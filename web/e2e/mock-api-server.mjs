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
 * Only serves the one route "/" actually depends on at request time.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(
  path.join(__dirname, "fixtures", "corpus-summary.json")
)
const port = Number(process.env.MOCK_API_PORT || 3011)

const server = createServer((req, res) => {
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
