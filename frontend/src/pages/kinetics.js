import React, { useState, useEffect, useMemo } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import { useScrollHeader } from "../hooks/useScrollHeader"
import config from "../config"

// Predicted data (kept as static for now)
const predictedData = [
  { enzyme: "IsPETase-like candidate #1", species: "CatPred hit", substrate: "MHET", temp: "30", ph: "8.0", kcat: "0.085", km: "0.0000032", ratio: "26562.5", model: "CatPred v1.2" },
  { enzyme: "IsPETase-like candidate #2", species: "CatPred hit", substrate: "MHET", temp: "30", ph: "8.0", kcat: "0.140", km: "0.0000015", ratio: "93333.3", model: "CatPred v1.2" }
]

// ── Cell render helpers ────────────────────────────────────────────────────
const doiLink = v =>
  v ? (
    <a
      href={v}
      target="_blank"
      rel="noopener noreferrer"
      title="View paper"
      className="whitespace-nowrap text-accent hover:text-accent-hover underline underline-offset-2 transition-colors"
    >
      Paper ↗
    </a>
  ) : (
    "—"
  )

// Long free-text / sequence fields: truncate but keep the full value on hover.
const truncated = v =>
  v ? (
    <span className="block max-w-56 truncate" title={v}>
      {v}
    </span>
  ) : (
    "—"
  )

// ── Column definitions ─────────────────────────────────────────────────────
// Both tabs show the same nine columns in the collapsed (default) view, so the
// layout lives in one place. Percent widths + `table-fixed` keep that view
// inside the viewport — no horizontal scrolling until "Show all fields" is on.
// Units live on their own line under the header label to keep the numeric
// columns narrow.
const makeBaseColumns = (keys, sourceColumn) => [
  { key: keys.enzyme, label: "Enzyme", width: "19%", cellClass: "font-medium text-foreground break-words" },
  { key: keys.species, label: "Organism", width: "19%", cellClass: "italic text-secondary-foreground break-words" },
  { key: keys.substrate, label: "Substrate", width: "13%", cellClass: "text-secondary-foreground break-words" },
  { key: keys.temp, label: "Temp", unit: "°C", numeric: true, width: "7%", cellClass: "text-muted-foreground" },
  { key: keys.ph, label: "pH", numeric: true, width: "6%", cellClass: "text-muted-foreground" },
  {
    key: keys.kcat,
    label: (<span>k<sub>cat</sub></span>),
    unit: "s⁻¹",
    numeric: true,
    width: "9%",
    cellClass: "font-mono text-xs tabular-nums text-secondary-foreground",
  },
  {
    key: keys.km,
    label: (<span>K<sub>m</sub></span>),
    unit: "M",
    numeric: true,
    width: "9%",
    cellClass: "font-mono text-xs tabular-nums text-secondary-foreground",
  },
  {
    key: keys.ratio,
    label: (<span>k<sub>cat</sub>/K<sub>m</sub></span>),
    unit: "M⁻¹s⁻¹",
    numeric: true,
    width: "10%",
    cellClass: "font-mono text-xs tabular-nums text-accent font-medium",
  },
  sourceColumn,
]

// Published (SQL) table — keys are the raw plastic_kinetics_published column names.
const PUBLISHED_BASE_COLUMNS = makeBaseColumns(
  {
    enzyme: "Enzyme",
    species: "Species",
    substrate: "Substrate",
    temp: "Temperature",
    ph: "pH",
    kcat: "Kcat_(/s)",
    km: "Km_(M)",
    ratio: "Kcat/Km_(/s/M)",
  },
  { key: "DOI", label: "Source", sortable: false, width: "8%", render: doiLink }
)

// Extra columns revealed by the "Show all fields" toggle.
const PUBLISHED_EXTRA_COLUMNS = [
  { key: "Class", label: "Class", cellClass: "text-secondary-foreground" },
  { key: "Experiment_#", label: "Experiment #", cellClass: "font-mono text-muted-foreground" },
  { key: "Uniprot", label: "UniProt", cellClass: "font-mono text-secondary-foreground" },
  { key: "GenBank", label: "GenBank", cellClass: "font-mono text-secondary-foreground" },
  { key: "AA_SEQ", label: "AA sequence", sortable: false, cellClass: "font-mono text-2xs text-muted-foreground", render: truncated },
  { key: "Substrate_SMILES", label: "Substrate SMILES", sortable: false, cellClass: "font-mono text-2xs text-muted-foreground", render: truncated },
  { key: "Paper_#", label: "Paper #", numeric: true, cellClass: "text-muted-foreground" },
  { key: "Pubmed", label: "PubMed", cellClass: "font-mono text-muted-foreground" },
  { key: "Supplemental", label: "Supplemental", sortable: false, cellClass: "text-muted-foreground", render: truncated },
]

// Predicted (static) table — keys match predictedData.
const PREDICTED_COLUMNS = makeBaseColumns(
  {
    enzyme: "enzyme",
    species: "species",
    substrate: "substrate",
    temp: "temp",
    ph: "ph",
    kcat: "kcat",
    km: "km",
    ratio: "ratio",
  },
  {
    key: "model",
    label: "Source",
    sortable: false,
    width: "8%",
    cellClass: "text-muted-foreground italic text-2xs break-words",
  }
)

const KineticsPage = () => {
  useScrollHeader()

  const [activeTab, setActiveTab] = useState("published")
  const [searchTerm, setSearchTerm] = useState("")
  const [substrateFilter, setSubstrateFilter] = useState("")
  const [organismFilter, setOrganismFilter] = useState("")
  const [experimentalData, setExperimentalData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState("asc")
  const [showAllFields, setShowAllFields] = useState(false)

  // Mirror SiteHeader's hide-on-scroll-down behavior so the sticky tab bar
  // can collapse upward instead of leaving a gap.
  useEffect(() => {
    let last = 0
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        setHeaderHidden(y > 80 && y > last)
        last = y
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Fetch the complete published table (all columns) from the API. The same
  // payload powers the table, the "Show all fields" toggle, and the download.
  useEffect(() => {
    if (activeTab !== "published") return
    setLoading(true)
    fetch(`${config.apiUrl}/kinetics/published/raw`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setExperimentalData(Array.isArray(data) ? data : data.data || [])
        setError(null)
      })
      .catch(err => {
        console.error("Error fetching published kinetics:", err)
        setError("Failed to load published data. Please try again later.")
      })
      .finally(() => setLoading(false))
  }, [activeTab])

  const switchTab = tab => {
    setActiveTab(tab)
    setSearchTerm("")
    setSubstrateFilter("")
    setOrganismFilter("")
    setSortKey(null)
  }

  const currentDataset = activeTab === "published" ? experimentalData : predictedData

  // Extract unique values for filter dropdowns
  const uniqueSubstrates = useMemo(() => {
    const key = activeTab === "published" ? "Substrate" : "substrate"
    const values = new Set(currentDataset.map(row => row[key]).filter(Boolean))
    return Array.from(values).sort()
  }, [currentDataset, activeTab])

  const uniqueOrganisms = useMemo(() => {
    const key = activeTab === "published" ? "Species" : "species"
    const values = new Set(currentDataset.map(row => row[key]).filter(Boolean))
    return Array.from(values).sort()
  }, [currentDataset, activeTab])

  const columns = useMemo(() => {
    if (activeTab !== "published") return PREDICTED_COLUMNS
    return showAllFields
      ? [...PUBLISHED_BASE_COLUMNS, ...PUBLISHED_EXTRA_COLUMNS]
      : PUBLISHED_BASE_COLUMNS
  }, [activeTab, showAllFields])

  // Only the nine base columns have widths that add up to 100%; the expanded
  // view falls back to auto layout + horizontal scroll.
  const fixedLayout = activeTab !== "published" || !showAllFields

  const filteredData = useMemo(() => {
    const substrateKey = activeTab === "published" ? "Substrate" : "substrate"
    const organismKey = activeTab === "published" ? "Species" : "species"

    return currentDataset.filter(row => {
      // Text search across all fields
      const matchesSearch =
        !searchTerm ||
        Object.values(row).some(val =>
          String(val ?? "").toLowerCase().includes(searchTerm.toLowerCase())
        )

      // Dropdown filters
      const matchesSubstrate =
        !substrateFilter || row[substrateKey] === substrateFilter
      const matchesOrganism =
        !organismFilter || row[organismKey] === organismFilter

      return matchesSearch && matchesSubstrate && matchesOrganism
    })
  }, [currentDataset, searchTerm, substrateFilter, organismFilter, activeTab])

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedData = useMemo(() => {
    const col = columns.find(c => c.key === sortKey)
    if (!sortKey || !col) return filteredData // hidden/absent column → leave unsorted
    const numeric = col.numeric
    return [...filteredData].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const aEmpty = av == null || av === ""
      const bEmpty = bv == null || bv === ""
      if (aEmpty && bEmpty) return 0
      if (aEmpty) return 1 // nulls always sort last
      if (bEmpty) return -1
      let cmp
      if (numeric) {
        const an = Number(av)
        const bn = Number(bv)
        cmp = isNaN(an) || isNaN(bn) ? String(av).localeCompare(String(bv)) : an - bn
      } else {
        cmp = String(av).toLowerCase().localeCompare(String(bv).toLowerCase())
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filteredData, sortKey, sortDir, columns])

  // Build a CSV string from an array of row objects, using their keys as headers.
  const generateCSV = data => {
    if (!data || data.length === 0) return ""
    const headers = Object.keys(data[0])
    const rows = data.map(row =>
      headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
    )
    return [headers.join(","), ...rows].join("\n")
  }

  const triggerDownload = (csv, filename) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Published: download the complete raw SQL table (all columns, all rows).
  const downloadRawPublished = () => {
    if (!experimentalData.length) return
    triggerDownload(generateCSV(experimentalData), "plastic_kinetics_published_full.csv")
  }

  const downloadPredicted = () => {
    triggerDownload(generateCSV(predictedData), "predicted_kinetics.csv")
  }

  const showLoading = loading && activeTab === "published"
  const showError = error && activeTab === "published"

  return (
    <>
      {/* Hero */}
      <section className="py-12 md:py-16 border-b border-border">
        <Container>
          <p className="label text-accent mb-3">Kinetics Registry</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            Enzyme Kinetic Parameters
          </h1>
          <p className="text-lg text-secondary-foreground max-w-3xl">
            Explore experimental and machine‑learning predicted enzyme kinetic parameters,
            including Michaelis constants (<span className="font-mono text-sm">K<sub>m</sub></span>)
            and turnover numbers (<span className="font-mono text-sm">k<sub>cat</sub></span>).
          </p>
        </Container>
      </section>

      {/* Sticky tabs — collapses to top:0 when SiteHeader auto-hides */}
      <div
        className={`sticky z-30 bg-background/95 backdrop-blur-md border-b border-border transition-[top] duration-300 ease-out ${
          headerHidden ? "top-0" : "top-16"
        }`}
      >
        <Container>
          <nav className="flex gap-1 overflow-x-auto -mx-2 px-2" aria-label="Kinetics data source">
            <button
              onClick={() => switchTab("published")}
              className={`relative shrink-0 px-4 md:px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md ${
                activeTab === "published"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={activeTab === "published" ? "page" : undefined}
            >
              <span className="flex items-center gap-2.5">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-2xs font-mono font-bold transition-colors ${
                  activeTab === "published"
                    ? "bg-accent text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  1
                </span>
                <span>Published</span>
                <span className="hidden md:inline text-xs font-normal text-muted-foreground">
                  — Experimental data
                </span>
              </span>
              {activeTab === "published" && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>

            <button
              onClick={() => switchTab("predicted")}
              className={`relative shrink-0 px-4 md:px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md ${
                activeTab === "predicted"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={activeTab === "predicted" ? "page" : undefined}
            >
              <span className="flex items-center gap-2.5">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-2xs font-mono font-bold transition-colors ${
                  activeTab === "predicted"
                    ? "bg-accent text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  2
                </span>
                <span>Predicted</span>
                <span className="hidden md:inline text-xs font-normal text-muted-foreground">
                  — CatPred models
                </span>
              </span>
              {activeTab === "predicted" && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          </nav>
        </Container>
      </div>

      {/* Section blurb */}
      <section className="pt-8 pb-2">
        <Container>
          <p className="text-sm text-muted-foreground max-w-3xl italic">
            {activeTab === "published"
              ? "Experimental kinetic parameters from peer‑reviewed literature."
              : "Machine‑learning predicted kinetic parameters from CatPred models."}
          </p>
        </Container>
      </section>

      {/* Main content */}
      <section className="py-8 md:py-10">
        <Container>
          {/* WIP notice for Predicted tab */}
          {activeTab === "predicted" && (
            <div className="mb-6 px-4 py-3 rounded-lg border border-warning/30 bg-warning/5 text-warning">
              <p className="text-sm font-medium">
                This section is a work in progress.
              </p>
              <p className="text-xs mt-1 text-warning/80">
                We are actively adding CatPred model predictions. Check back soon for updates.
              </p>
            </div>
          )}

          {/* Controls: Search + Filters + Download */}
          <div className="flex flex-col gap-4 mb-4">
            {/* Row 1: Search + Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-40 sm:w-48 text-sm py-2"
              />

              <select
                value={substrateFilter}
                onChange={(e) => setSubstrateFilter(e.target.value)}
                className="input text-sm py-2 pr-8 min-w-[140px]"
              >
                <option value="">All substrates</option>
                {uniqueSubstrates.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={organismFilter}
                onChange={(e) => setOrganismFilter(e.target.value)}
                className="input text-sm py-2 pr-8 min-w-[160px]"
              >
                <option value="">All organisms</option>
                {uniqueOrganisms.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>

              {(searchTerm || substrateFilter || organismFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm("")
                    setSubstrateFilter("")
                    setOrganismFilter("")
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Row 2: Show all fields + Download */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {activeTab === "published" && (
                  <label className="inline-flex items-center gap-2 text-sm text-secondary-foreground cursor-pointer select-none whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showAllFields}
                      onChange={(e) => setShowAllFields(e.target.checked)}
                      className="accent-accent w-4 h-4"
                    />
                    Show all fields
                  </label>
                )}

                {activeTab === "published" && !showAllFields && (
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Toggle to see all columns, or download for the complete table.
                  </p>
                )}
              </div>

              {activeTab === "published" ? (
                <button
                  className="btn btn-outline"
                  onClick={downloadRawPublished}
                  disabled={loading || !experimentalData.length}
                  title="Download the complete raw plastic_kinetics_published table"
                >
                  Download CSV
                </button>
              ) : (
                <button className="btn btn-outline" onClick={downloadPredicted}>
                  Download CSV
                </button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div
            className="w-full max-h-[calc(100vh-280px)] overflow-auto rounded-xl border border-border bg-card shadow-sm"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "var(--color-border) transparent",
            }}
          >
            {showLoading ? (
              <div className="px-4 py-12 text-center text-muted-foreground">Loading published data…</div>
            ) : showError ? (
              <div className="px-4 py-12 text-center text-destructive">{error}</div>
            ) : (
              <table
                className={`border-collapse text-sm ${
                  fixedLayout ? "w-full table-fixed" : "min-w-full"
                }`}
              >
                <thead className="sticky top-0 z-10">
                  <tr>
                    {columns.map(col => {
                      const sortable = col.sortable !== false
                      return (
                        <th
                          key={col.key}
                          onClick={sortable ? () => handleSort(col.key) : undefined}
                          style={fixedLayout && col.width ? { width: col.width } : undefined}
                          className={`bg-surface-raised align-bottom py-2 px-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                            col.numeric ? "text-right" : "text-left"
                          } ${fixedLayout ? "" : "whitespace-nowrap"} ${
                            sortable ? "cursor-pointer select-none" : ""
                          }`}
                        >
                          <span
                            className={`inline-flex items-start gap-1 ${
                              col.numeric ? "justify-end" : ""
                            }`}
                          >
                            <span className="leading-tight">
                              {col.label}
                              {col.unit && (
                                <span className="block text-2xs font-normal normal-case tracking-normal opacity-60">
                                  {col.unit}
                                </span>
                              )}
                            </span>
                            {sortable && (
                              <span
                                className={`text-xs ${
                                  sortKey === col.key ? "opacity-100" : "opacity-30"
                                }`}
                              >
                                {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                              </span>
                            )}
                          </span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.length > 0 ? (
                    sortedData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-raised transition-colors">
                        {columns.map(col => {
                          const value = row[col.key]
                          return (
                            <td
                              key={col.key}
                              className={`py-2 px-2.5 align-top ${
                                col.numeric ? "text-right" : ""
                              } ${col.cellClass || ""}`}
                            >
                              {col.render
                                ? col.render(value)
                                : value === "" || value == null
                                ? "—"
                                : value}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-12 text-center text-muted-foreground italic"
                      >
                        No matching kinetics record found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            {sortedData.length} record{sortedData.length !== 1 ? "s" : ""} shown
          </p>
        </Container>
      </section>
    </>
  )
}

export default KineticsPage

export const Head = () => (
  <Seo
    title="Kinetics Registry"
    description="Explore experimental and machine-learning predicted enzyme kinetic parameters for plastic-degrading enzymes."
  />
)
