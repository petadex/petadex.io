// frontend/src/components/explore/PlasticomeBrowser.jsx
//
// Start from a known enzyme: the characterized Plasticome entries, filtered by the viewer (text, substrate, fold).
// Opening an entry shows where it sits in the clustering — its enzyme (90 %), family (60 %) and superfamily (30 %)
// clusters, how big each is, and what each contains by source. Listed in PL-number order; nothing is ranked.
import React, { useEffect, useMemo, useState } from "react"
import config from "../../config"
import { ClusterLink, SequenceLink, fmtInt } from "../v260701/common"
import SourceSplit, { clusterCounts } from "../v260701/SourceSplit"
import { RUNGS, Glyph } from "./HierarchyLadder"

const SHOW = 40
const LEVEL_NAMES = { 90: "Enzyme (90 %)", 60: "Family (60 %)", 30: "Superfamily (30 %)" }

function WhereItSits({ entry }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    let off = false
    Promise.all([90, 60, 30].map(l =>
      fetch(`${config.apiUrl}/cluster/${l}/${encodeURIComponent(entry[`c${l}`])}`).then(r => (r.ok ? r.json() : Promise.reject(r.status)))))
      .then(d => !off && setRows(d))
      .catch(() => !off && setErr("Could not load the clusters."))
    return () => { off = true }
  }, [entry])
  if (err) return <p className="text-sm text-destructive m-0">{err}</p>
  if (!rows) return <p className="text-sm text-muted-foreground m-0">Loading…</p>
  return (
    <ol className="list-none m-0 p-0 space-y-2">
      {[90, 60, 30].map((l, i) => {
        const raw = rows[i]
        const c = raw.cluster || raw
        const rung = RUNGS.find(r => r.key === String(l))
        const own = c.cluster_id === entry.id
        return (
          <li key={l} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Glyph rung={rung} size={22} />
            <span className="w-36 shrink-0 text-secondary-foreground">{LEVEL_NAMES[l]}</span>
            <ClusterLink level={l} id={c.cluster_id} />
            <span className="text-xs text-muted-foreground">
              {own ? `${entry.id} is the centroid` : `centroid ${c.cluster_id}`} · {fmtInt(c.member_count)} proteins
            </span>
            <SourceSplit counts={clusterCounts(c)} title={`${c.cluster_id} (${l} %): proteins by source`} unit="proteins" />
          </li>
        )
      })}
    </ol>
  )
}

export default function PlasticomeBrowser({ entries, folds }) {
  const [q, setQ] = useState("")
  const [substrate, setSubstrate] = useState("")
  const [fold, setFold] = useState("")
  const [shown, setShown] = useState(SHOW)
  const [open, setOpen] = useState(null)

  const substrates = useMemo(() => {
    const n = {}
    for (const e of entries) for (const s of e.substrates) n[s] = (n[s] || 0) + 1
    return Object.entries(n).sort((a, b) => a[0].localeCompare(b[0]))
  }, [entries])
  const foldName = f => folds.find(d => d.fold === f)?.name || f

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return entries.filter(e =>
      (!substrate || e.substrates.includes(substrate)) &&
      (!fold || e.fold === fold) &&
      (!t || [e.id, e.name, e.organism, ...e.names, ...e.ec].some(v => String(v || "").toLowerCase().includes(t))))
  }, [entries, q, substrate, fold])
  useEffect(() => { setShown(SHOW) }, [q, substrate, fold])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <span className="text-secondary-foreground">Find</span>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="name, organism, EC or PL id"
            className="rounded-md border border-border bg-background px-2 py-1 w-64" />
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-secondary-foreground">Substrate</span>
          <select value={substrate} onChange={e => setSubstrate(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1">
            <option value="">any</option>
            {substrates.map(([s, n]) => <option key={s} value={s}>{s} ({n})</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-secondary-foreground">Fold</span>
          <select value={fold} onChange={e => setFold(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1">
            <option value="">any</option>
            {folds.map(d => <option key={d.fold} value={d.fold}>{d.name || d.fold}</option>)}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">{fmtInt(filtered.length)} of {fmtInt(entries.length)} entries</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[760px]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-4 font-medium">Entry</th>
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Substrates</th>
              <th className="py-2 pr-4 font-medium">EC</th>
              <th className="py-2 pr-4 font-medium">Organism</th>
              <th className="py-2 pr-4 font-medium">Fold</th>
              <th className="py-2 font-medium">Where it sits</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, shown).map(e => (
              <React.Fragment key={e.id}>
                <tr className="border-b border-border align-top">
                  <td className="py-1.5 pr-4"><SequenceLink id={e.id} /></td>
                  <td className="py-1.5 pr-4">{e.name || "–"}</td>
                  <td className="py-1.5 pr-4 text-xs">{e.substrates.join(", ") || "–"}</td>
                  <td className="py-1.5 pr-4 text-xs font-mono">{e.ec.map(x => x.replace(/^EC\s*/, "")).join(", ") || "–"}</td>
                  <td className="py-1.5 pr-4 text-xs italic">{e.organism || "–"}</td>
                  <td className="py-1.5 pr-4 text-xs">{foldName(e.fold)}</td>
                  <td className="py-1.5">
                    <button type="button" aria-expanded={open === e.id} onClick={() => setOpen(o => (o === e.id ? null : e.id))}
                      className="text-xs text-info hover:underline whitespace-nowrap">
                      {open === e.id ? "Hide" : `${e.c90} › ${e.c60} › ${e.c30}`}
                    </button>
                  </td>
                </tr>
                {open === e.id && (
                  <tr className="border-b border-border bg-secondary/30">
                    <td colSpan={7} className="py-3 px-3"><WhereItSits entry={e} /></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > shown && (
        <button type="button" onClick={() => setShown(s => s + SHOW)} className="mt-3 rounded-md border border-border px-3 py-1 text-sm hover:bg-secondary">
          Show {fmtInt(Math.min(SHOW, filtered.length - shown))} more
        </button>
      )}
    </div>
  )
}
