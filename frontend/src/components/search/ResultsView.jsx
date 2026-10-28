import React, { useState, useMemo, useEffect, useCallback } from "react"
import { Link } from "gatsby"
import { formatSeq, cleanSequence } from "../../utils/lib"
import { generateCSV, downloadCSV } from "../../utils/csvDownload"
import AtlasMap from "../charts/AtlasMap"
import { Scatterplot } from "../charts/Scatterplot"
import { TaxonomyScatterChart } from "../charts/TaxonomyScatterChart"

import AlignmentCoverageMap from "../charts/AlignmentCoverageMap"
import { FunctionalAnnotationChart } from "../charts/FunctionalAnnotationChart"
import SequenceViewer from "../sequence/SequenceViewer"
import { SEARCH_RESULT_DEPTH, resultViewOptions } from "./constants"
import ProfileBadge from "../annotation/ProfileBadge"
import {
  fetchAnnotations,
  resolveProfile,
  profileLabel,
  biosamplePath,
} from "../../utils/annotation"
import { familyColor } from "../../utils/familyColor"
import { formatCount } from "../../utils/format"
import ExportPanel from "./ExportPanel"
import { queryFullTitle } from "../../utils/queryTitle"
import HitsView from "./metadata/HitsView"
import AlignmentView from "./metadata/AlignmentView"
import EnvironmentsView from "./metadata/EnvironmentsView"
import RecordPanel from "./metadata/RecordPanel"
import { useSamplesBatch, useSearchAlignment } from "./metadata/useSearchData"
import { OriginTag } from "./metadata/parts"
import { enrichmentStatus, hasEnrichment } from "../../utils/searchMetadata"

// Tabs for a search_version 1.5.0 result, which carries store metadata.
// Bookmarkable as #hits / #alignment / #environments. Older results keep TABS.
const METADATA_TABS = [
  { id: "hits", label: "Hits" },
  { id: "alignment", label: "Alignment" },
  { id: "environments", label: "Environments" },
]

const TABS = [
  { id: "descriptions", label: "Descriptions" },
  { id: "graphic", label: "Graphic summary" },
  { id: "taxonomy", label: "Taxonomy" },
  { id: "atlas", label: "Atlas" },
]

// How the search orders hits (the aggregator's ranking, which the export
// files use too).
const RANK_ORDER =
  "ordered by bit score, highest first; ties broken by lower e-value."

// Descriptions-table columns. `help` is the header's hover text: what the
// field is, in a sentence or two.
const TABLE_COLUMNS = [
  {
    label: "#",
    key: "rank",
    help: `Rank in the search results, ${RANK_ORDER} Bit score measures alignment quality independent of database size.`,
  },
  {
    label: "Accession",
    key: "accession",
    help: "PETadex ID of the matching sequence. The prefix shows its source: LG = Logan (assembled from public sequencing runs), NR = NCBI nr, PL = Plasticome.",
  },
  {
    label: "Name",
    key: "name",
    help: "Protein name or description from the sequence's source record, when it has one.",
  },
  {
    label: "Organism",
    key: "organism",
    help: "Organism the sequence comes from, as given in its source record.",
  },
  {
    label: "Family",
    key: "family",
    minWidth: "10rem",
    help: "PETadex enzyme family the hit belongs to.",
  },
  {
    label: "Identity",
    key: "identity",
    help: "Percent of aligned positions where the hit has the same amino acid as the query.",
  },
  {
    label: "E-value",
    key: "evalue",
    minWidth: "8rem",
    help: "Number of hits this good expected by chance in a database this size. Lower is more significant; hits above 1e-3 aren't reported.",
  },
  {
    label: "Coverage",
    key: "query_coverage",
    help: "Percent of the query's length covered by the alignment.",
  },
  {
    label: "BioSample",
    key: "biosample",
    help: "NCBI BioSample of the sequencing run the sequence was assembled from. Only Logan hits can have one.",
  },
  {
    label: "Environment profile",
    key: "profile_sort",
    minWidth: "12rem",
    help: "Kind of environment the sample came from (e.g. soil, marine, human gut), sorted from its BioSample description. Marked when inferred rather than stated in the record.",
  },
  {
    label: "Country",
    key: "country",
    help: "Country where the sample was collected, from its BioSample record.",
  },
]

// Empty enrichment cell: a pending marker while the batch is in flight, a dash
// once it is known there is nothing to show. Neither is an error state.
function AnnotationPlaceholder({ status, hit }) {
  if (status === "loading" && hit.orf_id != null)
    return <span className="text-muted-foreground/60">…</span>
  const title = hit.ann
    ? hit.ann.run == null
      ? "Not from a metagenome run"
      : hit.ann.biosample == null
      ? "No linked SRA sample"
      : undefined
    : undefined
  return (
    <span className="text-muted-foreground" title={title}>
      -
    </span>
  )
}

const ResultsView = ({
  results: allResults,
  metadata,
  sessionId,
  onNewSearch,
  viewCount,
  onViewCountChange,
  viewPending = false,
  allHits = null,
}) => {
  const metaStatus = enrichmentStatus(metadata)
  const showMetadata = hasEnrichment(metaStatus)
  const tabs = showMetadata ? METADATA_TABS : TABS
  const [activeTab, setActiveTabState] = useState(() => {
    const hash =
      typeof window !== "undefined" ? window.location.hash.slice(1) : ""
    if (tabs.some(t => t.id === hash)) return hash
    return tabs[0].id
  })
  const setActiveTab = id => {
    setActiveTabState(id)
    try {
      window.history.replaceState(null, "", `#${id}`)
    } catch {
      // Hash sync is a convenience only.
    }
  }
  // The 1.5.0 views read every stored hit once loaded; until then, the rows
  // already fetched.
  const metaHits = allHits ?? allResults
  // Found in Samples for every Logan hit, once all stored hits are loaded.
  const samples = useSamplesBatch(metaHits, showMetadata && allHits != null)
  const querySequence = cleanSequence(metadata?.query_sequence)
  // The alignment + tree, read once the Alignment tab is first opened and
  // kept across tab switches (each read can start a build).
  const [alignmentWanted, setAlignmentWanted] = useState(false)
  useEffect(() => {
    if (activeTab === "alignment") setAlignmentWanted(true)
  }, [activeTab])
  const alignment = useSearchAlignment(
    showMetadata && alignmentWanted ? sessionId : null
  )
  // TODO: the record popout stands in for the new dataset's sequence pages,
  // which aren't built yet. Replace it with links to those pages (see
  // RecordLink in metadata/parts.jsx).
  const [recordId, setRecordId] = useState(null)
  const closeRecord = useCallback(() => setRecordId(null), [])
  const recordHit = recordId
    ? metaHits.find(h => h.target_id === recordId) ?? null
    : null
  const [familySummaryOpen, setFamilySummaryOpen] = useState(true)
  const [queryOpen, setQueryOpen] = useState(false)
  const [atlasActive, setAtlasActive] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState("asc")
  // BioSample annotation enrichment: orf_id(string) → provenance row. Filled by
  // POST /api/annotations/batch AFTER the hits render — the table never waits.
  const [annotations, setAnnotations] = useState(() => new Map())
  const [annotationStatus, setAnnotationStatus] = useState("idle") // idle | loading | ready | error
  // The finished export's summary, for "Top 500 of N" in the header.
  const [exportSummary, setExportSummary] = useState(null)

  // `allResults` is only what Express sent for the current view count — the
  // stored result is `num_results` deep, and that total is what the selector
  // has to offer. `result_depth` is stamped by the aggregator; until that
  // ships, fall back to the depth the client asks for.
  const totalHits = metadata?.num_results ?? allResults.length
  const resultDepth = metadata?.result_depth ?? SEARCH_RESULT_DEPTH
  const viewOptions = resultViewOptions(totalHits, resultDepth)
  const maxView = viewOptions[viewOptions.length - 1] ?? 0
  const shownCount = Math.min(viewCount, maxView)

  // Defensive re-slice. Express already trimmed to the requested count before
  // enriching, so this is normally a no-op; it only bites if a response carries
  // more rows than the current selection (e.g. a stale in-flight fetch).
  const results = useMemo(
    () => allResults.slice(0, shownCount),
    [allResults, shownCount]
  )

  // num_results < result_depth means DIAMOND's e-value floor ran out of hits
  // before the depth cap did — the search was exhaustive, so every hit above the
  // significance threshold is reachable and no count can ever re-run the search.
  // Otherwise the table is a top-N and ExportPanel offers the rest.
  const isExhaustive = totalHits < resultDepth

  // One batch call for the whole page of hits (≤ 500 rows; the cap is 1,000).
  // Keyed on the id list so re-sorting doesn't refetch, but a deeper view does.
  const orfIdKey = useMemo(
    () =>
      results
        .map(h => h.orf_id)
        .filter(id => id != null)
        .join(","),
    [results]
  )
  useEffect(() => {
    if (!orfIdKey) {
      setAnnotationStatus("idle")
      return
    }
    const controller = new AbortController()
    setAnnotationStatus("loading")
    fetchAnnotations(orfIdKey.split(","), controller.signal)
      .then(map => {
        setAnnotations(map)
        setAnnotationStatus("ready")
      })
      .catch(err => {
        if (err.name === "AbortError") return
        console.error("Annotation enrichment failed:", err)
        setAnnotationStatus("error")
      })
    return () => controller.abort()
  }, [orfIdKey])

  // Hits joined with their provenance row. Sortable keys are flattened onto the
  // row so the existing column sort works on the new columns too.
  const enrichedResults = useMemo(
    () =>
      results.map(hit => {
        const ann =
          hit.orf_id != null ? annotations.get(String(hit.orf_id)) : null
        if (!ann) return { ...hit, ann: null, resolved: null }
        const resolved = resolveProfile(ann)
        return {
          ...hit,
          ann,
          resolved,
          biosample: ann.biosample,
          country: ann.country,
          profile_sort: profileLabel(resolved.profile),
        }
      }),
    [results, annotations]
  )

  const hitFamilyIds = useMemo(
    () => new Set(results.map(h => h.family).filter(f => f != null)),
    [results]
  )

  const handleCopyLink = () => {
    if (!copied) {
      navigator.clipboard?.writeText(
        `${window.location.origin}/results?job=${sessionId}`
      )
      setCopied(true)
    }
    setTimeout(() => setCopied(false), 2000)
  }

  const familyUrl = familyId => `/family/${familyId}`

  const phyloTreeUrl = (familyNum, enzymeIds) => {
    const params = new URLSearchParams()
    if (enzymeIds?.length) params.set("highlight", enzymeIds.join(","))
    if (sessionId) params.set("session", sessionId)
    const qs = params.toString()
    return `/tree/${familyNum}${qs ? `?${qs}` : ""}`
  }

  // Family tally
  const familyCounts = {}
  let unknownCount = 0
  for (const hit of results) {
    if (hit.family != null) {
      const key = `Family ${hit.family}`
      if (!familyCounts[key])
        familyCounts[key] = {
          count: 0,
          enzyme_id: hit.enzyme_id,
          family_num: hit.family,
          has_tree: hit.has_tree,
          enzyme_ids: [],
          accessions: [],
        }
      familyCounts[key].count++
      if (hit.has_tree) familyCounts[key].has_tree = true
      if (hit.enzyme_id != null) {
        const id = String(hit.enzyme_id)
        if (!familyCounts[key].enzyme_ids.includes(id)) {
          familyCounts[key].enzyme_ids.push(id)
        }
      }
      if (hit.accession) {
        const acc = hit.accession
        if (!familyCounts[key].accessions.includes(acc)) {
          familyCounts[key].accessions.push(acc)
        }
      }
    } else {
      unknownCount++
    }
  }
  const sorted = Object.entries(familyCounts).sort(
    (a, b) => b[1].count - a[1].count
  )
  if (unknownCount > 0)
    sorted.push(["Unknown", { count: unknownCount, enzyme_id: null }])
  const uniqueFamilies = Object.keys(familyCounts).length
  const maxCount = sorted[0]?.[1].count || 1

  const cleanSeq = cleanSequence(metadata.query_sequence)
  const queryHeader = queryFullTitle(metadata.query_header)

  const scatterData = results.map(hit => ({
    x: hit.identity,
    y: hit.query_coverage,
    size: hit.bitscore ?? 5,
    evalue: hit.evalue,
    name: hit.accession,
    enzyme_id: hit.enzyme_id,
    family: hit.family,
  }))

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedResults = useMemo(() => {
    if (!sortKey) return enrichedResults
    return [...enrichedResults].sort((a, b) => {
      let av = a[sortKey],
        bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === "string") {
        av = av.toLowerCase()
        bv = (bv || "").toLowerCase()
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [enrichedResults, sortKey, sortDir])

  const handleDownload = () => {
    const headers = [
      "#",
      "Accession",
      "Name",
      "Organism",
      "Family",
      "Identity (%)",
      "E-value",
      "Coverage (%)",
      "BioSample",
      "Country",
      "Environment profile",
      "Profile source",
      "Profile evidence",
      // Last, like DIAMOND's own full_sseq column: it is by far the widest
      // field (~314 aa median) and would push everything else off-screen in a
      // spreadsheet anywhere else in the row.
      "Target sequence",
    ]
    const rows = enrichedResults.map(h => [
      h.rank,
      h.accession,
      h.name || "",
      h.organism || "",
      h.family != null ? `Family ${h.family}` : "",
      h.identity?.toFixed(1) ?? "",
      h.evalue ?? "",
      h.query_coverage ?? "",
      h.ann?.biosample || "",
      h.ann?.country || "",
      h.resolved?.profile || "",
      h.resolved?.source || "",
      h.resolved?.source === "own" ? h.resolved.evidence || "" : "",
      // The full subject protein, not the aligned segment. Empty for a hit
      // merged from a part written by a pre-1.3.0 worker, which stores null.
      h.target_sequence || "",
    ])
    downloadCSV(
      generateCSV(headers, rows),
      `petadex-results-${sessionId || "search"}`
    )
  }
  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify({ metadata, results }, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `petadex-results-${sessionId || "search"}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full px-4 md:px-8">
      {/* Results header */}
      <div className="flex justify-between items-start mb-4 gap-2 py-4">
        <div>
          {/* "Top 500 by bit score", never "500 results": a capped table is
              not the complete answer (and DIAMOND's -k is a heuristic, so the
              export can even hold a top-500 hit the table missed). */}
          <h2 className="text-lg">
            {allResults.length === 0
              ? "No results found"
              : isExhaustive
              ? `${formatCount(totalHits)} significant ${
                  totalHits === 1 ? "hit" : "hits"
                }`
              : `Top ${formatCount(resultDepth)} by bit score`}
          </h2>
          {allResults.length > 0 && (
            <p className="text-sm text-secondary-foreground">
              {isExhaustive
                ? `These are all ${formatCount(
                    totalHits
                  )} significant hits (e-value ≤ 1e-3).`
                : exportSummary?.total_hits != null
                ? `Top ${formatCount(resultDepth)} of ${formatCount(
                    exportSummary.total_hits
                  )} significant hits.`
                : "More significant hits exist beyond these."}
            </p>
          )}
          {metadata && (
            <p className="text-xs text-muted-foreground">
              {[
                metadata.query_length && `Query: ${metadata.query_length} aa`,
                metadata.database_release &&
                  `Release: ${metadata.database_release}`,
                metadata.database_size &&
                  `DB: ${metadata.database_size.toLocaleString()} seqs`,
                metadata.search_time_ms &&
                  `Search time: ${metadata.search_time_ms}ms`,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          )}
          {showMetadata && metadata?.summary?.by_origin && (
            <p className="text-xs text-muted-foreground">
              {Object.entries(metadata.summary.by_origin).map(([o, n]) => (
                <span key={o} className="mr-3 inline-flex items-center gap-1">
                  <span className="tabular-nums">{n}</span>
                  <OriginTag db={o} />
                </span>
              ))}
            </p>
          )}
          {metaStatus === "failed" && (
            <p role="status" className="text-xs text-warning">
              Metadata lookup failed.
            </p>
          )}
          {!showMetadata && viewOptions.length > 1 && (
            <div className="flex items-center gap-2 mt-3">
              <span
                id="row-count-label"
                className="text-xs font-semibold uppercase tracking-tighter text-muted-foreground"
              >
                Show
              </span>
              <div
                role="group"
                aria-labelledby="row-count-label"
                className="inline-flex rounded-lg border border-input overflow-hidden"
              >
                {viewOptions.map(n => {
                  const active = n === shownCount
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={active}
                      onClick={() => !active && onViewCountChange(n)}
                      disabled={viewPending}
                      className={[
                        "px-2.5 py-1 text-xs tabular-nums border-l border-input first:border-l-0 transition-colors disabled:cursor-wait",
                        active
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "bg-background text-secondary-foreground hover:bg-surface-raised",
                      ].join(" ")}
                    >
                      {n === maxView ? `All ${n}` : n}
                    </button>
                  )
                })}
              </div>
              {viewPending && (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-border border-t-accent animate-spin" />
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {sessionId && (
            <button
              className={
                copied
                  ? "btn btn-primary cursor-not-allowed"
                  : "btn btn-secondary"
              }
              onClick={handleCopyLink}
              title="Copy shareable link"
              disabled={copied}
            >
              {copied ? "✓ Copied!" : "🔗 Copy link"}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onNewSearch}>
            ← New search
          </button>
        </div>
      </div>
      {!isExhaustive && allResults.length > 0 && (
        <ExportPanel
          metadata={metadata}
          sessionId={sessionId}
          onSummary={setExportSummary}
        />
      )}
      {/* Query sequence pill */}
      {cleanSeq && (
        <div className="bg-surface-raised border border-border rounded-md mb-4 overflow-hidden">
          {/* Title on its own line, sequence below. Collapsed, each is one
              truncated line; expanded, both wrap in full, with the sequence
              viewer below. The sequence text sits outside the toggle button
              so it can be selected and copied. */}
          <button
            className="flex items-start gap-2 w-full px-4 pt-2 pb-0.5 cursor-pointer text-left bg-transparent hover:bg-border"
            onClick={() => setQueryOpen(o => !o)}
            aria-expanded={queryOpen}
            aria-controls="query-sequence"
          >
            <span
              className={`text-sm min-w-0 flex-1 ${
                queryOpen ? "wrap-break-word" : "truncate"
              }`}
              title={queryOpen ? undefined : queryHeader || undefined}
            >
              <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                Query{queryHeader ? ": " : ""}
              </span>
              {queryHeader && (
                <span className="font-semibold text-foreground">
                  {queryHeader}
                </span>
              )}
            </span>
            <span
              className={`text-sm text-gray-400 inline-block transition-transform duration-200 shrink-0 ${
                queryOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
          <p
            id="query-sequence"
            className={`px-4 pb-2 font-mono text-sm text-secondary-foreground ${
              queryOpen ? "break-all select-text" : "truncate"
            }`}
          >
            {queryOpen ? cleanSeq : formatSeq(cleanSeq, 60)}
            {queryOpen && (
              <span className="ml-2 text-xs text-muted-foreground font-sans">
                ({cleanSeq.length} aa)
              </span>
            )}
          </p>
          {queryOpen && (
            <SequenceViewer
              aminoAcidSequence={cleanSeq}
              nucleotideSequence={null}
            />
          )}
        </div>
      )}
      {allResults.length === 0 ? (
        <div className="p-3 text-center text-muted-foreground">
          <p>No similar sequences were found in the PETadex database.</p>
          <p>
            Try adjusting your search parameters or using a different sequence.
          </p>
          <button className="btn btn-primary mt-4" onClick={onNewSearch}>
            ← New search
          </button>
        </div>
      ) : (
        <>
          {/* Family summary — persists above tabs.
              TODO: hidden for search_version 1.5.0 results, whose hits carry no
              PETadex family number, so every hit lands in "Unknown". Bring it
              back once the family clustering is done, counting hits per family
              (it could read metadata.summary.clusters.c60 until then). */}
          {!showMetadata && (
            <div className="mb-5 py-3.5 px-4 bg-surface-raised border border-border rounded-sm">
              <div
                role="button"
                tabIndex={0}
                className="flex justify-between items-center text-sm font-semibold text-muted-foreground uppercase tracking-tighter cursor-pointer select-none"
                onClick={() => setFamilySummaryOpen(o => !o)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setFamilySummaryOpen(o => !o)
                  }
                }}
              >
                <span>
                  {uniqueFamilies}{" "}
                  {uniqueFamilies === 1 ? "family" : "families"} represented
                  across {results.length} hits
                </span>
                <span
                  className={`text-sm text-gray-400 inline-block transition-transform duration-200 ${
                    familySummaryOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </div>
              {familySummaryOpen && (
                <div className="flex flex-col gap-1.5 mt-2.5">
                  {sorted.map(
                    ([label, { count, family_num, has_tree, enzyme_ids }]) => (
                      <div
                        key={label}
                        className="flex items-center gap-0.5 text-sm"
                      >
                        <div className="w-28 shrink-0 whitespace-nowrap text-muted-foreground flex items-center gap-1.5">
                          {label !== "Unknown" && family_num != null ? (
                            <Link
                              to={familyUrl(family_num)}
                              className="hover:underline"
                              style={{ color: familyColor(family_num) }}
                            >
                              {label}
                            </Link>
                          ) : (
                            label
                          )}
                        </div>
                        <div className="flex flex-1 mr-2 h-2 bg-surface-sunken rounded-xs overflow-hidden">
                          <div
                            className="h-full rounded-xs transition-width duration-300 "
                            style={{
                              width: `${(count / maxCount) * 100}%`,
                              background:
                                label === "Unknown"
                                  ? "#adb5bd"
                                  : familyColor(family_num),
                            }}
                          />
                        </div>
                        <div className="w-15 shrink-0 text-right text-gray-400">
                          {count} ({Math.round((count / results.length) * 100)}
                          %)
                        </div>
                        {has_tree && family_num != null && (
                          <Link
                            to={phyloTreeUrl(family_num, enzyme_ids)}
                            className="shrink-0 text-xs text-accent hover:underline ml-2 whitespace-nowrap"
                          >
                            View phylogeny
                          </Link>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
          {/* Tab navigation */}
          <div className="flex flex-wrap border-b mt-2 mb-2 gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`btn btn-ghost ${
                  activeTab === tab.id
                    ? "text-accent font-semibold border-b-accent"
                    : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Tab panels */}
          <div className="px-6 py-4">
            {showMetadata && activeTab === "hits" && (
              <HitsView
                hits={metaHits}
                samples={samples}
                clusters={metadata.clusters}
                metadata={metadata}
                sessionId={sessionId}
                onOpenRecord={setRecordId}
              />
            )}
            {showMetadata && activeTab === "alignment" && (
              <AlignmentView
                hits={metaHits}
                sessionId={sessionId}
                querySequence={querySequence}
                alignment={alignment}
                queryLength={metadata.query_length}
                onOpenRecord={setRecordId}
              />
            )}
            {showMetadata && activeTab === "environments" && (
              <EnvironmentsView
                hits={metaHits}
                samples={samples}
                environments={metadata.summary?.environments}
                onOpenRecord={setRecordId}
              />
            )}

            {/* Graphic summary */}
            {activeTab === "graphic" && (
              <div className="grid gap-8 auto-cols-fr">
                <div className="flex flex-col gap-2">
                  <p className="label">Identity vs. Query Coverage</p>
                  <Scatterplot
                    height={500}
                    data={scatterData}
                    familyCounts={familyCounts}
                    unknownCount={unknownCount}
                    total={results.length}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="label">Alignment Coverage Map</p>
                  <AlignmentCoverageMap data={results} />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="label">Functional Annotation</p>
                  <FunctionalAnnotationChart data={results} height={500} />
                </div>
              </div>
            )}

            {/* Taxonomy */}
            {activeTab === "taxonomy" && (
              <div className="flex flex-col gap-2">
                <p className="label">Taxonomy vs. Identity</p>
                <TaxonomyScatterChart data={results} height={560} />
              </div>
            )}

            {/* Descriptions table */}
            {activeTab === "descriptions" && (
              <div className="overflow-x-auto">
                <div className="flex flex-wrap items-center justify-end mb-2 gap-2">
                  <div className="mr-auto flex items-center gap-2 text-sm">
                    {annotationStatus === "loading" && (
                      <span className="text-xs text-muted-foreground">
                        Loading sample metadata…
                      </span>
                    )}
                    {annotationStatus === "error" && (
                      <span className="text-xs text-destructive">
                        Sample metadata unavailable
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={handleDownloadJSON}
                    title={`Downloads the ${results.length} hits currently shown`}
                  >
                    ⬇ Download JSON
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={handleDownload}
                    title={`Downloads the ${results.length} hits currently shown`}
                  >
                    ⬇ Download CSV
                  </button>
                  <p className="basis-full text-right text-xs text-muted-foreground">
                    CSV and JSON downloads include metadata.
                  </p>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {TABLE_COLUMNS.map(({ label, key, minWidth, help }) => (
                        <th
                          key={key}
                          className="cursor-pointer select-none whitespace-nowrap bg-surface-raised text-left py-2 px-2.5 font-semibold"
                          style={{
                            minWidth: minWidth || undefined,
                          }}
                          onClick={() => handleSort(key)}
                          title={`${help}\n\nClick to sort.`}
                        >
                          <span className="underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">
                            {label}
                          </span>
                          <span
                            className={`ml-1 ${
                              sortKey === key ? "opacity-100" : "opacity-30"
                            } text-xs`}
                          >
                            {sortKey === key
                              ? sortDir === "asc"
                                ? "▲"
                                : "▼"
                              : "⇅"}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map(hit => (
                      <tr
                        key={`${hit.rank}-${hit.accession}`}
                        className="hover:bg-surface-raised"
                      >
                        <td
                          className="py-2 px-2.5 tabular-nums"
                          title={`Rank ${hit.rank} of ${totalHits}: ${RANK_ORDER}`}
                        >
                          {hit.rank}
                        </td>
                        <td className="py-2 px-2.5">
                          {/* v260701 petadex_ids have no sequence page yet
                              (sequence_href null): plain text, not a link to
                              a v1.1 page with the wrong id. */}
                          {hit.origin ? (
                            <span>{hit.display_id || hit.accession}</span>
                          ) : (
                            <a
                              href={
                                hit.sequence_href ||
                                `/sequence/${hit.accession}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                              style={{
                                color:
                                  hit.family != null
                                    ? familyColor(hit.family)
                                    : undefined,
                              }}
                            >
                              {hit.display_id || hit.accession}
                            </a>
                          )}
                          {hit.origin && (
                            <span className="block text-xs text-muted-foreground">
                              {hit.origin}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5">{hit.name || "-"}</td>
                        <td className="py-2 px-2.5">
                          <em>{hit.organism || "-"}</em>
                        </td>
                        <td className="py-2 px-2.5">
                          {hit.family != null ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-[50%] shrink-0"
                                style={{
                                  backgroundColor: familyColor(hit.family),
                                }}
                              />
                              <a
                                href={familyUrl(hit.family)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                                style={{ color: familyColor(hit.family) }}
                              >
                                Family {hit.family}
                              </a>
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-2 px-2.5">
                          <span
                            className="inline-block h-1.5 bg-success rounded-md mr-1 align-middle"
                            style={{
                              width: `${
                                Math.min(hit.identity ?? 0, 100) * 0.6
                              }px`,
                            }}
                          />
                          {hit.identity?.toFixed(1) ?? "-"}%
                        </td>
                        <td className="py-2 px-2.5">
                          {hit.evalue === 0
                            ? "0"
                            : hit.evalue?.toExponential(1) ?? "-"}
                        </td>
                        <td className="py-2 px-2.5">
                          {hit.query_coverage ?? "-"}%
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {hit.ann?.biosample ? (
                            <Link
                              to={biosamplePath(hit.ann.biosample)}
                              className="font-mono text-xs text-info hover:underline"
                            >
                              {hit.ann.biosample}
                            </Link>
                          ) : (
                            <AnnotationPlaceholder
                              status={annotationStatus}
                              hit={hit}
                            />
                          )}
                        </td>
                        <td className="py-2 px-2.5">
                          {hit.resolved?.profile ? (
                            <ProfileBadge {...hit.resolved} />
                          ) : (
                            <AnnotationPlaceholder
                              status={annotationStatus}
                              hit={hit}
                            />
                          )}
                        </td>
                        <td className="py-2 px-2.5">
                          {hit.ann?.country || (
                            <AnnotationPlaceholder
                              status={annotationStatus}
                              hit={hit}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Atlas */}
            {activeTab === "atlas" && (
              <div style={{ position: "relative" }}>
                <AtlasMap
                  highlightFamilyIds={hitFamilyIds}
                  controllerEnabled={atlasActive}
                />
                {!atlasActive && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setAtlasActive(true)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setAtlasActive(true)
                      }
                    }}
                    onMouseLeave={() => setAtlasActive(false)}
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(15,23,42,0.45)",
                      cursor: "pointer",
                      borderRadius: 8,
                    }}
                  >
                    <span
                      style={{
                        color: "#fff",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        background: "rgba(0,0,0,0.5)",
                        padding: "0.4rem 1rem",
                        borderRadius: 20,
                      }}
                    >
                      Click to interact
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      {showMetadata && (
        <RecordPanel
          hit={recordHit}
          querySequence={querySequence}
          hits={metaHits}
          clusters={metadata.clusters}
          onClose={closeRecord}
        />
      )}
    </div>
  )
}

export default ResultsView
