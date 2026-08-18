import { apiFetch } from "./client"
import type { CorpusSummary } from "./types"

/**
 * Corpus-wide counts for the landing page.
 *
 * Deliberately not wrapped in a try/catch. The old homepage hardcoded these
 * numbers into the page source and they drifted — it still advertises "1.3
 * billion unique sequences" against an actual catalytic-ORF total of 307
 * million. Reading them from `corpus_summary` means the page cannot claim a
 * number the database does not hold, and a failed fetch fails the build rather
 * than publishing a page with no counts on it.
 *
 * `corpus_summary` is a matview refreshed with the corpus, so an hour of
 * staleness is far below its actual update frequency.
 */
export function fetchCorpusSummary(): Promise<CorpusSummary> {
  return apiFetch<CorpusSummary>("/resolve/summary", {
    revalidate: 3600,
    tags: ["corpus-summary"],
  })
}

/**
 * Parses one `corpus_summary` count into a number.
 *
 * The columns are `bigint`, so they arrive as strings. Returns `null` for an
 * absent column — the route is a `SELECT *` pass-through, so a column can
 * disappear without any code here changing — which callers render as an em
 * dash rather than as a zero.
 */
export function parseCount(value: string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Formats a count for display at the given precision.
 *
 * `compact` yields "307M" / "18.2M" for headline figures; `full` yields
 * "307,155,746" for the exact value shown underneath. Both use en-US
 * explicitly so the server-rendered string matches the client's, whatever
 * locale the browser reports — a mismatch here is a hydration error.
 */
export function formatCount(
  value: number | null,
  style: "compact" | "full" = "full"
): string {
  if (value === null) return "—"
  return value.toLocaleString(
    "en-US",
    style === "compact"
      ? { notation: "compact", maximumFractionDigits: 1 }
      : undefined
  )
}
