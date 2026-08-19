# Literature citation network (prototype)

Technical contract for the PAZy-first literature graph (`/papers`, `/paper/:doi`).

## Schema (`plastic_degradation_literature`)

| Column | Type | Role |
|--------|------|------|
| `doi` | text | Primary key / node id |
| `paper_title` | text | Title |
| `authors` | text[] | Ordered author list |
| `date_published` | date (ISO-8601) | Chronological y-axis |
| `paper_summary` | text | Brief overview (popup + detail). Fixture uses `[PENDING SUMMARY]` until real summaries land |
| `citations_in_dataset` | text[] | DOIs cited that are also in this set → edges |
| `plastics_studied` | text[] | Color = **first** entry; popup lists all |
| `proteins_studied_count` | integer | Node size |

## Data source (prototype)

| Path | Role |
|------|------|
| `backend/data/literature_pazy_fixture.json` | Default fixture (PAZy-shaped rows) |
| `LITERATURE_PATH` | Optional override to another JSON file |

Soft-fail: missing file → empty `papers`, `status.status = unavailable`.

## API

Base: `/api/literature`

| Method | Path | Response |
|--------|------|----------|
| GET | `/` | `{ papers, status }` |
| GET | `/status` | Load meta (`n_papers`, `source`, …) |
| GET | `/item/:doiEncoded` | `{ paper, outgoing_citations }` — DOI via `encodeURIComponent` |

## Frontend

| Route | File |
|-------|------|
| `/papers` | `frontend/src/pages/papers.js` + `LiteratureNetwork.jsx` |
| `/paper/:doi` | `frontend/src/pages/paper/[doi].js` — DOI path uses `/` → `~` (see `doiPath.js`) |

Plot behavior:

- Y = publication year (older at top)
- X = single stream (no plastic columns)
- Color = first of `plastics_studied`
- Size = `proteins_studied_count` (count labeled on node)
- Edges = `citations_in_dataset`
- Hover / click: info panel without citation list; click highlights incident edges; “Go to paper” → detail
- Legend sits below the plot (not overlaid)

Not in SiteHeader yet.

## Swap to Adi’s table later

Replace fixture load in `literatureCache.js` with Postgres reads of
`plastic_degradation_literature` (same column names). Keep the JSON API shape
so the plot/detail pages stay unchanged.
