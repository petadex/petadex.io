import { env } from "@/lib/env"
import { apiFetchOrNull } from "./client"
import type { SearchResultResponse, SequenceSamples } from "./types"

/** The three job-id shapes the backend's `jobIdSchema` accepts. */
const JOB_ID_PATTERN =
  /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|regen_example_[a-z0-9_]+)$/i

export function isJobId(value: string | null | undefined): value is string {
  return typeof value === "string" && JOB_ID_PATTERN.test(value)
}

/**
 * GET /api/search/results/:jobId — a cache read, never rate limited, and never
 * starts a search. `null` when the backend 404s (unknown or expired job).
 * Called from the browser, so it goes to the search API origin.
 */
export function getSearchResult(
  jobId: string,
  { maxResults }: { maxResults?: number } = {}
): Promise<SearchResultResponse | null> {
  return apiFetchOrNull<SearchResultResponse>(
    `/search/results/${encodeURIComponent(jobId)}`,
    {
      baseUrl: env.searchApiUrl,
      searchParams: { max_results: maxResults },
      cache: "no-store",
    }
  )
}

/**
 * GET /api/sequence/:id/samples — the BioSamples a Logan sequence was found
 * in. `null` when the store has no record; 503 (lookup unavailable) throws.
 */
export function getSequenceSamples(
  id: string
): Promise<SequenceSamples | null> {
  return apiFetchOrNull<SequenceSamples>(
    `/sequence/${encodeURIComponent(id)}/samples`,
    { baseUrl: env.searchApiUrl }
  )
}
