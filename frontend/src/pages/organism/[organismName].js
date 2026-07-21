// /organism/:organismName
import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import Seo from "../../components/seo"
import Container from "../../components/common/Container"
import config from "../../config"
import { useScrollHeader } from "../../hooks/useScrollHeader"
import BacDriveStub, {
  BiosampleLink,
  SraRunLink,
} from "../../components/sra/SraShared"

export default function OrganismPage({ params }) {
  useScrollHeader()
  const name = params?.organismName
    ? decodeURIComponent(params.organismName)
    : null
  const [data, setData] = useState(null)
  const [biosamples, setBiosamples] = useState([])
  const [status, setStatus] = useState("loading")
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (!name) {
      setStatus("error")
      setErrorMsg("No organism in URL.")
      return
    }
    let cancelled = false
    setStatus("loading")
    const enc = encodeURIComponent(name)

    Promise.all([
      fetch(`${config.apiUrl}/sra/organism/${enc}`),
      fetch(`${config.apiUrl}/sra/organism/${enc}/biosamples?limit=30&offset=0`),
    ])
      .then(async ([oRes, bRes]) => {
        if (cancelled) return
        if (oRes.status === 202) {
          const body = await oRes.json().catch(() => ({}))
          setStatus("error")
          setErrorMsg(
            body.message ||
              "Organism stats cache is warming (one-time). Retry in 1–3 minutes."
          )
          return
        }
        if (oRes.status === 404) {
          setStatus("notfound")
          return
        }
        if (!oRes.ok) {
          const body = await oRes.json().catch(() => ({}))
          setStatus("error")
          setErrorMsg(body.error || `Request failed (${oRes.status})`)
          return
        }
        const base = await oRes.json()
        setData(base)
        const bData = bRes.ok ? await bRes.json() : { biosamples: [] }
        setBiosamples(bData.biosamples || [])
        setStatus("ready")

        // Lazy enrichment (countries/biomes) — does not block first paint.
        fetch(`${config.apiUrl}/sra/organism/${enc}?enrich=1`)
          .then(async r => (r.ok ? r.json() : null))
          .then(enriched => {
            if (!cancelled && enriched) setData(enriched)
          })
          .catch(() => {})
      })
      .catch(() => {
        if (cancelled) return
        setStatus("error")
        setErrorMsg("Could not reach the server.")
      })

    return () => {
      cancelled = true
    }
  }, [name])

  return (
    <section className="py-20 md:py-24">
      <Container>
        <Link
          to="/biosamples"
          className="text-sm text-info no-underline border-b-2 border-transparent hover:border-info"
        >
          ← Biosamples / SRA
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl italic">
          {name}
        </h1>
        <p className="mt-2 text-secondary-foreground">
          Organism hub · SRA aggregates in PETadex
        </p>

        {status === "loading" && (
          <p className="mt-8 text-muted-foreground italic">Loading…</p>
        )}
        {status === "notfound" && (
          <div className="mt-8 p-4 bg-warning/5 border border-warning/20 rounded-xl">
            No SRA records for this organism name.
          </div>
        )}
        {status === "error" && (
          <div className="mt-8 p-4 bg-error/5 border border-error/20 rounded-xl text-destructive">
            {errorMsg}
          </div>
        )}

        {status === "ready" && data && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Runs", value: data.n_runs },
                { label: "BioSamples", value: data.n_biosamples },
                {
                  label: "Countries",
                  value:
                    data.n_countries != null
                      ? data.n_countries
                      : data.top_countries?.length
                        ? data.top_countries.length
                        : "…",
                },
                {
                  label: "Biomes",
                  value:
                    data.n_biomes != null
                      ? data.n_biomes
                      : data.top_biomes?.length
                        ? data.top_biomes.length
                        : "…",
                },
              ].map(s => (
                <div key={s.label} className="card p-4">
                  <div className="label">{s.label}</div>
                  <div className="text-xl font-semibold mt-1">
                    {typeof s.value === "number"
                      ? s.value.toLocaleString()
                      : s.value}
                  </div>
                </div>
              ))}
            </div>

            <BacDriveStub entityLabel={name} />

            {(data.top_countries?.length > 0 || data.top_biomes?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.top_countries?.length > 0 && (
                  <div className="card p-6">
                    <h2 className="text-lg font-semibold m-0 mb-3">
                      Top countries
                    </h2>
                    <ul className="m-0 p-0 list-none text-sm divide-y divide-border/60">
                      {data.top_countries.map(c => (
                        <li
                          key={c.country}
                          className="py-2 flex justify-between gap-3"
                        >
                          <span>{c.country}</span>
                          <span className="text-muted-foreground">
                            {c.n.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.top_biomes?.length > 0 && (
                  <div className="card p-6">
                    <h2 className="text-lg font-semibold m-0 mb-3">
                      Top biomes
                    </h2>
                    <ul className="m-0 p-0 list-none text-sm divide-y divide-border/60">
                      {data.top_biomes.map(b => (
                        <li
                          key={b.biome}
                          className="py-2 flex justify-between gap-3"
                        >
                          <span className="font-mono text-xs">{b.biome}</span>
                          <span className="text-muted-foreground">
                            {b.n.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="card p-6">
              <h2 className="text-lg font-semibold m-0 mb-4">BioSamples</h2>
              {biosamples.length === 0 ? (
                <p className="text-sm text-muted-foreground m-0">None listed.</p>
              ) : (
                <ul className="m-0 p-0 list-none divide-y divide-border/60">
                  {biosamples.map(b => (
                    <li
                      key={b.biosample}
                      className="py-2 flex flex-wrap justify-between gap-3 text-sm"
                    >
                      <BiosampleLink biosample={b.biosample} />
                      <span className="text-muted-foreground">
                        {b.n_runs} runs
                        {b.country ? ` · ${b.country}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {data.sample_runs?.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold m-0 mb-4">
                  Recent sample runs
                </h2>
                <ul className="m-0 p-0 list-none divide-y divide-border/60">
                  {data.sample_runs.map(r => (
                    <li
                      key={r.acc}
                      className="py-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"
                    >
                      <SraRunLink acc={r.acc} />
                      {r.biosample && (
                        <BiosampleLink biosample={r.biosample} />
                      )}
                      <span className="text-muted-foreground">
                        {[r.assay_type, r.country].filter(Boolean).join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Container>
    </section>
  )
}

export const Head = ({ params }) => {
  const name = params?.organismName
    ? decodeURIComponent(params.organismName)
    : "Organism"
  return (
    <Seo
      title={`${name} · Organism`}
      description={`PETadex SRA aggregates for ${name}: runs, BioSamples, geography.`}
    />
  )
}
