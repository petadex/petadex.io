# Protein structures (ESMFold2 + experimental)

Living 3D folds for PETadex sequences: **experimental PDBs** (existing
`pdb_accessions` → public `petadex/pdb_structs/`) and **ESMFold2 predictions**
(Alex) under `s3://petadex-protein-structures/`.

This is **on-demand lookup only**. There are ~18M 90% centroids — never browse
or ship a static catalog of all folds.

Board reference: Alex, *Petadex Structure Schema (S3)*, Jul 14 2026 — **Website
Display** section only (no dedicated Structures microsite). The Folding Viewer
embeds wherever structures already appear, with corresponding figures beside it.

## S3 data lanes → Folding Viewer

Everything should resolve to **ORFid** terms.

| Lane | Assumed prefix | Format | ID story |
|------|----------------|--------|----------|
| Pre-Existing PDBs | public `petadex/pdb_structs/{pdb_id}.pdb` (+ optional Alex `pdb_structures/`) | `.pdb` | PDB accession → ORF |
| Pre-Existing AF Cores | `af_db/af_structures/{uniprot}.cif` | `.cif` | Uniprot → catalytic_cores → ORF (**mapping TBD**) |
| Pre-Existing ESMAtlas Cores | `esmatlas/{structures,arrays}/{orf_id}` | `.cif` + arrays | hash → ORF (**after rerun**) |
| Folded ORFs w/ ESMFold2 | same layout as ESMAtlas | `.cif` + arrays | ORFid known |
| 90% centroids | `esmfold2-centroids/90pid/{structures,arrays}/{orf_id}` | `.cif` + arrays | centroid ORFid |
| Benchmark Data | `benchmark/{orf_id}.npz` (**assumed**) | NPZ | pred vs exp diffs → figure panel beside viewer |

HTTPS base (default): `https://petadex-protein-structures.s3.amazonaws.com`

Override: `STRUCTURE_S3_BASE` / `STRUCTURE_ARRAY_EXT` (default `.npy`; NPZ-compatible archives accepted).

### Finetune parallels (**assumed until Alex confirms**)

| Base | Finetune |
|------|----------|
| `esmfold2-centroids/90pid/…` | `esmfold2-centroids/90pid-finetune/…` |
| `esmatlas/…` | `esmatlas-finetune/…` |

### Assumed array archive keys

| Key | Shape | Meaning |
|-----|-------|---------|
| `plddt` | `float32[L]` | Per-residue confidence 0–100 |
| `ptm` | scalar `float32` | Predicted TM |
| `pae` | `float32[L,L]` | Predicted aligned error |
| `molprobity` | optional scalar | Physical plausibility |
| `lddt` / `tm` / `gdt_ts` | optional | Experimental compare |

**ACL note:** prefixes need public-read + CORS (or proxy). Until then, Mol* /
metrics show empty states while resolve still returns URLs.

## API

Mounted at `/api/structure`:

| Route | Behavior |
|-------|----------|
| `GET /api/structure/orf/:orfId?variant=base\|finetune` | Prefer experimental PDB → 90pid centroid → ORF esmatlas. Returns base + finetune URLs for predicted sources. |
| `GET /api/structure/accession/:accession?variant=…` | Prefer experimental PDB; else accession → ORF → predicted CIF. |
| `GET /api/structure/metrics/:orfId?variant=…` | Server-side array parse → mean_plddt, ptm, molprobity, downsampled PAE. Soft-fails with `available: false` on 403/404/parse. |

AF cores deferred until Uniprot→ORF mapping exists.

`source` values: `experimental_pdb` | `esmfold2_centroid_90` | `esmfold2_orf`.

## Frontend: Folding Viewer (inline, no hub page)

[`FoldingViewer`](../src/components/structure/FoldingViewer.jsx) via
[`StructurePanel`](../src/components/StructurePanel.js) on:

| Page | Behavior |
|------|----------|
| `/cluster/90/:id` | Centroid Folding Viewer + figures column |
| `/sequence/orf/:orfId` | Structure section when resolve returns 200 |
| `/family/:familyId` | Centroid Structure section |
| Curated sequence Structure tab | Same panel |

**Left / main (Alex Folding Viewer):**

1. CIF in Mol* with **Base / Finetune** toggle  
2. mean-pLDDT / pTM / MolProbity table + centroid / non-PDB validation disclaimer  
3. Interactive PAE heatmap  
4. SAE features stub ([arxiv 2606.12209](https://arxiv.org/pdf/2606.12209))

**Beside viewer:** corresponding figures placeholders (ESMC Finetune Graphs /
Exp. 1–2, confidence calibration). Filled when Alex ships result CSVs — same
ORFid resolve flow as the structure.

## Metrics references (Alex)

- [pLDDT / lDDT](https://academic.oup.com/bioinformatics/article/29/21/2722/195896)
- [TM-score](https://pmc.ncbi.nlm.nih.gov/articles/PMC2913670/)
- [PAE](https://pmc.ncbi.nlm.nih.gov/articles/PMC10692239/)
- [MolProbity](https://onlinelibrary.wiley.com/iucr/doi/10.1107/S0907444909042073)
- [GDT](https://pmc.ncbi.nlm.nih.gov/articles/PMC3607910/)
- [Biohub paper](https://www.biorxiv.org/content/10.64898/2026.06.03.729735v1.full.pdf)

## Ownership

| Who | Owns |
|-----|------|
| Alex | CIF/array ingest, ACL/CORS, confirm assumed paths/keys, Exp figure CSVs |
| Frontend / API | Resolve + metrics contract, Folding Viewer + figure slots |

### TBD for Alex

- [ ] Confirm finetune S3 prefixes + array keys
- [ ] Public-read + CORS
- [ ] Uniprot / hash → ORF mappings
- [ ] Benchmark NPZ + Exp. 1–2 figure payloads for the beside-viewer panel
