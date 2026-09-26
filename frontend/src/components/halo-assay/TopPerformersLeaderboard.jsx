import React, { useEffect, useMemo, useState } from "react"
import { Link } from "gatsby"
import { mediaColors, mediaLabels } from "../charts/ActivityLineChart"
import { BENCHMARK_ENZYMES, COMPARISON_SUBSTRATES } from "./constants"
import { fetchComparison } from "./comparison"

const TOP_N = 6

const TopPerformersLeaderboard = () => {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { activity: rows } = await fetchComparison(COMPARISON_SUBSTRATES)
        setActivity(rows || [])
      } catch (err) {
        setError(err.toString())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const ranked = useMemo(() => {
    const byGene = new Map()
    activity.forEach(row => {
      if (row.activity == null) return
      const entry = byGene.get(row.gene) || {
        gene: row.gene,
        nickname: row.nickname,
        accession: row.accession,
        per: {},
        best: { media: null, value: -Infinity },
      }
      entry.per[row.media] = parseFloat(row.activity)
      if (entry.per[row.media] > entry.best.value) {
        entry.best = { media: row.media, value: entry.per[row.media] }
      }
      byGene.set(row.gene, entry)
    })
    return [...byGene.values()]
      .filter(e => e.best.value > 0)
      .sort((a, b) => b.best.value - a.best.value)
      .slice(0, TOP_N)
  }, [activity])

  const max = ranked[0]?.best.value || 1

  if (loading) {
    return (
      <div className="card p-8 text-center text-muted-foreground italic">
        Loading top performers…
      </div>
    )
  }

  if (error || ranked.length === 0) {
    return (
      <div className="card p-8 text-center text-muted-foreground">
        {error ? `Error loading activity data: ${error}` : "No activity data yet."}
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-primary">Top Performers</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Highest peak-to-min activity recorded across BHET substrates
          </p>
        </div>
        <Link
          to="/halo-assay?tab=activity"
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          See full activity data →
        </Link>
      </div>

      <ol className="space-y-2">
        {ranked.map((entry, i) => {
          const pct = (entry.best.value / max) * 100
          const color = mediaColors[entry.best.media] || "#059669"
          const benchmark = BENCHMARK_ENZYMES[entry.accession]
          return (
            <li
              key={entry.gene}
              className="grid items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/40 transition-colors"
              style={{ gridTemplateColumns: "2rem 1fr 5rem" }}
            >
              <span className="text-sm font-mono text-muted-foreground tabular-nums">
                #{i + 1}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.accession ? (
                    <Link
                      to={`/sequence/${entry.accession}`}
                      className="font-mono text-sm font-semibold text-primary hover:text-accent truncate"
                    >
                      {entry.nickname || entry.gene}
                    </Link>
                  ) : (
                    <span className="font-mono text-sm font-semibold text-primary truncate">
                      {entry.nickname || entry.gene}
                    </span>
                  )}
                  {benchmark && (
                    <span className="px-1.5 py-0.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded text-2xs font-bold">
                      {benchmark}
                    </span>
                  )}
                  <span
                    className="px-1.5 py-0.5 rounded text-2xs font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {mediaLabels[entry.best.media]}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>

              <span
                className="text-sm font-bold tabular-nums text-right"
                style={{ color }}
              >
                {entry.best.value.toFixed(2)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default TopPerformersLeaderboard
