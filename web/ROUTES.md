# Route ledger

The planned URL contract for `web/`, and the record of what each route replaces.

One row per route. A row is filled in **before** the page is written, not after —
see "Adding a page" in [CONTRIBUTING.md](../CONTRIBUTING.md). The **Replaces**
column is what the Phase 4 redirect map is assembled from, so a missing or wrong
value there is a silent 404 for a URL someone may have cited.

## Field schema

| Field         | Values                                                               |
| ------------- | -------------------------------------------------------------------- |
| **Route**     | URL path, `:param` for dynamic segments                              |
| **Purpose**   | One line: what a visitor does here                                   |
| **Replaces**  | Old Gatsby path, or `none` for a new page                            |
| **Data**      | Every endpoint or object read. `none` for committed content          |
| **Rendering** | `static` · `isr` · `ssr` · `client`                                  |
| **Frozen**    | `yes` — path is citable and must never move · `no` · `tbd` — blocked |
| **Status**    | `planned` · `in progress` · `shipped`                                |

`tbd` in **Frozen** means a Phase 1 decision blocks it. Those routes cannot ship
until the decision lands; the blocker is named under [Blocked](#blocked).

---

## Ledger

### Shipped

| Route | Purpose                                                                         | Replaces | Data          | Rendering | Frozen | Status                |
| ----- | ------------------------------------------------------------------------------- | -------- | ------------- | --------- | ------ | --------------------- |
| `/`   | Scaffold placeholder with a backend-connection probe. Becomes the landing page. | `/`      | `GET /health` | `ssr`     | yes    | shipped (placeholder) |

### Planned — top-level

| Route           | Purpose                                                                                             | Replaces        | Data                                                                                                                          | Rendering                | Frozen | Status  |
| --------------- | --------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------ | ------- |
| `/`             | Landing: hero over a live atlas render, headline counts, feature blurbs, citation block at `#cite`  | `/`             | atlas S3 object                                                                                                               | `isr`                    | yes    | planned |
| `/enzymes`      | Browse BLAST-NR enzyme families. Paged, sortable, filter by atlas component, identifier resolver    | `/enzymes`      | `/api/enzymes/families/summary`, `/api/enzymes/family/:id`, `/api/enzymes?component=`, `/api/resolve`, `/api/resolve/summary` | `isr` + `client` filters | yes    | planned |
| `/atlas`        | Full UMAP atlas of enzyme families, focus state from the query string                               | `/atlas`        | atlas S3 object, `/api/family/:id/umap`                                                                                       | `client`                 | yes    | planned |
| `/search`       | Sequence search input. Submits and navigates to `/results?job=`                                     | `/search`       | `POST /api/search`                                                                                                            | `static` + `client` form | yes    | planned |
| `/results`      | DIAMOND results. Polls a job ID from `?job=` until complete. Bookmarkable URL, fast back-navigation | `/results`      | `GET /api/search/results/:sessionId`                                                                                          | `client`                 | yes    | planned |
| `/fastaa`       | Curated sequence browser, split by whether experimental data exists                                 | `/fastaa`       | `GET /api/fastaa`                                                                                                             | `isr`                    | yes    | planned |
| `/kinetics`     | Kinetics registry: experimental and ML-predicted kcat/Km, filterable, raw-table download            | `/kinetics`     | `/api/kinetics/published/raw`, committed CSV                                                                                  | `isr`                    | yes    | planned |
| `/halo-assay`   | BHET halo assay explorer: origins map, sequences assayed, activity readout                          | `/halo-assay`   | `/api/gene-details/locations`, `/api/fastaa`, `/api/plate-data/comparison`                                                    | `isr` + `client` map     | yes    | planned |
| `/cath-domains` | Pfam/CATH domain reference: profile selector, structure panel, narrative, figures, references       | `/cath-domains` | committed catalog, `GET /api/atlas/components`                                                                                | `static`                 | yes    | planned |
| `/activity`     | Hub page. Cards to Kinetics, Substrates, Halo Assay. No data of its own                             | `/activity`     | none                                                                                                                          | `static`                 | no     | planned |

### Planned — detail routes

| Route                        | Purpose                                                                            | Replaces                     | Data                                                                                                                                                                   | Rendering                  | Frozen | Status  |
| ---------------------------- | ---------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------ | ------- |
| `/enzyme/:enzymeId`          | Enzyme detail: sequence, taxonomy, family, catalytic domains                       | `/enzyme/:enzymeId`          | `/api/enzymes/:id`, `/api/petadex-domains/:id`                                                                                                                         | `isr` curated + `ssr` rest | tbd    | blocked |
| `/family/:familyId`          | Family detail: members, tree, atlas view, catalytic domains                        | `/family/:familyId`          | `/api/family/:id`, `/members`, `/metadata`, `/tree`                                                                                                                    | `isr` curated + `ssr` rest | yes    | planned |
| `/tree/:familyId`            | Standalone dendrogram with in-tree search. `?highlight=`, `?session=`              | `/tree/:familyId`            | `/api/family/:id/tree`, `/api/search/phylo-tree/:id`, `/api/family/:id/tree-members`                                                                                   | `ssr` + `client` tree      | yes    | planned |
| `/cluster/:level/:clusterId` | Cluster-block landing, the resolver's single-match destination. Level ∈ 90, 60, 30 | `/cluster/:level/:clusterId` | `GET /api/cluster/:level/:clusterId`                                                                                                                                   | `ssr`                      | yes    | planned |
| `/sequence/:accession`       | Curated sequence detail                                                            | `/sequence/:sequenceId`      | `/api/fastaa/:accession`, `/api/gene-metadata/by-accession/:accession`, `/api/gene-details/:accession/header`, `/api/plate-data/gene/:gene/average`, `/api/resolve?q=` | `isr`                      | tbd    | blocked |
| `/sequence/orf/:orfId`       | Corpus sequence page for the 307M ORF set                                          | `/sequence/orf/:orfId`       | `/api/orf/:orfId`, `/api/pdb/accession/:accession`, `/api/cluster/90/:c90Id`                                                                                           | `ssr`                      | tbd    | blocked |

### Under review — disposition not settled

| Route                       | Question                                                                                                                                  | Old path                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `/substrates`               | Polymer reference library, 3D viewer. Content is a ~600-line literal in the page. Name collides with `/substrate`; one is getting renamed | `/substrates`               |
| `/substrate`                | BHET activity comparison across concentrations. Different data from `/substrates`. Same rename question                                   | `/substrate`                |
| `/metadata`                 | Renders the same map from the same endpoint as the origins view of `/halo-assay`. Merge candidate                                         | `/metadata`                 |
| `/protein-viewer-prototype` | Prototype. Kill candidate — needs a global jQuery `ProvidePlugin` for `feature-viewer`                                                    | `/protein-viewer-prototype` |
| `/biosamples`, `/sra/:acc`  | Built only on `feat/denis-bacdive-biosample-means`. Never deployed. Rebuild or drop                                                       | branch only                 |
| `/methodology`              | Built only on `cat-domain-scaffold`. Never deployed. Rebuild or drop                                                                      | branch only                 |

### Not rebuilt — Next handles these natively

| Old route       | Disposition                                                                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/404`          | The Gatsby 404 sniffed `window.location.pathname` for `/sequence/:accession` and rendered the sequence template, so client-only URLs resolved on GitHub Pages. Next renders those routes server-side, so the hack is unnecessary. `app/not-found.tsx` replaces it |
| `/dev-404-page` | Gatsby internal. Never deployed                                                                                                                                                                                                                                   |

---

## Cutover dispositions

Every path below needs a rule in `next.config.ts` at Phase 4. Nothing is added
there until the replacing page actually ships.

### 410 — removed from `main`, may still be live

Deleted from the Gatsby source but possibly deployed at some point, so the URLs
may exist in the wild.

| Path                                           | Removed in | Date       |
| ---------------------------------------------- | ---------- | ---------- |
| `/kinetics-20260722-2`, `/kinetics-20260722-3` | `170b014`  | 2026-07-28 |
| `/trees-prototype`                             | `a66f122`  | 2026-06-13 |
| `/annotated-structure-prototype`               | `4e27e4d`  | 2026-05-29 |
| `/protein`                                     | `3be2989`  | 2025-10-16 |
| `/page-2`, `/using-ssr`, `/using-typescript`   | `a8cf42c`  | 2025-07-08 |

### 301 — moved

Filled in as pages ship and any path changes. Empty so far: every planned route
above keeps its old path.

---

## Blocked

| Blocker                                                                                                                                                                                                                     | Blocks                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Enzyme URL key.** A stable `enzyme_id` exists in `enzyme_fastaa`, but `gatsby-node.js` built URLs from `genbank_accession_id \|\| enzyme_id`. Key on the internal ID                                                      | `/enzyme/:enzymeId`                            |
| **`/sequence/*` namespace.** Three producers write into it — curated static, enzyme static (which silently wins collisions), and the client-only dynamic route. Split it deliberately                                       | `/sequence/:accession`, `/sequence/orf/:orfId` |
| **Accession versioning.** Sequence accessions are external NCBI/UniProt keys carrying version suffixes. Decide whether such a path can be frozen at all                                                                     | `/sequence/*` **Frozen** values                |
| **Substrate schema.** `plastic_kinetics_published` has no primary key, all-text columns, and free-text substrate identity with 31 distinct values. Model substrates as a table with an ID, or drop the substrate URL family | the `/substrate` ÷ `/substrates` rename        |

---

## Notes

- The old site published **no sitemap** — `gatsby-plugin-sitemap` was never
  installed. This file is the route contract until the Next app emits one.
- Counts for reference: the last clean Gatsby build (2026-08-14) produced 22
  hand-authored routes and **zero** generated pages, because all three
  `createPages` fetches failed and the build still exited 0. Full detail in the
  Page Inventory note.
- Old-site static generation truncated at a hardcoded `limit=10000` against 1.05M
  enzymes. That ceiling was accidental. Do not treat it as the target when
  choosing a `generateStaticParams` set.
