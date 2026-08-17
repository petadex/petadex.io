# `/backend` – Express API

The backend is a lightweight **Node18 / Express 4** service exposing a REST API to the `fastaa` table in the `petadex` PostgreSQL database.

---

## Folder structure

```
backend/
├── src/
│   ├── app.js            # Express app (exported)
│   ├── index.js          # Local runner (node src/index.js)
│   ├── db.js             # pg connection pool
│   ├── routes/
│   │   └── fastaa.js     # /api/fastaa routes
│   └── docs/openapi.yaml # OpenAPI 3 spec (served at /docs)
├── tests/                # Jest integration tests
├── .env.example          # sample environment vars
└── package.json          # scripts & deps
```

---

## Environment variables

| Variable  | Description                                                       |
| --------- | ----------------------------------------------------------------- |
| `DB_HOST` | RDS endpoint (e.g. `petadex.xxxxxxx.us-east-1.rds.amazonaws.com`) |
| `DB_PORT` | 5432                                                              |
| `DB_NAME` | **petadex**                                                       |
| `DB_USER` | RDS username                                                      |
| `DB_PASS` | RDS password                                                      |
| `DB_PORT` | Local listen port (default `3001`)                                |

---

## Scripts

```bash
# install deps
npm ci

# dev mode w/ nodemon
npm run dev

# production mode locally
npm start

# lint & test
npm run lint
npm test

# create enviornmental variable
# and populate the file (values on AWS Secrets)
cp .env.example .env
```

---


## API endpoints

| Method | Path                              | Description                                        |
| ------ | --------------------------------- | -------------------------------------------------- |
| GET    | `/api/fastaa`                     | list all sequences                                 |
| GET    | `/api/fastaa/:accession`          | fetch a single sequence                            |
| POST   | `/api/fastaa`                     | insert (JSON body: `{ accession, sequence }`)      |
| GET    | `/api/enzymes`                    | list enzymes (filterable by family/component)      |
| GET    | `/api/enzymes/:enzyme_id`         | fetch a single enzyme by ID                        |
| GET    | `/api/enzymes/accession/:acc`     | fetch a single enzyme by GenBank accession         |
| GET    | `/api/enzymes/:enzyme_id/variants`| list all variants for an enzyme centroid           |
| GET    | `/api/enzymes/family/:family_id`  | list all enzymes in a family                       |
| GET    | `/api/enzymes/component/:id`      | list all enzymes in a component                    |
| GET    | `/api/enzymes/stats/overview`     | database-wide counts (see below)                   |
| GET    | `/api/enzymes/families/summary`   | paginated family list with variant/component stats |
| GET    | `/api/enzymes/search`             | unified search across families, enzymes, variants  |

### `GET /api/enzymes/stats/overview`

Returns aggregate counts used by the homepage stats banner. All four values are computed in a single query across three tables:

| Field              | Source                                      |
| ------------------ | ------------------------------------------- |
| `total_families`   | `COUNT(DISTINCT family)` in `enzyme_taxonomy`    |
| `total_enzymes`    | `COUNT(DISTINCT enzyme_id)` in `enzyme_fastaa`   |
| `total_components` | `COUNT(DISTINCT component)` in `enzyme_taxonomy` |
| `total_variants`   | `COUNT(DISTINCT variant_id)` in `variant_dictionary` |

```json
{
  "total_enzymes": 1048585,
  "total_families": 64730,
  "total_components": 42,
  "total_variants": 2735959
}
```

See interactive docs at `` (Swagger UI).

---

## Deployment summary

The backend is serverless. There is no server to SSH into, no PM2 process and no
NGINX proxy — the EC2→Lambda migration removed all three.

1. A push to `main` touching `backend/**` triggers **backend-ci-deploy.yml**.
2. The workflow runs `npm ci && npm test`, then `npx serverless@3 deploy`.
3. API Gateway (HTTP API) routes `/{proxy+}` and `/` to the `petadex-backend`
   Lambda, which wraps this Express app via `src/handler.js`.
4. The Lambda is VPC-bound so it can reach RDS. AWS credentials and DB settings
   come from GitHub Secrets.


## Check for bottlenecks in DB

-- Slow queries currently running
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start IS NOT NULL
ORDER BY duration DESC;

-- Tables doing the most sequential scans (index candidates)
SELECT relname, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
ORDER BY seq_scan DESC
LIMIT 20;

-- Existing indexes that are never used
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
