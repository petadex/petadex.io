import React, { useState, useMemo } from "react"
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

// Deterministic per-family color — must match enzymes.js
function familyColor(familyId) {
  const hue = (familyId * 137.508) % 360
  return `hsl(${hue}, 60%, 45%)`
}

const TABS = [
  { id: "descriptions", label: "Descriptions" },
  { id: "graphic", label: "Graphic summary" },
  { id: "taxonomy", label: "Taxonomy" },
  { id: "atlas", label: "Atlas" },
]

const ResultsView = ({
  results: allResults,
  metadata,
  sessionId,
  onNewSearch,
  viewCount,
  onViewCountChange,
  viewPending = false,
}) => {
  const [activeTab, setActiveTab] = useState("descriptions")
  const [familySummaryOpen, setFamilySummaryOpen] = useState(true)
  const [queryOpen, setQueryOpen] = useState(false)
  const [atlasActive, setAtlasActive] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState("asc")

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
  const isExhaustive = totalHits < resultDepth

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
  const queryHeader = metadata.query_header || null

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
    if (!sortKey) return results
    return [...results].sort((a, b) => {
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
  }, [results, sortKey, sortDir])

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
      // Last, like DIAMOND's own full_sseq column: it is by far the widest
      // field (~314 aa median) and would push everything else off-screen in a
      // spreadsheet anywhere else in the row.
      "Target sequence",
    ]
    const rows = results.map(h => [
      h.rank,
      h.accession,
      h.name || "",
      h.organism || "",
      h.family != null ? `Family ${h.family}` : "",
      h.identity?.toFixed(1) ?? "",
      h.evalue ?? "",
      h.query_coverage ?? "",
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
          <h2 className="text-lg">
            {allResults.length === 0
              ? "No results found"
              : `${totalHits} sequences found`}
          </h2>
          {metadata && (
            <p className="text-xs text-muted-foreground">
              {[
                metadata.query_length && `Query: ${metadata.query_length} aa`,
                metadata.database_size &&
                  `DB: ${metadata.database_size.toLocaleString()} seqs`,
                metadata.search_time_ms &&
                  `Search time: ${metadata.search_time_ms}ms`,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          )}
          {viewOptions.length > 1 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-foreground">
              <label className="flex items-center gap-2">
                Show
                <select
                  value={shownCount}
                  onChange={e =>
                    onViewCountChange(parseInt(e.target.value, 10))
                  }
                  disabled={viewPending}
                  className="bg-background border border-input text-foreground text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-ring disabled:opacity-60 transition-colors"
                >
                  {viewOptions.map(n => (
                    <option key={n} value={n}>
                      {n === maxView ? `All (${n})` : n}
                    </option>
                  ))}
                </select>
                of {totalHits} hits
              </label>
              {viewPending && (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-border border-t-accent animate-spin" />
              )}
              <span
                className="text-xs text-muted-foreground"
                title={
                  isExhaustive
                    ? "Every hit above DIAMOND's significance cutoff was stored — showing more re-reads the cached result, it never re-runs the search."
                    : `The search stored the top ${resultDepth} hits; more may exist below this depth.`
                }
              >
                {isExhaustive
                  ? "· complete result set"
                  : `· capped at search depth ${resultDepth}`}
              </span>
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
      {/* Query sequence pill */}
      {cleanSeq && (
        <div className="bg-surface-raised border border-border rounded-md mb-4 overflow-hidden">
          <button
            className="flex items-center gap-2 w-full px-4 py-2 cursor-pointer text-left bg-transparent hover:bg-border"
            onClick={() => setQueryOpen(o => !o)}
          >
            <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground shrink-0">
              Query{queryHeader ? `: ${queryHeader}` : ""}
            </span>
            <span className="font-mono text-sm text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap flex min-w-0">
              {formatSeq(cleanSeq, 60)}
            </span>
            <span
              className={`text-sm text-gray-400 inline-block transition-transform duration-200 ml-auto ${
                queryOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
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
          {/* Family summary — persists above tabs */}
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
                {uniqueFamilies} {uniqueFamilies === 1 ? "family" : "families"}{" "}
                represented across {results.length} hits
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
                        {count} ({Math.round((count / results.length) * 100)}%)
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
          {/* Tab navigation */}
          <div className="flex border-b mt-2 mb-2 gap-0">
            {TABS.map(tab => (
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
                <div className="flex justify-end mb-2 gap-2">
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
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {[
                        { label: "#", key: "rank" },
                        { label: "Accession", key: "accession" },
                        { label: "Name", key: "name" },
                        { label: "Organism", key: "organism" },
                        { label: "Family", key: "family", minWidth: "10rem" },
                        { label: "Identity", key: "identity" },
                        { label: "E-value", key: "evalue", minWidth: "8rem" },
                        { label: "Coverage", key: "query_coverage" },
                      ].map(({ label, key, minWidth }) => (
                        <th
                          key={key}
                          className="cursor-pointer select-none whitespace-nowrap bg-surface-raised text-left py-2 px-2.5 font-semibold"
                          style={{
                            minWidth: minWidth || undefined,
                          }}
                          onClick={() => handleSort(key)}
                        >
                          {label}
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
                        <td className="py-2 px-2.5">{hit.rank}</td>
                        <td className="py-2 px-2.5">
                          <a
                            href={
                              hit.sequence_href || `/sequence/${hit.accession}`
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
    </div>
  )
}

export default ResultsView
