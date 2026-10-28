// Alignment: where hits align on the query, how much sequence they carry
// beyond it, and how identity falls off by source (from each hit's
// coordinates and full subject sequence); and the tree and alignment of the
// representative hits (built after every search).
import React, { useMemo, useRef, useState } from "react"
import Dropdown from "../../common/Dropdown"
import { MsaPanel, TreePanel } from "./TreeAlignment"
import { OriginTag, SectionTitle } from "./parts"

const ORIGINS = ["plasticome", "ncbi_nr", "logan"]
const ORIGIN_COLOR = {
  plasticome: "var(--origin-plasticome)",
  ncbi_nr: "var(--origin-ncbi-nr)",
  logan: "var(--origin-logan)",
}
const IDENTITY_COLOR = "var(--info)"
const OVERHANG_COLOR = "var(--muted-foreground)"

const W = 1000
const LABEL_W = 110
// Room between the id labels and the longest drawn overhang, for its "+N".
const LABEL_GAP = 34
const PLOT_W = W - LABEL_W - LABEL_GAP - 70
// Overhangs are drawn to scale up to this many residues; longer ones are
// capped and labelled with their length.
const MAX_OVERHANG = 80

const axisText = "fill-muted-foreground font-mono text-[10px]"

/** Lowest identity among `hits`, rounded down to 10 %. */
export const identityFloor = hits =>
  Math.max(
    0,
    Math.floor(Math.min(100, ...hits.map(h => h.identity ?? 100)) / 10) * 10
  )

/** Rows of hit geometry in query coordinates. */
function geometry(hit) {
  const tlen = hit.target_sequence?.length ?? null
  return {
    left: hit.target_start != null ? hit.target_start - 1 : 0,
    right: tlen != null && hit.target_end != null ? tlen - hit.target_end : 0,
    tlen,
  }
}

function useTip() {
  const [tip, setTip] = useState(null)
  const show = (content, e) => {
    const pad = 14
    let x = e.clientX + pad
    let y = e.clientY + pad
    if (x + 280 > window.innerWidth) x = e.clientX - 280 - pad
    if (y + 120 > window.innerHeight) y = e.clientY - 120 - pad
    setTip({ content, x, y })
  }
  const node = tip ? (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-30 w-max max-w-72 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.content}
    </div>
  ) : null
  return { show, hide: () => setTip(null), node }
}

function HitTip({ hit, g, showRank = false }) {
  return (
    <>
      <div className="font-mono font-semibold">{hit.target_id}</div>
      <OriginTag db={hit.db} />
      {showRank && (
        <div>
          Rank {hit.rank}
          {hit.bitscore != null && ` · bit score ${Math.round(hit.bitscore)}`}
        </div>
      )}
      <div>
        {hit.identity?.toFixed(1)} % identity · query {hit.query_start}–
        {hit.query_end}
      </div>
      {g.tlen != null && (
        <div className="text-muted-foreground">
          {g.tlen} aa · +{g.left} before · +{g.right} after
        </div>
      )}
    </>
  )
}

/* ── 1 + 2. Coverage depth and alignment map, on one query axis ─────────── */

function QueryAxis({ qlen, sx, y }) {
  const step = qlen > 600 ? 100 : 50
  const ticks = [1]
  for (let t = step; t < qlen; t += step) ticks.push(t)
  ticks.push(qlen)
  return ticks.map(t => (
    <text key={t} x={sx(t)} y={y} textAnchor="middle" className={axisText}>
      {t}
    </text>
  ))
}

function CoverageAndMap({ hits, qlen, count, colorBy, onOpenRecord }) {
  const tip = useTip()
  // Query positions span the plot; overhang room on both sides.
  const pad = (PLOT_W * MAX_OVERHANG) / (qlen + 2 * MAX_OVERHANG)
  const inner = PLOT_W - 2 * pad
  const x0 = LABEL_W + LABEL_GAP + pad
  const sx = pos => x0 + ((pos - 1) / Math.max(1, qlen - 1)) * inner
  const res = inner / Math.max(1, qlen - 1)

  // 1. Depth: hits covering each query position, over every hit.
  const depth = useMemo(() => {
    const d = new Array(qlen + 2).fill(0)
    for (const h of hits) {
      if (h.query_start == null || h.query_end == null) continue
      d[h.query_start] += 1
      d[h.query_end + 1] -= 1
    }
    let run = 0
    return d.slice(1, qlen + 1).map(v => (run += v))
  }, [hits, qlen])
  const maxDepth = Math.max(1, ...depth)
  const DH = 70
  const depthPath =
    `M${sx(1)},${DH}` +
    depth
      .map((v, i) => `L${sx(i + 1)},${DH - (v / maxDepth) * (DH - 6)}`)
      .join("") +
    `L${sx(qlen)},${DH}Z`

  // 2. Map: one row per hit, rank order.
  const shown = hits.slice(0, count)
  // Identity shading spans the rows shown, so close hits stay distinguishable.
  const idLo = identityFloor(shown)
  const ROW = shown.length > 150 ? 5 : shown.length > 60 ? 8 : 12
  const GAP = ROW > 6 ? 2 : 1
  const labels = ROW >= 8
  const mapTop = DH + 26
  const height = mapTop + shown.length * (ROW + GAP) + 22

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Coverage depth along the ${qlen} aa query, and the alignment of the top ${shown.length} hits`}
      >
        {/* 1. depth */}
        <text x={LABEL_W - 8} y={14} textAnchor="end" className={axisText}>
          {maxDepth} hits
        </text>
        <text x={LABEL_W - 8} y={DH} textAnchor="end" className={axisText}>
          0
        </text>
        <line
          x1={sx(1)}
          x2={sx(qlen)}
          y1={DH}
          y2={DH}
          stroke="var(--border-strong)"
        />
        <path d={depthPath} fill={IDENTITY_COLOR} fillOpacity={0.35} />
        <path
          d={depthPath.replace(/Z$/, "")}
          fill="none"
          stroke={IDENTITY_COLOR}
          strokeWidth={1.5}
        />
        <QueryAxis qlen={qlen} sx={sx} y={DH + 14} />

        {/* 2. map */}
        <line
          x1={sx(1)}
          x2={sx(1)}
          y1={mapTop - 4}
          y2={height - 20}
          stroke="var(--border)"
          strokeDasharray="2 3"
        />
        <line
          x1={sx(qlen)}
          x2={sx(qlen)}
          y1={mapTop - 4}
          y2={height - 20}
          stroke="var(--border)"
          strokeDasharray="2 3"
        />
        {shown.map((h, i) => {
          const g = geometry(h)
          const y = mapTop + i * (ROW + GAP)
          const a = sx(h.query_start)
          const b = sx(h.query_end)
          const lw = Math.min(g.left, MAX_OVERHANG) * res
          const rw = Math.min(g.right, MAX_OVERHANG) * res
          const t = Math.max(
            0,
            Math.min(1, ((h.identity ?? 0) - idLo) / (100 - idLo || 1))
          )
          const fill =
            colorBy === "origin" ? ORIGIN_COLOR[h.db] : IDENTITY_COLOR
          const opacity = colorBy === "origin" ? 0.9 : 0.25 + 0.75 * t
          return (
            // Each row opens its hit's record, like an accession in the hits list.
            <g
              key={`${h.rank}-${h.target_id}`}
              role="button"
              tabIndex={0}
              aria-label={`Open record for ${h.target_id}`}
              className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:fill-accent/10"
              onClick={() => onOpenRecord(h.target_id)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onOpenRecord(h.target_id)
                }
              }}
              onMouseEnter={e => tip.show(<HitTip hit={h} g={g} />, e)}
              onMouseMove={e => tip.show(<HitTip hit={h} g={g} />, e)}
              onMouseLeave={tip.hide}
            >
              <rect
                x={0}
                y={y - GAP / 2}
                width={W}
                height={ROW + GAP}
                className="fill-transparent hover:fill-foreground/5"
              />
              {labels && (
                <text
                  x={LABEL_W - 8}
                  y={y + ROW - 1}
                  textAnchor="end"
                  className="fill-secondary-foreground font-mono text-[9px] underline decoration-dotted"
                >
                  {h.target_id}
                </text>
              )}
              {lw > 0 && (
                <rect
                  x={a - lw}
                  y={y + ROW * 0.3}
                  width={lw}
                  height={ROW * 0.4}
                  fill={OVERHANG_COLOR}
                  fillOpacity={0.45}
                />
              )}
              <rect
                x={a}
                y={y}
                width={Math.max(1, b - a)}
                height={ROW}
                rx={Math.min(2, ROW / 3)}
                fill={fill}
                fillOpacity={opacity}
              />
              {rw > 0 && (
                <rect
                  x={b}
                  y={y + ROW * 0.3}
                  width={rw}
                  height={ROW * 0.4}
                  fill={OVERHANG_COLOR}
                  fillOpacity={0.45}
                />
              )}
              {labels && g.left > MAX_OVERHANG && (
                <text
                  x={a - lw - 3}
                  y={y + ROW - 1}
                  textAnchor="end"
                  className="fill-muted-foreground font-mono text-[8px]"
                >
                  +{g.left}
                </text>
              )}
              {labels && g.right > MAX_OVERHANG && (
                <text
                  x={b + rw + 3}
                  y={y + ROW - 1}
                  className="fill-muted-foreground font-mono text-[8px]"
                >
                  +{g.right}
                </text>
              )}
            </g>
          )
        })}
        <QueryAxis qlen={qlen} sx={sx} y={height - 6} />
      </svg>
      {tip.node}
    </div>
  )
}

/* ── 3. Identity by rank ────────────────────────────────────────────────── */

function IdentityByRank({ hits, shown }) {
  const tip = useTip()
  const H = 260
  const M = { l: 40, r: 10, t: 10, b: 28 }
  const n = Math.max(1, hits.length)
  const lo = Math.max(
    0,
    Math.floor(Math.min(...hits.map(h => h.identity ?? 100)) / 10) * 10
  )
  const sx = r => M.l + ((r - 1) / Math.max(1, n - 1)) * (500 - M.l - M.r)
  const sy = v => M.t + ((100 - v) / (100 - lo || 1)) * (H - M.t - M.b)
  const yTicks = []
  for (let v = lo; v <= 100; v += 10) yTicks.push(v)
  const xTicks = [1, ...[100, 200, 300, 400, 500].filter(t => t < n), n]
  // Draw Logan first, Plasticome last, so the few characterized hits sit on top.
  const order = ["logan", "ncbi_nr", "plasticome"]
  // Hidden origins drop their dots; axes stay on every hit, so ranks don't move.
  const sorted = hits
    .filter(h => !ORIGINS.includes(h.db) || shown.has(h.db))
    .sort((a, b) => order.indexOf(a.db) - order.indexOf(b.db))
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 500 ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Identity to the query by search rank, colored by origin"
      >
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={M.l}
              x2={500 - M.r}
              y1={sy(v)}
              y2={sy(v)}
              stroke="var(--border)"
            />
            <text
              x={M.l - 6}
              y={sy(v) + 3}
              textAnchor="end"
              className={axisText}
            >
              {v}%
            </text>
          </g>
        ))}
        {xTicks.map(t => (
          <text
            key={t}
            x={sx(t)}
            y={H - 12}
            textAnchor="middle"
            className={axisText}
          >
            {t}
          </text>
        ))}
        <text x={500 - M.r} y={H - 1} textAnchor="end" className={axisText}>
          rank →
        </text>
        {sorted.map(h => (
          <circle
            key={`${h.rank}-${h.target_id}`}
            cx={sx(h.rank)}
            cy={sy(h.identity ?? 0)}
            r={h.db === "plasticome" ? 4 : 2.6}
            fill={ORIGIN_COLOR[h.db] || OVERHANG_COLOR}
            stroke={h.db === "plasticome" ? "var(--card)" : "none"}
            strokeWidth={1}
            onMouseEnter={e =>
              tip.show(<HitTip hit={h} g={geometry(h)} showRank />, e)
            }
            onMouseMove={e =>
              tip.show(<HitTip hit={h} g={geometry(h)} showRank />, e)
            }
            onMouseLeave={tip.hide}
          />
        ))}
      </svg>
      {tip.node}
    </div>
  )
}

/* ── 4. Identity distribution, stacked by origin ────────────────────────── */

/** Round `x` up to 1, 2 or 5 × a power of ten, for count-axis steps. */
const niceStep = x => {
  const p = 10 ** Math.floor(Math.log10(Math.max(1, x)))
  return [1, 2, 5, 10].map(m => m * p).find(s => s >= x)
}

function IdentityHistogram({ hits, shown }) {
  const tip = useTip()
  const H = 260
  const M = { l: 40, r: 10, t: 10, b: 28 }
  const lo = identityFloor(hits)
  const bins = []
  for (let v = lo; v < 100; v += 5) bins.push(v)
  // counts[i][origin]: hits in bin i; 100 % falls in the last bin.
  const counts = bins.map(b =>
    Object.fromEntries(
      ORIGINS.map(o => [
        o,
        hits.filter(h => {
          const v = h.identity ?? 0
          return h.db === o && v >= b && (v < b + 5 || (b === 95 && v === 100))
        }).length,
      ])
    )
  )
  // Logan at the base, Plasticome on top, matching the rank chart's layering.
  // The count axis fits the shown origins only.
  const stack = ["logan", "ncbi_nr", "plasticome"].filter(o => shown.has(o))
  const totals = counts.map(c => stack.reduce((s, o) => s + c[o], 0))
  const step = niceStep(Math.max(1, ...totals) / 4)
  const top = Math.max(step, Math.ceil(Math.max(1, ...totals) / step) * step)
  const yTicks = []
  for (let v = 0; v <= top; v += step) yTicks.push(v)
  const plotW = 500 - M.l - M.r
  const bw = plotW / bins.length
  const sy = n => H - M.b - (n / top) * (H - M.t - M.b)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 500 ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Hits by identity to the query, 5 % bins, stacked by origin"
      >
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={M.l}
              x2={500 - M.r}
              y1={sy(v)}
              y2={sy(v)}
              stroke="var(--border)"
            />
            <text
              x={M.l - 6}
              y={sy(v) + 3}
              textAnchor="end"
              className={axisText}
            >
              {v}
            </text>
          </g>
        ))}
        {counts.map((c, i) => {
          const x = M.l + i * bw
          let acc = 0
          return (
            <g key={bins[i]}>
              {stack.map(o => {
                if (!c[o]) return null
                const y0 = sy(acc)
                acc += c[o]
                return (
                  <rect
                    key={o}
                    x={x + 1}
                    y={sy(acc)}
                    width={bw - 2}
                    height={y0 - sy(acc)}
                    fill={ORIGIN_COLOR[o]}
                  />
                )
              })}
              <rect
                x={x}
                y={M.t}
                width={bw}
                height={H - M.t - M.b}
                className="fill-transparent hover:fill-foreground/5"
                onMouseEnter={e =>
                  tip.show(
                    <>
                      <div className="font-semibold">
                        {bins[i]}–{bins[i] + 5} % identity · {totals[i]} hits
                      </div>
                      {[...stack].reverse().map(o => (
                        <div key={o} className="flex items-center gap-2">
                          <OriginTag db={o} />
                          <span className="tabular-nums">{c[o]}</span>
                        </div>
                      ))}
                    </>,
                    e
                  )
                }
                onMouseLeave={tip.hide}
              />
            </g>
          )
        })}
        {bins
          .filter(b => b % 10 === 0)
          .concat(100)
          .map(b => (
            <text
              key={b}
              x={M.l + ((b - lo) / 5) * bw}
              y={H - 12}
              textAnchor="middle"
              className={axisText}
            >
              {b}%
            </text>
          ))}
        <text x={500 - M.r} y={H - 1} textAnchor="end" className={axisText}>
          identity to query →
        </text>
      </svg>
      {tip.node}
    </div>
  )
}

/* ── Legend ─────────────────────────────────────────────────────────────── */

/** Origin legend whose items show or hide that origin; one always stays on. */
function OriginToggles({ shown, onChange }) {
  const flip = o => {
    const next = new Set(shown)
    if (next.has(o)) {
      if (next.size === 1) return
      next.delete(o)
    } else next.add(o)
    onChange(next)
  }
  return (
    <div className="flex flex-wrap gap-1 text-xs text-secondary-foreground">
      {ORIGINS.map(o => (
        <button
          key={o}
          type="button"
          aria-pressed={shown.has(o)}
          onClick={() => flip(o)}
          className={`cursor-pointer rounded-full px-2 py-0.5 transition-opacity hover:bg-surface-raised ${
            shown.has(o) ? "" : "line-through opacity-40"
          }`}
        >
          <OriginTag db={o} />
        </button>
      ))}
    </div>
  )
}

/* ── View ───────────────────────────────────────────────────────────────── */

const COUNTS = [50, 100, 250, 500]
const toggle = active =>
  `cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
    active
      ? "border-accent bg-accent-subtle text-foreground"
      : "border-border bg-background text-secondary-foreground hover:bg-surface-raised hover:text-foreground"
  }`

const PANELS = [
  { id: "identity", label: "Identity" },
  { id: "coverage", label: "Coverage and alignment" },
  { id: "tree", label: "Phylogenetic tree" },
  { id: "msa", label: "Multiple alignment" },
]

/** Sub-panel tabs; arrow keys move between them. */
function PanelTabs({ panel, onSelect }) {
  const refs = useRef({})
  const onKeyDown = e => {
    const i = PANELS.findIndex(p => p.id === panel)
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = PANELS[(i + step + PANELS.length) % PANELS.length].id
    onSelect(next)
    refs.current[next]?.focus()
  }
  return (
    <div
      role="tablist"
      aria-label="Alignment figures"
      className="flex flex-wrap gap-1 border-b border-border"
      onKeyDown={onKeyDown}
    >
      {PANELS.map(p => {
        const active = p.id === panel
        return (
          <button
            key={p.id}
            ref={el => (refs.current[p.id] = el)}
            type="button"
            role="tab"
            id={`alignment-tab-${p.id}`}
            aria-selected={active}
            aria-controls={`alignment-panel-${p.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(p.id)}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-info text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

export default function AlignmentView({
  hits,
  queryLength,
  querySequence,
  sessionId,
  alignment,
  onOpenRecord,
}) {
  const [panel, setPanel] = useState("identity")
  const [rankShown, setRankShown] = useState(() => new Set(ORIGINS))
  const [histShown, setHistShown] = useState(() => new Set(ORIGINS))
  const [count, setCount] = useState(100)
  const [colorBy, setColorBy] = useState("identity")
  const qlen =
    queryLength ||
    querySequence?.length ||
    Math.max(1, ...hits.map(h => h.query_end ?? 0))
  const options = COUNTS.filter(n => n < hits.length)
    .map(n => ({ value: n, label: String(n) }))
    .concat({ value: hits.length, label: `All ${hits.length}` })
  const shownCount = Math.min(count, hits.length)

  const panelProps = id => ({
    role: "tabpanel",
    id: `alignment-panel-${id}`,
    "aria-labelledby": `alignment-tab-${id}`,
  })

  return (
    <div className="flex flex-col gap-4">
      <PanelTabs panel={panel} onSelect={setPanel} />

      {panel === "identity" && (
        <section
          {...panelProps("identity")}
          className="grid gap-6 lg:grid-cols-2"
        >
          <div className="flex flex-col gap-2">
            <SectionTitle title="Identity by rank" />
            <p className="text-xs text-muted-foreground">
              Rank is ordered by DIAMOND bit score.
            </p>
            <OriginToggles shown={rankShown} onChange={setRankShown} />
            <IdentityByRank hits={hits} shown={rankShown} />
          </div>
          <div className="flex flex-col gap-2">
            <SectionTitle title="Identity by origin" />
            <p className="text-xs text-muted-foreground">
              Hits per 5 % identity bin, stacked by origin. Hover a bar for the
              per-origin counts.
            </p>
            <OriginToggles shown={histShown} onChange={setHistShown} />
            <IdentityHistogram hits={hits} shown={histShown} />
          </div>
        </section>
      )}

      {panel === "coverage" && (
        <section {...panelProps("coverage")} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <SectionTitle title="Coverage and alignment" />
            <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-secondary-foreground">
              <span className="inline-flex gap-1">
                <button
                  type="button"
                  aria-pressed={colorBy === "identity"}
                  className={toggle(colorBy === "identity")}
                  onClick={() => setColorBy("identity")}
                >
                  Identity
                </button>
                <button
                  type="button"
                  aria-pressed={colorBy === "origin"}
                  className={toggle(colorBy === "origin")}
                  onClick={() => setColorBy("origin")}
                >
                  Origin
                </button>
              </span>
              <Dropdown
                label="Rows"
                value={shownCount}
                options={options}
                onChange={setCount}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-secondary-foreground">
            {colorBy === "identity" ? (
              <span className="inline-flex items-center gap-1.5">
                {identityFloor(hits.slice(0, shownCount))} %
                <i
                  className="inline-block h-2.5 w-20 rounded-xs"
                  style={{
                    background: `linear-gradient(to right, color-mix(in oklab, ${IDENTITY_COLOR} 25%, transparent), ${IDENTITY_COLOR})`,
                  }}
                />
                100 %
              </span>
            ) : (
              ORIGINS.map(o => <OriginTag key={o} db={o} />)
            )}
            <span className="inline-flex items-center gap-1.5">
              <i
                className="inline-block h-1 w-6"
                style={{ background: OVERHANG_COLOR, opacity: 0.45 }}
              />
              unaligned sequence
            </span>
          </div>
          <CoverageAndMap
            hits={hits}
            qlen={qlen}
            count={shownCount}
            colorBy={colorBy}
            onOpenRecord={onOpenRecord}
          />
        </section>
      )}

      {panel === "tree" && (
        <div {...panelProps("tree")}>
          <TreePanel
            alignment={alignment}
            hits={hits}
            onOpenRecord={onOpenRecord}
          />
        </div>
      )}

      {panel === "msa" && (
        <div {...panelProps("msa")}>
          <MsaPanel
            alignment={alignment}
            hits={hits}
            onOpenRecord={onOpenRecord}
          />
        </div>
      )}
    </div>
  )
}
