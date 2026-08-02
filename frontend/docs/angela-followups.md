# Follow-ups after DB update + Thomas

Track for Angela data that is not loadable yet. The website already soft-handles missing tables.

## When DeepLoc lands (`deeploc21_orf_predictions`)

1. Confirm table matches notebook schema in igem-toronto #95.
2. `GET /api/orf/:id/annotations` already queries it via `fetchDeeplocPrediction`.
3. Extend `SignalPeptidePanel` (or a sibling panel) to render localization mask / top localizations for eukaryotic ORFs; show n/a for prokaryotes.

## When biochem lands (`orf_biochemical_properties`)

1. Confirm schema from #96.
2. `fetchBiochemProperties` already wired in annotations.
3. Add instability index + aromaticity to the corpus page (keep on-the-fly mass/pI/GRAVY unless preferring table values when `calc_status=ok`).

## When Thomas runs Angela’s phylo / ASR scripts

1. Get table or S3 path + schema keyed by PID cluster id (30/60/90).
2. Swap pin-tray centroid sequences for ancestral AA; keep the “centroid” label until then.
3. If a parent→child map ships with that run, replace the deferred children response in `cluster.js`.

## Ops ask (child expand)

```sql
CREATE INDEX CONCURRENTLY petadex_clustering_c30_c60
  ON petadex_clustering ("30pid_superfamily_id", "60pid_family_id");
CREATE INDEX CONCURRENTLY petadex_clustering_c60_c90
  ON petadex_clustering ("60pid_family_id", "90pid_enzyme_id");
```
