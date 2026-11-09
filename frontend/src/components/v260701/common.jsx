// frontend/src/components/v260701/common.jsx
//
// Shared bits for the v260701 sequence and cluster pages.
//
// Naming: a sequence is keyed on its petadex_id (PL… / NR… / LG…). A cluster is named after its centroid's
// petadex_id, and the level always travels with the name: "/cluster/90/PL228", "PL228 (90 %)".
import React from "react"
import { Link } from "gatsby"

export const PETADEX_ID_RE = /^(PL|NR|LG)[1-9]\d*$/
export const isPetadexId = v => PETADEX_ID_RE.test(String(v ?? "").trim())

export const SOURCE_LABELS = { PL: "Plasticome", NR: "NCBI nr", LG: "Logan" }
export const LEVELS = [90, 60, 30]

export const sequenceHref = id => `/sequence/${encodeURIComponent(id)}`
export const clusterHref = (level, id) => `/cluster/${level}/${encodeURIComponent(id)}`
export const ncbiProtein = acc => `https://www.ncbi.nlm.nih.gov/protein/${encodeURIComponent(acc)}`
export const ncbiSra = run => `https://www.ncbi.nlm.nih.gov/sra/?term=${encodeURIComponent(run)}`
export const ncbiBiosample = bs => `https://www.ncbi.nlm.nih.gov/biosample/${encodeURIComponent(bs)}`
export const ncbiBioproject = bp => `https://www.ncbi.nlm.nih.gov/bioproject/${encodeURIComponent(bp)}`

export const fmtInt = v => (v == null || v === "" ? null : Number(v).toLocaleString("en-US"))
export const fmtNum = (v, d = 1) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v).toFixed(d))
export const fmtPct = v => (v == null ? null : `${(Number(v) * 100).toFixed(1)} %`)

export function SourceBadge({ src }) {
  if (!src) return null
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
      {SOURCE_LABELS[src] || src}
    </span>
  )
}

export function Card({ title, badge, note, children }) {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground m-0">{title}</h2>
        {badge}
      </div>
      {note && <p className="text-xs text-muted-foreground mt-1 mb-4">{note}</p>}
      {!note && <div className="mb-3" />}
      {children}
    </section>
  )
}

/** Label/value grid; rows with an empty value are dropped. */
export function Fields({ rows, cols = 2 }) {
  const shown = rows.filter(r => r && r[1] != null && r[1] !== "" && r[1] !== false)
  if (!shown.length) return null
  return (
    <dl className={`grid grid-cols-1 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-x-6 gap-y-3 m-0`}>
      {shown.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="m-0 text-sm text-foreground break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ExtLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">
      {children}
    </a>
  )
}

export function ClusterLink({ level, id, children }) {
  if (!id) return null
  return (
    <Link to={clusterHref(level, id)} className="font-mono text-info hover:underline">
      {children || id}
    </Link>
  )
}

export function SequenceLink({ id, children }) {
  if (!id) return null
  return (
    <Link to={sequenceHref(id)} className="font-mono text-info hover:underline">
      {children || id}
    </Link>
  )
}

/** Horizontal bars for a {category: count} histogram, largest first. Counts are shown as given. */
export function HistogramBars({ hist, unit }) {
  const entries = Object.entries(hist || {}).filter(([, v]) => Number(v) > 0).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  const max = entries[0][1]
  const total = entries.reduce((s, [, v]) => s + Number(v), 0)
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-3 text-sm">
          <span className="w-44 shrink-0 truncate text-secondary-foreground" title={k}>{k.replace(/_/g, " ")}</span>
          <span className="flex-1 h-2.5 rounded bg-secondary overflow-hidden">
            <span className="block h-full bg-info/70" style={{ width: `${(100 * v) / max}%` }} />
          </span>
          <span className="w-28 shrink-0 text-right font-mono text-xs text-muted-foreground">
            {fmtInt(v)} ({(100 * v) / total < 1 ? "<1" : ((100 * v) / total).toFixed(0)} %)
          </span>
        </div>
      ))}
      {unit && (
        <p className="text-xs text-muted-foreground mt-2 mb-0">
          Counts are {unit}; shares are of the {fmtInt(total)} counted.
        </p>
      )}
    </div>
  )
}

/** Parse "S107(S161):D170(D250)" (HMM state(residue in this sequence)) into parallel lists. */
export function parseSiteIdentities(s) {
  const residues = [], states = []
  for (const part of String(s || "").split(":")) {
    const m = /^([A-Z-]+\d*)\(([^)]*)\)$/.exec(part.trim())
    if (!m) continue
    states.push(m[1])
    residues.push(m[2] === "-NA" ? "absent" : m[2])
  }
  return { residues, states }
}
