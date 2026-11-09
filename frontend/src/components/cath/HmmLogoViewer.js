import React, { useEffect, useMemo, useRef, useState } from "react"
import { hmmLogoDataUrl, hmmEntryUrl } from "../../utils/hmmAssets"

// Interactive profile-HMM sequence logo (Skylign-style), rendered client-side from the InterPro
// `?annotation=logo` Skylign JSON. Stacked letters per match state are scaled by information
// content (bits); a zoom slider controls column width and the plot scrolls horizontally with a
// pinned bits axis — the "feature-viewer with the slider" experience, without the jQuery plugin.

// Residue coloring by chemistry, on a white plot background so it stays readable in dark mode.
const AA_COLORS = {
  // acidic
  D: "#d6336c", E: "#d6336c",
  // basic
  K: "#1c7ed6", R: "#1c7ed6", H: "#1c7ed6",
  // polar / uncharged
  S: "#0ca678", T: "#0ca678", N: "#0ca678", Q: "#0ca678",
  G: "#0ca678", Y: "#0ca678", C: "#0ca678",
  // hydrophobic / nonpolar
  A: "#343a40", V: "#343a40", L: "#343a40", I: "#343a40", M: "#343a40",
  F: "#343a40", W: "#343a40", P: "#343a40",
}
const NT_COLORS = { A: "#0ca678", C: "#1c7ed6", G: "#f08c00", T: "#d6336c", U: "#d6336c" }

function residueColor(letter, alphabet) {
  const L = String(letter || "").toUpperCase()
  if (alphabet === "dna" || alphabet === "rna") return NT_COLORS[L] || "#343a40"
  return AA_COLORS[L] || "#343a40"
}

// Layout constants (px).
const LOGO_HEIGHT = 150
const TOP_PAD = 8
const RULER_HEIGHT = 24
const AXIS_WIDTH = 42
const CAP_RATIO = 0.72 // uppercase cap-height as a fraction of font-size

/**
 * @param {{ pfamAccession: string, profileHmm?: string }} props
 */
const HmmLogoViewer = ({ pfamAccession, profileHmm }) => {
  const [status, setStatus] = useState("loading") // loading | ready | error
  const [data, setData] = useState(null)
  const [colWidth, setColWidth] = useState(20)
  const [useTheoretical, setUseTheoretical] = useState(false)
  const [hoverCol, setHoverCol] = useState(null)
  const scrollRef = useRef(null)

  const dataUrl = hmmLogoDataUrl(pfamAccession)

  useEffect(() => {
    if (!dataUrl) {
      setStatus("error")
      return
    }
    let cancelled = false
    const controller = new AbortController()
    setStatus("loading")
    setData(null)
    setHoverCol(null)

    fetch(dataUrl, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(json => {
        if (cancelled) return
        if (!json || !Array.isArray(json.height_arr) || json.height_arr.length === 0) {
          setStatus("error")
          return
        }
        setData(json)
        setStatus("ready")
      })
      .catch(err => {
        if (cancelled || err?.name === "AbortError") return
        setStatus("error")
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [dataUrl])

  // Parse the Skylign height_arr into per-column [{ letter, bits }] sorted ascending.
  const columns = useMemo(() => {
    if (!data) return []
    return data.height_arr.map(col =>
      (Array.isArray(col) ? col : [])
        .map(token => {
          const idx = String(token).lastIndexOf(":")
          const letter = String(token).slice(0, idx)
          const bits = parseFloat(String(token).slice(idx + 1))
          return { letter, bits: Number.isFinite(bits) ? bits : 0 }
        })
        .filter(d => d.bits > 0)
        .sort((a, b) => a.bits - b.bits),
    )
  }, [data])

  const alphabet = data?.alphabet || "aa"
  const yMax = useMemo(() => {
    if (!data) return 1
    const theory = Number(data.max_height_theory) || 0
    const obs = Number(data.max_height_obs) || 0
    const chosen = useTheoretical ? theory : obs
    return chosen > 0 ? chosen : theory || obs || 1
  }, [data, useTheoretical])

  if (status === "loading") {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
        Loading interactive HMM logo…
      </div>
    )
  }

  if (status === "error" || !data) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        Interactive HMM logo could not be loaded.{" "}
        <a
          href={hmmEntryUrl(pfamAccession)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover underline underline-offset-2"
        >
          Link to InterPro
        </a>
        .
      </div>
    )
  }

  const numCols = columns.length
  const pxPerBit = LOGO_HEIGHT / yMax
  const svgWidth = Math.max(numCols * colWidth, 1)
  const svgHeight = TOP_PAD + LOGO_HEIGHT + RULER_HEIGHT
  const baseY = TOP_PAD + LOGO_HEIGHT

  // Ruler tick step scales with zoom so labels never overlap.
  const tickStep = colWidth >= 26 ? 5 : colWidth >= 16 ? 10 : colWidth >= 10 ? 20 : 50

  const axisTicks = [0, yMax / 2, yMax]

  const hovered = hoverCol != null && columns[hoverCol] ? columns[hoverCol] : null
  const hoveredTop = hovered && hovered.length ? hovered[hovered.length - 1] : null

  const handleMouseMove = e => {
    const el = scrollRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left + el.scrollLeft
    const col = Math.floor(x / colWidth)
    setHoverCol(col >= 0 && col < numCols ? col : null)
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="text-xs text-muted-foreground">
          Interactive profile-HMM logo · {numCols} match states
          {hovered && hoveredTop && (
            <span className="ml-2 text-foreground">
              · Position {hoverCol + 1}: <span className="font-mono font-semibold">{hoveredTop.letter}</span>{" "}
              ({hoveredTop.bits.toFixed(2)} bits)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Zoom</span>
            <input
              type="range"
              min={6}
              max={40}
              step={1}
              value={colWidth}
              onChange={e => setColWidth(Number(e.target.value))}
              className="h-1 w-28 cursor-pointer accent-accent"
              aria-label="Logo zoom (column width)"
            />
          </label>
          <button
            type="button"
            onClick={() => setUseTheoretical(v => !v)}
            className="rounded-md border border-input bg-background px-2 py-1 text-2xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            title="Toggle the vertical scale between the maximum observed and the maximum theoretical information content"
          >
            Scale: {useTheoretical ? "theoretical" : "observed"}
          </button>
        </div>
      </div>

      <div className="flex rounded-lg border border-border bg-white overflow-hidden">
        {/* Pinned bits axis */}
        <svg
          width={AXIS_WIDTH}
          height={svgHeight}
          className="shrink-0"
          aria-hidden="true"
        >
          <line x1={AXIS_WIDTH - 1} y1={TOP_PAD} x2={AXIS_WIDTH - 1} y2={baseY} stroke="#adb5bd" strokeWidth={1} />
          {axisTicks.map((t, i) => {
            const y = baseY - t * pxPerBit
            return (
              <g key={i}>
                <line x1={AXIS_WIDTH - 5} y1={y} x2={AXIS_WIDTH - 1} y2={y} stroke="#adb5bd" strokeWidth={1} />
                <text x={AXIS_WIDTH - 7} y={y + 3} textAnchor="end" fontSize={9} fill="#868e96">
                  {t.toFixed(1)}
                </text>
              </g>
            )
          })}
          <text
            x={11}
            y={TOP_PAD + LOGO_HEIGHT / 2}
            fontSize={10}
            fill="#868e96"
            textAnchor="middle"
            transform={`rotate(-90, 11, ${TOP_PAD + LOGO_HEIGHT / 2})`}
          >
            bits
          </text>
        </svg>

        {/* Scrollable logo */}
        <div
          ref={scrollRef}
          className="overflow-x-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCol(null)}
        >
          <svg width={svgWidth} height={svgHeight} role="img" aria-label={`Profile HMM logo for ${profileHmm || pfamAccession}`}>
            {/* baseline */}
            <line x1={0} y1={baseY} x2={svgWidth} y2={baseY} stroke="#dee2e6" strokeWidth={1} />

            {hoverCol != null && (
              <rect
                x={hoverCol * colWidth}
                y={TOP_PAD}
                width={colWidth}
                height={LOGO_HEIGHT}
                fill="#4dabf7"
                fillOpacity={0.12}
              />
            )}

            {columns.map((col, ci) => {
              const x = ci * colWidth
              let cursor = baseY
              return (
                <g key={ci}>
                  {col.map((d, li) => {
                    const h = d.bits * pxPerBit
                    if (h < 0.5) {
                      return null
                    }
                    const top = cursor - h
                    cursor = top
                    const fontSize = h / CAP_RATIO
                    return (
                      <text
                        key={li}
                        x={x}
                        y={top + h}
                        fontSize={fontSize}
                        textLength={colWidth}
                        lengthAdjust="spacingAndGlyphs"
                        fontFamily="'DejaVu Sans Mono', 'Courier New', monospace"
                        fontWeight={700}
                        fill={residueColor(d.letter, alphabet)}
                        style={{ dominantBaseline: "alphabetic" }}
                      >
                        {d.letter}
                      </text>
                    )
                  })}
                </g>
              )
            })}

            {/* Position ruler */}
            {columns.map((_, ci) => {
              const pos = ci + 1
              if (pos % tickStep !== 0 && pos !== 1) return null
              const x = ci * colWidth + colWidth / 2
              return (
                <g key={`tick-${ci}`}>
                  <line x1={x} y1={baseY} x2={x} y2={baseY + 4} stroke="#adb5bd" strokeWidth={1} />
                  <text x={x} y={baseY + 15} textAnchor="middle" fontSize={9} fill="#868e96">
                    {pos}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <p className="mt-1.5 text-2xs text-muted-foreground leading-relaxed">
        Letter height is information content (bits) per match state; taller stacks are more conserved.
        Drag the zoom slider and scroll horizontally to explore. Source: EBI/InterPro (Skylign).
      </p>
    </div>
  )
}

export default HmmLogoViewer
