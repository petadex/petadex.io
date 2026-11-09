// frontend/src/components/explore/FoldBrowser.jsx
//
// Browse by fold: the 15 CATH folds as cards, then the superfamilies (30 % clusters) of the chosen fold — or of all
// folds — with filters and sorts the viewer picks. Sorts are plain facts (size, families, Plasticome members, …);
// nothing is ranked as better. Superfamily rows open the cluster page, which drills down to families and enzymes.
import React, { useEffect, useState } from "react"
import config from "../../config"
import { ClusterLink, fmtInt } from "../v260701/common"
import SourceSplit, { clusterCounts } from "../v260701/SourceSplit"

const SORTS = [
  ["size", "Proteins"],
  ["families", "Families"],
  ["plasticome", "Plasticome members"],
  ["nr", "NCBI nr members"],
  ["logan_share", "Logan share"],
  ["biosamples", "BioSamples"],
]
const PAGE = 50
const envLabel = e => (e ? e.replace(/_/g, " ") : null)
const fmtM = n => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)} M` : fmtInt(n))

function FoldCard({ d, selected, onSelect }) {
  return (
    <div className={`card p-4 transition-colors ${selected ? "ring-2 ring-info" : "hover:bg-secondary/40"}`}>
      <button type="button" onClick={() => onSelect(d.fold)} aria-pressed={selected} className="text-left w-full">
        <span className="block text-sm font-semibold text-foreground leading-snug">{d.name || d.fold}</span>
        <span className="block text-xs text-muted-foreground font-mono">{d.cath_code || "no CATH code"}</span>
        <span className="block text-xs text-secondary-foreground mt-2">
          {fmtInt(d.n_30)} superfamilies · {fmtM(d.n_60)} families · {fmtM(d.n_90)} enzymes · {fmtM(d.n_proteins)} proteins
        </span>
      </button>
      <div className="mt-2">
        <SourceSplit counts={d.members} title={`${d.name || d.fold}: proteins by source`} unit="proteins" width="w-full" />
      </div>
    </div>
  )
}

function useJson(url) {
  const [s, setS] = useState({ status: "loading", data: null })
  useEffect(() => {
    let off = false
    setS(prev => ({ status: "loading", data: prev.data }))
    fetch(url)
      .then(async r => {
        const b = await r.json().catch(() => ({}))
        if (!off) setS(r.ok ? { status: "ready", data: b } : { status: "error", data: null, error: b.error || `Request failed (${r.status})` })
      })
      .catch(() => !off && setS({ status: "error", data: null, error: "Could not reach the server." }))
    return () => { off = true }
  }, [url])
  return s
}

function SuperfamilyTable({ fold, folds }) {
  const [sort, setSort] = useState("size")
  const [order, setOrder] = useState("desc")
  const [hasPl, setHasPl] = useState(false)
  const [env, setEnv] = useState("")
  const [offset, setOffset] = useState(0)
  useEffect(() => { setOffset(0); setEnv("") }, [fold])
  useEffect(() => { setOffset(0) }, [sort, order, hasPl, env])

  const qs = new URLSearchParams({ sort, order, offset: String(offset), limit: String(PAGE) })
  if (fold) qs.set("fold", fold)
  if (hasPl) qs.set("has_plasticome", "true")
  if (env) qs.set("env", env)
  const list = useJson(`${config.apiUrl}/explore/superfamilies?${qs}`)
  const envs = useJson(`${config.apiUrl}/explore/envs${fold ? `?fold=${encodeURIComponent(fold)}` : ""}`)
  const foldName = f => folds.find(d => d.fold === f)?.name || f
  const total = list.data?.total ?? 0
  const rows = list.data?.rows || []

  return (
    <section className="card p-5 mt-6" aria-labelledby="sf-title">
      <h3 id="sf-title" className="m-0 text-lg font-semibold text-foreground">
        Superfamilies {fold ? <>in {foldName(fold)}</> : "in all folds"}
        <span className="ml-2 text-sm font-normal text-muted-foreground">({fmtInt(total)})</span>
      </h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4">30 % identity clusters. Open one to see its families and enzymes.</p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <span className="text-secondary-foreground">Sort by</span>
          <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1">
            {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button type="button" onClick={() => setOrder(o => (o === "desc" ? "asc" : "desc"))}
            className="rounded-md border border-border px-2 py-1 hover:bg-secondary" aria-label={`Order: ${order === "desc" ? "highest first" : "lowest first"}`}>
            {order === "desc" ? "↓ highest first" : "↑ lowest first"}
          </button>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={hasPl} onChange={e => setHasPl(e.target.checked)} />
          <span className="text-secondary-foreground">Has a Plasticome member</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-secondary-foreground">Most common environment</span>
          <select value={env} onChange={e => setEnv(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1">
            <option value="">any</option>
            {(envs.data?.envs || []).map(e => <option key={e.env} value={e.env}>{envLabel(e.env)} ({fmtInt(e.n)})</option>)}
          </select>
        </label>
      </div>

      {list.status === "error" && <p className="text-sm text-destructive">{list.error}</p>}
      <div className={`overflow-x-auto ${list.status === "loading" ? "opacity-60" : ""}`}>
        <table className="w-full text-sm border-collapse min-w-[860px]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-4 font-medium">Superfamily</th>
              {!fold && <th className="py-2 pr-4 font-medium">Fold</th>}
              <th className="py-2 pr-4 font-medium text-right">Proteins</th>
              <th className="py-2 pr-4 font-medium text-right">Families</th>
              <th className="py-2 pr-4 font-medium">Sources</th>
              <th className="py-2 pr-4 font-medium">Plasticome enzymes</th>
              <th className="py-2 pr-4 font-medium">Substrates</th>
              <th className="py-2 pr-4 font-medium">Most common environment</th>
              <th className="py-2 font-medium text-right">BioSamples</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0 align-top">
                <td className="py-1.5 pr-4"><ClusterLink level={30} id={r.id} /></td>
                {!fold && <td className="py-1.5 pr-4 text-xs">{r.domain_name || r.fold}</td>}
                <td className="py-1.5 pr-4 text-right font-mono text-xs">{fmtInt(r.member_count)}</td>
                <td className="py-1.5 pr-4 text-right font-mono text-xs">{fmtInt(r.child_count)}</td>
                <td className="py-1.5 pr-4"><SourceSplit counts={clusterCounts(r)} title={`${r.id}: proteins by source`} unit="proteins" /></td>
                <td className="py-1.5 pr-4 text-xs">
                  {r.n_plasticome_names ? <>{r.plasticome_names.join(", ")}{r.n_plasticome_names > r.plasticome_names.length && <span className="text-muted-foreground"> +{r.n_plasticome_names - r.plasticome_names.length}</span>}</> : <span className="text-muted-foreground">–</span>}
                </td>
                <td className="py-1.5 pr-4 text-xs">{r.substrates?.length ? r.substrates.join(", ") : <span className="text-muted-foreground">–</span>}</td>
                <td className="py-1.5 pr-4 text-xs">{envLabel(r.env_dominant) || <span className="text-muted-foreground">–</span>}</td>
                <td className="py-1.5 text-right font-mono text-xs">{fmtInt(r.n_biosamples) || "–"}</td>
              </tr>
            ))}
            {list.status === "ready" && !rows.length && (
              <tr><td colSpan={9} className="py-4 text-sm text-muted-foreground">No superfamily matches these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {total > PAGE && (
        <div className="flex items-center gap-3 mt-4 text-sm">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - PAGE))}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:bg-secondary">← Previous</button>
          <span className="text-muted-foreground">{fmtInt(offset + 1)}–{fmtInt(Math.min(offset + PAGE, total))} of {fmtInt(total)}</span>
          <button type="button" disabled={offset + PAGE >= total} onClick={() => setOffset(o => o + PAGE)}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:bg-secondary">Next →</button>
        </div>
      )}
    </section>
  )
}

export default function FoldBrowser({ summary, fold, onFold }) {
  const folds = [...summary.domains].sort((a, b) => b.n_proteins - a.n_proteins)
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button type="button" onClick={() => onFold(null)} aria-pressed={!fold}
          className={`rounded-full border px-3 py-1 text-sm ${!fold ? "border-info text-info" : "border-border text-secondary-foreground hover:bg-secondary"}`}>
          All folds
        </button>
        <span className="text-xs text-muted-foreground">Folds are ordered by number of proteins.</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {folds.map(d => <FoldCard key={d.fold} d={d} selected={fold === d.fold} onSelect={onFold} />)}
      </div>
      <SuperfamilyTable fold={fold} folds={folds} />
    </div>
  )
}
