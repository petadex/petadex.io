# Angela sequence annotations and PID cluster navigation

Website wiring for Angela Jiang’s sequence predictions and PID hierarchy UI.

## Live now

### SignalP 6 (corpus ORF pages)

- **Table:** `public.signalp6_orf_predictions` (old database; ~42M positive hits)
- **API:** `GET /api/orf/:orfId/annotations` → `.signalp`
- **UI:** [`SignalPeptidePanel`](../src/components/corpus/SignalPeptidePanel.jsx) on `/sequence/orf/:id`
- Cleavage span highlights residues `1..cleavage_pos` on the sequence viewer
- Labels: SP / LIPO / TAT / TATLIPO / PILIN (`top_signal` 1–5)

After the next database update Angela will re-run / reload SignalP. The join fails soft if the table is missing (`available: false`).

### PID cluster navigation (prototype)

- **API:**
  - `GET /api/cluster/:level/:clusterId/children` (30→60, 60→90)
  - `GET /api/cluster/:level/:clusterId/parent`
- **UI:** [`ClusterHierarchyNav`](../src/components/corpus/ClusterHierarchyNav.jsx) on `/cluster/:level/:id`
- Multi-pin tray compares **cluster centroid** sequences (color-coded AA)
- Labeled as centroids, not ancestral reconstructions
- **Parent + centroid path** resolve via the block centroid’s `petadex_clustering` row (orf_id PK, fast)
- **Child listing is deferred:** `petadex_clustering` only has a PK on `orf_id`, so DISTINCT parent→child scans are not interactive. The children endpoint returns `deferred: true` plus suggested index SQL. Once Dennis (or whoever owns RDS) adds those indexes or a parent→child map, flip the endpoint to a real enumerate without changing the UI contract.

## Pending (do not claim live)

| Data | Expected table | Blocker |
|------|----------------|---------|
| DeepLoc organelle localization | `deeploc21_orf_predictions` | DB update + Angela load (#95) |
| ProtParam extras (instability, aromaticity) | `orf_biochemical_properties` | DB update + Angela load (#96) |
| Ancestral AA at PID nodes | TBD after Thomas runs Angela’s phylo scripts | Thomas + separate server |

The annotations endpoint already returns soft stubs:

```json
{
  "localization": { "available": false, "reason": "table_missing", "note": "..." },
  "biochemical": { "available": false, "reason": "table_missing", "note": "..." }
}
```

When those tables land, the same endpoint starts returning rows without a frontend rewrite. Wire DeepLoc / biochem panels then.

## Verify locally

```bash
# SignalP hit example
curl -s "$API/orf/294247546/annotations" | jq .signalp

# Hierarchy
curl -s "$API/cluster/30/1/children" | jq '.child_level, (.children|length)'
curl -s "$API/cluster/60/28/parent" | jq .parent.level
```

Pages: `/sequence/orf/294247546`, `/cluster/30/1`
