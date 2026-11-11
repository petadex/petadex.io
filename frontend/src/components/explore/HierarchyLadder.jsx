// frontend/src/components/explore/HierarchyLadder.jsx
//
// The PETadex clustering hierarchy as an interactive ladder (after manuscript figure 2c): protein -> enzyme (90 %)
// -> family (60 %) -> superfamily (30 %) -> domain (fold). Hovering or focusing a level shows, in the inspector
// beside it, where that level comes from: the source of each cluster's centroid, and which sources its clusters
// contain. Facts only: no level or cluster is ranked.
import React, { useState } from "react"
import { fmtInt } from "../v260701/common"
import { SourceBar, SourceSplitTable, SOURCE_COLORS } from "../v260701/SourceSplit"

/** The wiki's Clustering page; each level has a child page, Clustering-<Level>. */
export const CLUSTERING_WIKI = "https://github.com/petadex/petadex.io/wiki/Clustering"

// Colours of figure 2c: stroke (dark), fill (light).
export const RUNGS = [
  { key: "protein", name: "Protein", letter: "P", sub: "One sequence with a complete catalytic hit.", shape: "circle", stroke: "#680070", fill: "#c399c6", small: 9 },
  { key: "90", name: "Enzyme", letter: "E", sub: "90 % identity cluster", shape: "hexagon", stroke: "#d43844", fill: "#ecaa97", small: 7 },
  { key: "60", name: "Family", letter: "F", sub: "60 % identity cluster", shape: "pentagon", stroke: "#70ba4b", fill: "#d5e5cc", small: 5 },
  { key: "30", name: "Superfamily", letter: "S", sub: "30 % identity cluster", shape: "square", stroke: "#b39226", fill: "#f9e7ad", small: 3 },
  { key: "domain", name: "Domain", letter: "D", sub: "distinct fold (CATH)", shape: "triangle", stroke: "#5776f7", fill: "#9aadfa", small: 7 },
]

/** One glyph centred on (cx, cy) with "radius" r, with the level's initial in the middle. */
export function GlyphShape({ shape, cx, cy, r, stroke, fill, sw = 1.5, letter }) {
  const outline = glyphOutline({ shape, cx, cy, r, stroke, fill, sw })
  if (!letter || !outline) return outline
  // A triangle's inscribed circle is half its radius, so its letter is smaller (and nudged down a hair, where
  // the triangle is widest).
  const tri = shape === "triangle"
  return (
    <g>
      {outline}
      <text
        x={cx}
        y={tri ? cy + r * 0.1 : cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={stroke}
        fontSize={(tri ? 0.62 : 1.05) * r}
        fontWeight="700"
        fontFamily="inherit"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {letter}
      </text>
    </g>
  )
}

function glyphOutline({ shape, cx, cy, r, stroke, fill, sw }) {
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
      <GlyphShape shape={rung.shape} cx={size / 2} cy={rung.shape === "triangle" ? size / 2 + 3 : size / 2} r={r} stroke={rung.stroke} fill={rung.fill} sw={2.5} letter={rung.letter} />
    </svg>
  )
}

const ROW_H = 112
const MOTIF_W = 220

/** The figure's motif for one rung: a row of members with the centroid larger, joined by a bracket, and the spine. */
function Motif({ rung, first, last, mark }) {
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
        return <GlyphShape key={i} shape={rung.shape} cx={x} cy={gy} r={centre ? 9 : 6.5} stroke={rung.stroke} fill={rung.fill} sw={1.3} letter={rung.letter} />
      })}
      {/* The looked-up protein's unit at this level, beside the spine. */}
      {mark && (
        <text x={last ? cx : cx + 10} y={last ? 54 : 84} textAnchor={last ? "middle" : "start"} fontSize="14" fontWeight="600"
          fill={nameColor(rung)} fontFamily="inherit">
          {mark.length > 26 ? `${mark.slice(0, 25)}…` : mark}
        </text>
      )}
    </svg>
  )
}

function Inspector({ rung, summary }) {
  const lv = summary.levels.find(l => String(l.level) === rung.key)
  const isCluster = ["90", "60", "30"].includes(rung.key)
  const n = rung.key === "domain" ? summary.domains.length : lv?.n
  return (
    <div className="card p-7 h-full" aria-live="polite">
      <div className="flex items-center gap-4 mb-1">
        <Glyph rung={rung} size={48} />
        <div>
          <h3 className="m-0 text-2xl font-semibold text-foreground">{rung.name}s</h3>
          <p className="m-0 text-base text-muted-foreground">{rung.sub}</p>
        </div>
        <span className="ml-auto text-2xl text-foreground">{fmtInt(n)}</span>
      </div>

      {rung.key === "protein" && (
        <>
          <h4 className="text-xl font-semibold text-secondary-foreground mt-5 mb-2">Where the proteins come from</h4>
          <SourceBar counts={lv.members} height="h-3.5" />
          <div className="mt-3"><SourceSplitTable counts={lv.members} unit="proteins" textSize="text-base" /></div>
          <p className="text-base text-muted-foreground mt-4 mb-0">Each protein is counted once, under the database it was taken from.</p>
        </>
      )}

      {isCluster && (
        <>
          <h4 className="text-xl font-semibold text-secondary-foreground mt-5 mb-2">Source of each cluster's centroid</h4>
          <SourceBar counts={lv.centroids} height="h-3.5" />
          <div className="mt-3"><SourceSplitTable counts={lv.centroids} unit="clusters" textSize="text-base" /></div>
        </>
      )}

      {rung.key === "domain" && (
        <>
          <h4 className="text-xl font-semibold text-secondary-foreground mt-5 mb-2">Proteins per fold, by source</h4>
          <ul className="list-none m-0 p-0 space-y-2">
            {[...summary.domains].sort((a, b) => b.n_proteins - a.n_proteins).map(d => (
              <li key={d.fold} className="flex items-center gap-2 text-base">
                <span className="w-52 shrink-0 truncate" title={d.name || d.fold}>{d.name || d.fold}</span>
                <span className="flex-1"><SourceBar counts={d.members} total={summary.levels[0].n} /></span>
                <span className="w-24 shrink-0 text-right text-muted-foreground">{fmtInt(d.n_proteins)}</span>
              </li>
            ))}
          </ul>
          <p className="text-base text-muted-foreground mt-4 mb-0">Bar length is the fold's share of all proteins.</p>
        </>
      )}

      <a
        href={`${CLUSTERING_WIKI}-${rung.name}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-5 rounded-md border border-border px-4 py-2 text-base text-info hover:bg-secondary"
      >
        How the {rung.name.toLowerCase()} level is defined ↗<span className="sr-only"> (opens the PETadex wiki in a new tab)</span>
      </a>
    </div>
  )
}

/** Level name colour; the protein's dark purple is lightened so it reads on both themes. */
const nameColor = r => (r.stroke === "#680070" ? "#b56cbb" : r.stroke)

export default function HierarchyLadder({ summary, path }) {
  const [active, setActive] = useState("protein")
  const rung = RUNGS.find(r => r.key === active)
  const countOf = r => (r.key === "domain" ? summary.domains.length : summary.levels.find(l => String(l.level) === r.key)?.n)
  return (
    // The ladder is centred in the space left of the inspector card; on narrow screens everything stacks.
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px] gap-6 items-start">
      <ol className="list-none m-0 p-0 w-fit max-w-full mx-auto" aria-label="Clustering levels, from single proteins up to folds">
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
              <span className="w-60 shrink-0">
                <span className="block text-xl font-semibold" style={{ color: nameColor(r) }}>{r.name}</span>
                <span className="block text-base text-muted-foreground leading-snug">{r.sub}</span>
                <span className="block text-base text-foreground mt-0.5">n = {fmtInt(countOf(r))}</span>
              </span>
              <span className="flex flex-col items-center shrink-0" style={{ height: ROW_H }}>
                <span className="mt-2"><Glyph rung={r} /></span>
                {i < RUNGS.length - 1 && <span aria-hidden="true" className="flex-1 w-0.5 bg-foreground/70 mt-1" />}
              </span>
              <Motif rung={r} first={i === 0} last={i === RUNGS.length - 1} mark={path?.[r.key]?.id} />
            </button>
          </li>
        ))}
      </ol>
      <div className="lg:sticky lg:top-24 w-full max-w-[480px] mx-auto lg:max-w-none">
        <Inspector rung={rung} summary={summary} />
        <p className="text-sm text-muted-foreground mt-3 mb-0 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(SOURCE_COLORS).map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c }} />
              {{ PL: "Plasticome", NR: "NCBI nr", LG: "Logan" }[k]}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}
