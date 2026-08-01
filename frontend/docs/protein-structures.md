# Protein structures (ESMFold2 + experimental)

Living 3D folds for PETadex sequences: **experimental PDBs** (existing
`pdb_accessions` → public `petadex/pdb_structs/`) and **ESMFold2 predictions**
(Alex) under `s3://petadex-protein-structures/`.

This is **on-demand lookup only**. Never browse or ship a static catalog of all
folds. The API only returns predicted folds when the CIF object is publicly
readable (HEAD/Range probe).

Board reference: Alex, *Petadex Structure Schema (S3)* — **Website Display**
section. Folding Viewer embeds wherever structures already appear.

## S3 data lanes → Folding Viewer

Everything resolves in **ORFid** terms. Filenames use the `orf{id}` prefix.

| Lane | Prefix | Files | Status |
|------|--------|--------|--------|
| Demo (public today) | `esmfold2-centroids/test2/` | `structures/orf{id}.cif` · `metrics/orf{id}.json` | Working; temporary |
| Production (Alex) | `esmfold2-centroids/60pid/` | same layout | **403** — ask Dennis for public GET |
| MSA experimental | `esmfold2-centroids/60pid-msa/` | same layout | Path **confirmed** by Alex; **403** until Dennis opens it |
| Experimental PDBs | public `petadex/pdb_structs/{pdb_id}.pdb` | `.pdb` via `pdb_accessions` | Live |

HTTPS base: `https://petadex-protein-structures.s3.amazonaws.com`

Env overrides:

| Variable | Default | Meaning |
|----------|---------|---------|
| `STRUCTURE_S3_BASE` | `https://petadex-protein-structures.s3.amazonaws.com` | Bucket HTTPS origin |
| `STRUCTURE_S3_LANE` | `esmfold2-centroids/test2` | Baseline predicted CIF/metrics prefix (flip to `…/60pid` after Dennis opens public GET) |
| `STRUCTURE_S3_MSA_LANE` | *(empty)* | Set to `esmfold2-centroids/60pid-msa` once that prefix is public; empty hides Base/MSA toggle |
| `STRUCTURE_S3_FINETUNE_LANE` | *(legacy alias)* | Still read if `STRUCTURE_S3_MSA_LANE` unset |

Example object URLs for ORF `4981589` (demo lane):

```
…/esmfold2-centroids/test2/structures/orf4981589.cif
…/esmfold2-centroids/test2/metrics/orf4981589.json
```

Production (when public):

```
…/esmfold2-centroids/60pid/structures/orf4981589.cif
…/esmfold2-centroids/60pid/metrics/orf4981589.json
```

MSA experimental (Alex confirmed path; same layout):

```
…/esmfold2-centroids/60pid-msa/structures/orf4981589.cif
…/esmfold2-centroids/60pid-msa/metrics/orf4981589.json
```

**Examples:** the example set *is* whatever is readable on S3 under the active
lane (Alex confirmed). No separate catalog beyond that. Bucket **listing** is
still 403 — only known keys are fetchable.

### Metrics JSON (Alex)

```json
{
  "id": "orf4981589",
  "seq_len": 95,
  "status": "ok",
  "run": { "label": "baseline", "esmfold2": "full", "…": "…" },
  "confidence": {
    "mean_plddt": 88.9,
    "ptm": 0.92,
    "iptm": 0.0,
    "per_residue_plddt": [/* L */],
    "pae": [/* L×L */]
  }
}
```

CIF `B_iso_or_equiv` matches per-residue pLDDT. Legacy `.npy` / NPZ archives are
still parsed if pointed at by `metrics_url`.

### MSA (experimental group; was “finetune”)

Alex confirmed: experimental group is **MSA**, lane
`esmfold2-centroids/60pid-msa/`, same `structures/` + `metrics/` + `orf{id}`
layout as base. Set `STRUCTURE_S3_MSA_LANE=esmfold2-centroids/60pid-msa` once
Dennis opens public GET (probe hides the toggle if objects are still 403).
API accepts `variant=msa` (and legacy `variant=finetune` as an alias).

### Figures

Beside-viewer Exp. 1–2 plots wait on **full folds from Purav** — do not expect
figure payloads yet.

### CORS

Bucket CORS is oriented at `https://petadex.net`. Localhost direct S3 fetches
are blocked; Mol* uses `GET /api/structure/content/orf/:orfId` as a proxy. Alex
said he can try adding localhost CORS later.

## API

Mounted at `/api/structure`:

| Route | Behavior |
|-------|----------|
| `GET /api/structure/orf/:orfId?variant=base\|msa` | Prefer experimental PDB; else predicted CIF if the object exists (404 otherwise). |
| `GET /api/structure/accession/:accession?variant=…` | Same preference via accession → ORF. |
| `GET /api/structure/metrics/:orfId?variant=…` | Fetch metrics JSON (or legacy arrays) → mean_plddt, ptm, downsampled PAE. Soft-fails with `available: false`. |
| `GET /api/structure/content/orf/:orfId?variant=…` | Streams the CIF through the API (avoids S3 CORS limits for localhost / Mol*). |

`source` values: `experimental_pdb` | `esmfold2_centroid_60` | `esmfold2_orf`
(centroid labeling uses `block_60pid`; both use the same predicted S3 lane today).

Response fields for predicted folds include `msa_structure_url` /
`msa_metrics_url` (plus legacy `finetune_*` aliases pointing at the same URLs).

## Frontend: Folding Viewer

[`FoldingViewer`](../src/components/structure/FoldingViewer.jsx) via
[`StructurePanel`](../src/components/StructurePanel.js) on:

| Page | Behavior |
|------|----------|
| `/cluster/90/:id` | Centroid Folding Viewer + figures column |
| `/sequence/orf/:orfId` | Structure section when resolve returns 200 |
| `/family/:familyId` | Centroid Structure section |
| Curated sequence Structure tab | Same panel |

**Viewer:** Mol* CIF, confidence table (mean-pLDDT / pTM), PAE heatmap, SAE stub,
optional **Base / MSA** when MSA URLs exist.

**Beside viewer:** figure placeholders until Purav full folds land.

## Ownership

| Who | Owns |
|-----|------|
| Alex | CIF/metrics ingest, lane naming (`60pid`, `60pid-msa`) |
| Dennis (S3 admin) | Public GET (and optional listing) on `60pid` + `60pid-msa`; CORS if needed |
| Purav | Full folds needed before Exp. figures |
| Frontend / API | Resolve + metrics contract, Folding Viewer |

### Resolved (Alex, Jul 31)

- [x] Production prefix → `esmfold2-centroids/60pid` (`test2` is temp demo)
- [x] Examples = data on S3 (no separate catalog)
- [x] Relabel finetune → MSA
- [x] MSA lane → `esmfold2-centroids/60pid-msa` (same `structures/` + `metrics/` layout)
- [x] Figures wait on Purav
- [x] Alex can’t fix S3 ACL — route to Dennis

### Ask Dennis (outstanding)

- [ ] Public GET on `esmfold2-centroids/60pid/structures/orf*.cif` + `…/metrics/orf*.json` (same ACL as `test2`)
- [ ] Public GET on `esmfold2-centroids/60pid-msa/…` (same layout) when objects exist
- [ ] Optional: allow ListObjects on those prefixes (today listing is 403; we can only hit known keys)
- [ ] Optional: CORS for `http://localhost:8000` (API CIF proxy already works without it)

### After Dennis opens `60pid`

1. Set `STRUCTURE_S3_LANE=esmfold2-centroids/60pid`
2. Set `STRUCTURE_S3_MSA_LANE=esmfold2-centroids/60pid-msa` (when that prefix is readable)
3. Smoke-test ORF `4981589` (and any other known keys)