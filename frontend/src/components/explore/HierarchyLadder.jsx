// frontend/src/components/explore/HierarchyLadder.jsx
//
// The PETadex clustering hierarchy as an interactive ladder (after manuscript figure 2c): protein -> enzyme (90 %)
// -> family (60 %) -> superfamily (30 %) -> domain (fold). Hovering or focusing a level shows, in the inspector
// beside it, where that level comes from: the source of each cluster's centroid, and which sources its clusters
// contain. Facts only: no level or cluster is ranked.
import React, { useState } from "react"
import { fmtInt } from "../v260701/common"
import { SourceBar, SourceSplitTable, SOURCE_COLORS } from "../v260701/SourceSplit"

// Colours of figure 2c: stroke (dark), fill (light).
export const RUNGS = [
  { key: "protein", name: "Protein", sub: "one complete catalytic domain per protein", shape: "circle", stroke: "#680070", fill: "#c399c6", small: 9 },
  { key: "90", name: "Enzyme", sub: "90 % identity cluster", shape: "hexagon", stroke: "#d43844", fill: "#ecaa97", small: 7 },
  { key: "60", name: "Family", sub: "60 % identity cluster", shape: "pentagon", stroke: "#70ba4b", fill: "#d5e5cc", small: 5 },
  { key: "30", name: "Superfamily", sub: "30 % identity cluster", shape: "square", stroke: "#b39226", fill: "#f9e7ad", small: 3 },
  { key: "domain", name: "Domain", sub: "distinct fold (CATH)", shape: "triangle", stroke: "#5776f7", fill: "#9aadfa", small: 7 },
]

/** One glyph centred on (cx, cy) with "radius" r. */
export function GlyphShape({ shape, cx, cy, r, stroke, fill, sw = 1.5 }) {
  const pts = (n, rot) => Array.from({ length: n }, (_, i) => {
    const a = rot + (2 * Math.PI * i) / n
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(" ")
  const common = { stroke, fill, strokeWidth: sw }
  switch (shape) {
    case "circle": return <circle cx={cx} cy={cy} r={r} {...common} />
    case "hexagon": return <polygon points={pts(6, 0)} {...common} />
    case "pentagon": return <polygon points={pts(5, -Math.PI / 2)} {...common} />
    case "square": return <rect x={cx - r * 0.85} y={cy - r * 0.85} width={r * 1.7} height={r * 1.7} {...common} />
    case "triangle": return <polygon points={pts(3, -Math.PI / 2)} {...common} />
    default: return null
  }
}

export function Glyph({ rung, size = 44 }) {
  const r = size / 2 - 3
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0">
      <GlyphShape shape={rung.shape} cx={size / 2} cy={rung.shape === "triangle" ? size / 2 + 3 : size / 2} r={r} stroke={rung.stroke} fill={rung.fill} sw={2.5} />
    </svg>
  )
}

const ROW_H = 92
const MOTIF_W = 220

/** The figure's motif for one rung: a row of members with the centroid larger, joined by a bracket, and the spine. */
function Motif({ rung, first, last }) {
  const cx = MOTIF_W / 2
  const gy = 22
  const n = rung.small
  const step = 22
  const xs = Array.from({ length: n }, (_, i) => cx + (i - (n - 1) / 2) * step)
  const bracketY = 58
  return (
    <svg width={MOTIF_W} height={ROW_H} viewBox={`0 0 ${MOTIF_W} ${ROW_H}`} aria-hidden="true" className="shrink-0 hidden sm:block">
      {!first && <line x1={cx} y1={0} x2={cx} y2={gy - 9} className="stroke-foreground" strokeWidth="2.5" />}
      {!last && (
        <g className="stroke-muted-foreground" strokeWidth="2" opacity="0.8">
          {xs.map((x, i) => i === (n - 1) / 2 ? null : <line key={i} x1={x} y1={gy + 8} x2={x} y2={bracketY} />)}
          <line x1={xs[0]} y1={bracketY} x2={xs[n - 1]} y2={bracketY} />
        </g>
      )}
      {!last && <line x1={cx} y1={gy + 9} x2={cx} y2={ROW_H} className="stroke-foreground" strokeWidth="2.5" />}
      {xs.map((x, i) => {
        const centre = i === (n - 1) / 2
        return <GlyphShape key={i} shape={rung.shape} cx={x} cy={gy} r={centre ? 9 : 6.5} stroke={rung.stroke} fill={rung.fill} sw={1.3} />
      })}
    </svg>
  )
}

const COMPOSITION = [
  ["with_PL", "Contain a Plasticome enzyme"],
  ["NR_LG", "NCBI nr and Logan, no Plasticome"],
  ["NR_only", "NCBI nr only"],
  ["LG_only", "Logan only"],
]

function pct(n, total) {
  if (!total) return "–"
  const p = (100 * n) / total
  return n > 0 && p < 0.1 ? "<0.1 %" : `${p < 10 ? p.toFixed(1) : p.toFixed(0)} %`
}

function Inspector({ rung, summary, onAction }) {
  const lv = summary.levels.find(l => String(l.level) === rung.key)
  const isCluster = ["90", "60", "30"].includes(rung.key)
  const n = rung.key === "domain" ? summary.domains.length : lv?.n
  const action = {
    protein: ["Open a random protein", () => onAction("random", "protein")],
    90: ["Open a random enzyme", () => onAction("random", "90")],
    60: ["Open a random family", () => onAction("random", "60")],
    30: ["Browse superfamilies", () => onAction("browse", "superfamilies")],
    domain: ["Browse the folds", () => onAction("browse", "folds")],
  }[rung.key]
  return (
    <div className="card p-5 h-full" aria-live="polite">
      <div className="flex items-center gap-3 mb-1">
        <Glyph rung={rung} size={32} />
        <div>
          <h3 className="m-0 text-lg font-semibold text-foreground">{rung.name}s</h3>
          <p className="m-0 text-xs text-muted-foreground">{rung.sub}</p>
        </div>
        <span className="ml-auto font-mono text-lg text-foreground">{fmtInt(n)}</span>
      </div>

      {rung.key === "protein" && (
        <>
          <h4 className="text-xs font-semibold text-secondary-foreground mt-4 mb-2">Where the proteins come from</h4>
          <SourceBar counts={lv.members} />
          <div className="mt-2"><SourceSplitTable counts={lv.members} unit="proteins" /></div>
          <p className="text-xs text-muted-foreground mt-3 mb-0">Each protein is counted once, under the database it was taken from.</p>
        </>
      )}

      {isCluster && (
        <>
          <h4 className="text-xs font-semibold text-secondary-foreground mt-4 mb-2">Source of each cluster's centroid</h4>
          <SourceBar counts={lv.centroids} />
          <div className="mt-2"><SourceSplitTable counts={lv.centroids} unit="clusters" /></div>
          {lv.composition && (
            <>
              <h4 className="text-xs font-semibold text-secondary-foreground mt-4 mb-2">What the clusters contain</h4>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {COMPOSITION.map(([k, label]) => (
                    <tr key={k}>
                      <td className="py-0.5 pr-2">{label}</td>
                      <td className="py-0.5 pr-2 text-right font-mono">{fmtInt(lv.composition[k])}</td>
                      <td className="py-0.5 text-right font-mono text-muted-foreground whitespace-nowrap">{pct(lv.composition[k], lv.n)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-3 mb-0">
            A centroid comes from the first source present among its members, in the order Plasticome, NCBI nr,
            Logan, so a Logan centroid means the cluster has no Plasticome or NCBI nr member.
          </p>
        </>
      )}

      {rung.key === "domain" && (
        <>
          <h4 className="text-xs font-semibold text-secondary-foreground mt-4 mb-2">Proteins per fold, by source</h4>
          <ul className="list-none m-0 p-0 space-y-1.5">
            {[...summary.domains].sort((a, b) => b.n_proteins - a.n_proteins).map(d => (
              <li key={d.fold} className="flex items-center gap-2 text-xs">
                <span className="w-40 shrink-0 truncate" title={d.name || d.fold}>{d.name || d.fold}</span>
                <span className="flex-1"><SourceBar counts={d.members} total={summary.levels[0].n} /></span>
                <span className="w-16 shrink-0 text-right font-mono text-muted-foreground">{fmtInt(d.n_proteins)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3 mb-0">Bar length is the fold's share of all proteins.</p>
        </>
      )}

      {action && (
        <button type="button" onClick={action[1]} className="mt-4 rounded-md border border-border px-3 py-1.5 text-sm text-info hover:bg-secondary">
          {action[0]} →
        </button>
      )}
    </div>
  )
}

export default function HierarchyLadder({ summary, onAction }) {
  const [active, setActive] = useState("protein")
  const rung = RUNGS.find(r => r.key === active)
  const countOf = r => (r.key === "domain" ? summary.domains.length : summary.levels.find(l => String(l.level) === r.key)?.n)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <ol className="list-none m-0 p-0 w-full sm:w-fit mx-auto" aria-label="Clustering levels, from single proteins up to folds">
        {RUNGS.map((r, i) => (
          <li key={r.key}>
            <button
              type="button"
              onMouseEnter={() => setActive(r.key)}
              onFocus={() => setActive(r.key)}
              onClick={() => setActive(r.key)}
              aria-pressed={active === r.key}
              className={`w-full flex items-center gap-4 px-3 rounded-lg text-left transition-colors ${active === r.key ? "bg-secondary/60" : "hover:bg-secondary/30"}`}
              style={{ height: ROW_H }}
            >
              <span className="w-44 shrink-0">
                <span className="block text-base font-semibold" style={{ color: r.stroke === "#680070" ? "#b56cbb" : r.stroke }}>{r.name}</span>
                <span className="block text-xs text-muted-foreground leading-tight">{r.sub}</span>
                <span className="block text-sm font-mono text-foreground mt-0.5">n = {fmtInt(countOf(r))}</span>
              </span>
              <span className="flex flex-col items-center shrink-0" style={{ height: ROW_H }}>
                <span className="mt-2"><Glyph rung={r} /></span>
                {i < RUNGS.length - 1 && <span aria-hidden="true" className="flex-1 w-0.5 bg-foreground/70 mt-1" />}
              </span>
              <Motif rung={r} first={i === 0} last={i === RUNGS.length - 1} />
            </button>
          </li>
        ))}
      </ol>
      <div className="lg:sticky lg:top-24">
        <Inspector rung={rung} summary={summary} onAction={onAction} />
        <p className="text-[11px] text-muted-foreground mt-2 mb-0 flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(SOURCE_COLORS).map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              {{ PL: "Plasticome", NR: "NCBI nr", LG: "Logan" }[k]}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}
