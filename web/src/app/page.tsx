import { probeApiHealth } from "@/lib/api"
import { env } from "@/lib/env"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Home",
  description:
    "PETadex is an open database of plastic-degrading enzymes. This is the Next.js rebuild scaffold.",
  path: "/",
})

/**
 * The probe reflects live backend state, so this page must not be prerendered
 * into a static shell at build time.
 */
export const dynamic = "force-dynamic"

export default async function HomePage() {
  const health = await probeApiHealth()

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <section className="max-w-2xl">
        <p className="text-accent text-sm font-medium tracking-wide uppercase">
          Scaffold
        </p>
        <h1 className="text-foreground mt-2 text-4xl font-semibold tracking-tight text-balance">
          PETadex rebuild
        </h1>
        <p className="text-muted mt-4 text-lg leading-relaxed">
          The shell is in place: routing, styling, the typed API client and the
          metadata helper. Pages arrive one at a time in Phase 3. The Gatsby
          site at petadex.net stays live until cutover.
        </p>
      </section>

      <section className="mt-12 max-w-2xl">
        <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">
          Backend connection
        </h2>

        <div className="border-border bg-surface mt-3 rounded-lg border p-5">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={`size-2.5 rounded-full ${
                health.ok ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="text-foreground text-sm font-medium">
              {health.ok
                ? `API reachable, database responding (${health.status})`
                : "API unreachable"}
            </span>
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted w-28 shrink-0">API base</dt>
              <dd className="tabular font-mono text-xs break-all">
                {env.apiUrl}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted w-28 shrink-0">Health probe</dt>
              <dd className="tabular font-mono text-xs break-all">
                {env.apiOrigin}/health
              </dd>
            </div>
          </dl>

          {!health.ok && (
            <p className="text-muted border-border mt-4 border-t pt-4 text-xs leading-relaxed">
              {health.reason}
            </p>
          )}
        </div>

        <p className="text-muted mt-3 text-xs">
          Diagnostic only — delete this section once real pages land. It reports
          failure as data; every data page lets the API client throw instead.
        </p>
      </section>
    </div>
  )
}
