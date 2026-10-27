import { Suspense } from "react"
import { ResultsView } from "@/components/results/ResultsView"
import { buildMetadata } from "@/lib/seo"

/**
 * DIAMOND search results for `?job=`. Client-rendered: the view polls a stored
 * job until it completes. Read-only — only the /search submit starts a search.
 * Plan: web/docs/search-and-results.md.
 */
export const metadata = buildMetadata({
  title: "Search results",
  description: "Sequence search results against the PETadex database",
  path: "/results",
  noIndex: true,
})

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Suspense fallback={null}>
        <ResultsView />
      </Suspense>
    </div>
  )
}
