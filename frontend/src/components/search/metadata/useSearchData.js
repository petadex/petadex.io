// Data hooks for the 1.5.0+ results views. Each reads the Express relays for
// a finished search's stored artefacts; neither delays the search itself.
import { useEffect, useState } from "react"
import config from "../../../config"

const searchApiUrl = () => process.env.GATSBY_SEARCH_API_URL || config.apiUrl

const BATCH_MAX = 500

/**
 * Found in Samples for every Logan hit, in one batch call. Fetched in the
 * background once the hits are on screen (it takes seconds and the hits table
 * and Environments tab both use it), never retried on failure.
 * Returns { status: idle|loading|ready|unavailable, data }.
 */
export function useSamplesBatch(hits, enabled) {
  const [state, setState] = useState({ status: "idle", data: null })
  const ids = enabled
    ? hits
        .filter(h => h.db === "logan")
        .map(h => h.target_id)
        .slice(0, BATCH_MAX)
    : []
  const key = ids.join(",")

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    setState({ status: "loading", data: null })
    fetch(`${searchApiUrl()}/search/samples`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: key.split(",") }),
      signal: controller.signal,
    })
      .then(async resp => {
        if (!resp.ok) throw new Error(`samples batch ${resp.status}`)
        setState({ status: "ready", data: await resp.json() })
      })
      .catch(err => {
        if (err.name === "AbortError") return
        setState({ status: "unavailable", data: null })
      })
    return () => controller.abort()
  }, [key])

  return state
}

const POLL_MS = 3000
// A "running" status older than this reads as failed (the orchestrator says so too).
const RUNNING_LIMIT_MS = 5 * 60 * 1000

/**
 * The search's alignment + tree (built by the aggregator after every search).
 * Polls while it runs. Any non-200 answer, e.g. before the align action is
 * deployed, reads as unavailable.
 * Returns { status: loading|running|ready|failed|unavailable, data, error }.
 */
export function useSearchAlignment(sessionId) {
  const [state, setState] = useState({ status: "loading", data: null })

  useEffect(() => {
    if (!sessionId) {
      setState({ status: "loading", data: null })
      return
    }
    let cancelled = false
    let timer = null
    const started = Date.now()

    const read = async () => {
      try {
        const resp = await fetch(`${searchApiUrl()}/search/align`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
        const body = await resp.json().catch(() => ({}))
        if (cancelled) return
        if (!resp.ok) {
          setState({ status: "unavailable", data: null, error: body.error })
          return
        }
        if (body.status === "ready") {
          setState({ status: "ready", data: body })
        } else if (body.status === "failed") {
          setState({ status: "failed", data: null, error: body.error })
        } else if (Date.now() - started > RUNNING_LIMIT_MS) {
          setState({ status: "failed", data: null, error: "timed out" })
        } else {
          setState({ status: "running", data: body })
          timer = setTimeout(read, POLL_MS)
        }
      } catch {
        if (!cancelled) setState({ status: "unavailable", data: null })
      }
    }
    read()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [sessionId])

  return state
}
