# CATH Domains Page — Enhancements

## Motivation

The lead asked to (1) annotate each CATH domain with its profile HMM where
applicable, (2) make the HMM downloadable and show its logo, and (3) integrate
the CATH pages with the rest of the database so they feel native and navigable.
This work delivers all three, plus an interactive sequence-level viewer and a
fix to a shared highlight-alignment bug.

## Feature summary

### 1. Profile HMM annotation + download + logo

Each CATH profile shows a **Profile HMM** block with the HMM name, the Pfam
accession (linked to InterPro), a **Download HMM (.hmm.gz)** button, and a
**View on InterPro** link. HMM files and logos are sourced live from
EBI/InterPro (Pfam moved there after the xfam shutdown).

### 2. Interactive HMM sequence logo ("feature viewer with the slider")

A **Show interactive logo** toggle renders a Skylign-style sequence logo
client-side from InterPro's `?annotation=logo` JSON: per-column stacked letters
scaled by information content (bits), a **zoom slider**, horizontal scroll, a
**pinned bits axis**, a position ruler, and a hover readout. Progressive
disclosure keeps it off the initial render.

### 3. Domain architecture viewer (InterPro IDA)

A **Show domain architecture** toggle fetches InterPro's Integrated Domain
Architecture (IDA) data and renders up to 6 representative proteins as
InterPro-style domain tracks, with stable per-family colors, a legend, the
current family highlighted, and a floating hover tooltip
(name · accession · residue range) so even tiny domain blocks are legible.

### 4. Interactive per-protein feature viewer (sequence-level)

Each architecture row has a **Sequence view** toggle that fetches the
representative protein's sequence from UniProt and mounts the shared
`FeatureViewerPanel` with the Pfam domains as zoomable, selectable tracks — the
same viewer used on ORF/enzyme pages, now reused here. It is lazy-loaded
(code-split) and only fetches when expanded.

### 5. Site integration (cross-linking)

- **Homepage:** new "CATH domains" tool card ("Five ways into the data").
- **Footer:** "CATH domains" nav link.
- **Family pages:** "Component N" badges link to the matching CATH profile.
- **Enzyme pages:** the Component pill links to the matching CATH profile.
- **Corpus catalytic-domains panel:** links out to `/cath-domains?pfam=…` when a
  Pfam accession is available.
- **CATH profile → PDB:** reciprocal RCSB/Mol\* links for listed PDB IDs.

### 6. Bug fix — feature-viewer highlight misalignment (shared)

Fixed a few-pixel drift between the cursor and the highlighted residue/label that
appeared only when zoomed out. Root cause: the pointer→residue hit-test and the
residue→pixel highlight used different coordinate systems (local SVG units with
padding vs. screen-space bounding rect without padding). The highlight is now the
exact inverse of the hit-test via a shared `PLOT_PAD` constant and the same CTM
projection. This also improves the ORF/enzyme-page viewers, which share this
utility. Verified: highlight-center vs. cursor delta went from a consistent few
px to `0–1 px` across the whole zoomed-out plot.

### 7. Dev-only HMR fix

Added a small webpack loader (`frontend/loaders/mini-css-hmr-fix-loader.js`,
wired in `gatsby-node.js` for `develop` stages only) to prevent a
`mini-css-extract-plugin` crash during CSS hot-reload. No effect on production
builds.

## File reference

### New files

| File | Purpose |
|------|---------|
| `frontend/src/utils/hmmAssets.js` | InterPro HMM URL builders (download, entry, logo-data, filename, inline-logo resolver) |
| `frontend/src/utils/uniprotSequence.js` | Fetch + parse UniProt FASTA (with abort) |
| `frontend/src/components/cath/CathDomainHmmPanel.js` | Profile HMM block (name, accession, download, logo toggle) |
| `frontend/src/components/cath/HmmLogoViewer.js` | Interactive Skylign-style logo (zoom, scroll, bits axis, ruler) |
| `frontend/src/components/cath/CathDomainArchitecture.js` | InterPro IDA domain-architecture viewer |
| `frontend/src/components/cath/RepresentativeProteinViewer.js` | Bridges UniProt sequence + InterPro domains into `FeatureViewerPanel` |
| `frontend/src/components/proteinViewerPrototype/LazyFeatureViewerPanel.jsx` | Code-split lazy wrapper for the heavy feature viewer |
| `frontend/loaders/mini-css-hmr-fix-loader.js` | Dev-only HMR crash workaround |

### Modified files

| File | Change |
|------|--------|
| `frontend/src/data/cathDomainCatalog.js` | New optional `hmmLogoImage` field (JSDoc) |
| `frontend/src/utils/mergeCatalogWithAtlas.js` | Pass `hmmLogoImage` through to the domain model |
| `frontend/src/components/cath/CathDomainVisualizationPanel.js` | Render HMM panel + architecture viewer; PDB reciprocal links |
| `frontend/src/templates/family.js` | Link "Component N" → CATH profile |
| `frontend/src/templates/enzyme.js` | Link Component pill → CATH profile |
| `frontend/src/components/corpus/CatalyticDomainsPanel.jsx` | Link to `/cath-domains?pfam=` when accession present |
| `frontend/src/pages/index.js` | Homepage "CATH domains" tool card |
| `frontend/src/components/footer.js` | Footer "CATH domains" link |
| `frontend/src/components/proteinViewerPrototype/residueColumnHighlight.js` | Highlight/label alignment fix |
| `frontend/gatsby-node.js` | Register dev-only mini-css HMR loader |

## External APIs used

All called directly from the browser (both providers send permissive CORS):

- **InterPro (Pfam) HMM download:** `https://www.ebi.ac.uk/interpro/api/entry/pfam/{ACC}?annotation=hmm` → gzipped `.hmm`
- **InterPro logo (Skylign JSON):** `https://www.ebi.ac.uk/interpro/api/entry/pfam/{ACC}?annotation=logo`
- **InterPro domain architectures (IDA):** `https://www.ebi.ac.uk/interpro/api/entry/pfam/{ACC}/?ida&page_size=6`
- **InterPro entry pages:** `.../interpro/entry/pfam/{ACC}/curation/` and `.../{ACC}/domain_architecture/`
- **UniProt sequence:** `https://rest.uniprot.org/uniprotkb/{ACC}.fasta`

## Data flow

```
cathDomainCatalog.js ──► mergeCatalogWithAtlas.js ──► CathDomainVisualizationPanel
                                                          ├─ CathDomainHmmPanel ─► hmmAssets ─► InterPro (hmm/logo/entry)
                                                          │        └─ HmmLogoViewer ─► InterPro ?annotation=logo
                                                          └─ CathDomainArchitecture ─► InterPro ?ida
                                                                   └─ RepresentativeProteinViewer
                                                                          ├─ uniprotSequence ─► UniProt FASTA
                                                                          └─ LazyFeatureViewerPanel ─► FeatureViewerPanel
```

## How to add / annotate a new CATH domain

1. Add/edit the entry in `frontend/src/data/cathDomainCatalog.js`. Ensure it has
   a `pfamAccession` — the HMM download, logo, architecture, and cross-links all
   key off it.
2. HMM download/logo/architecture work automatically from InterPro; no per-entry
   config needed.
3. Optional: set `hmmLogoImage: "/cath/hmm/{ACC}_logo.png"` to render a locally
   committed static logo inline (otherwise the interactive logo / InterPro link
   is used).
4. Cross-links to family/enzyme pages resolve via the Component ↔ CATH mapping;
   no manual wiring.

## Testing / verification

- Highlight-alignment fix verified in-browser via scripted pointer moves at
  20/50/80% of a zoomed-out plot: delta `0–1 px` (was a consistent few px).
- CATH reference/citation ordering is enforced by `npm run build:validate-cath` (all catalog profiles must pass before a strict build succeeds).

## Known limitations / follow-ups

- HMM logo/architecture require live network access to EBI/UniProt; all views
  degrade gracefully to external links on failure.
- IDA architectures are capped at 6 representatives.
- `CatalyticDomainsPanel` only shows the CATH link once PAZy tracks carry a Pfam
  accession (falls back to no link until then).
- Pre-existing CATH citation-order issues were resolved (duplicate InterPro entries, comma-trailing URLs, and a DOI canonicalization bug for `10.1128/...` AEM papers).
