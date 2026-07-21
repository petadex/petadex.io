// src/pages/cluster/[level]/[clusterId].js
//
// Cluster-block landing page — the single-match destination of the MVP Search
// Index resolver (see "04 - MVP Search Index", 2026-06-22 update). A resolved
// orf_id / genbank_acc lands here on its 90% cluster block, keyed by cluster_id.
//
// Client-only dynamic route /cluster/:level/:clusterId, backed by
// GET /api/cluster/:level/:clusterId (block_{level}pid row). This is intentionally
// a thin block view for now; the future browse view is expected to reuse the same
// block data, at which point this can delegate to a shared block component.
import React, { useState, useEffect } from "react"
import { Link } from "gatsby"
import Seo from "../../../components/seo"
import Container from "../../../components/common/Container"
import config from "../../../config"
import { useScrollHeader } from "../../../hooks/useScrollHeader"
import StructurePanel from "../../../components/StructurePanel"

const VALID_LEVELS = new Set(["90", "60", "30"])

export default function ClusterPage({ params }) {
  useScrollHeader()

  const { level, clusterId } = params
  const [block, setBlock] = useState(null)
  const [status, setStatus] = useState("loading") // loading | ready | notfound | error
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (!VALID_LEVELS.has(String(level))) {
      setStatus("error")
      setErrorMsg(
        `Unsupported clustering level "${level}" (expected 90, 60, or 30).`
      )
      return
    }

    let cancelled = false
    setStatus("loading")

    fetch(`${config.apiUrl}/cluster/${level}/${encodeURIComponent(clusterId)}`)
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) {
          setStatus("notfound")
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setStatus("error")
          setErrorMsg(body.error || `Request failed (${res.status})`)
          return
        }
        const data = await res.json()
        if (cancelled) return
        setBlock(data)
        setStatus("ready")
      })
      .catch(err => {
        if (cancelled) return
        console.error("Cluster fetch error:", err)
        setStatus("error")
        setErrorMsg("Could not reach the server.")
      })

    return () => {
      cancelled = true
    }
  }, [level, clusterId])

  const centroidAcc = block?.centroid_accession ?? null
  const centroidOrf = block?.centroid_orf_id ?? null
  // Remaining columns beyond the identity fields already shown in the header.
  const SHOWN = new Set([
    "level",
    "cluster_id",
    "centroid_orf_id",
    "centroid_accession",
  ])
  const extraFields = block
    ? Object.entries(block).filter(([k]) => !SHOWN.has(k))
    : []

  return (
    <section className="py-20 md:py-24">
      <Container>
        <Link
          to="/enzymes"
          className="text-sm text-info no-underline border-b-2 border-transparent transition-colors hover:border-info"
        >
          ← Back to enzyme database
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">
          {level}% Cluster Block
        </h1>
        <p className="mt-2 font-mono text-secondary-foreground">
          cluster_id {clusterId}
        </p>

        <div className="mt-8">
          {status === "loading" && (
            <p className="text-muted-foreground italic">
              Loading cluster block…
            </p>
          )}

          {status === "notfound" && (
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl text-secondary-foreground">
              No {level}% cluster block found for cluster_id{" "}
              <span className="font-mono">{clusterId}</span>.
            </div>
          )}

          {status === "error" && (
            <div className="p-4 bg-error/5 border border-error/20 rounded-xl text-destructive">
              {errorMsg}
            </div>
          )}

          {status === "ready" && block && (
            <>
              <div className="card p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex flex-col">
                    <span className="label">Centroid accession</span>
                    <span className="font-mono text-sm font-semibold text-primary break-all">
                      {centroidAcc ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="label">Centroid ORF</span>
                    <span className="font-mono text-sm font-semibold text-primary">
                      {centroidOrf != null ? (
                        <Link
                          to={`/sequence/orf/${centroidOrf}`}
                          className="text-info border-b border-transparent hover:border-info"
                        >
                          {centroidOrf}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                </div>

                {extraFields.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border pt-4">
                    {extraFields.map(([k, v]) => (
                      <React.Fragment key={k}>
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-mono text-secondary-foreground break-all">
                          {k === "dominant_organism" && v ? (
                            <Link
                              to={`/organism/${encodeURIComponent(String(v))}`}
                              className="italic text-info hover:underline"
                            >
                              {String(v)}
                            </Link>
                          ) : v === null ? (
                            "—"
                          ) : (
                            String(v)
                          )}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {String(level) === "90" && centroidOrf != null && (
                <div className="card p-6 mt-6">
                  <StructurePanel
                    orfId={centroidOrf}
                    accession={centroidAcc}
                    title="Centroid fold (ESMFold2)"
                    emptyMessage="No predicted fold available for this 90% centroid yet."
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </section>
  )
}

export const Head = () => (
  <Seo title="Cluster Block" description="PETadex cluster block" />
)
