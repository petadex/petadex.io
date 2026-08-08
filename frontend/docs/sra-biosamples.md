# SRA / BioSample / organism hubs (Denis)

Living sample provenance for PETadex: SRA runs (`library_id`), NCBI BioSamples,
and organisms. Served from Postgres `sra_metadata` (already ingested from Denis’s
public S3 CSVs). BacDive environmental means join on BioSample (Denis CSV #3).

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
| BacDive means `biosampleID` | Same BioSample id → optimum T/pH averages |

## API (`/api/sra`)

| Route | Purpose |
|-------|---------|
| `GET /summary` | Hub counts |
| `GET /run/:acc` | Run row + `orf_count` |
| `GET /run/:acc/orfs` | Paginated ORFs for library |
| `GET /biosample/:id` | BioSample aggregate + `bacdive` means when available |
| `GET /biosample/:id/runs` | Paginated runs |
| `GET /organism?q=` | Prefix search (limit 50) |
| `GET /organism/:name` | Aggregates + sample runs |
| `GET /organism/:name/biosamples` | Paginated BioSamples |
| `GET /bacdive/status` | BacDive CSV #3 load state / row count |

## Frontend routes

| Path | Page |
|------|------|
| `/biosamples` | Hub search + counts |
| `/sra/:acc` | Run detail + ORF list |
| `/biosample/:id` | BioSample + runs + BacDive means panel |
| `/organism/:name` | Organism stats + biosamples + BacDive note |

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
| File cache `backend/.cache/bacdive-biosample-means.json` | Parsed Denis CSV #3 keyed by biosample |
| In-memory TTL on `/summary` | Serve cached hub counts |
| `GET /organism` / `/summary` return **202 warming** while the first build runs | UI shows “retry in 1–3 min” |
| Organism detail uses cache for counts; sample runs use a short DB timeout | First paint stays responsive |

Ops with table ownership can still run:

```bash
cd backend && npm run ensure-sra-indexes
```

After Denis reloads `sra_metadata`, delete `backend/.cache/sra-organism-stats.json` and restart the API.
After BacDive CSV updates, delete `backend/.cache/bacdive-biosample-means.json` (or set `BACDIVE_MEANS_PATH`) and restart.

## BacDive / BacDrive (Denis)

Denis’s BacDive analysis (Slack, Jul 2026) — ~5.1M BioSamples with BacDive
organisms that have environmental data (not 1:1 with all PETadex BioSamples).

| CSV | Contents | Status in PETadex |
|-----|----------|-------------------|
| **#1** | Unique BacDive organisms appearing in SRA stats | **Not published yet** |
| **#2** | #1 filtered to organisms with environmental data | **Not published yet** |
| **#2.5** | BioSample SRA rows trimmed to BacDive organisms from #2 | **Not published yet** |
| **#3** | Per-BioSample means: `biosampleID`, n organisms (temp), avg optimum temp, n organisms (pH), avg optimum pH | **Wired** — URL below |

Published URL (still **403 AccessDenied** as of Jul 31 2026):

`https://petabite.s3.us-east-1.amazonaws.com/automated-metadata/bacdive_data_analysis/biosample_bacdive_means.csv`

**Join:** `biosampleID` = PETadex / NCBI BioSample (`sra_metadata.biosample`).

**Local override while S3 is private:**

```bash
# place file at:
backend/data/biosample_bacdive_means.csv
# or
export BACDIVE_MEANS_PATH=/path/to/biosample_bacdive_means.csv
```

### Still ask Denis

1. Make CSV #3 publicly readable (or copy under `s3://petadex/`) + confirm exact header names  
2. Publish CSVs #1 / #2 / #2.5 if we need organism-level BacDive lists or per-organism env rows  
3. Confirm `petadex_metadata_dedup.csv` remains the canonical SRA feed  
4. Any extra paper-plot columns beyond mean optimum T/pH
