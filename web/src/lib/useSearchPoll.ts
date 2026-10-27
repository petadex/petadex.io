"use client"

import { useEffect, useState } from "react"
import { getSearchResult } from "@/lib/api/search"
import type { SearchResultResponse } from "@/lib/api/types"

export const POLL_INTERVAL_MS = 3_000
/** Gatsby's POLL_TIMEOUT_SECONDS; the orchestrator fails real failures sooner. */
export const POLL_TIMEOUT_MS = 180_000

export type SearchPollState =
  | { kind: "loading" }
  | { kind: "processing" }
  | { kind: "not_found" }
  | { kind: "timed_out" }
  | { kind: "failed"; error: string }
  | {
      kind: "completed"
      result: Extract<SearchResultResponse, { status: "completed" }>
    }

/**
 * Polls one stored search until it completes, fails or 404s. Only reads: a
 * page stuck on "processing" means no stored result yet, never a re-run.
 * Pauses while the tab is hidden; a fetch error is thrown to the nearest
 * error boundary rather than retried silently.
 */
export function useSearchPoll(
  jobId: string,
  maxResults?: number
): SearchPollState {
  const [state, setState] = useState<SearchPollState>({ kind: "loading" })
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    // Set while a read is in flight or after a terminal state, so a tab
    // becoming visible never starts a second, overlapping read.
    let busy = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const deadline = Date.now() + POLL_TIMEOUT_MS

    async function tick() {
      timer = null
      if (document.hidden) return
      busy = true
      let response: SearchResultResponse | null
      try {
        response = await getSearchResult(jobId, { maxResults })
      } catch (err) {
        if (!cancelled) setError(err)
        return
      }
      if (cancelled) return
      if (response === null) return setState({ kind: "not_found" })
      if (response.status === "completed")
        return setState({ kind: "completed", result: response })
      if (response.status === "failed")
        return setState({ kind: "failed", error: response.error })
      if (Date.now() >= deadline) return setState({ kind: "timed_out" })
      setState({ kind: "processing" })
      busy = false
      timer = setTimeout(tick, POLL_INTERVAL_MS)
    }

    function onVisibility() {
      if (!document.hidden && !busy && timer === null && !cancelled) void tick()
    }

    void tick()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [jobId, maxResults])

  if (error) throw error
  return state
}
