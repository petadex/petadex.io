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

/**
 * GET /sequence/:id/samples for the fixture's Logan hits, built from each
 * hit's prof_hist. The first Logan hit with metadata answers normally; the
 * second answers 503 (lookup unavailable); any other id 404s.
 */
const loganHits = enriched.results.filter(
  h => h.origin === "logan" && h.metadata
)
const SAMPLES_UNAVAILABLE_ID = loganHits[1]?.target_id

function sequenceSamples(id) {
  if (id === SAMPLES_UNAVAILABLE_ID)
    return { status: 503, body: { error: "Sample lookup unavailable." } }
  const hit = loganHits.find(h => h.target_id === id)
  if (!hit)
    return { status: 404, body: { error: `No sample record for ${id}.` } }
  const m = hit.metadata
  const profiles = Object.entries(m.prof_hist).flatMap(([profile, n]) =>
    Array.from({ length: n }, () => profile)
  )
  const samples = profiles.slice(0, 200).map((profile, i) => ({
    biosample: `SAMN${String(10_000_000 + i).padStart(8, "0")}`,
    bioproject: `PRJNA${100 + (i % m.n_bioprojects)}`,
    bioproject_title: `${profile} metagenome survey`,
    n_runs: 1 + (i % 3),
    ka_max: 0.5,
    profile,
    profile_evidence: i % 2 ? "inferred" : "stated",
    isolation_source: profile,
    env_broad_scale: null,
    env_medium: null,
    host: null,
    country: i % 2 ? "Japan" : "Germany",
    latitude: null,
    longitude: null,
    temperature_c: i % 4 ? 20 + (i % 10) : null,
    ph: i % 4 ? 7.1 : null,
    top_species: [["Ideonella sakaiensis", 0.12]],
  }))
  return {
    status: 200,
    body: {
      id,
      n_biosamples: m.n_biosamples,
      n_bioprojects: m.n_bioprojects,
      samples,
    },
  }
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
  const samplesMatch = /^\/api\/sequence\/([^/]+)\/samples$/.exec(url.pathname)
  if (samplesMatch && req.method === "GET") {
    const { status, body } = sequenceSamples(
      decodeURIComponent(samplesMatch[1])
    )
    res.writeHead(status, { "Content-Type": "application/json" })
    res.end(JSON.stringify(body))
    return
  }
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
