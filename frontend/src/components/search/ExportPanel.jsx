/**
 * ExportPanel – "Export all significant hits" on the results page.
 *
 * Shown only when the search hit its 500-row cap. Starts the uncapped export
 * on request (or picks up one the search form already started), polls it, and
 * offers the files with their sizes. See utils/searchExport.js and vault note
 * "13 - Export All Significant Hits".
 */
import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  startExport,
  pollExport,
  takePendingExport,
  rememberExportJob,
  recallExportJob,
  forgetExportJob,
  formatBytes,
} from "../../utils/searchExport"
import { formatCount } from "../../utils/format"

const POLL_INTERVAL_MS = 3000
// The largest family measured (7.9 M hits, with its 1.4 GB FASTA) is ready in
// ~5.4 min; this leaves room for a cold start and a queue before calling it lost.
const POLL_TIMEOUT_SECONDS = 12 * 60
// Refresh a presigned link this long before the API says it expires.
const LINK_REFRESH_MARGIN_S = 60

const EVALUE_BANDS = ["1e-10", "1e-30", "1e-50"]
const ORIGIN_LABELS = {
  logan: "Logan",
  ncbi_nr: "NCBI nr",
  plasticome: "Plasticome",
}

const isSearchSessionId = id => /^[a-f0-9]{32}$/.test(id || "")

const ExportPanel = ({ metadata, sessionId, onSummary }) => {
  // idle | starting | running | ready | busy | refused | error
  const [phase, setPhase] = useState("idle")
  const [job, setJob] = useState(null) // { export_session_id, job_id }
  const [summary, setSummary] = useState(null)
  const [message, setMessage] = useState(null)
  const [retryAt, setRetryAt] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const confirmRef = useRef(null)
  const readyAt = useRef(0)
  const startedAt = useRef(0)

  const showReady = useCallback(
    data => {
      readyAt.current = Date.now()
      setSummary(data)
      setPhase("ready")
      forgetExportJob(sessionId)
      onSummary?.(data)
    },
    [sessionId, onSummary]
  )

  const handleStartResult = useCallback(
    ({ status, data }) => {
      if (status === 200 && data.status === "ready") return showReady(data)
      if (status === 202) {
        const next = {
          export_session_id: data.export_session_id,
          job_id: data.job_id,
        }
        rememberExportJob(sessionId, next)
        startedAt.current = Date.now()
        setJob(next)
        setPhase("running")
        return
      }
      if (status === 429 || status === 503) {
        setRetryAt(Date.now() + (data.retry_after ?? 30) * 1000)
        setMessage(data.error || "PETadex search is busy right now.")
        setPhase("busy")
        return
      }
      setMessage(data.error || `Export failed (${status}).`)
      setPhase(status === 409 ? "refused" : "error")
    },
    [sessionId, showReady]
  )

  const begin = useCallback(
    async startPromise => {
      setPhase("starting")
      setMessage(null)
      try {
        handleStartResult(await startPromise)
      } catch {
        setMessage("Could not reach the PETadex API. Please try again.")
        setPhase("error")
      }
    },
    [handleStartResult]
  )

  // On load: an export the search form just started, then one this tab was
  // already polling, then (free, S3 reads only) one that already exists.
  useEffect(() => {
    const pending = takePendingExport(sessionId)
    if (pending) {
      begin(pending)
      return
    }
    const remembered = recallExportJob(sessionId)
    if (remembered?.export_session_id) {
      startedAt.current = Date.now()
      setJob(remembered)
      setPhase("running")
      return
    }
    if (!isSearchSessionId(sessionId)) return
    let cancelled = false
    pollExport(`${sessionId}_x`)
      .then(({ ok, data }) => {
        if (!cancelled && ok && data.status === "ready") showReady(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "running" || !job) return
    let stopped = false
    const tick = async () => {
      const secs = Math.floor((Date.now() - startedAt.current) / 1000)
      setElapsed(secs)
      if (secs >= POLL_TIMEOUT_SECONDS) {
        forgetExportJob(sessionId)
        setMessage(
          `The export is still not ready after ${
            POLL_TIMEOUT_SECONDS / 60
          } minutes. It may have failed; please try again.`
        )
        setPhase("error")
        return
      }
      try {
        const { ok, data } = await pollExport(job.export_session_id, job.job_id)
        if (stopped) return
        if (!ok) throw new Error(data.error)
        if (data.status === "ready") showReady(data)
        else if (data.status === "failed") {
          forgetExportJob(sessionId)
          setMessage(data.error || "The export failed.")
          setPhase("error")
        }
        // none | running: keep polling. "none" is a start whose index isn't
        // written yet (the invoke timed out before handing back a job).
      } catch {
        // A dropped poll isn't a failed export; the timeout is the backstop.
      }
    }
    tick()
    const poll = setInterval(tick, POLL_INTERVAL_MS)
    const clock = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000
    )
    return () => {
      stopped = true
      clearInterval(poll)
      clearInterval(clock)
    }
  }, [phase, job, sessionId, showReady])

  // Count down a 429/503 so the button only comes back when a retry can work.
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (phase !== "busy" || !retryAt) return
    const t = setInterval(() => forceTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [phase, retryAt])
  const retryIn =
    phase === "busy" && retryAt
      ? Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))
      : 0

  const handleExport = () => {
    const seq = metadata?.query_sequence || ""
    const header = metadata?.query_header
    begin(
      startExport({
        sequence: header ? `>${header}\n${seq}` : seq,
        databaseVersion: metadata?.database_version,
      })
    )
  }

  // Presigned links last url_expires_in seconds. A click on a stale one
  // re-polls (S3 reads only) for a fresh link instead of a 403 from S3.
  const handleDownload = async (e, kind) => {
    const ttl = summary?.url_expires_in ?? 0
    if (Date.now() - readyAt.current < (ttl - LINK_REFRESH_MARGIN_S) * 1000)
      return
    e.preventDefault()
    try {
      const { ok, data } = await pollExport(
        summary.export_session_id,
        summary.job_id
      )
      if (ok && data.status === "ready") {
        readyAt.current = Date.now()
        setSummary(data)
        const url = data.files?.[kind]?.url
        if (url) window.location.assign(url)
      }
    } catch {
      setMessage("Could not refresh the download link. Please try again.")
    }
  }

  const box =
    "mb-4 py-3.5 px-4 bg-surface-raised border border-border rounded-sm text-sm"

  if (phase === "ready" && summary) {
    const { tsv, fasta } = summary.files || {}
    const bands = EVALUE_BANDS.filter(b => summary.by_evalue?.[b] != null)
    const origins = Object.entries(summary.by_origin || {}).filter(
      ([, n]) => n > 0
    )
    return (
      <div className={box}>
        <p className="font-semibold text-foreground">
          All {formatCount(summary.total_hits)} significant hits
          <span className="font-normal text-muted-foreground">
            {" "}
            (e-value ≤ {summary.evalue_cutoff ?? 0.001})
            {summary.database_release && ` · ${summary.database_release}`}
          </span>
        </p>
        {(bands.length > 0 || origins.length > 0) && (
          <p className="text-xs text-muted-foreground mt-1">
            {bands
              .map(b => `≤ ${b}: ${formatCount(summary.by_evalue[b])}`)
              .concat(
                origins.map(
                  ([o, n]) => `${ORIGIN_LABELS[o] || o}: ${formatCount(n)}`
                )
              )
              .join("  ·  ")}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {tsv?.url && (
            <a
              className="btn btn-outline"
              href={tsv.url}
              onClick={e => handleDownload(e, "tsv")}
              title="Ranked hits table: rank, target_id, origin, identity, alignment coordinates, e-value, bit score"
            >
              ⬇ Hits table (.tsv.gz
              {tsv.bytes != null && `, ${formatBytes(tsv.bytes)}`})
            </a>
          )}
          {fasta?.url && (
            <a
              className="btn btn-outline"
              href={fasta.url}
              onClick={e => handleDownload(e, "fasta")}
              title="Full sequence of every hit, in rank order"
            >
              ⬇ Sequences (.fasta.gz
              {fasta.bytes != null && `, ${formatBytes(fasta.bytes)}`})
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Ranked like the table (bit score, then e-value). The export is the
          exact ranking: the quick search's top 500 can occasionally miss a hit
          that belongs in it.
        </p>
        {message && <p className="text-xs text-destructive mt-1">{message}</p>}
      </div>
    )
  }

  if (phase === "starting" || phase === "running") {
    // Most exports land in ~45 s; the bar eases toward 95% over ~2 min and
    // waits there, since the real duration isn't known up front.
    const pct = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / 60))))
    return (
      <div className={box} aria-live="polite">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-border border-t-accent animate-spin" />
          <span className="font-semibold text-foreground">
            Preparing every significant hit…
          </span>
          {phase === "running" && (
            <span className="text-xs text-muted-foreground">
              {elapsed}s elapsed
            </span>
          )}
        </div>
        <div className="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden mt-2.5">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${phase === "starting" ? 3 : Math.max(pct, 3)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Usually about a minute; up to ~6 minutes for the largest families. You
          can keep using these results meanwhile.
        </p>
      </div>
    )
  }

  if (phase === "refused") {
    return (
      <div className={box}>
        <p className="text-muted-foreground">{message}</p>
      </div>
    )
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button
        className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        // A retry was already confirmed; only the first start asks.
        onClick={
          phase === "idle"
            ? () => confirmRef.current?.showModal()
            : handleExport
        }
        disabled={retryIn > 0 || !metadata?.query_sequence}
      >
        {retryIn > 0
          ? `Try again in ${retryIn}s`
          : phase === "error" || phase === "busy"
          ? "Try again"
          : "Export all hits"}
      </button>
      {(phase === "error" || phase === "busy") && message && (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      )}
      <ExportConfirmDialog
        dialogRef={confirmRef}
        onConfirm={() => {
          confirmRef.current?.close()
          handleExport()
        }}
      />
    </div>
  )
}

// The times and sizes quoted are measured ranges (vault note 13 §12), because
// the total for THIS query can't be known in advance: with a 500-hit cap
// DIAMOND stops scoring weaker candidates, so hit 501 onwards is never
// computed, and extrapolating the top 500's e-values was tried and missed by
// 1–4000× across families.
const ExportConfirmDialog = ({ dialogRef, onConfirm }) => (
  <dialog
    ref={dialogRef}
    aria-labelledby="export-confirm-title"
    className="m-auto max-w-lg w-[calc(100%-2rem)] rounded-lg border border-border bg-background text-foreground p-0 shadow-lg backdrop:bg-black/50"
  >
    <div className="p-5 space-y-3 text-sm">
      <h3 id="export-confirm-title" className="text-base font-semibold">
        Export all hits?
      </h3>
      <p className="text-secondary-foreground">
        Exporting runs a new search without the 500-hit cap, returning every hit
        at e-value ≤ 1e-3. Known exports have taken from about 50 seconds to 5½
        minutes, depending on how large the query's family is.
      </p>
      <div>
        <p className="font-semibold text-foreground">Outputs:</p>
        <ol className="list-decimal pl-5 mt-1 space-y-0.5 text-secondary-foreground">
          <li>Hits file (.tsv.gz)</li>
          <li>
            Sequence file (.fasta.gz): can be well over 1 GB for large families
          </li>
        </ol>
        <p className="text-xs text-muted-foreground mt-2">
          Exports are cached like search results, so exporting this query again
          is instant.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          className="btn btn-ghost"
          onClick={() => dialogRef.current?.close()}
          autoFocus
        >
          Cancel
        </button>
        <button className="btn btn-primary" onClick={onConfirm}>
          Start export
        </button>
      </div>
    </div>
  </dialog>
)

export default ExportPanel
