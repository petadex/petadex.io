// frontend/src/components/corpus/ClusterContextPanel.jsx
//
// The clustering structure is a real, deterministically-computed relationship
// (not a similarity guess), so it may be stated plainly as structure — see "01 -
// Per-Sequence Annotation Plan". This panel fetches the ORF's 90% cluster block
// (GET /api/cluster/90/{c90_id}) and shows the neighborhood facts, with a link to
// the full cluster page (/cluster/90/{c90_id}).
import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import config from "../../config"

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-primary">{value}</span>
    </div>
  )
}

/**
 * @param {{ c90Id: number | string | null, ancestors?: { c90_id?: any, c60_id?: any, c30_id?: any } }} props
 */
export default function ClusterContextPanel({ c90Id, ancestors }) {
  const [block, setBlock] = useState(null)
  const [status, setStatus] = useState("idle") // idle | loading | ready | empty | error

  useEffect(() => {
    if (c90Id == null || c90Id === "") {
      setStatus("idle")
      return
    }

    let cancelled = false
    setStatus("loading")

    fetch(`${config.apiUrl}/cluster/90/${encodeURIComponent(String(c90Id))}`)
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) {
          setStatus("empty")
          return
        }
        if (!res.ok) {
          setStatus("error")
          return
        }
        const data = await res.json()
        if (cancelled) return
        setBlock(data)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [c90Id])

  // Ancestor path is a first-paint fact we already have from /api/orf; render it
  // even if the block fetch is still in flight or unavailable.
  const ancestorChips = [
    { level: 90, id: ancestors?.c90_id },
    { level: 60, id: ancestors?.c60_id },
    { level: 30, id: ancestors?.c30_id },
  ].filter(a => a.id != null)

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-foreground m-0">
        Cluster context
      </h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Deterministic clustering structure — where this sequence sits in the
        identity hierarchy.
      </p>

      {ancestorChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {ancestorChips.map(a => (
            <a
              key={a.level}
              href={`/cluster/${a.level}/${encodeURIComponent(String(a.id))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-sm text-secondary-foreground hover:border-info hover:text-info transition-colors"
            >
              <span className="font-medium">{a.level}%</span>
              <span className="font-mono text-xs opacity-80">
                {String(a.id)}
              </span>
            </a>
          ))}
        </div>
      )}

      {status === "loading" && (
        <p className="text-sm text-muted-foreground italic m-0">
          Loading 90% cluster neighborhood…
        </p>
      )}

      {status === "ready" && block && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {block.member_count != null && (
              <Stat label="Members" value={block.member_count} />
            )}
            {block.child_count != null && (
              <Stat label="Sub-clusters" value={block.child_count} />
            )}
            {block.distinct_organism_count != null && (
              <Stat
                label="Distinct organisms"
                value={block.distinct_organism_count}
              />
            )}
            {block.n_pazy != null && (
              <Stat label="PAZy members" value={block.n_pazy} />
            )}
            {block.n_nr != null && (
              <Stat label="NR members" value={block.n_nr} />
            )}
            {block.n_sra != null && (
              <Stat
                label="SRA members"
                value={
                  <Link to="/biosamples" className="text-info hover:underline">
                    {block.n_sra}
                  </Link>
                }
              />
            )}
          </div>

          {block.dominant_organism && (
            <p className="text-sm text-muted-foreground mt-4 mb-0">
              Dominant organism:{" "}
              <Link
                to={`/organism/${encodeURIComponent(block.dominant_organism)}`}
                className="italic text-info hover:underline"
              >
                {block.dominant_organism}
              </Link>
            </p>
          )}

          {c90Id != null && (
            <a
              href={`/cluster/90/${encodeURIComponent(String(c90Id))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm text-info hover:underline"
            >
              View full 90% cluster block →
            </a>
          )}
        </>
      )}

      {status === "empty" && (
        <p className="text-sm text-muted-foreground m-0">
          No 90% cluster block is recorded for this sequence.
        </p>
      )}

      {status === "error" && (
        <p className="text-sm text-muted-foreground m-0">
          Cluster neighborhood could not be loaded.
        </p>
      )}
    </section>
  )
}
