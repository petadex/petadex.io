// src/components/search/IdentifierResolver.jsx
//
// MVP Search Index resolver UI (Layer 3 of "04 - MVP Search Index", incl. the
// 2026-06-22 post-schema update).
//
// Resolves three raw-provenance identifier types a user (or deep link) may paste:
//   - orf_id      (all digits)        -> single match -> ORF sequence page (+ its 90% cluster)
//   - genbank_acc (e.g. WP_0123.1)    -> single match -> ORF sequence page (+ its 90% cluster)
//   - library_id  (e.g. ERR4800418)   -> paginated list of ORFs in that library
//
// Backed by GET /api/resolve. Client-side shape pre-routing mirrors the server so
// the predicted identifier type is shown as-you-type. A single match surfaces the
// full chain — searched id -> resolved cluster -> centroid — so pasting accession X
// and landing on centroid Y is legible, not a perceived bug. The primary action
// opens the matched ORF's own sequence page (/sequence/orf/{orf_id}); a secondary
// action opens its 90% cluster block (/cluster/90/{c90_id}). Library ORFs link to
// the same corpus sequence page (NOT the curated /enzyme/${id} route).
import React, { useState, useMemo, useRef, useEffect } from "react"
import { Link } from "gatsby"
import config from "../../config"

// ── Shape pre-routing (mirror of backend routeLegs) ─────────────────────────

const MATCH_TYPE_META = {
  orf_id: { label: "ORF ID", className: "bg-success/10 text-success" },
  genbank_acc: {
    label: "GenBank accession",
    className: "bg-info/10 text-info",
  },
  library_id: { label: "SRA library", className: "bg-warning/10 text-warning" },
}

// Returns the predicted match_type for a raw query, or null if empty/ambiguous.
function predictType(raw) {
  const q = raw.trim()
  if (!q) return null
  if (/^\d+$/.test(q)) return "orf_id"
  if (/^[SED]R[RXSAP]\d+$/i.test(q)) return "library_id"
  return "genbank_acc"
}

// ── Corpus summary strip ────────────────────────────────────────────────────

// Columns we know how to label, in display order. Only those present in the
// corpus_summary row are rendered, so the strip tolerates schema additions.
const SUMMARY_FIELDS = [
  { key: "catalytic_core_total", label: "Catalytic ORFs" },
  { key: "clusters_90pid", label: "90% clusters" },
  { key: "clusters_60pid", label: "60% clusters" },
  { key: "clusters_30pid", label: "30% clusters" },
  { key: "pazy_total", label: "PAZy" },
  { key: "nr_total", label: "NR" },
  { key: "sra_total", label: "SRA" },
]

const fmtCount = v => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString() : String(v)
}

const CorpusSummaryStrip = () => {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${config.apiUrl}/resolve/summary`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled && data) setSummary(data)
      })
      .catch(err => console.error("Corpus summary error:", err))
    return () => {
      cancelled = true
    }
  }, [])

  if (!summary) return null

  const fields = SUMMARY_FIELDS.filter(
    f => summary[f.key] !== undefined && summary[f.key] !== null
  )
  if (!fields.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
      {fields.map(({ key, label }) => (
        <div
          key={key}
          className="rounded-lg border border bg-surface-raised px-3 py-2"
        >
          <div className="text-lg font-semibold text-primary">
            {fmtCount(summary[key])}
          </div>
          <div className="label">{label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Result panels ───────────────────────────────────────────────────────────

const TypeBadge = ({ type }) => {
  const meta = MATCH_TYPE_META[type]
  if (!meta) return null
  return (
    <span
      className={`px-2 py-0.5 rounded text-2xs font-semibold uppercase tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

// One link in the searched -> cluster -> centroid chain.
const ChainStep = ({ label, value, mono = true }) => (
  <div className="flex flex-col">
    <span className="label">{label}</span>
    <span
      className={`text-primary ${
        mono ? "font-mono" : ""
      } text-sm font-semibold break-all`}
    >
      {value ?? "—"}
    </span>
  </div>
)

// single match (orf_id / genbank_acc) -> lands on the 90% cluster block.
const SingleResult = ({ result }) => {
  const c90 = result.cluster?.c90_id ?? null
  const block = result.block || {}
  const centroidAcc = block.centroid_accession ?? null
  const centroidOrf = block.centroid_orf_id ?? null

  // Block columns beyond the identity fields already shown in the chain.
  const SHOWN = new Set(["cluster_id", "centroid_orf_id", "centroid_accession"])
  const extraBlock = Object.entries(block).filter(([k]) => !SHOWN.has(k))

  return (
    <div className="card text-left p-6">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <TypeBadge type={result.match_type} />
        <span className="text-sm text-muted-foreground">
          resolved to its 90% cluster
        </span>
      </div>

      {/* searched -> resolved cluster -> centroid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <ChainStep label="Searched" value={result.match_value} />
        <ChainStep label="90% cluster" value={c90} />
        <ChainStep
          label="Centroid"
          value={
            centroidAcc || (centroidOrf != null ? `ORF ${centroidOrf}` : null)
          }
        />
      </div>

      {!result.block_found && (
        <p className="text-xs text-warning mb-4">
          Cluster resolved, but its block row isn’t available yet.
        </p>
      )}

      {extraBlock.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          {extraBlock.map(([k, v]) => (
            <React.Fragment key={k}>
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono text-secondary-foreground break-all">
                {String(v)}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {(result.orf_id != null || c90 != null) && (
        <div className="flex flex-wrap gap-2">
          {result.orf_id != null && (
            <Link
              to={`/sequence/orf/${result.orf_id}`}
              className="btn btn-primary text-sm"
            >
              Open ORF {result.orf_id} sequence page →
            </Link>
          )}
          {c90 != null && (
            <Link
              to={`/cluster/90/${c90}`}
              className={`btn text-sm ${
                result.orf_id != null ? "btn-secondary" : "btn-primary"
              }`}
            >
              Open 90% cluster block →
            </Link>
          )}
        </div>
      )}
      {result.orf_id == null && c90 == null && (
        <p className="text-sm text-muted-foreground">
          No ORF or cluster id on this match — rebuild{" "}
          <span className="font-mono">search_index</span> to carry{" "}
          <span className="font-mono">c90_id</span>.
        </p>
      )}
    </div>
  )
}

// list match (library_id) -> paginated list of ORFs in the library.
const ListResult = ({ result, onLoadMore, loadingMore }) => (
  <div className="card text-left p-6">
    <div className="flex items-center gap-3 mb-1 flex-wrap">
      <TypeBadge type="library_id" />
      <Link
        to={`/sra/${encodeURIComponent(result.library_id)}`}
        className="font-mono text-sm text-info hover:underline"
      >
        {result.library_id}
      </Link>
      <a
        href={`https://www.ncbi.nlm.nih.gov/sra/?term=${encodeURIComponent(result.library_id)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:text-info"
      >
        NCBI ↗
      </a>
    </div>
    <p className="text-sm text-muted-foreground mb-4">
      <strong className="text-primary">
        {result.pagination.total.toLocaleString()}
      </strong>{" "}
      ORFs in this library — showing {result.orf_ids.length}. Open the{" "}
      <Link
        to={`/sra/${encodeURIComponent(result.library_id)}`}
        className="text-info hover:underline"
      >
        SRA run page
      </Link>{" "}
      for sample metadata.
    </p>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {result.orf_ids.map(orfId => (
        <Link
          key={orfId}
          to={`/sequence/orf/${orfId}`}
          className="font-mono text-sm text-primary no-underline border border rounded px-3 py-2 hover:border-info transition-colors"
        >
          {orfId}
        </Link>
      ))}
    </div>
    {result.pagination.hasMore && (
      <div className="text-center mt-4">
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className={`btn ${
            loadingMore
              ? "btn-ghost text-muted-foreground cursor-default"
              : "btn-secondary"
          } text-sm`}
        >
          {loadingMore ? "Loading…" : "Load More"}
        </button>
      </div>
    )}
  </div>
)

// partial input (no exact hit) -> clickable candidate list; picking one re-resolves it.
const SuggestionsList = ({ suggestions, query, onPick }) => (
  <div className="card text-left p-2">
    <p className="px-3 py-2 text-xs text-muted-foreground">
      {suggestions.length} match{suggestions.length !== 1 ? "es" : ""} for
      &quot;{query}&quot; — pick one:
    </p>
    <ul className="flex flex-col">
      {suggestions.map(s => (
        <li key={`${s.match_type}:${s.match_value}`}>
          <button
            type="button"
            onClick={() => onPick(s.match_value)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded hover:bg-surfaced transition-colors text-left"
          >
            <span className="font-mono text-sm text-primary break-all">
              {s.match_value}
            </span>
            <TypeBadge type={s.match_type} />
          </button>
        </li>
      ))}
    </ul>
  </div>
)

// ── IdentifierResolver ──────────────────────────────────────────────────────

const PAGE_SIZE = 50
const DEBOUNCE_MS = 280

const IdentifierResolver = () => {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState(null) // resolver payload or { result_kind: 'none' }
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const reqIdRef = useRef(0)
  const debounceRef = useRef(null)

  const predicted = useMemo(() => predictType(query), [query])

  const performResolve = async rawQ => {
    const q = (rawQ ?? "").trim()
    if (!q) return
    const reqId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(
        `${config.apiUrl}/resolve?q=${encodeURIComponent(
          q
        )}&limit=${PAGE_SIZE}&offset=0`
      )
      if (reqId !== reqIdRef.current) return // stale response, a newer query is in flight
      if (res.ok) {
        setResult(await res.json())
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error || `Resolver error (${res.status})`)
      }
    } catch (err) {
      if (reqId !== reqIdRef.current) return
      console.error("Resolver error:", err)
      setError("Could not reach the resolver.")
    } finally {
      if (reqId === reqIdRef.current) setLoading(false)
    }
  }

  // As-you-type: debounce input so partial queries surface suggestions without a
  // round-trip per keystroke. Clears results immediately when the box is emptied.
  const handleChange = value => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      reqIdRef.current++ // invalidate any in-flight response
      setResult(null)
      setError(null)
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(() => performResolve(value), DEBOUNCE_MS)
  }

  // Explicit submit (Enter / button) — resolve now, cancelling the pending debounce.
  const onSubmit = e => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    performResolve(query)
  }

  // Picking a suggestion fills the box with its exact value and resolves it.
  const pickSuggestion = value => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setQuery(value)
    performResolve(value)
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  // library list fan-out: append the next page of orf_ids. Guarded with the same
  // reqId so a slow page-2 response that lands after the query changed is dropped.
  const loadMore = async () => {
    if (!result || result.result_kind !== "list") return
    const reqId = reqIdRef.current
    setLoadingMore(true)
    try {
      const nextOffset = result.pagination.offset + result.orf_ids.length
      const res = await fetch(
        `${config.apiUrl}/resolve?q=${encodeURIComponent(
          result.library_id
        )}&limit=${PAGE_SIZE}&offset=${nextOffset}`
      )
      if (reqId !== reqIdRef.current) return // a newer query superseded this list
      if (res.ok) {
        const next = await res.json()
        setResult(prev => ({
          ...next,
          orf_ids: [...prev.orf_ids, ...next.orf_ids],
        }))
      }
    } catch (err) {
      console.error("Resolver load-more error:", err)
    } finally {
      if (reqId === reqIdRef.current) setLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <CorpusSummaryStrip />

      <form
        onSubmit={onSubmit}
        className="flex flex-col sm:flex-row gap-2 items-stretch"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Search an ORF ID, GenBank accession, or SRA library…"
            className="input"
            aria-label="Identifier to resolve"
          />
          {predicted && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <TypeBadge type={predicted} />
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="btn btn-primary"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="mt-4">
        {error && (
          <div className="p-4 bg-error/5 border border-error/20 rounded-xl text-destructive text-sm">
            {error}
          </div>
        )}

        {!error && result && result.result_kind === "single" && (
          <SingleResult result={result} />
        )}

        {!error && result && result.result_kind === "list" && (
          <ListResult
            result={result}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
          />
        )}

        {!error && result && result.result_kind === "suggestions" && (
          <SuggestionsList
            suggestions={result.suggestions}
            query={result.query}
            onPick={pickSuggestion}
          />
        )}

        {!error && result && result.result_kind === "none" && (
          <p className="text-muted-foreground text-sm">
            No match for &quot;{result.query}&quot;. Try part of an ORF ID,
            GenBank accession (e.g.{" "}
            <span className="font-mono">WP_054022242</span>), or SRA library
            (e.g. <span className="font-mono">ERR4800418</span>).
          </p>
        )}
      </div>
    </div>
  )
}

export default IdentifierResolver
