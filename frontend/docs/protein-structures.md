# Protein structures (ESMFold2 + experimental)

Living 3D folds for PETadex sequences: **experimental PDBs** (existing
`pdb_accessions` → public `petadex/pdb_structs/`) and **ESMFold2 predictions**
(Alex) under `s3://petadex-protein-structures/`.

This is **on-demand lookup only**. There are ~18M 90% centroids — never browse
or ship a static catalog of all folds.

## S3 layout (Alex)

| Prefix | Role |
|--------|------|
| `esmatlas/structures/{orf_id}.cif` | ORF-level ESMFold2 mmCIF |
| `esmatlas/arrays/{orf_id}.npy` | Per-ORF quality metrics (schema TBD) |
| `esmfold2-centroids/90pid/structures/{orf_id}.cif` | 90% centroid folds |
| `esmfold2-centroids/90pid/arrays/{orf_id}.npy` | Centroid quality metrics |
| `pdb_structures/` | Optional PDB mirror (deferred; RCSB / existing `pdb_structs` used today) |
| `af_db/af_structures/` | AF cores (deferred) |

HTTPS base (default):

`https://petadex-protein-structures.s3.amazonaws.com`

Override with backend env `STRUCTURE_S3_BASE` / `STRUCTURE_ARRAY_EXT`.

**ACL note:** prefixes must be browser-readable (public + CORS) or served via
signed URL / proxy. Until Alex unlocks access, Mol* may show “Structure
unavailable” while the resolve API still returns URLs.

## API

Mounted at `/api/structure`:

| Route | Behavior |
|-------|----------|
| `GET /api/structure/orf/:orfId` | ORF must exist in `orf_origins`. Prefer experimental PDB by accession, else 90pid centroid CIF if `block_90pid.centroid_orf_id`, else ORF esmatlas CIF. |
| `GET /api/structure/accession/:accession` | Prefer experimental PDB; else map accession → corpus `orf_id` and return predicted CIF. |

Example response:

```json
{
  "orf_id": 123,
  "accession": "ABC123.1",
  "source": "esmfold2_centroid_90",
  "format": "mmcif",
  "structure_url": "https://petadex-protein-structures.s3.amazonaws.com/esmfold2-centroids/90pid/structures/123.cif",
  "metrics_url": "https://petadex-protein-structures.s3.amazonaws.com/esmfold2-centroids/90pid/arrays/123.npy",
  "method": "ESMFold2",
  "updated_at": null
}
```

`source` values: `experimental_pdb` | `esmfold2_centroid_90` | `esmfold2_orf`.

## Frontend surfaces

| Page | Behavior |
|------|----------|
| `/sequence/orf/:orfId` | Structure section when `/api/structure/orf/:id` returns 200 |
| `/family/:familyId` | **Centroid Structure** section (accession resolve) |
| `/cluster/90/:id` | Centroid fold panel for `centroid_orf_id` |
| Curated sequence Structure tab | Still uses `StructurePanel` (accession) |

Mol* loads via [`ProteinViewer`](../src/components/protein/ProteinViewer.js)
with `parseTrajectory(..., 'mmcif'|'pdb')`. Quality-array coloring is deferred
until the array schema is documented.

## Ownership

| Who | Owns |
|-----|------|
| Alex | CIF/array ingest, living updates, S3 ACL/CORS, future DB index of available folds |
| Frontend / API | Resolve contract, Mol* viewer, page placement |

When a DB index lands, replace URL construction with indexed lookups without
changing the JSON contract above.
