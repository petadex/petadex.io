# PETadex web

The Next.js rebuild of petadex.net. Replaces `frontend/` (Gatsby) after cutover;
until then both exist side by side and the Gatsby site stays live.

- **Framework** Next.js 16, App Router, TypeScript
- **Rendering** Node server runtime on Vercel — not a static export
- **Styling** Tailwind CSS v4
- **Data** everything through the Express API. Next never touches Postgres.
- **Auth** none. The database is read-only and public.

`src/app/` is the URL contract. A folder here is a public URL, so adding one is a
commitment.

## Running it locally

Requires Node 24 or newer (`.nvmrc` pins 24; `nvm use` picks it up).

### 1. Start the backend

The web app has no database access of its own, so the API has to be running.

```bash
cd backend
cp .env.example .env      # fill in the RDS credentials
npm ci
npm run dev               # http://localhost:3001
```

Confirm it is up before moving on:

```bash
curl http://localhost:3001/health
# {"status":"ok"}
```

`{"status":"error"}` means the API is running but cannot reach the database —
check the `DB_*` values in `backend/.env`.

You can skip this step and point at the deployed API instead; see
[Running against production data](#running-against-production-data).

### 2. Start the web app

```bash
cd web
cp .env.example .env.local
npm ci
npm run dev               # http://localhost:3000
```

Open http://localhost:3000. The home page shows a **Backend connection** panel:
a green dot means the API answered and the database responded. A red dot prints
the underlying reason — wrong port, backend not started, database unreachable.

`localhost:3000` is already in the backend's CORS allowlist, so no CORS
configuration is needed for local work.

### Running against production data

To develop without a local backend, point `.env.local` at the deployed API:

```bash
NEXT_PUBLIC_API_URL=https://8ww706wo68.execute-api.us-east-1.amazonaws.com/api
```

Restart `npm run dev` afterwards — `NEXT_PUBLIC_*` values are inlined at build
time and are not picked up by hot reload.

Do not use `https://api.petadex.net` yet. Phase 0 flags that hostname as
unresolved: verification found no A or CNAME record, while a build run resolved
it to an IP that timed out.

### Checking a production build

```bash
npm run build
npm run start             # serves the production build on :3000
```

## Scripts

| Command             | Does                                           |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Dev server on :3000                            |
| `npm run build`     | Production build                               |
| `npm run start`     | Serve the production build                     |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run lint`      | ESLint                                         |
| `npm run format`    | Prettier, writes                               |
| `npm run check`     | typecheck + lint + format check — what CI runs |

## Layout

```
src/
├── app/            URL contract. One folder per public route.
│   ├── layout.tsx      root layout, header/footer, root metadata
│   ├── page.tsx        home (scaffold placeholder)
│   ├── error.tsx       route error boundary
│   ├── not-found.tsx   404
│   └── globals.css     Tailwind theme + semantic color tokens
├── components/     shared UI
└── lib/
    ├── env.ts          validated environment, throws on missing values
    ├── seo.ts          buildMetadata() — every page gets one
    └── api/            the only code that calls the backend
        ├── client.ts   apiFetch / apiFetchOrNull, ApiError
        ├── types.ts    hand-written response types
        └── health.ts   dev diagnostic probe
```

## Conventions

**A failed fetch fails the build.** `apiFetch` throws on any non-2xx. This is
load-bearing: Gatsby's `createPages` swallowed fetch errors and logged them, so a
green CI run published a site with zero sequence, enzyme and family pages. Use
`apiFetchOrNull` only where a 404 genuinely means "no such record", feeding
`notFound()`.

**Every page exports metadata** built with `buildMetadata()`. On the old site
`/substrates` and `/tree/:familyId` shipped with none.

**Fetches are uncached by default** in Next 16. Pass `revalidate` on calls whose
data is stable enough to cache.

**Substrate colors** live in `globals.css` as `--color-bhet-*`. Do not redefine
them per component: BHET12.5 `#2E86AB`, BHET25 `#A23B72`, BHET50 `#F18F01`.

## Not done yet

- Vercel project (root directory `web/`, ignore-build-step path filter)
- Test framework — Vitest + Playwright assumed in the CI plan, not chosen
- Typed client generated from OpenAPI. `backend/docs/openapi.yaml` documents 4 of
  ~25 mounted routes, so types are hand-written until the spec is completed.
- Any actual page. Phase 1 must settle the enzyme key, the substrate schema and
  the `/sequence/*` namespace split before routes are committed to.
