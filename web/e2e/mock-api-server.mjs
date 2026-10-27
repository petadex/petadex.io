import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

/**
 * Stand-in for the Express API, used only by the local ("mocked") E2E run.
 *
 * page.tsx fetches /resolve/summary server-side during render (SSR/ISR, not
 * from the browser), so Playwright's page.route() cannot intercept it -- that
 * only sees requests the browser itself makes. Without something answering
 * this port, `next build` fails outright (apiFetch throws ApiUnreachableError
 * and the prerender of "/" aborts the build), which is the intended behavior
 * per lib/api/corpus.ts's "a failed fetch fails the build" contract -- it
 * just means CI needs a real, if fake, backend to build against.
 *
 * Serves the one route "/" depends on at render time, plus the search-result
 * reads /results makes from the browser (fixtures in fixtures/search/).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(
  path.join(__dirname, "fixtures", "corpus-summary.json")
)
const enriched = JSON.parse(
  readFileSync(
    path.join(__dirname, "fixtures", "search", "v260701-ispetase-enriched.json")
  )
)

/** Same result with no enrichment: metadata null on every hit. */
function withoutEnrichment(status) {
  return {
    ...enriched,
    results: enriched.results.map(hit => ({ ...hit, metadata: null })),
    metadata: {
      ...enriched.metadata,
      enrichment_status: status,
      metadata_version: null,
      clusters: null,
      summary: null,
    },
  }
}

/** Job ids the search-result route answers, by fixture. */
const SEARCH_JOBS = {
  enriched: "regen_example_ispetase_v260701",
  failed: "a".repeat(32),
  unavailable: "b".repeat(32),
  processing: "c".repeat(32),
  searchFailed: "d".repeat(32),
}

// The processing job answers `processing` twice, then completes.
let processingReads = 0

function searchResult(jobId) {
  switch (jobId) {
    case SEARCH_JOBS.enriched:
      return enriched
    case SEARCH_JOBS.failed:
      return withoutEnrichment("failed")
    case SEARCH_JOBS.unavailable:
      return withoutEnrichment(null)
    case SEARCH_JOBS.processing:
      processingReads += 1
      return processingReads <= 2
        ? { status: "processing", session_id: jobId }
        : enriched
    case SEARCH_JOBS.searchFailed:
      return { status: "failed", session_id: jobId, error: "Search aborted" }
    default:
      return null
  }
}

const port = Number(process.env.MOCK_API_PORT || 3011)

const server = createServer((req, res) => {
  // /results polls from the browser on another origin.
  res.setHeader("Access-Control-Allow-Origin", "*")
  const url = new URL(req.url, "http://localhost")
  const searchMatch = /^\/api\/search\/results\/([^/]+)$/.exec(url.pathname)
  if (searchMatch && req.method === "GET") {
    const body = searchResult(decodeURIComponent(searchMatch[1]))
    res.writeHead(body ? 200 : 404, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify(body ?? { status: "not_found", error: "Job not found." })
    )
    return
  }
  if (req.url === "/api/resolve/summary" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(fixture)
    return
  }
  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "not found (mock-api-server)" }))
})

server.listen(port, () => {
  console.log(`mock-api-server listening on :${port}`)
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
