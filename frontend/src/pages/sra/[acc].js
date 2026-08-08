// /sra/:acc — SRA run (library_id) detail
import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import Seo from "../../components/seo"
import Container from "../../components/common/Container"
import config from "../../config"
import { useScrollHeader } from "../../hooks/useScrollHeader"
import {
  BiosampleLink,
  NcbiLink,
  OrganismLink,
  OrfList,
  SraMetaTable,
} from "../../components/sra/SraShared"

export default function SraRunPage({ params }) {
  useScrollHeader()
  const acc = params?.acc ? decodeURIComponent(params.acc) : null
  const [run, setRun] = useState(null)
  const [orfs, setOrfs] = useState([])
  const [status, setStatus] = useState("loading")
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (!acc) {
      setStatus("error")
      setErrorMsg("No run accession in URL.")
      return
    }
    let cancelled = false
    setStatus("loading")

    Promise.all([
      fetch(`${config.apiUrl}/sra/run/${encodeURIComponent(acc)}`),
      fetch(
        `${config.apiUrl}/sra/run/${encodeURIComponent(acc)}/orfs?limit=40&offset=0`
      ),
    ])
      .then(async ([runRes, orfRes]) => {
        if (cancelled) return
        if (runRes.status === 404) {
          setStatus("notfound")
          return
        }
        if (!runRes.ok) {
          const body = await runRes.json().catch(() => ({}))
          setStatus("error")
          setErrorMsg(body.error || `Request failed (${runRes.status})`)
          return
        }
        const runData = await runRes.json()
        const orfData = orfRes.ok ? await orfRes.json() : { orfs: [] }
        setRun(runData)
        setOrfs(orfData.orfs || [])
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
  }, [acc])

  return (
    <section className="py-20 md:py-24">
      <Container>
        <Link
          to="/biosamples"
          className="text-sm text-info no-underline border-b-2 border-transparent hover:border-info"
        >
          ← Biosamples / SRA
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl font-mono">
          {acc}
        </h1>
        <p className="mt-2 text-secondary-foreground">SRA run · library_id</p>

        {status === "loading" && (
          <p className="mt-8 text-muted-foreground italic">Loading run…</p>
        )}
        {status === "notfound" && (
          <div className="mt-8 p-4 bg-warning/5 border border-warning/20 rounded-xl">
            No SRA metadata for <span className="font-mono">{acc}</span>.
          </div>
        )}
        {status === "error" && (
          <div className="mt-8 p-4 bg-error/5 border border-error/20 rounded-xl text-destructive">
            {errorMsg}
          </div>
        )}

        {status === "ready" && run && (
          <div className="mt-8 space-y-6">
            <div className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold m-0">Run metadata</h2>
                <NcbiLink href={run.external_link}>Open in NCBI SRA</NcbiLink>
              </div>
              <SraMetaTable
                rows={[
                  [
                    "Organism",
                    run.organism ? <OrganismLink organism={run.organism} /> : null,
                  ],
                  [
                    "BioSample",
                    run.biosample ? (
                      <BiosampleLink biosample={run.biosample} />
                    ) : null,
                  ],
                  ["BioProject", run.bioproject],
                  ["Study", run.sra_study],
                  ["Assay", run.assay_type],
                  ["Platform", run.platform],
                  ["Instrument", run.instrument],
                  ["Country", run.geo_loc_name_country_calc],
                  ["Continent", run.geo_loc_name_country_continent_calc],
                  ["Biome", run.biome],
                  ["Collection date", run.collection_date_sam],
                  ["Lat / lon",
                    run.latitude != null
                      ? `${run.latitude}, ${run.longitude}`
                      : null,
                  ],
                  ["Size (Mbases)", run.mbases],
                  ["PETadex ORFs", run.orf_count],
                ]}
              />
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold m-0 mb-4">
                PETadex ORFs from this run
              </h2>
              <OrfList orfs={orfs} />
              {run.orf_count > orfs.length && (
                <p className="mt-3 text-xs text-muted-foreground m-0">
                  Showing {orfs.length} of {run.orf_count.toLocaleString()} ORFs.
                </p>
              )}
            </div>
          </div>
        )}
      </Container>
    </section>
  )
}

export const Head = ({ params }) => {
  const acc = params?.acc ? decodeURIComponent(params.acc) : "SRA run"
  return (
    <Seo
      title={`${acc} · SRA run`}
      description={`PETadex SRA run ${acc}: metadata and linked corpus ORFs.`}
    />
  )
}
