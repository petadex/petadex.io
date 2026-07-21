# SRA / BioSample / organism hubs (Denis)

Living sample provenance for PETadex: SRA runs (`library_id`), NCBI BioSamples,
and organisms. Served from Postgres `sra_metadata` (already ingested from Denis’s
public S3 CSVs). BacDrive enrichment is stubbed until Denis delivers that feed.

## S3 source of truth

Bucket prefix: `s3://petadex/sra/`

| Key | Role |
|-----|------|
| `petadex_metadata_dedup.csv` | Canonical run metadata (~2.4 GB) |
| `petadex_metadata_raw.csv` | Raw dump |
| `petadex_unique_runs.csv` | `run_id` list |
| `petadex_biosamples.csv` | BioSample id list |

Dedup columns match `sra_metadata` 1:1 (`acc`, `biosample`, `organism`, geo,
platform/assay, sizes, …).

**Update loop:** Denis refreshes S3 → team upserts RDS `sra_metadata` → site
updates with no frontend change.

## Join keys

| Key | Role |
|-----|------|
| `sra_metadata.acc` | SRA run = `logan_catalytic_orfs.library_id` |
| `biosample` | NCBI BioSample |
| `organism` | Soft string key for organism hub |

## API (`/api/sra`)

| Route | Purpose |
|-------|---------|
| `GET /summary` | Hub counts |
| `GET /run/:acc` | Run row + `orf_count` |
| `GET /run/:acc/orfs` | Paginated ORFs for library |
| `GET /biosample/:id` | BioSample aggregate + `orf_count` |
| `GET /biosample/:id/runs` | Paginated runs |
| `GET /organism?q=` | Prefix search (limit 50) |
| `GET /organism/:name` | Aggregates + sample runs |
| `GET /organism/:name/biosamples` | Paginated BioSamples |

## Frontend routes

| Path | Page |
|------|------|
| `/biosamples` | Hub search + counts |
| `/sra/:acc` | Run detail + ORF list |
| `/biosample/:id` | BioSample + runs + BacDrive stub |
| `/organism/:name` | Organism stats + biosamples + BacDrive stub |

Deep links from: ORF `ProvenancePanel`, curated `MetadataPanel`, IdentifierResolver
library hits, cluster dominant organism / `n_sra`, metadata map popups, enzyme
`library_id`, homepage + SiteHeader.

## Performance

`sra_metadata` is ~8M rows. The app DB role often **cannot** `CREATE INDEX` /
`CREATE TABLE` on shared RDS.

**What we do instead:**

| Mechanism | Role |
|-----------|------|
| File cache `backend/.cache/sra-organism-stats.json` | One-time `GROUP BY organism` → ~144k rows; search is in-memory |
| In-memory TTL on `/summary` | Serve cached hub counts |
| `GET /organism` / `/summary` return **202 warming** while the first build runs | UI shows “retry in 1–3 min” |
| Organism detail uses cache for counts; sample runs use a short DB timeout | First paint stays responsive |

Ops with table ownership can still run:

```bash
cd backend && npm run ensure-sra-indexes
```

(that script builds Postgres aggregate tables / indexes when permitted).

After Denis reloads `sra_metadata`, delete `backend/.cache/sra-organism-stats.json` and restart the API (or hit any `/api/sra/organism?q=xx` to rebuild).

## BacDrive (pending)

No BacDrive objects under `s3://petadex/` yet. Organism and BioSample pages show
a stub. **Ask Denis:**

1. BacDrive CSV path + column schema  
2. Join key (biosample vs organism vs other)  
3. Confirm `petadex_metadata_dedup.csv` remains the canonical SRA feed  
4. Any new “stat” columns needed for Amar’s paper plots beyond current schema
