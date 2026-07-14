# Family Phylogenetic Tree — Navigation Tools

## Motivation

Dry Lab asked for better ways to **search and navigate** family phylogenetic
trees: traceback from a tip to the root, nearby sequences, a local neighborhood
around a focus tip, and coloring by metadata. This work adds those tools to the
**existing** tree UI (`PhyloTreePanel` / `PhyloTreeViewer`), rather than a
separate search framework.

## Feature summary

### 1. Focus + search (unchanged entry points)

Search still uses `PhyloTreeSearch` against `/api/family/:id/tree-members`.
Focus a tip by searching or clicking a leaf. Clearing an empty search no longer
wipes an externally set focus (sidebar neighbor clicks stay selected).

### 2. Path to root

With a focused tip, the tree highlights the unique path from that tip up to the
root. The sidebar shows path length (edges). Topology helpers live in
`treeTopology.js` (UID indexing, tip→root path, LCA, patristic distance).

### 3. Nearby sequences

The sidebar lists the closest tips by patristic distance (k-NN). Selecting a
neighbor re-focuses the tree and bumps `zoomNonce` so re-zoom works even when
the same tip is already focused.

### 4. Local neighborhood

Toggle a local neighborhood around the focus tip:

- **Radius** — tips within a patristic-distance radius of the focus
- **k-NN** — the k nearest tips

Non-neighborhood leaves are dimmed; **Fit neighborhood** zooms the viewport to
the active set.

### 5. Color by metadata

Optional leaf coloring modes (`metadataColors.js`):

| Mode | Source |
|------|--------|
| None | Search/path highlights only |
| Component | CATH atlas component (`enzyme_taxonomy.component`) |
| Identity to centroid | `family_pid` continuous scale |
| Organism | `blast_nr_metadata.organism` (when present) |
| Country | `blast_nr_metadata.country` (when present) |

Organism/country come from a LEFT JOIN on `/tree-members`; tips without
metadata fall back to a neutral color.

### 6. Where tools are enabled

`PhyloTreePanel` takes `showNavTools`. When true, it renders `PhyloNavSidebar`
and wires path / neighborhood / color into the viewer.

| Route | Nav tools |
|-------|-----------|
| `/family/:familyId` (Phylogenetic Tree section) | On |
| `/tree/:familyId` | On |
| `/phylo-tree-prototype/?family=:id` | On (thin wrapper over the same panel) |

Trees themselves are stored in S3 (`search-phylo-trees/family_{id}.nwk`). Only
families with a tree show “View phylogeny” from search results.

## File reference

### New files

| File | Purpose |
|------|---------|
| `frontend/src/components/phyloTree/PhyloNavSidebar.jsx` | Focus, path, neighborhood, neighbors, color-by UI |
| `frontend/src/components/phyloTree/treeTopology.js` | Tree index, path-to-root, LCA, k-NN, radius neighborhood |
| `frontend/src/components/phyloTree/metadataColors.js` | Color modes + legend helpers |
| `frontend/src/pages/phylo-tree-prototype.js` | Optional family-ID entry page using the same panel |

### Modified files

| File | Change |
|------|--------|
| `frontend/src/components/phyloTree/PhyloTreePanel.jsx` | `showNavTools`, sidebar state, path/neighborhood/color wiring, `zoomNonce` |
| `frontend/src/components/phyloTree/PhyloTreeViewer.jsx` | Path highlight, neighborhood dimming, leaf colors, `onLeafSelect`, fit + `zoomNonce` |
| `frontend/src/components/phyloTree/PhyloTreeSearch.jsx` | Empty query does not clear external focus |
| `frontend/src/components/phyloTree/useFamilyMemberIndex.js` | Store optional `organism` / `country` |
| `frontend/src/pages/tree/[familyId].js` | Enable `showNavTools` |
| `frontend/src/templates/family.js` | Enable `showNavTools` on the family tree section |
| `backend/src/routes/family.js` | `GET .../tree-members` LEFT JOINs `blast_nr_metadata` for organism/country |

## Data flow

```
S3 family_{id}.nwk ──► PhyloTreePanel ──► PhyloTreeViewer
                              │
                              ├─ PhyloTreeSearch + useFamilyMemberIndex
                              │       └─ GET /api/family/:id/tree-members
                              │              (enzyme_fastaa ⋈ taxonomy
                              │               ⟕ blast_nr_metadata)
                              │
                              └─ showNavTools?
                                    ├─ treeTopology (path / k-NN / radius)
                                    ├─ metadataColors
                                    └─ PhyloNavSidebar
```

## Bug fix — re-zoom when focus is unchanged

**Symptom:** “Re-zoom to tip” (or re-selecting the same leaf) did nothing.

**Cause:** React skipped the zoom effect when `focusedLeafId` was set to the
same value.

**Fix:** Bump `zoomNonce` on leaf select / re-zoom; the viewer effect depends
on `[focusedLeafId, zoomNonce, zoomToLeaf]`.

## Testing / verification

- Open `/family/182` and `/tree/182` — sidebar present; Newick loads.
- Focus via search or click — path-to-root highlights; path length updates.
- Nearby sequences list sorts by distance; click focuses + zooms.
- Toggle neighborhood (radius and k-NN); dimming + Fit neighborhood work.
- Color modes update tip colors / legend; organism/country only when metadata exists.
- Re-zoom to an already-focused tip still recenters the viewport.
- Empty search does not clear a focus set from the sidebar.

## Known limitations / follow-ups

- Only families with a Newick object in S3 have a tree (currently a small set,
  e.g. 182, 21080, 47364).
- Organism/country coloring depends on `blast_nr_metadata` coverage; many tips
  may be uncolored for those modes.
- Neighborhood controls use patristic distance on the displayed tree topology;
  they are not BLAST or sequence-identity neighbors.
- `/phylo-tree-prototype` is a convenience entry for demos; production entry
  points remain family pages, `/tree/:id`, and search “View phylogeny”.
