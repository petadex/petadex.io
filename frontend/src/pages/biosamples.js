// /biosamples — SRA / BioSample / organism hub
import React, { useEffect, useState } from "react"
import { Link, navigate } from "gatsby"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"
import { useScrollHeader } from "../hooks/useScrollHeader"
import {
  BiosampleLink,
  OrganismLink,
  SraRunLink,
} from "../components/sra/SraShared"

function detectKind(q) {
  const s = q.trim()
  if (!s) return null
  if (/^[SED]RR?\d+$/i.test(s) || /^[SED]RX\d+$/i.test(s) || /^DRR\d+$/i.test(s)) {
    return "run"
  }
  if (/^SAM[NED]\w+$/i.test(s)) return "biosample"
  return "organism"
}

export default function BiosamplesHubPage() {
  useScrollHeader()
  const [summary, setSummary] = useState(null)
  const [q, setQ] = useState("")
  const [orgResults, setOrgResults] = useState(null)
  const [status, setStatus] = useState("idle")
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${config.apiUrl}/sra/summary`)
      .then(async res => {
        if (cancelled) return
        if (!res.ok) return
        setSummary(await res.json())
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = e => {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    const kind = detectKind(query)
    if (kind === "run") {
      navigate(`/sra/${encodeURIComponent(query.toUpperCase())}`)
      return
    }
    if (kind === "biosample") {
      navigate(`/biosample/${encodeURIComponent(query.toUpperCase())}`)
      return
    }
    setStatus("loading")
    setErrorMsg(null)
    fetch(`${config.apiUrl}/sra/organism?q=${encodeURIComponent(query)}`)
      .then(async res => {
        if (res.status === 202) {
          const body = await res.json().catch(() => ({}))
          setStatus("warming")
          setErrorMsg(
            body.message ||
              "Search cache is warming (one-time). Retry in 1–3 minutes."
          )
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setStatus("error")
          setErrorMsg(body.error || `Search failed (${res.status})`)
          return
        }
        const data = await res.json()
        setOrgResults(data.results || [])
        setStatus("ready")
      })
      .catch(() => {
        setStatus("error")
        setErrorMsg("Could not reach the server.")
      })
  }

  return (
    <section className="py-20 md:py-24">
      <Container>
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl m-0">
          Biosamples / SRA
        </h1>
        <p className="mt-3 text-secondary-foreground max-w-2xl">
          Explore PETadex sample provenance: SRA runs (library ids), NCBI
          BioSamples, and organisms. Data is served from{" "}
          <span className="font-mono text-xs">sra_metadata</span> (Denis S3 CSV
          ingest). BacDrive enrichment is pending.
        </p>

        {summary && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "SRA runs", value: summary.n_runs },
              { label: "BioSamples", value: summary.n_biosamples },
              { label: "Organisms", value: summary.n_organisms },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <div className="label">{s.label}</div>
                <div className="text-2xl font-semibold text-foreground mt-1">
                  {Number(s.value).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-10 card p-6">
          <label className="label" htmlFor="sra-hub-q">
            Search by run (ERR…), BioSample (SAMN…), or organism name (min 2 chars)
          </label>
          <div className="mt-2 flex flex-col sm:flex-row gap-3">
            <input
              id="sra-hub-q"
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="e.g. DRR138460 · SAMD00127172 · Escherichia coli"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Search
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground m-0">
            Tip: run and BioSample ids jump straight to their detail pages;
            organism names return a ranked list.
          </p>
        </form>

        {status === "loading" && (
          <p className="mt-6 text-muted-foreground italic">Searching…</p>
        )}
        {status === "warming" && (
          <div className="mt-6 p-4 bg-warning/5 border border-warning/20 rounded-xl text-secondary-foreground">
            {errorMsg}
          </div>
        )}
        {status === "error" && (
          <div className="mt-6 p-4 bg-error/5 border border-error/20 rounded-xl text-destructive">
            {errorMsg}
          </div>
        )}
        {status === "ready" && orgResults && (
          <div className="mt-6 card p-6">
            <h2 className="text-lg font-semibold m-0 mb-4">Organism matches</h2>
            {orgResults.length === 0 ? (
              <p className="text-sm text-muted-foreground m-0">No matches.</p>
            ) : (
              <ul className="m-0 p-0 list-none divide-y divide-border/60">
                {orgResults.map(r => (
                  <li
                    key={r.organism}
                    className="py-3 flex flex-wrap items-baseline justify-between gap-3"
                  >
                    <OrganismLink organism={r.organism} />
                    <span className="text-xs text-muted-foreground">
                      {r.n_runs.toLocaleString()} runs ·{" "}
                      {r.n_biosamples.toLocaleString()} biosamples
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-10 text-sm text-muted-foreground">
          <p className="m-0 mb-2">Examples:</p>
          <ul className="m-0 pl-5">
            <li>
              Run <SraRunLink acc="DRR138460" />
            </li>
            <li>
              BioSample <BiosampleLink biosample="SAMD00127172" />
            </li>
            <li>
              Organism <OrganismLink organism="Escherichia coli" />
            </li>
          </ul>
          <p className="mt-4 m-0">
            Also linked from ORF provenance, curated metadata, and{" "}
            <Link to="/metadata" className="text-info hover:underline">
              sample geography
            </Link>
            .
          </p>
        </div>
      </Container>
    </section>
  )
}

export const Head = () => (
  <Seo
    title="Biosamples / SRA"
    description="Browse PETadex SRA runs, BioSamples, and organisms from Denis metadata."
  />
)
