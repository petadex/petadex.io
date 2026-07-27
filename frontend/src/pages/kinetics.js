import React, { useState, useEffect } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import { useScrollHeader } from "../hooks/useScrollHeader"
import config from "../config"

// Predicted data (kept as static for now)
const predictedData = [
  { enzyme: "IsPETase-like candidate #1", species: "CatPred hit", substrate: "MHET", temp: "30", ph: "8.0", kcat: "0.085", km: "0.0000032", ratio: "26562.5", model: "CatPred v1.2" },
  { enzyme: "IsPETase-like candidate #2", species: "CatPred hit", substrate: "MHET", temp: "30", ph: "8.0", kcat: "0.140", km: "0.0000015", ratio: "93333.3", model: "CatPred v1.2" }
]

const KineticsPage = () => {
  useScrollHeader()

  const [activeTab, setActiveTab] = useState("published")
  const [searchTerm, setSearchTerm] = useState("")
  const [experimentalData, setExperimentalData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch published kinetics from the API
  useEffect(() => {
    if (activeTab === "published") {
      setLoading(true)
      fetch(`${config.apiUrl}/kinetics/published`) // adjust endpoint as needed
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
    }
  }, [activeTab]) // re-fetch when tab changes? only if you want to refresh

  const currentDataset = activeTab === "published" ? experimentalData : predictedData

  const filteredData = currentDataset.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Generate CSV from the full dataset (all columns)
  const generateCSV = (data) => {
    if (!data || data.length === 0) return ""
    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(h => `"${String(row[h] || "").replace(/"/g, '""')}"`).join(","))
    return [headers.join(","), ...rows].join("\n")
  }

  const downloadCSV = () => {
    const dataToDownload = activeTab === "published" ? experimentalData : predictedData
    const csv = generateCSV(dataToDownload)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${activeTab}_kinetics.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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

      {/* Sticky tabs */}
      <div className="sticky z-30 bg-background/95 backdrop-blur-md border-b border-border transition-[top] duration-300 ease-out top-16">
        <Container>
          <nav className="flex gap-1 overflow-x-auto -mx-2 px-2" aria-label="Kinetics data source">
            <button
              onClick={() => { setActiveTab("published"); setSearchTerm(""); }}
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
              onClick={() => { setActiveTab("predicted"); setSearchTerm(""); }}
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
          {/* Controls: Search + Download */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by enzyme, organism, substrate, or any field…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full sm:w-80 text-sm py-2.5"
            />

            <button
              onClick={downloadCSV}
              disabled={activeTab === "published" && loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV
            </button>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            {loading && activeTab === "published" ? (
              <div className="px-4 py-12 text-center text-muted-foreground">Loading published data…</div>
            ) : error ? (
              <div className="px-4 py-12 text-center text-destructive">{error}</div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enzyme</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organism</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Substrate</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temp / pH</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">k<sub>cat</sub> (s⁻¹)</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">K<sub>m</sub> (M)</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">k<sub>cat</sub>/K<sub>m</sub> (M⁻¹s⁻¹)</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map((row, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5 text-sm font-medium text-foreground">{row.enzyme}</td>
                        <td className="px-4 py-3.5 text-sm text-secondary-foreground italic">{row.species}</td>
                        <td className="px-4 py-3.5 text-sm text-secondary-foreground">{row.substrate}</td>
                        <td className="px-4 py-3.5 text-sm text-muted-foreground">{row.temp}°C / pH {row.ph || "N/A"}</td>
                        <td className="px-4 py-3.5 text-sm font-mono text-secondary-foreground">{row.kcat}</td>
                        <td className="px-4 py-3.5 text-sm font-mono text-secondary-foreground">{row.km}</td>
                        <td className="px-4 py-3.5 text-sm font-mono text-accent font-medium">{row.ratio}</td>
                        <td className="px-4 py-3.5 text-sm">
                          {activeTab === "published" ? (
                            <a
                              href={row.doi}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:text-accent-hover underline underline-offset-2 transition-colors"
                            >
                              View Paper ↗
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">{row.model}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-muted-foreground italic">
                        No matching kinetics record found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            {filteredData.length} record{filteredData.length !== 1 ? "s" : ""} shown
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