# `/search` and `/results` — plan

**Status: planned, not built.** Both routes are `planned` rows in
[ROUTES.md](../ROUTES.md). This file is the contract the page code will be
written against. Change it here first, then in code.

The pages search the **v260701** DIAMOND database
(`petadex_seq_v260701_20261026_202443`, 298,687,346 full-length sequences)
while the live Gatsby site keeps searching `diamond/LATEST` (v1.1) until the
Upcycle cutover.

## Before any page code

These sit outside `web/` and block a working deploy:

1. **Backend CORS.** `backend/src/app.js` allows `petadex-gatsby*.vercel.app`
   but not this project (`petadex-io`). Both pages call the API from the
   browser, so add `/^https:\/\/petadex-io(-[a-z0-9-]+)?\.vercel\.app$/`.
   `localhost:3000` is already allowed.
2. **Backend branch `feat/search-v260701`** reviewed and deployed. It adds
   version pinning, the per-hit fields below, and `resultMetadata()`.
3. **`SEARCH_PINNABLE_VERSIONS`** set on the backend Lambda to the pinned
   version. The search side's pinned re-validation passed on 2026-10-26 (every
   pinned hit a petadex_id, no v1.1 hit one), so this is no longer blocked
   upstream.
4. Optional: `GET /api/search/versions` → `{ latest, pinnable: [...] }`, read
   only, for the deploy check (see [Tests](#tests)).

## URL contract

| Route               | Rendering                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/search`           | `static` shell, `"use client"` form leaf                                                                                        |
| `/results?job=<id>` | `client`. `page.tsx` stays a server component (metadata) and wraps the poller in `<Suspense>`, which `useSearchParams` requires |

`job` takes the three shapes the backend's `jobIdSchema` accepts:

| Shape        | Example                  | Backend resolves it via                                  |
| ------------ | ------------------------ | -------------------------------------------------------- |
| 32-hex MD5   | `a1b2…`                  | `results/{sessionId}.index` → job JSON; can `processing` |
| UUID v4      | `67f51ed3-…`             | the job JSON directly (history, shared links)            |
| Example slug | `regen_example_ispetase` | same as MD5                                              |

- Same paths as Gatsby, so shared links survive cutover. Gatsby's
  `/results/?job=` 308s to `/results?job=` under `trailingSlash: false`, keeping
  the query.
- A `sessionId` is `md5(sequence:database_version:search_version)`, so it is
  **per database**. A v1.1 link opened here shows the v1.1 result, labelled by
  its own `database_release`. It is not re-run.
- No `job`, or a malformed one: redirect to `/search`. A well-formed ID the
  backend 404s: "result not found or expired" state.
- `/results` exports `robots: noindex`. `/search` is indexable.
- **Only the `/search` submit starts a search.** `/results` only reads. A page
  stuck on "processing" means no stored result yet, not a re-run.

## Fetcher — `src/lib/api/search.ts`

Through `apiFetch` with `baseUrl: env.searchApiUrl`, never raw `fetch`. Called
from the browser.

### `submitSearch({ sequence, maxResults })` → `POST /search`

```json
{
  "sequence": "...",
  "max_results": 50,
  "database_version": "petadex_seq_v260701_20261026_202443"
}
```

`database_version` is present only when `env.searchDbVersion` is set.

| Backend answer                                     | Returns                                                | UI                                                        |
| -------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `200 { status: "completed", cached: true, … }`     | `{ kind: "completed", sessionId }`                     | go to `/results?job=`                                     |
| `202 { status: "processing", session_id }`         | `{ kind: "started", sessionId }`                       | go to `/results?job=`                                     |
| `429` / `503 { error, limit, retry_after }`        | `{ kind: "busy", status, limit, retryAfter, message }` | inline message + countdown; submit disabled until it ends |
| `400` sequence validation                          | `{ kind: "invalid", message }`                         | inline under the textarea                                 |
| `400` pinning not enabled / version not searchable | **throws**                                             | `error.tsx` — a deploy misconfiguration, so it is loud    |
| `500`, unreachable                                 | throws                                                 | `error.tsx`                                               |

`apiFetch` throws `ApiError` on any non-2xx with the JSON in `body`;
`search.ts` catches only 400/429/503, parses, and rethrows the rest. Use
`retry_after` from the body (the `Retry-After` header isn't readable from
`ApiError`).

### `getSearchResult(jobId, { maxResults })` → `GET /search/results/:jobId?max_results=`

`processing | completed | failed`, and 404 → `not_found` via `apiFetchOrNull`.
A cache read, never rate limited.

### `useSearchPoll` (client hook)

- First read immediately, then every 3 s; give up after 3 min (Gatsby's
  `POLL_TIMEOUT_SECONDS`; the orchestrator writes a failure sentinel on real
  failures well before that).
- Stops on `completed`, `failed` or `not_found`. Aborts in-flight requests on
  unmount or a `job` change. Pauses while the tab is hidden.
- After completion, changing the row count re-reads the same job with a larger
  `max_results` — a cache hit by construction.

### Types (`src/lib/api/types.ts`)

Mirror the backend's `transformResults()` and `resultMetadata()`. New on
`feat/search-v260701`:

- Hit: `id_format: "petadex_id" | "v1.1"`, `origin: "plasticome" | "ncbi_nr" |
"logan" | null`, `metadata: object | null`, `target_sequence`.
- Result: `engine`, `database_release`, `database_version`, `search_version`,
  `enrichment_status`, and `database_size` (falls back to `db_sequence_count`).

## Version pinning

```
web/    NEXT_PUBLIC_SEARCH_DB_VERSION ─► POST /search { database_version }
                                          │ backend Joi: must be in SEARCH_PINNABLE_VERSIONS, else 400
                                          ▼
backend version lookup for that build ─► orchestrator { action: "version", version }
                                          │ answer must echo it, else per-request nonce (forced miss)
                                          ▼
        orchestrator { action: "search", …, version } ─► resolve_version(version)
Gatsby  (no field) ────────────────────► diamond/LATEST (v1.1)
```

- `src/lib/env.ts` gains optional `searchDbVersion`, read literally from
  `process.env.NEXT_PUBLIC_SEARCH_DB_VERSION`. A non-empty value must match
  `/^[a-z0-9_]+$/` or the build throws.
- Vercel (Preview + Production): set it to
  `petadex_seq_v260701_20261026_202443`. Leave it out of `.env.example` and CI.
- The backend allowlist and this variable must agree. A mismatch is the loud
  400 above.
- **Cutover** flips `diamond/LATEST` to v260701. The cache key uses the version
  the orchestrator resolves, so pinned and unpinned searches for one sequence
  then share a key and a stored result. The pin becomes redundant but harmless.

## Rendering hits

A result can mix ID formats (a worker cache bug did this before 2026-10-26, and
the backend now logs any recurrence), so every decision is **per hit on
`id_format`**, never per result.

|                                 | v260701 `petadex_id` (`LG113721682`)           | v1.1 header (`1\|WP_054022242.1\|\|\|\|\|`) |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| ID cell                         | as-is                                          | GenBank, else `ORF n`, else library         |
| Origin                          | from prefix: PAZy / Plasticome, NCBI nr, Logan | —                                           |
| Link                            | none                                           | none (`/sequence/orf/:orfId` is blocked)    |
| Family / tree                   | hidden                                         | from backend enrichment when present        |
| Profiles (`/annotations/batch`) | skipped: keyed on `orf_id`                     | skipped in v1                               |

- **One link gate.** `hitHref(hit): string | null` in `src/lib/searchHits.ts`
  returns `null` for everything today. It turns on per format as v260701
  sequence pages and `/cluster/:level/:id` ship. No component builds a hit URL
  itself.
- **`metadata` null, `enrichment_status` null** (every v260701 hit until the
  RDS load): one note, "Annotations for this release aren't loaded yet". Hide
  Name / Organism / Family / Component columns that are empty for every row.
- **`enrichment_status: "failed"`**: warn that annotation lookup failed; the
  hits are valid.
- **Header line**: query length, `Release v260701`, DB size, search time. The
  release is always shown.
- **Columns**: rank, ID, origin, identity %, query coverage, e-value, bitscore,
  alignment range, then any metadata columns. Keep the coverage map, CSV/JSON
  download and copy-link from Gatsby.
- `src/lib/targetId.ts` ports `backend/src/lib/targetId.js`. The backend's
  `id_format` / `origin` win when present; the client parser covers results
  stored before that change.

## Metadata views (search_version 1.5.0)

Built on `feat/web-results-metadata`; `/search` is not. Logic in
`src/lib/searchMetadata.ts`, views in `src/components/results/`.

- Rules: data, never judgements (no score, shortlist or verdict; default order
  is search rank). Section title + count badge; no explanatory prose. Every
  value carries an evidence badge (`FIELD_EVIDENCE`, per origin).
- **Relatives**: nr + Logan hits. Filters identity, coverage, origin; sort rank,
  identity, samples, studies, coverage; "One per 90 % cluster" off by default;
  Copy as FASTA.
- **Environments**: `summary.environments` as a dumbbell per profile (this
  search vs a random PETadex Logan sequence, "N× expected"); top 5 as closed
  `<details>` listing Logan hits by `prof_hist` share.
- **Sequence record**: one overview block; Characterized relatives
  (`clusters.c60[c60].pl_members`, else PL hits sharing the c60) open; Logan
  "Found in Samples" closed, an empty slot until the samples lookup exists.
- `enrichment_status`: `ok`/`partial` show metadata (missing hits render —);
  `failed` shows hits plus one line; `unavailable` or `null` hides metadata.
- **Backend dependency**: `resultMetadata()` must pass through
  `metadata_version`, `clusters` and `summary`, which it currently drops.

## Search form

- Validation as Gatsby: `/^[ACDEFGHIKLMNPQRSTVWY\s\n\r*-]+$/i`, 10–10,000
  residues after stripping a FASTA header. A client-side failure never POSTs.
- Example slugs are regenerated by CI on `LATEST`, so they are v1.1 results
  (open question 4).
- History lives in this viewer's `localStorage` (try/catch around every access):
  `{ jobId, sessionId, database_version, topHit, time }`. Don't call
  `GET /api/search/history` without `job_ids`. It lists every stored search.

## Tests

**Vitest**, colocated:

- `search.test.ts`: `database_version` sent only when configured; 200 / 202 /
  429 / 503 / 400 map to the right `kind` with `retryAfter`; the pinning 400
  throws; 500 and unreachable propagate uncaught (the `corpus.test.ts`
  pattern).
- `targetId.test.ts`: `PL1`, `NR223`, `LG113721682`, both pipe forms, bare
  `WP_…`, and `NRX1` (not a petadex_id).
- `searchHits.test.ts`: `hitHref` null for every format; empty-column hiding.
- `useSearchPoll.test.ts` (fake timers): stops on each terminal state, times
  out at 3 min, aborts on unmount, never calls `submitSearch`.
- `env.test.ts`: a malformed `NEXT_PUBLIC_SEARCH_DB_VERSION` throws.

**Playwright** — `e2e/search.spec.ts`, `e2e/results.spec.ts`: 200 + content,
axe, no console errors, SEO tags (`noindex` on `/results`), link integrity (no
hit links to `/sequence/LG…`, `/sequence/NR…`, `/sequence/PL…`).

Fixtures in `e2e/fixtures/search/`, trimmed to 50 hits:

- `v260701-ispetase.json` — clean, all petadex_id, `metadata` null
  (`s3://petadex/results/validate-pin-IsPETase-c4ce3754/…`).
- `v260701-mixed.json` — some v1.1 pipe IDs in a v260701 result
  (`validate-pin-SRR10663367-263abae3/…`, pre-fix).
- `v1.1-ispetase.json` — `regen_example_ispetase`.
- Synthetic `processing`, `failed`, `enrichment_status: "failed"`.

`e2e/mock-api-server.mjs` gains:

- `POST /api/search`: sentinel sequences pick the outcome (cached, 202, 429 with
  `retry_after: 5`, 503, 400). Records the last body so a test can assert
  `database_version`.
- `GET /api/search/results/:id`: fixture by ID; one ID returns `processing`
  twice, then completes.

Scenarios: submit → results URL; processing completes; busy countdown
re-enables submit; v260701 result shows origins, release label, no hit links;
mixed result renders both formats; not-found and missing `job` redirect; row
count re-reads the same job.

**Deploy check** (`web-deploy-check.yml`, real backend) runs **no searches**:
render `/search`, render `/results?job=regen_example_ispetase`, and — if
`GET /api/search/versions` exists — assert the configured pin is in
`pinnable`. A POST probe can't check the pin: Joi stops at the first invalid
key, before `database_version`.

## Open questions

1. After cutover: drop `NEXT_PUBLIC_SEARCH_DB_VERSION`, or keep an explicit pin
   per release so a later `LATEST` flip can't change this site silently?
2. Busy: manual retry after the countdown (proposed), or one automatic retry?
3. v1.1 hits: no link (proposed), or link out to the legacy petadex.net page
   until cutover?
4. Examples: v260701 slugs (e.g. `regen_example_ispetase_v260701`, generated by
   the same CI job with the pin), or none until cutover?
5. Row count in the URL (`&n=100`) for shared links, or UI state only as in
   Gatsby?
6. Restrict `GET /api/search/history` to `job_ids` only (backend change), since
   unfiltered it lists everyone's searches?
7. Ship on Vercel previews once the blockers clear, or hold until the v260701
   RDS load so Tier A metadata exists at first view?
