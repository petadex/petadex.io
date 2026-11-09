// frontend/src/components/v260701/SourceSplit.jsx
//
// How much of something comes from each PETadex source (Plasticome / NCBI nr / Logan): a three-part bar whose
// popover (hover or keyboard focus) gives the counts and shares. Plasticome counts are often far below 1 % — the bar
// shows them at their true width (often invisible), so the popover always lists the count.
import React, { useId, useRef, useState } from "react"
import { SOURCE_LABELS, fmtInt } from "./common"

// PETadex source colours, as in every figure and the atlas.
export const SOURCE_COLORS = { PL: "#5e689e", NR: "#9d5e91", LG: "#679a79" }
const ORDER = ["PL", "NR", "LG"]

const share = (n, total) => {
  if (!total) return "–"
  const p = (100 * n) / total
  if (n > 0 && p < 0.1) return "<0.1 %"
  return `${p < 10 ? p.toFixed(1) : p.toFixed(0)} %`
}

/**
 * A static bar split by source. With `total`, the bar's filled length is counts / total (the rest stays empty), so
 * several bars can be compared on one scale.
 */
export function SourceBar({ counts, total }) {
  const sum = ORDER.reduce((s, k) => s + (Number(counts?.[k]) || 0), 0)
  if (!sum) return null
  const scale = total ? sum / total : 1
  return (
    <span className="block w-full h-2.5 rounded-full overflow-hidden bg-secondary" aria-hidden="true">
      <span className="flex h-full" style={{ width: `${Math.max(0.5, 100 * scale)}%` }}>
        {ORDER.map(k => {
          const n = Number(counts[k]) || 0
          return n ? <span key={k} className="h-full" style={{ width: `${(100 * n) / sum}%`, background: SOURCE_COLORS[k] }} /> : null
        })}
      </span>
    </span>
  )
}

/** The counts as a three-row table (used inside popovers and on its own). */
export function SourceSplitTable({ counts, unit }) {
  const total = ORDER.reduce((s, k) => s + (Number(counts?.[k]) || 0), 0)
  return (
    <table className="w-full text-xs border-collapse">
      <tbody>
        {ORDER.map(k => (
          <tr key={k}>
            <td className="py-0.5 pr-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle" style={{ background: SOURCE_COLORS[k] }} />
              {SOURCE_LABELS[k]}
            </td>
            <td className="py-0.5 pr-2 text-right font-mono">{fmtInt(counts?.[k] || 0)}</td>
            <td className="py-0.5 text-right font-mono text-muted-foreground whitespace-nowrap">{share(Number(counts?.[k]) || 0, total)}</td>
          </tr>
        ))}
        <tr className="border-t border-border">
          <td className="pt-1 pr-2 text-muted-foreground">Total{unit ? ` ${unit}` : ""}</td>
          <td className="pt-1 pr-2 text-right font-mono">{fmtInt(total)}</td>
          <td />
        </tr>
      </tbody>
    </table>
  )
}

/**
 * A thin bar split by source with a popover.
 * @param {{counts: {PL:number, NR:number, LG:number}, title?: string, unit?: string, width?: string}} props
 */
export default function SourceSplit({ counts, title, unit, width = "w-28", note }) {
  const id = useId()
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const open = pos != null
  // Fixed positioning, so tables with overflow scrolling do not clip the popover; kept inside the viewport.
  const show = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const W = 256
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8))
    const below = r.bottom + 8
    setPos(window.innerHeight - below < 170 ? { left, bottom: window.innerHeight - r.top + 8 } : { left, top: below })
  }
  const hide = () => setPos(null)
  const total = ORDER.reduce((s, k) => s + (Number(counts?.[k]) || 0), 0)
  if (!counts || !total) return null
  const label = `${title ? `${title}: ` : ""}${ORDER.map(k => `${SOURCE_LABELS[k]} ${fmtInt(counts[k] || 0)}`).join(", ")}`
  return (
    <span className={`relative ${width === "w-full" ? "block" : "inline-block"} align-middle`}>
      <button
        type="button"
        className={`${width} h-2.5 rounded-full overflow-hidden flex bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-info`}
        aria-label={label}
        aria-describedby={open ? id : undefined}
        ref={btn}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={e => e.key === "Escape" && hide()}
        onClick={e => { e.preventDefault(); open ? hide() : show() }}
      >
        {ORDER.map(k => {
          const n = Number(counts[k]) || 0
          return n ? <span key={k} className="h-full" style={{ width: `${(100 * n) / total}%`, background: SOURCE_COLORS[k] }} /> : null
        })}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="fixed z-50 w-64 rounded-lg border border-border bg-background p-3 shadow-lg text-left pointer-events-none"
          style={pos}
        >
          {title && <span className="block text-xs font-semibold text-foreground mb-1.5">{title}</span>}
          <SourceSplitTable counts={counts} unit={unit} />
          {note && <span className="block text-[11px] text-muted-foreground mt-1.5 leading-snug">{note}</span>}
        </span>
      )}
    </span>
  )
}

/** {n_pl, n_nr, n_lg} of a cluster row -> {PL, NR, LG}. */
export const clusterCounts = r => (r ? { PL: Number(r.n_pl) || 0, NR: Number(r.n_nr) || 0, LG: Number(r.n_lg) || 0 } : null)
