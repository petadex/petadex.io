# PETadex Organism Atlas - apply-ready PR package

This is an **apply-ready change set** for `petadex/petadex.io`, not a standalone
application. It contains every target-repository file that changes for the
Organism Atlas; it relies on the target repository's existing Express app,
PostgreSQL connection module, Gatsby layout, and dependencies. No new AWS
resources or npm packages are required.

### Apply preflight

Apply this folder only to the current `petadex/petadex.io` repository. Before
copying the replacements, confirm the target still has:

- `backend/src/handler.js` exporting the Serverless handler;
- `backend/package.json` with Express, `pg`, `cors`, `compression`,
  `serverless-http`, and `yamljs`;
- `frontend/src/config.js`, which supplies `GATSBY_API_URL`;
- the existing database connection configuration (`DB_HOST`, `DB_PORT`,
  `DB_NAME`, `DB_USER`, `DB_PASS`).

Those unmodified target files are deliberately not duplicated here. This keeps
the package a focused PR change set instead of an unsafe replacement repository.

## View the site locally

Apply this package to a checkout of the target repository, then run the existing
backend and Gatsby frontend:

```bash
# From the parent directory containing both repositories
cp -R petadex-atlas-pr/backend/. petadex.io/backend/
cp -R petadex-atlas-pr/frontend/. petadex.io/frontend/

cd petadex.io/backend
npm ci
npm test                         # verifies the Atlas API contract
cp .env.example .env             # add the existing PostgreSQL settings
npm run dev                      # API on http://localhost:3001
```

In a second terminal:

```bash
cd petadex.io/frontend
npm ci
cp .env.development.example .env.development
npm run develop                  # Gatsby on http://localhost:8000
```

Open **http://localhost:8000/organisms**. The page uses the target repository's
existing Gatsby layout, theme context, images, and dependencies. The backend
must be connected to a database containing the `organisms` and
`organism_entries` tables for the stats, list, and detail drawer to display
data. The source-only UI can be reviewed directly at
`frontend/src/pages/organisms.js`.

---

## Files and where they go

| File in this folder | Copy to repo at… | Action |
|---|---|---|
| `backend/src/routes/organisms.js` | `backend/src/routes/organisms.js` | **Replace** existing route |
| `backend/src/app.js` | `backend/src/app.js` | **Replace** (adds `.io` CORS origins and route mount) |
| `backend/migrations/003_organisms_protparam.sql` | `backend/migrations/003_organisms_protparam.sql` | **New follow-on migration, run once** |
| `backend/scripts/migrate-organisms.js` | `backend/scripts/migrate-organisms.js` | **Replace** loader with staged, validated atomic reload |
| `backend/serverless.yml` | `backend/serverless.yml` | **Replace** (adds HTTP API CORS policy; preserves existing VPC/IAM settings) |
| `backend/docs/openapi.yaml` | `backend/docs/openapi.yaml` | **Replace** (retains existing documented routes and adds organism contract) |
| `backend/src/routes/__tests__/organisms.test.js` | `backend/src/routes/__tests__/organisms.test.js` | **Replace** tests for the new API contract |
| `frontend/src/pages/organisms.js` | `frontend/src/pages/organisms.js` | **New file** |
| `frontend/src/components/SiteHeader.js` | `frontend/src/components/SiteHeader.js` | **Replace** existing file |

---

## Step 1 - production schema

The target repository's existing migration 002 and the organism data are
already present in RDS. They are intentionally **not** duplicated in this PR
package, and must not be re-run as a data-reset mechanism. Before deploying
this package, run the small, idempotent follow-on migration once so the `pp`
column can retain the ProtParam JSON arrays that the drawer displays:

```bash
psql "$DATABASE_URL" -f backend/migrations/003_organisms_protparam.sql
```

The loader reloads only when explicitly run with current CSV exports. It stages
both files, checks that every PlasticDB entry still maps to exactly one organism
name, and swaps both live tables in a single transaction. The exclusive-lock
window is limited to the final table replacement; it also checks that live row
counts match the validated staging tables before committing. Schedule a reload
during a maintenance window. It intentionally preserves the existing name-based
relationship instead of introducing a breaking foreign-key redesign.

---

## Step 2 - Set Lambda environment variables

In the AWS console → Lambda → `petadex-backend` → Configuration → Environment variables,
add (or confirm these exist):

| Key | Value |
|---|---|
| `DB_HOST` | `petadex.c6dcs4m8a2uy.us-east-1.rds.amazonaws.com` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `petadex` |
| `DB_USER` | `petadex` |
| `DB_PASS` | *(your RDS password)* |

`serverless.yml` already forwards all five vars to Lambda. No changes are needed there.

---

## Step 3 - Deploy

The repository's current GitHub workflow deploys the existing **`dev`**
Serverless stage. Before deploying, confirm that the production API custom
domain is mapped to that stage; do not assume `api.petadex.net` points at a new
stage merely because a deploy succeeded. Keep manual deployment aligned with
the mapped stage unless the target repository's custom-domain configuration is
deliberately changed:

```bash
cd backend
npx serverless@3 deploy --stage dev
```

After deployment, verify the live mapping and CORS response from the public
frontend origin:

```bash
curl -i -H 'Origin: https://petadex.io' \
  'https://api.petadex.net/api/organisms/stats'
```

---

## Step 4 - Verify backend

```bash
# Stats bar data
curl "https://api.petadex.net/api/organisms/stats"

# Organism list (page 1, Confirmed tier)
curl "https://api.petadex.net/api/organisms?tier=confirmed&page=1&per_page=50"

# Phylum breakdown (for chart at bottom of page)
curl "https://api.petadex.net/api/organisms/phylum"

# Atlas drawer detail (by organism name)
curl "https://api.petadex.net/api/organisms/by-name/Pseudomonas%20aeruginosa"

# Existing programmatic detail endpoint (by NCBI TaxID)
curl "https://api.petadex.net/api/organisms/287"
```

---

## Step 5 - Build and deploy frontend

```bash
cd frontend
GATSBY_API_URL=https://api.petadex.net/api gatsby build
# then deploy /public as usual (gh-pages or S3)
```

The new Organisms Atlas is at `/organisms` on the site.

---

## API reference

### `GET /api/organisms/stats`

Returns the 11 aggregated counts available to the Atlas. The current stats bar
displays eight of them and retains the other three for API consumers.

```json
{
  "total_organisms": 2902229,
  "bioplastic_active": 1098,
  "genome_count": 673,
  "bacdive_count": 474,
  "total_entries": 2535,
  "unique_plastics": 70,
  "unique_genera": 132252,
  "sra_count": 4821,
  "confirmed_count": 874,
  "predicted_count": 1098,
  "listed_count": 2900257
}
```

### `GET /api/organisms`

| Param | Default | Description |
|---|---|---|
| `page` | 1 | 1-based page number |
| `per_page` | 50 | Rows per page (max 200) |
| `q` | none | Case-insensitive search on organism name, genus, phylum, or listed plastic |
| `phylum` | none | Exact phylum name (existing programmatic API compatibility) |
| `filter` | none | `bioplastic`, `conventional`, `genome`, `bacdive`, `sra`, `thermo`, `rt` |
| `tier` | none | `confirmed`, `predicted`, `listed` |
| `sort` | `name` | `name`, `novelty`, `sra`, `pubmed`, `entries`, `year` |

For existing programmatic clients, `pageSize` remains accepted as an alias for
`per_page` (with its historical maximum of 500), and `sort=taxid` and
`sort=tier` remain available.

Response shape:
```json
{
  "total": 2902229,
  "page": 1,
  "per_page": 50,
  "pages": 58045,
  "organisms": [{ "name": "...", "plastics": ["PET"], ... }]
}
```

### `GET /api/organisms/phylum`

Returns confirmed-organism counts by phylum for the breakdown chart.

```json
{ "phyla": [{ "phylum": "Proteobacteria", "count": 312 }, ...] }
```

### `GET /api/organisms/by-name/:name`

Full organism detail by name (URL-encoded). Returns all 69 columns plus the
joined `entries` array from `organism_entries`.

### `GET /api/organisms/:taxid`

Existing compatibility endpoint for programmatic consumers. It accepts a
positive NCBI TaxID and returns the same enriched profile, including both
canonical entry fields (`plastic`, `year`, `has_seq`) and the compact fields
used by the drawer (`pl`, `yr`, `seq`).

```json
{
  "name": "Pseudomonas aeruginosa",
  "tax_id": "287",
  "confidence_tier": "Confirmed",
  "plastics": ["PET", "LDPE", "PHB"],
  "ch_pl_labels": ["LDPE", "PHB", ...],
  "ch_pl_values": [8, 6, ...],
  "entries": [{ "pl": "PET", "yr": 2016, "enz": "IsPETase", ... }],
  ...
}
```

---

## What the Gatsby page covers (`frontend/src/pages/organisms.js`)

Every feature visible on the Replit Organism Atlas:

| Feature | Covered |
|---|---|
| Stats bar: 8 metrics (Total, Confirmed, Predicted, Listed, Genera, Genomes, BacDive, Plastics) | Yes |
| Search (organism / genus / phylum) with 300ms debounce | Yes |
| Filter pills: All, Bioplastic, Conventional, Has genome, In BacDive | Yes |
| Tier pills: All tiers, Confirmed, Predicted, Listed | Yes |
| Sort select: Name, Novelty, SRA runs, PubMed, Entries, First year | Yes |
| Result count and fetching indicator | Yes |
| Table: 11 columns: Organism, Genus, Phylum, Plastics, #Types, 1st Year, SRA, PubMed, Genome, BacDive, Novelty | Yes |
| Plastic pills (bioplastic = green, conventional = blue) | Yes |
| Tier badge on each row (Confirmed / Predicted / Listed) | Yes |
| Novelty score coloured by threshold (at least 70 green, at least 40 amber, below 40 red) | Yes |
| Genome accession chip | Yes |
| Pagination with Previous/Next and page-jump input | Yes |
| Phylum breakdown collapsible chart (top 16 confirmed phyla) | Yes |
| Organism detail drawer, opened by clicking any row | Yes |
| Drawer: Summary (bio/conv counts, Seq/Enzyme/GenBank badges, isolation envs/locs, all plastic pills) | Yes |
| Drawer: Genome (size, level, accession link, N50, coverage, NCBI Tax ID) | Yes |
| Drawer: BacDive physiology (temp, pH, oxygen, morphology, isolation source) | Yes |
| Drawer: Research Overview, 4 Recharts (Plastics studied bar, Publications by year bar, Evidence methods bar, Enzyme families donut) | Yes |
| Drawer: Novelty score with 4 sub-score progress bars | Yes |
| Drawer: PlasticDB entries table (plastic, year, enzyme, family, seq, GenBank, env, loc, DOI link) | Yes |
| Drawer: Temperature profile (Thermophile / Room-temperature active / Mesophile) | Yes |
| Drawer: PubMed counts and search link | Yes |
| Drawer: ProtParam table (length, MW, pI, instability, GRAVY, stability) | Yes |
| Drawer: SRA (run count, bases, date range, platforms, strategies) | Yes |
| "Organisms" nav link added to site header | Yes |
| URL state: q, filter, tier, sort, page, org all in query string | Yes |
| Skeleton loading states on table and stats bar | Yes |
