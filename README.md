## PETadex.io [Under construction]

PETadex.io is an open‑source platform for exploring plastic‑degrading enzymes. The repository has two‑tiers

```
petadex.io/
├── backend/     - Node/Express API (PostgreSQL – fastaa table)
├── frontend/    - Gatsby static site (served by GitHub Pages)
├── .github/     - Workflows & AI helpers
└── docs/        - OpenAPI spec & misc assets
```

### Local quick start (development server)
#### clone & enter repo
 `git clone https://github.com/ababaian/petadex.io.git && cd petadex.io`

#### backend → http://localhost:3001
``` 
 cd backend && cp .env.example .env  # fill in DB creds
 npm ci && npm run dev
```

#### frontend → http://localhost:8000
```
 <!-- Do the following in new terminal  -->
 cd ../frontend && npm ci
 npm run develop
```

### Production architecture

The backend runs **serverless** on AWS Lambda behind API Gateway (no EC2/NGINX/PM2 — see issue #79 for the EC2→Lambda migration).

```
┌───────────────┐   HTTPS    ┌──────────────┐      ┌─────────────────────┐   5432   ┌───────────────┐
│  GitHub Pages │ petadex.net│  API Gateway │ ───► │  Lambda (in VPC)    │ ───────► │ PostgreSQL RDS│
│  (Gatsby)     │ ─────────► │  (HTTP API)  │      │  petadex-backend    │          │   petadex     │
└──────┬────────┘            └──────────────┘      │  Express via        │ ◀─────── └───────────────┘
       │                                           │  serverless-http    │
       │ atlas (large payload, bypasses API)       └───────┬─────────────┘
       ▼                                                   │ async invoke (Event)
┌──────────────────────────┐                       ┌───────▼──────────────────────┐
│ S3 (petadex bucket)      │ ◀─ atlas/umap.json.gz │ petadex-diamond-orchestrator │
│ public, gzipped, CORS    │                       │ validate · resolve DB version│
│  atlas/   diamond/       │                       └───────┬──────────────────────┘
│  results/ search-phylo-  │                               │ StartExecution
│  trees/                  │        ┌───────────────────────▼────────────────────────┐
└──────────┬───────────────┘        │ Step Functions: petadex-diamond-search         │
           │ shard_i.fa.zst (read)  │   Map (MaxConcurrency 32)                      │
           │◀────────────────────── │     32× petadex-diamond-worker                 │
           │ parts/ + {jobId}.json  │        DIAMOND v2.2.2 blastp · 1 shard each    │
           └───────────────────────▶│   → petadex-diamond-aggregator (merge+enrich)  │
                                    └────────────────────────────────────────────────┘
```

- **GitHub Pages** hosts the static site built from `/frontend`; `GATSBY_API_URL` points at the API Gateway endpoint.
- **API Gateway (HTTP API)** routes every path/method (`/{proxy+}`, `/`) to a single Lambda.
- **Lambda `petadex-backend`** runs the Express app via a serverless handler (`src/handler.js`); VPC-bound (`timeout: 29s`, `memorySize: 512`, DB pool `max: 2`, read-only DB user).
- **PostgreSQL RDS** stores enzyme sequences (`fastaa` table) and related datasets.
- **S3 (`petadex` bucket)** serves the large family-atlas UMAP payload as a gzipped static object (`atlas/umap.json.gz`) — it exceeds Lambda's 6 MB response limit, so it bypasses the API. Regenerate with `cd backend && npm run export-atlas`. The v260701 superfamily atlas used by `/atlas` and the homepage hero (`atlas/v260701/superfamilies.json.gz`, UMAP + t-SNE layouts, from the `superfamily_atlas` materialized view) is regenerated with `npm run export-superfamily-atlas`; family pages and search results still read the legacy family atlas. The bucket also stores the search corpus shards (`diamond/{version}/shard_{i}.fa.zst`), search results (`results/`), and per-family phylogenetic trees (`search-phylo-trees/`).
- **Sequence search** runs as an async, sharded fan-out powered by **DIAMOND v2.2.2** (tag `v2.2.2`, commit `4c026ea`) over the full Logan corpus (**307,155,746** sequences, DB release `v1.1`). The backend never runs the search itself: a `POST /api/search` invokes **`petadex-diamond-orchestrator`** asynchronously (returns `202` + `session_id`), which validates the query, resolves the live DB version from `s3://petadex/diamond/LATEST`, and starts the **`petadex-diamond-search` Step Functions** state machine. A `Map` (MaxConcurrency 32) fans out to **32 `petadex-diamond-worker`** Lambdas — each downloads one zstd-compressed FASTA shard (`shard_{i}.fa.zst`) and runs `diamond blastp` — then **`petadex-diamond-aggregator`** merges, sorts, enriches via RDS, and writes `results/{sessionId}/{jobId}.json` + `results/{sessionId}.index`. The client polls `GET /api/search/results/{sessionId}`. The pipeline is **fail-fast** (any shard failure fails the job) and **search-bound** end-to-end (~40–46 s; zstd shards collapsed per-shard download ~10×, replacing the prior `.dmnd`/MMseqs2 single-Lambda path in the **v2.2.2 cutover, 2026-06-26**).
- **Search result cache** is keyed on the query **plus the corpus + pipeline version** (`md5(sequence:maxResults:databaseVersion:searchVersion)`), so a database rebuild or a search-pipeline change automatically busts stale results instead of serving them; a cache hit (`results/{sessionId}.index` exists) returns the completed payload inline (`200`, `cached: true`) without invoking the orchestrator, and a failed version lookup falls back to a per-request nonce (forced cache miss). See "Search Result Caching (version-aware)" in `CLAUDE.md`. _Ops note: re-keying orphans the old `results/` keyspace — add a `results/`-scoped S3 lifecycle rule (not a blind age) to reap it._

#### CI/CD overview

| Workflow                   | Path                | Purpose                                                                                          |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| **frontend-ci-deploy.yml** | `.github/workflows` | Builds Gatsby from `/frontend`, injects `GATSBY_API_URL`, deploys to GitHub Pages.               |
| **backend-ci-deploy.yml**  | `.github/workflows` | On push to `backend/**`: `npm ci` + `npm test`, then `npx serverless@3 deploy` to AWS Lambda.    |

All sensitive values (DB creds, API URL, AWS keys) live in **GitHub Secrets**.

### Contributing
PETadex community — feel free to open issues & PRs!

1. Fork & branch from `main`.
2. Run `npm run lint` in both sub‑projects.
3. Add or update unit tests (`backend/tests`, `frontend/src/__tests__`).
4. PR → CI must pass.


