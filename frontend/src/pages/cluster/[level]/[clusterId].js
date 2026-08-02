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
import ClusterHierarchyNav from "../../../components/corpus/ClusterHierarchyNav.jsx"

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
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Identity hierarchy landing page. Walk the centroid path, pin clusters
          to compare sequences, and open the centroid ORF for annotations.
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
              <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch mb-2">
                <div className="card p-6 h-full">
                  <h2 className="text-base font-semibold text-foreground m-0 mb-4">
                    Centroid
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col">
                      <span className="label">Accession</span>
                      <span className="font-mono text-sm font-semibold text-primary break-all">
                        {centroidAcc ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="label">ORF</span>
                      {centroidOrf != null ? (
                        <Link
                          to={`/sequence/orf/${encodeURIComponent(String(centroidOrf))}`}
                          className="font-mono text-sm font-semibold text-info hover:underline"
                        >
                          {String(centroidOrf)}
                        </Link>
                      ) : (
                        <span className="font-mono text-sm font-semibold text-primary">
                          —
                        </span>
                      )}
                    </div>
                    {block.dominant_organism && (
                      <div className="flex flex-col">
                        <span className="label">Dominant organism</span>
                        <span className="text-sm italic text-foreground">
                          {block.dominant_organism}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card p-6 h-full">
                  <h2 className="text-base font-semibold text-foreground m-0 mb-4">
                    Cluster size
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Members", block.member_count],
                      ["Sub-clusters", block.child_count],
                      ["Organisms", block.distinct_organism_count],
                      ["PAZy", block.n_pazy],
                      ["NR", block.n_nr],
                      ["SRA", block.n_sra],
                    ]
                      .filter(([, v]) => v != null)
                      .map(([label, value]) => (
                        <div key={label} className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            {label}
                          </span>
                          <span className="text-lg font-semibold text-primary tabular-nums">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                  {extraFields.length > 0 && (
                    <details className="mt-4 pt-3 border-t border-border/60">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        All block fields
                      </summary>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-3">
                        {extraFields.map(([k, v]) => (
                          <React.Fragment key={k}>
                            <span className="text-muted-foreground break-all">
                              {k}
                            </span>
                            <span className="font-mono text-secondary-foreground break-all">
                              {v === null ? "—" : String(v)}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>

              <ClusterHierarchyNav
                level={level}
                clusterId={clusterId}
                block={block}
              />
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
