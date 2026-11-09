// frontend/src/components/v260701/SequenceClustersPanel.jsx
//
// The three clusters a sequence belongs to (one per identity level). Each cluster is named after its centroid.
import React from "react"
import { Card, ClusterLink, SequenceLink, fmtInt, LEVELS } from "./common"

const LEVEL_TEXT = { 90: "90 % identity", 60: "60 % identity", 30: "30 % identity" }

export default function SequenceClustersPanel({ id, clusters, rows }) {
  if (!clusters) return null
  return (
    <Card
      title="Clusters"
      note="Catalytic cores clustered at 90, 60 and 30 % identity (PETadex v260701, clustering of 2026-11-04). A cluster is named after its centroid sequence; the levels nest."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-4 font-medium">Level</th>
              <th className="py-2 pr-4 font-medium">Cluster</th>
              <th className="py-2 pr-4 font-medium text-right">Sequences</th>
              <th className="py-2 pr-4 font-medium text-right">Plasticome / nr / Logan</th>
              <th className="py-2 pr-4 font-medium">Sub-clusters</th>
            </tr>
          </thead>
          <tbody>
            {LEVELS.map(level => {
              const name = clusters[`c${level}`]
              const r = rows?.[level]
              return (
                <tr key={level} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 whitespace-nowrap">{LEVEL_TEXT[level]}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <ClusterLink level={level} id={name} />
                    {name === id && (
                      <span className="ml-2 rounded-full bg-info/10 px-2 py-0.5 text-xs text-info">this sequence is the centroid</span>
                    )}
                    {name !== id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        centroid <SequenceLink id={name} />
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">{fmtInt(r?.member_count) ?? "—"}</td>
                  <td className="py-2 pr-4 text-right font-mono text-xs">
                    {r ? `${fmtInt(r.n_pl)} / ${fmtInt(r.n_nr)} / ${fmtInt(r.n_lg)}` : "—"}
                  </td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {r?.child_count != null ? `${fmtInt(r.child_count)} at ${level === 30 ? 60 : 90} %` : ""}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
