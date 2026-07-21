// /biosample/:biosampleId
import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import Seo from "../../components/seo"
import Container from "../../components/common/Container"
import config from "../../config"
import { useScrollHeader } from "../../hooks/useScrollHeader"
import BacDriveStub, {
  NcbiLink,
  OrganismLink,
  SraRunLink,
} from "../../components/sra/SraShared"

export default function BiosamplePage({ params }) {
  useScrollHeader()
  const id = params?.biosampleId
    ? decodeURIComponent(params.biosampleId)
    : null
  const [sample, setSample] = useState(null)
  const [runs, setRuns] = useState([])
  const [status, setStatus] = useState("loading")
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (!id) {
      setStatus("error")
      setErrorMsg("No BioSample id in URL.")
      return
    }
    let cancelled = false
    setStatus("loading")

    Promise.all([
      fetch(`${config.apiUrl}/sra/biosample/${encodeURIComponent(id)}`),
      fetch(
        `${config.apiUrl}/sra/biosample/${encodeURIComponent(id)}/runs?limit=40&offset=0`
      ),
    ])
      .then(async ([sRes, rRes]) => {
        if (cancelled) return
        if (sRes.status === 404) {
          setStatus("notfound")
          return
        }
        if (!sRes.ok) {
          const body = await sRes.json().catch(() => ({}))
          setStatus("error")
          setErrorMsg(body.error || `Request failed (${sRes.status})`)
          return
        }
        setSample(await sRes.json())
        const rData = rRes.ok ? await rRes.json() : { runs: [] }
        setRuns(rData.runs || [])
        setStatus("ready")
      })
      .catch(() => {
        if (cancelled) return
        setStatus("error")
        setErrorMsg("Could not reach the server.")
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <section className="py-20 md:py-24">
      <Container>
        <Link
          to="/biosamples"
          className="text-sm text-info no-underline border-b-2 border-transparent hover:border-info"
        >
          ← Biosamples / SRA
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl font-mono break-all">
          {id}
        </h1>
        <p className="mt-2 text-secondary-foreground">NCBI BioSample</p>

        {status === "loading" && (
          <p className="mt-8 text-muted-foreground italic">Loading…</p>
        )}
        {status === "notfound" && (
          <div className="mt-8 p-4 bg-warning/5 border border-warning/20 rounded-xl">
            No BioSample <span className="font-mono">{id}</span> in PETadex
            metadata.
          </div>
        )}
        {status === "error" && (
          <div className="mt-8 p-4 bg-error/5 border border-error/20 rounded-xl text-destructive">
            {errorMsg}
          </div>
        )}

        {status === "ready" && sample && (
          <div className="mt-8 space-y-6">
            <div className="card p-6">
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold m-0">Summary</h2>
                <NcbiLink href={sample.external_link}>Open in NCBI</NcbiLink>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="label">Organism</div>
                  <div className="mt-1">
                    {sample.organism ? (
                      <OrganismLink organism={sample.organism} />
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <div className="label">BioProject</div>
                  <div className="mt-1 font-mono">{sample.bioproject || "—"}</div>
                </div>
                <div>
                  <div className="label">Country / biome</div>
                  <div className="mt-1">
                    {[sample.country, sample.biome].filter(Boolean).join(" · ") ||
                      "—"}
                  </div>
                </div>
                <div>
                  <div className="label">Runs / PETadex ORFs</div>
                  <div className="mt-1">
                    {sample.n_runs?.toLocaleString?.() ?? sample.n_runs} runs
                    {sample.orf_count != null
                      ? ` · ${sample.orf_count.toLocaleString()} ORFs`
                      : ""}
                  </div>
                </div>
              </div>
            </div>

            <BacDriveStub entityLabel={`BioSample ${id}`} />

            <div className="card p-6">
              <h2 className="text-lg font-semibold m-0 mb-4">SRA runs</h2>
              {runs.length === 0 ? (
                <p className="text-sm text-muted-foreground m-0">No runs.</p>
              ) : (
                <ul className="m-0 p-0 list-none divide-y divide-border/60">
                  {runs.map(r => (
                    <li
                      key={r.acc}
                      className="py-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"
                    >
                      <SraRunLink acc={r.acc} />
                      <span className="text-muted-foreground">
                        {[r.assay_type, r.platform, r.country]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Container>
    </section>
  )
}

export const Head = ({ params }) => {
  const id = params?.biosampleId
    ? decodeURIComponent(params.biosampleId)
    : "BioSample"
  return (
    <Seo
      title={`${id} · BioSample`}
      description={`PETadex BioSample ${id}: SRA runs and organism context.`}
    />
  )
}
