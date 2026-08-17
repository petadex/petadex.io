# Contributing to PETadex.io

PETadex is a public, read-only database of plastic-degrading enzymes. No auth, no
user data, no write path. A contribution is either a page that renders data or an
endpoint that returns it.

The repo is mid-rebuild — which tree you're in decides which rules apply.

## Where things live

| Tree        | Status               | Changes                                           |
| ----------- | -------------------- | ------------------------------------------------- |
| `web/`      | Under construction   | Yes — new frontend work goes here                 |
| `backend/`  | In production        | Yes — both sites depend on it                     |
| `frontend/` | Live, being replaced | **Breakage fixes only.** No new pages or features |

`frontend/` (Gatsby) is deleted after cutover; anything built there now is
thrown away. A feature belongs in `web/` even if the page it's for hasn't been
rebuilt yet — say so in the issue.

**`web/src/app/` is the URL contract.** A folder there is a public URL, and a
public URL on a scientific database gets cited in papers. Adding one is a
commitment — see [Adding a page](#adding-a-page-web).

## Ground rules

Each of these exists because the old site broke exactly this way. Reviews block
on them.

1. **A failed data fetch fails the build.** Gatsby's `createPages` logged and
   swallowed fetch errors; a green build once published a site with zero
   sequence, enzyme, and family pages. `apiFetch` throws on any non-2xx and
   nothing catches it by default. Use `apiFetchOrNull` only where a 404 means
   "no such record," feeding `notFound()` — never to render an empty state.
2. **Every page exports metadata** via `buildMetadata()` (`@/lib/seo`).
   `/substrates` and `/tree/:familyId` shipped with none on the old site.
3. **Missing config fails at startup, loudly.** `web/src/lib/env.ts` validates
   at module scope and names the missing variable. Don't read `process.env`
   anywhere else — a bare `process.env.NEXT_PUBLIC_X` silently inlines
   `undefined` instead.
4. **Next never touches Postgres.** All data goes through the Express API. No
   `pg`, no connection string in `web/`. Missing data means the endpoint comes
   first.
5. **Confirm the relation exists before mounting a route.**
   `/api/aa-seq-features` 500'd in production because `aa_seq_features` doesn't
   exist. Check with `psql` first, and handle `42P01` explicitly (see
   [Adding a backend endpoint](#adding-a-backend-endpoint-backend)).

## Setup

Node 24+ (`web/.nvmrc` pins it). npm, with `package-lock.json` committed in both
trees.

```bash
# backend
cd backend && cp .env.example .env   # fill in RDS credentials
npm ci && npm run dev                # :3001
curl http://localhost:3001/health    # {"status":"ok"}

# web
cd web && cp .env.example .env.local
npm ci && npm run dev                # :3000
```

The home page shows a **Backend connection** panel — green means the API and
database both answered; red prints why. `localhost:3000` is already
CORS-allowed.

To skip the local backend, point `.env.local` at the deployed API
(`NEXT_PUBLIC_API_URL=https://8ww706wo68.execute-api.us-east-1.amazonaws.com/api`)
and restart the dev server — `NEXT_PUBLIC_*` is inlined at build, not
hot-reloaded. Don't use `https://api.petadex.net` yet; that hostname is
unresolved.

Before pushing: `cd web && npm run check` (typecheck + lint + format).

## Workflow

- **Branch** off `main` as `<kind>/<scope>-<what>` (e.g.
  `feat/web-enzyme-detail-page`). For `web/` work, branch off `rebuild/next-web`
  instead — it's the Vercel production branch until the rebuild merges to
  `main`.
- **Commit** as `<type>: <imperative summary>` (`feat:`, `fix:`, `chore:`,
  `docs:`), one logical change per commit. When deleting or unmounting
  something, say what evidence justified it — see `backend/src/app.js` for the
  pattern.
- **PRs** state what changed and why, link the [route ledger](web/ROUTES.md)
  row for a page or a `curl` transcript for an endpoint, and note anything
  found broken along the way (file an issue, don't fix it in the same PR).
  Vercel previews and GitHub Actions checks must both pass.

## Adding a page (`web/`)

1. **Claim the route.** Add a row to [`web/ROUTES.md`](web/ROUTES.md) _before_
   writing code — Route, Purpose, Replaces, Data, Rendering, Frozen, Status.
   The Replaces column is how the cutover redirect map gets assembled: a
   frozen old path needs a 301 at cutover, a retired one needs a 410. No
   silent 404s.
2. **Type the response** in `web/src/lib/api/types.ts`, field names exactly as
   the API returns them (`fastaa.aa_sequence` comes back as `sequence` — the
   type says `sequence`, not the schema's name).
3. **Add a fetcher** in `web/src/lib/api/`, re-exported from `index.ts`.
   Nothing outside that folder calls `fetch` against the backend:

   ```ts
   // web/src/lib/api/enzymes.ts
   import { apiFetchOrNull } from "./client";
   import type { Enzyme } from "./types";

   /** GET /api/enzymes/:id — null when no such enzyme exists. */
   export function getEnzyme(id: number) {
     return apiFetchOrNull<Enzyme>(`/enzymes/${id}`, { revalidate: 3600 });
   }
   ```

   Fetches are uncached by default — pass `revalidate` (seconds) for stable
   data, `tags` for on-demand invalidation. Only pass `timeoutMs` when one call
   needs a tighter bound than API Gateway's 29s; it opts the request out of
   per-render memoization.

4. **Write the page** as an async server component:

   ```tsx
   // web/src/app/enzyme/[enzymeId]/page.tsx
   import { notFound } from "next/navigation";
   import { getEnzyme } from "@/lib/api";
   import { buildMetadata } from "@/lib/seo";

   export async function generateMetadata({
     params,
   }: PageProps<"/enzyme/[enzymeId]">) {
     const { enzymeId } = await params;
     const enzyme = await getEnzyme(Number(enzymeId));
     if (!enzyme) notFound();
     return buildMetadata({
       title: enzyme.genbank_accession_id ?? `Enzyme ${enzyme.enzyme_id}`,
       description: `Sequence, taxonomy and family for enzyme ${enzyme.enzyme_id}.`,
       path: `/enzyme/${enzymeId}`,
     });
   }

   export default async function EnzymePage({
     params,
   }: PageProps<"/enzyme/[enzymeId]">) {
     const { enzymeId } = await params;
     const enzyme = await getEnzyme(Number(enzymeId));
     if (!enzyme) notFound();
     return (
       <article className="mx-auto max-w-6xl px-6 py-12">{/* … */}</article>
     );
   }
   ```

   Use the generated `PageProps<"/route">` / `LayoutProps<"/route">` types
   (from `next typegen`) rather than hand-writing them. `params` is a Promise.
   Calling the same fetcher from `generateMetadata` and the body is fine —
   Next memoizes it per render.

5. **Pick a rendering mode deliberately:**

   | Mode     | Use when                                                | How                                                         |
   | -------- | ------------------------------------------------------- | ----------------------------------------------------------- |
   | `static` | Committed content, no per-request data                  | Default                                                     |
   | `isr`    | API data, stable, bounded key space                     | `revalidate` + `generateStaticParams` for the prebuilt set  |
   | `ssr`    | Unbounded key space, or must reflect live state         | `export const dynamic = "force-dynamic"`                    |
   | `client` | Polling or heavy interactivity (search, atlas, viewers) | `"use client"` leaf component under a server-component page |

   Cutoff: prebuild curated sets, render the 307M-row ORF pages on demand.
   (The old site's static `limit=10000` against 1.05M enzymes was accidental —
   don't treat it as a target.)

6. **Keep `"use client"` at the leaves.** MapLibre, Mol\*, deck.gl, Recharts,
   and the search poller are browser-only. Put the directive on the smallest
   component that needs it and pass data down as props; on a page file it
   client-renders the whole subtree and loses streaming and metadata.

7. **Add `loading.tsx` / `error.tsx`** beside the page where the defaults
   (`src/app/error.tsx`, `not-found.tsx`) aren't specific enough.

8. **Finish:** `npm run check`, then flip the ledger row to `shipped`.

## Adding a backend endpoint (`backend/`)

ES modules (`import`/`export`, never `require`).

1. **Confirm the relation exists:** `psql "$DATABASE_URL" -c "\d your_table"`.
   If it doesn't, the route doesn't get mounted yet.
2. **Write the route**, one file per resource in `backend/src/routes/`:

   ```js
   import { Router } from "express";
   import Joi from "joi";
   import { pool } from "../db.js";

   const router = Router();
   const accessionSchema = Joi.string().max(64).required();

   /** GET /api/thing/:accession — one line on what this returns and from where. */
   router.get("/:accession", async (req, res, next) => {
     const { error, value } = accessionSchema.validate(req.params.accession);
     if (error) return res.status(400).json({ error: error.message });

     try {
       const { rows } = await pool.query(
         "SELECT * FROM thing WHERE accession = $1",
         [value],
       );
       if (!rows.length) return res.status(404).json({ error: "Not found" });
       res.json(rows[0]);
     } catch (err) {
       if (err.code === "42P01") {
         return res
           .status(503)
           .json({ error: "Backing object is unavailable", object: "thing" });
       }
       next(err);
     }
   });

   export default router;
   ```

   Joi-validate every parameter (`max(64)` for identifiers). Parameterised
   queries only — where the table name itself varies, pull it from a fixed
   lookup keyed by a validated enum (see `routes/cluster.js`). `42P01` → 503,
   not 500: "matview not rebuilt yet" is a different fact from "server broken."
   Everything else → `next(err)`. Give the file a header comment on what it
   backs and depends on, like the rest of the tree.

3. **Mount it** in `backend/src/app.js`. If you ever unmount a route, leave the
   evidence in a comment at the mount site (`aaSeqFeatures` is the model).
4. **Respect Lambda's constraints:** 6 MB response cap (bigger payloads go to
   S3, see the atlas export), 29s timeout (Express already peaks at 28.1s), DB
   pool max 2 (use `pool` from `db.js`, don't open your own client), SELECT-only
   DB user. Paginate list endpoints with `limit`/`offset` — an unbounded scan
   over a 307M-row table hits the timeout, it doesn't just return slowly.
5. **CORS:** the allowlist in `app.js` is explicit; add an origin only if this
   project owns that domain (`petadex.org` was removed for exactly the reverse
   reason).
6. **Document it:** add the path to `backend/docs/openapi.yaml` (currently
   covers 4 of ~25 routes — this is why `web/src/lib/api/types.ts` is
   hand-written instead of generated), add it to `CLAUDE.md`'s endpoint list,
   and add the response type to `web/src/lib/api/types.ts` once a page needs it.

## Conventions

**TypeScript/React** — Prettier (no semicolons, double quotes, `arrowParens:
"avoid"`, Tailwind class sorting); `eslint-config-next`; `@/` → `web/src/`; no
`any`, no non-null `!` on API data; server components by default,
`"use client"` at leaves only; components `PascalCase.tsx`, `lib/`
`camelCase.ts`.

**Styling** — Tailwind v4, configured in CSS (`globals.css`, no
`tailwind.config.js`). Use the semantic tokens (`bg-background`, `bg-surface`,
`text-foreground`, `text-muted`, `border-border`, `text-accent`), not raw
values. Dark mode follows `data-theme` on `<html>`, OS as fallback (toggle not
wired yet). Domain colors are canonical `@theme` tokens — don't redefine them
per component:

| Token               | Value     | Meaning      |
| ------------------- | --------- | ------------ |
| `--color-bhet-125`  | `#2E86AB` | BHET 12.5 mM |
| `--color-bhet-25`   | `#A23B72` | BHET 25 mM   |
| `--color-bhet-50`   | `#F18F01` | BHET 50 mM   |
| `--color-bacteria`  | `#4ECDC4` | Bacteria     |
| `--color-archaea`   | `#FF6B6B` | Archaea      |
| `--color-eukaryota` | `#FFD93D` | Eukaryota    |
| `--color-viruses`   | `#B482FF` | Viruses      |

These match published figures — they're data encoding, not decoration.
Accessions, sequences, and gene IDs get `font-mono` + the `.tabular` utility.

**JavaScript (`backend/`)** — matches what's there: ES modules, semicolons,
single quotes, 2-space indent. No enforced formatter; follow the surrounding
file.

## CI

Vercel owns builds and previews; GitHub Actions owns checks — so a failing
check reads as "code is broken," not "the site didn't ship."

| Workflow                 | Trigger                              | Runs                                    |
| ------------------------ | ------------------------------------ | --------------------------------------- |
| `web-ci.yml`             | PR/push touching `web/**`            | typecheck, lint, format check, build    |
| `backend-ci-deploy.yml`  | push to `main` touching `backend/**` | `npm ci`, `npm test`, serverless deploy |
| `frontend-ci-deploy.yml` | push to `main`                       | Gatsby build → GitHub Pages             |
| Vercel                   | push to `rebuild/next-web`, PRs      | Next build + preview deploy             |

**No test framework is chosen yet** (Vitest + Playwright assumed, not
decided), so no test is required today — attach a `curl` transcript or
screenshot instead. This section gets updated once that lands.

## Decided vs. open

Framework, language, rendering mode, hosting, auth, styling, package manager,
Node version, and the `web/` directory are locked — see `CLAUDE.md` and the
Rebuild Plan rather than relitigating in a PR. Still open and worth checking
before you build on top of them: the enzyme URL key, the `/sequence/*`
namespace split, the substrate schema, and the `/substrate` vs. `/substrates`
naming collision — all tracked in [`web/ROUTES.md`](web/ROUTES.md#blocked).

## Reporting a problem

Open an issue. For data problems, include the accession/gene/family ID and the
endpoint called. For site problems, include the URL and whether it fails on a
hard load.

## Licence

See [LICENSE](LICENSE). Contributions are licensed the same way.
