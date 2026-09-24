// Substrate activity comparison view (halo assay results).
//
// The sole home of this tool. It began as an extraction of the standalone
// /substrate page so it could be embedded as the Activity tab of /halo-assay;
// the two then diverged (drag-to-zoom, compact axis ticks, benchmark-label
// dedup, responsive sizing all landed here only) and /substrate was deleted.
// BHET50 went with it — this view offers 12.5 and 25 mM only.
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Link } from "gatsby"
import config from "../../config"
import { generateCSV, downloadCSV } from "../../utils/csvDownload"
import ActivityLineChart, {
  mediaColors,
  mediaLabels,
} from "../charts/ActivityLineChart"
import {
  ScatterChart,
  Scatter,
  ZAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts"

const allSubstrates = ["BHET12.5", "BHET25"]

const timepointColors = {
  all: "#6b7280",
  24: "#10b981",
  48: "#3b82f6",
  72: "#8b5cf6",
  96: "#f59e0b",
  120: "#ef4444",
}

const plotModes = {
  intensity: {
    label: "Raw Intensity",
    description: "Average pixel intensity at each timepoint",
  },
  activity: {
    label: "Activity",
    description: "Peak intensity minus subsequent minimum (degradation signal)",
  },
}

const benchmarkEnzymes = {
  "WP_054022242.1": "IsPETase",
  "WP_054022242.1_M1": "Fast-PETase",
}

const diamondPoints = (cx, cy, r) =>
  `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`

// Compact numeric formatting for axis ticks — Recharts' default is the raw
// floating-point string, which produces values like "-0.0163622711583298".
const formatTick = value => {
  if (value === 0) return "0"
  if (value == null || isNaN(value)) return ""
  const abs = Math.abs(value)
  if (abs < 0.001) return value.toExponential(1)
  if (abs < 1) return value.toFixed(3)
  if (abs < 10) return value.toFixed(2)
  if (abs < 100) return value.toFixed(1)
  return Math.round(value).toString()
}

// ── ScatterTooltip ─────────────────────────────────────────────────────────

const ScatterTooltipContent = ({ active, payload, xKey, yKey, plotMode }) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  const isActivityMode = plotMode === "activity"
  const valueLabel = isActivityMode ? "Activity" : "Intensity"

  return (
    <div className="bg-surface border rounded-xl px-4 py-3 shadow-lg text-sm max-w-[300px]">
      <div className="font-bold font-mono text-primary mb-1">{data.gene}</div>
      {data.nickname && (
        <div className="text-muted-foreground text-xs mb-1">{data.nickname}</div>
      )}
      <div className="mb-0.5" style={{ color: mediaColors[xKey] }}>
        {mediaLabels[xKey]} {valueLabel}: <strong>{data.x?.toFixed(2)}</strong>
      </div>
      <div className={isActivityMode ? "mb-2" : ""} style={{ color: mediaColors[yKey] }}>
        {mediaLabels[yKey]} {valueLabel}: <strong>{data.y?.toFixed(2)}</strong>
      </div>
      {isActivityMode && data.xActivity && (
        <div className="text-xs text-muted-foreground border-t border pt-2 mt-2 space-y-0.5">
          <div>
            {mediaLabels[xKey]}: peak@{data.xActivity.peak_timepoint}h → min@
            {data.xActivity.min_timepoint}h
          </div>
          <div>
            {mediaLabels[yKey]}: peak@{data.yActivity.peak_timepoint}h → min@
            {data.yActivity.min_timepoint}h
          </div>
        </div>
      )}
      <div className="text-muted-foreground mt-1.5 text-xs italic">Click to jump to gene card</div>
    </div>
  )
}

// ── SubstrateHero ──────────────────────────────────────────────────────────

const SubstrateHero = ({ heroStats, activeSubstrates }) => {
  const substrates = [...activeSubstrates]
  const isVsMode = substrates.length === 2
  if (substrates.length === 0) return null

  return (
    <div className="flex items-stretch mb-8 rounded-xl overflow-hidden border shadow-md relative">
      {substrates.map((substrate, i) => {
        const stats = heroStats[substrate]
        const color = mediaColors[substrate]
        return (
          <React.Fragment key={substrate}>
            {isVsMode && i === 1 && (
              <div className="flex items-center justify-center w-0 relative z-10">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm tracking-wider bg-foreground text-background shadow-lg absolute">
                  VS
                </div>
              </div>
            )}
            {!isVsMode && i > 0 && <div className="w-px bg-border" />}
            <div
              className="flex-1 p-7"
              style={{
                background: `linear-gradient(135deg, ${color}0A 0%, ${color}18 100%)`,
                borderLeft: `4px solid ${color}`,
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
                />
                <span className="text-xl font-extrabold text-primary">
                  {mediaLabels[substrate]}
                </span>
              </div>
              <div className="flex gap-8">
                <div>
                  <div className="label mb-1">Genes Tested</div>
                  <div className="text-3xl font-extrabold" style={{ color }}>
                    {stats?.geneCount || 0}
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── PlotModeToggle ─────────────────────────────────────────────────────────

const PlotModeToggle = ({ plotMode, onModeChange }) => (
  <div className="flex items-center gap-2 mb-6 flex-wrap">
    <span className="text-sm font-semibold text-secondary-foreground">Plot Mode:</span>
    {Object.entries(plotModes).map(([mode, { label, description }]) => {
      const isActive = plotMode === mode
      return (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          title={description}
          className={`btn text-sm ${isActive ? "btn-primary" : "btn-secondary"}`}
        >
          {label}
        </button>
      )
    })}
    <span className="text-xs text-muted-foreground italic ml-2">
      {plotModes[plotMode].description}
    </span>
  </div>
)

// ── TimepointToggle ────────────────────────────────────────────────────────

const TimepointToggle = ({ availableTimepoints, activeTimepoint, onSelect }) => {
  if (availableTimepoints.length === 0) return null
  return (
    <div className="flex items-center gap-2 mb-8 flex-wrap">
      <span className="text-sm font-semibold text-secondary-foreground">Timepoint:</span>
      {[null, ...availableTimepoints].map(tp => {
        const isActive = activeTimepoint === tp
        const color = tp === null ? timepointColors.all : timepointColors[tp] || "#6b7280"
        const label = tp === null ? "All (avg)" : `${tp}h`
        return (
          <button
            key={tp ?? "all"}
            onClick={() => onSelect(tp)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors"
            style={{
              borderColor: color,
              backgroundColor: isActive ? color : "transparent",
              color: isActive ? "#fff" : color,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── SubstrateToggle ────────────────────────────────────────────────────────

const SubstrateToggle = ({ activeSubstrates, onToggle }) => (
  <div className="flex items-center gap-3 mb-8 flex-wrap">
    <span className="text-sm font-semibold text-secondary-foreground">Substrates:</span>
    {allSubstrates.map(substrate => {
      const isActive = activeSubstrates.has(substrate)
      const color = mediaColors[substrate]
      return (
        <button
          key={substrate}
          onClick={() => onToggle(substrate)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-bold transition-colors"
          style={{
            borderColor: color,
            backgroundColor: isActive ? color : "transparent",
            color: isActive ? "#fff" : color,
          }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: isActive ? "#fff" : color }}
          />
          {mediaLabels[substrate]}
        </button>
      )
    })}
  </div>
)

// ── SubstrateScatter ───────────────────────────────────────────────────────

const SubstrateScatter = ({
  scatterData, activeSubstrates,
  scatterXAxis, scatterYAxis,
  onXAxisChange, onYAxisChange,
  onDotClick, highlightedGene,
  activeTimepoint, plotMode,
}) => {
  const isActivityMode = plotMode === "activity"
  const axisLabel = isActivityMode ? "Activity" : "Avg Intensity"
  const substrates = [...activeSubstrates]

  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const isMobile = containerWidth > 0 && containerWidth < 600
  const chartMargin = isMobile
    ? { top: 16, right: 12, left: 48, bottom: 64 }
    : { top: 24, right: 48, left: 88, bottom: 88 }
  const chartHeight = isMobile ? 340 : 460
  const xLabelOffset = isMobile ? 22 : 48
  const yLabelDx = isMobile ? -28 : -64
  const yAxisWidth = isMobile ? 44 : 72
  const axisFontSize = isMobile ? 9 : 11
  const labelFontSize = isMobile ? "0.72rem" : "0.85rem"
  const xTickCount = isMobile ? 4 : undefined

  // Zoom state. `zoom` holds the locked-in axis domains; `dragStart`/`dragEnd`
  // hold the selection rectangle while the user is dragging.
  const [zoom, setZoom] = useState(null)
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)

  // Reset zoom whenever the underlying data shape changes — axis switch,
  // timepoint switch, substrate set change. Avoids stranded zoom rectangles.
  useEffect(() => {
    setZoom(null)
    setDragStart(null)
    setDragEnd(null)
  }, [scatterXAxis, scatterYAxis, activeTimepoint, plotMode])

  // A single benchmark accession (e.g. WP_054022242.1) may have multiple
  // synthesized gene records, producing multiple dots. Label only the
  // best-scoring one per accession so we don't print "IsPETase" twice.
  const labeledBenchmarkGenes = useMemo(() => {
    const winners = new Map()
    scatterData.forEach(d => {
      if (!benchmarkEnzymes[d.accession]) return
      const score = (d.x || 0) + (d.y || 0)
      const current = winners.get(d.accession)
      if (!current || score > current.score) {
        winners.set(d.accession, { gene: d.gene, score })
      }
    })
    return new Set([...winners.values()].map(v => v.gene))
  }, [scatterData])

  const dataExtents = useMemo(() => {
    if (scatterData.length === 0) return { xRange: 1, yRange: 1 }
    const xs = scatterData.map(d => d.x).filter(v => v != null && !isNaN(v))
    const ys = scatterData.map(d => d.y).filter(v => v != null && !isNaN(v))
    return {
      xRange: Math.max(...xs) - Math.min(...xs) || 1,
      yRange: Math.max(...ys) - Math.min(...ys) || 1,
    }
  }, [scatterData])

  // Resolved numeric min/max for the current scatter data (used in coordinate conversion).
  const resolvedDomain = useMemo(() => {
    if (!scatterData.length) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
    const xs = scatterData.map(d => d.x).filter(v => v != null && !isNaN(v))
    const ys = scatterData.map(d => d.y).filter(v => v != null && !isNaN(v))
    if (!xs.length || !ys.length) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
    return { xMin: Math.min(...xs), xMax: Math.max(...xs), yMin: Math.min(...ys), yMax: Math.max(...ys) }
  }, [scatterData])

  // Cache the Recharts plot-area rect (from the SVG clip path) so that mouse
  // events can convert client pixels → data coordinates without layout thrash.
  const plotAreaRef = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => {
      const clipRect = containerRef.current
        ?.querySelector('.recharts-surface defs clipPath rect')
      if (!clipRect) return
      plotAreaRef.current = {
        x: parseFloat(clipRect.getAttribute('x') || '0'),
        y: parseFloat(clipRect.getAttribute('y') || '0'),
        w: parseFloat(clipRect.getAttribute('width') || '0'),
        h: parseFloat(clipRect.getAttribute('height') || '0'),
      }
    }, 50)
    return () => clearTimeout(t)
  }, [containerWidth, chartHeight, isMobile, scatterData.length])

  // Convert a client-space mouse position to chart data coordinates.
  const clientToData = (clientX, clientY) => {
    const pa = plotAreaRef.current
    if (!pa || pa.w === 0 || pa.h === 0) return null
    const svg = containerRef.current?.querySelector('.recharts-surface')
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const svgX = clientX - rect.left
    const svgY = clientY - rect.top
    const [xMin, xMax] = zoom?.x ?? [resolvedDomain.xMin, resolvedDomain.xMax]
    const [yMin, yMax] = zoom?.y ?? [resolvedDomain.yMin, resolvedDomain.yMax]
    const xFrac = Math.max(0, Math.min(1, (svgX - pa.x) / pa.w))
    const yFrac = Math.max(0, Math.min(1, (svgY - pa.y) / pa.h))
    return {
      x: xMin + xFrac * (xMax - xMin),
      y: yMax - yFrac * (yMax - yMin),
    }
  }

  const diagonalData = useMemo(() => {
    if (scatterData.length === 0) return []
    const allVals = scatterData.flatMap(d => [d.x, d.y]).filter(v => v != null && !isNaN(v))
    if (allVals.length === 0) return []
    const min = Math.min(...allVals)
    const max = Math.max(...allVals)
    const pad = (max - min) * 0.05 || 0.01
    return [{ x: min - pad, y: min - pad }, { x: max + pad, y: max + pad }]
  }, [scatterData])

  // In Recharts v3 the chart-level mouse handlers receive (nextState, event).
  // nextState has no xValue/yValue for ScatterChart — the real coordinates come
  // from the native mouse event in the second argument.
  const handleChartMouseDown = (_nextState, event) => {
    if (!event) return
    const pt = clientToData(event.clientX, event.clientY)
    if (!pt) return
    setDragStart(pt)
    setDragEnd(null)
  }

  const handleChartMouseMove = (_nextState, event) => {
    if (!dragStart || !event) return
    const pt = clientToData(event.clientX, event.clientY)
    if (!pt) return
    setDragEnd(pt)
  }

  const handleChartMouseUp = () => {
    if (dragStart && dragEnd) {
      const xMin = Math.min(dragStart.x, dragEnd.x)
      const xMax = Math.max(dragStart.x, dragEnd.x)
      const yMin = Math.min(dragStart.y, dragEnd.y)
      const yMax = Math.max(dragStart.y, dragEnd.y)
      // Only zoom for a non-trivial drag (≥2% of axis range in both dims);
      // otherwise let the click pass through to the dot's onClick.
      if (
        xMax - xMin > dataExtents.xRange * 0.02 &&
        yMax - yMin > dataExtents.yRange * 0.02
      ) {
        setZoom({ x: [xMin, xMax], y: [yMin, yMax] })
      }
    }
    setDragStart(null)
    setDragEnd(null)
  }

  const handleChartMouseLeave = () => {
    setDragStart(null)
    setDragEnd(null)
  }

  const xDomain = zoom?.x || ["dataMin", "dataMax"]
  const yDomain = zoom?.y || ["dataMin", "dataMax"]
  const isZoomed = zoom !== null

  return (
    <div id="substrate-scatter" className="card mb-8 relative" ref={containerRef}>
      <div className="flex justify-between items-start mb-4 flex-wrap gap-4 px-6 pt-6">
        <div>
          <h2 className="text-xl font-bold text-primary">
            Substrate Preference
            {isActivityMode && (
              <span className="ml-3 text-sm font-semibold text-success bg-success/10 px-2.5 py-0.5 rounded-full">
                Activity Mode
              </span>
            )}
            {!isActivityMode && activeTimepoint !== null && (
              <span
                className="ml-3 text-sm font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  color: timepointColors[activeTimepoint] || "#6b7280",
                  backgroundColor: `${timepointColors[activeTimepoint] || "#6b7280"}18`,
                }}
              >
                @ {activeTimepoint}h
              </span>
            )}
          </h2>
          <p className="text-sm text-secondary-foreground mt-1">
            {isActivityMode
              ? "Each dot is one gene. Activity = peak intensity minus subsequent minimum"
              : `Each dot is one gene. Dots above the diagonal prefer the Y-axis substrate${activeTimepoint === null ? " (averaged across all timepoints)" : ""}`}
          </p>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          {isZoomed && (
            <button
              onClick={() => setZoom(null)}
              className="btn btn-secondary text-xs gap-1.5"
              title="Reset zoom to fit all data"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v6h6" />
              </svg>
              Reset zoom
            </button>
          )}

          {substrates.length > 2 && (
            <div className="flex gap-4 items-center">
              {[
                { label: "X", value: scatterXAxis, onChange: onXAxisChange },
                { label: "Y", value: scatterYAxis, onChange: onYAxisChange },
              ].map(({ label, value, onChange }) => (
                <label key={label} className="flex items-center gap-1.5 text-sm text-secondary-foreground">
                  {label}:
                  <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="input w-auto py-1 text-sm font-semibold"
                    style={{
                      borderColor: mediaColors[value],
                      color: mediaColors[value],
                    }}
                  >
                    {substrates.map(s => (
                      <option key={s} value={s}>{mediaLabels[s]}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic mb-3 px-6">
        Drag a box on the chart to zoom in · click a dot to jump to its gene card
      </p>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <ScatterChart
          margin={chartMargin}
          onMouseDown={handleChartMouseDown}
          onMouseMove={handleChartMouseMove}
          onMouseUp={handleChartMouseUp}
          onMouseLeave={handleChartMouseLeave}
          style={{ cursor: dragStart ? "crosshair" : "default", userSelect: "none" }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number" dataKey="x" name={mediaLabels[scatterXAxis]}
            domain={xDomain}
            allowDataOverflow={isZoomed}
            tickFormatter={formatTick}
            tickCount={xTickCount}
            label={{
              value: `${axisLabel} — ${mediaLabels[scatterXAxis]}`,
              position: "bottom", offset: xLabelOffset,
              style: { fontWeight: "700", fontSize: labelFontSize, fill: mediaColors[scatterXAxis], textAnchor: "middle" },
            }}
            tick={{ fontSize: axisFontSize, fill: "var(--muted-foreground)" }}
            tickMargin={8}
            stroke="var(--border)"
          />
          <YAxis
            type="number" dataKey="y" name={mediaLabels[scatterYAxis]}
            domain={yDomain}
            allowDataOverflow={isZoomed}
            tickFormatter={formatTick}
            label={{
              value: `${axisLabel} — ${mediaLabels[scatterYAxis]}`,
              angle: -90, position: "center", dx: yLabelDx,
              style: { fontWeight: "700", fontSize: labelFontSize, fill: mediaColors[scatterYAxis], textAnchor: "middle" },
            }}
            tick={{ fontSize: axisFontSize, fill: "var(--muted-foreground)" }}
            tickMargin={8}
            width={yAxisWidth}
            stroke="var(--border)"
          />
          <ZAxis range={[50, 50]} />
          <Tooltip
            content={
              <ScatterTooltipContent
                xKey={scatterXAxis}
                yKey={scatterYAxis}
                plotMode={plotMode}
              />
            }
          />
          <Scatter
            data={diagonalData}
            fill="none"
            line={{ stroke: "var(--muted-foreground)", strokeDasharray: "6 4", strokeWidth: 1.5 }}
            shape={() => null}
            legendType="none"
            isAnimationActive={false}
          />
          <Scatter
            data={scatterData}
            isAnimationActive
            animationDuration={800}
            onClick={data => { if (data?.gene) onDotClick(data.gene) }}
            cursor="pointer"
            shape={props => {
              const { cx, cy, payload } = props
              const prefersX = payload.x > payload.y
              const color = prefersX ? mediaColors[scatterXAxis] : mediaColors[scatterYAxis]
              const isHighlighted = highlightedGene && payload.gene === highlightedGene
              const benchmarkLabel = benchmarkEnzymes[payload.accession]
              const showBenchmarkLabel =
                benchmarkLabel && labeledBenchmarkGenes.has(payload.gene)

              const pulseRing = (
                <circle cx={cx} cy={cy} r={14} fill="none" stroke={color} strokeWidth={2}>
                  <animate attributeName="r" from="8" to="18" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )

              const label = showBenchmarkLabel ? (
                <text x={cx + 14} y={cy + 4} fontSize="11" fontWeight="700" fill="var(--foreground)">
                  {benchmarkLabel}
                </text>
              ) : null

              if (benchmarkLabel && isHighlighted) {
                return <g>{pulseRing}<polygon points={diamondPoints(cx, cy, 9)} fill={color} stroke="#fff" strokeWidth={2.5} />{label}</g>
              }
              if (benchmarkLabel) {
                return <g><polygon points={diamondPoints(cx, cy, 8)} fill={color} stroke="var(--foreground)" strokeWidth={2} />{label}</g>
              }
              if (isHighlighted) {
                return <g>{pulseRing}<circle cx={cx} cy={cy} r={7} fill={color} stroke="#fff" strokeWidth={2.5} /></g>
              }
              return <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.65} stroke={color} strokeWidth={1.5} strokeOpacity={0.9} />
            }}
          />
          {dragStart && dragEnd && (
            <ReferenceArea
              x1={dragStart.x}
              x2={dragEnd.x}
              y1={dragStart.y}
              y2={dragEnd.y}
              stroke="var(--accent)"
              strokeOpacity={0.7}
              fill="var(--accent)"
              fillOpacity={0.12}
              isAnimationActive={false}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>

      {highlightedGene && (() => {
        const gene = scatterData.find(d => d.gene === highlightedGene)
        if (!gene) return null
        const valueLabel = isActivityMode ? "Activity" : "Intensity"
        return (
          <div className="absolute top-16 right-8 bg-surface border rounded-xl px-4 py-3 shadow-lg text-sm max-w-[280px] z-10 opacity-0 animate-[fadeIn_0.3s_ease_forwards]">
            <style>{`@keyframes fadeIn { to { opacity: 1 } }`}</style>
            <div className="font-bold font-mono text-primary mb-1">{gene.gene}</div>
            {gene.nickname && <div className="text-muted-foreground text-xs mb-1">{gene.nickname}</div>}
            <div style={{ color: mediaColors[scatterXAxis] }} className="mb-0.5">
              {mediaLabels[scatterXAxis]} {valueLabel}: <strong>{gene.x?.toFixed(2)}</strong>
            </div>
            <div style={{ color: mediaColors[scatterYAxis] }}>
              {mediaLabels[scatterYAxis]} {valueLabel}: <strong>{gene.y?.toFixed(2)}</strong>
            </div>
          </div>
        )
      })()}

      <div className="flex justify-center gap-6 mt-2 pb-6 text-xs text-secondary-foreground flex-wrap">
        {[
          { color: mediaColors[scatterXAxis], label: `Prefers ${mediaLabels[scatterXAxis]}` },
          { color: mediaColors[scatterYAxis], label: `Prefers ${mediaLabels[scatterYAxis]}` },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed border-text-tertiary" />
          Equal preference
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <polygon points="6,1 11,6 6,11 1,6" fill="var(--foreground)" />
          </svg>
          Benchmark
        </span>
      </div>
    </div>
  )
}

// ── GeneSubstrateCard ──────────────────────────────────────────────────────

const GeneSubstrateCard = ({
  gene, geneData, isExpanded, onToggle,
  onScrollToScatter, activityData, isSelected, onSelectionChange,
}) => {
  const { nickname, accession, mediaData } = geneData
  const mediaTypes = Object.keys(mediaData)
  const flatChartData = Object.entries(mediaData).flatMap(([media, points]) =>
    points.map(p => ({
      timepoint_hours: p.timepoint,
      media,
      average_readout: p.average_readout,
      stddev_readout: p.stddev_readout,
    }))
  )

  return (
    <div
      id={`gene-${gene}`}
      className="bg-surface border rounded-xl mb-3 overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 bg-transparent border-none cursor-pointer flex justify-between items-center text-left"
      >
        <div className="flex gap-6 items-center flex-wrap flex-1">
          <div
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onSelectionChange(gene) }}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                onSelectionChange(gene)
              }
            }}
            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors shrink-0 border-2"
            style={{
              borderColor: isSelected ? "#059669" : "var(--border-strong)",
              backgroundColor: isSelected ? "#059669" : "var(--surface)",
            }}
          >
            {isSelected && (
              <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <div>
            <div className="label mb-0.5">Gene ID</div>
            <div className="font-mono text-lg font-bold text-primary">{gene}</div>
          </div>

          {nickname && (
            <div>
              <div className="label mb-0.5">Nickname</div>
              <div className="text-lg text-secondary-foreground">{nickname}</div>
            </div>
          )}

          {accession && (
            <div>
              <div className="label mb-0.5">Accession</div>
              <div className="font-mono text-lg text-secondary-foreground">{accession}</div>
            </div>
          )}

          <div className="flex gap-1.5 items-center flex-wrap">
            {benchmarkEnzymes[accession] && (
              <span className="px-2 py-0.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded text-2xs font-bold">
                Benchmark
              </span>
            )}
            {mediaTypes.map(media => (
              <span
                key={media}
                className="px-2 py-0.5 rounded text-2xs font-bold text-white"
                style={{ backgroundColor: mediaColors[media] || "#059669" }}
              >
                {media}
              </span>
            ))}
          </div>
        </div>

        <svg
          className="w-5 h-5 shrink-0 ml-4 text-muted-foreground transition-transform duration-200"
          style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5">
          <div className="border-t border pt-4">
            <div className="flex items-center gap-6 mb-4 flex-wrap">
              {accession && (
                <Link
                  to={`/sequence/${accession}`}
                  className="text-sm font-medium text-accent hover:text-accent-hover border-b-2 border-transparent hover:border-accent transition-colors"
                >
                  View sequence details for {accession} →
                </Link>
              )}
              <button
                onClick={onScrollToScatter}
                className="text-sm font-medium text-muted-foreground hover:text-primary border-b-2 border-transparent hover:border-text-tertiary transition-colors bg-transparent border-none p-0 cursor-pointer"
              >
                ← Back to scatter plot
              </button>
            </div>

            {flatChartData.length > 0 && (
              <div className="bg-success/5 border border-success/30 rounded-lg p-4">
                <div className="text-sm font-semibold text-success mb-3">Activity Over Time</div>
                <ActivityLineChart data={flatChartData} />

                <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                  {mediaTypes.map(media => {
                    const points = mediaData[media]
                    const values = points.map(p => p.average_readout)
                    const avg = values.reduce((s, v) => s + v, 0) / values.length
                    const max = Math.max(...values)
                    const min = Math.min(...values)
                    const stddevs = points.map(p => p.stddev_readout || 0).filter(s => s > 0)
                    const avgStddev = stddevs.length > 0
                      ? Math.sqrt(stddevs.reduce((sum, s) => sum + s * s, 0) / stddevs.length)
                      : 0
                    const activity = activityData?.[media]

                    return (
                      <div
                        key={media}
                        className="bg-surface rounded p-3 border-2"
                        style={{ borderColor: mediaColors[media] || "#059669" }}
                      >
                        <div className="text-xs font-semibold text-success mb-2">{media}</div>

                        {activity?.activity !== null && activity?.activity !== undefined && (
                          <div className="bg-success/5 border border-success/30 rounded p-2 mb-2">
                            <div className="label mb-0.5">Activity (Peak → Min)</div>
                            <div
                              className="text-lg font-extrabold"
                              style={{ color: mediaColors[media] || "#059669" }}
                            >
                              {activity.activity.toFixed(2)}
                            </div>
                            <div className="text-2xs text-muted-foreground mt-0.5">
                              {activity.peak_value.toFixed(2)} @ {activity.peak_timepoint}h →{" "}
                              {activity.min_value.toFixed(2)} @ {activity.min_timepoint}h
                            </div>
                            {activity.flag && (
                              <div className="text-2xs text-warning mt-0.5 italic">
                                {activity.flag.replace(/_/g, " ")}
                              </div>
                            )}
                          </div>
                        )}

                        {activity?.activity === null && (
                          <div className="bg-warning/5 border border-warning/30 rounded p-2 mb-2 text-xs text-warning">
                            Activity: N/A ({activity.flag?.replace(/_/g, " ") || "insufficient data"})
                          </div>
                        )}

                        <div className="text-xs text-secondary-foreground space-y-0.5">
                          <div>
                            Avg Intensity:{" "}
                            <strong className="text-success">{avg.toFixed(2)}</strong>
                            {avgStddev > 0 && ` ± ${avgStddev.toFixed(2)}`}
                          </div>
                          <div>
                            Max: <strong className="text-success">{max.toFixed(2)}</strong>
                          </div>
                          <div>
                            Min: <strong className="text-success">{min.toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── DownloadControls ───────────────────────────────────────────────────────

const DownloadControls = ({
  selectedCount, totalCount,
  onSelectAll, onDeselectAll,
  onDownloadIntensity, onDownloadActivity,
  disabled,
}) => (
  <div className="flex justify-between items-center p-4 bg-surface-raised border rounded-xl mb-6 flex-wrap gap-4">
    <div className="flex items-center gap-4">
      <span className="text-sm text-secondary-foreground font-medium">
        {selectedCount} of {totalCount} genes selected
      </span>
      <button
        onClick={onSelectAll}
        disabled={disabled || selectedCount === totalCount}
        className="btn btn-secondary text-sm disabled:opacity-40 disabled:cursor-default"
      >
        Select All
      </button>
      <button
        onClick={onDeselectAll}
        disabled={disabled || selectedCount === 0}
        className="btn btn-secondary text-sm disabled:opacity-40 disabled:cursor-default"
      >
        Deselect All
      </button>
    </div>

    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">Download:</span>
      {[
        { label: "Intensity CSV", color: "#059669", onClick: onDownloadIntensity },
        { label: "Activity CSV", color: "#7c3aed", onClick: onDownloadActivity },
      ].map(({ label, color, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          disabled={disabled || selectedCount === 0}
          className="btn text-sm gap-1.5 disabled:opacity-40 disabled:cursor-default"
          style={
            selectedCount > 0 && !disabled
              ? { backgroundColor: color, color: "#fff", borderColor: color }
              : {}
          }
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {label}
        </button>
      ))}
    </div>
  </div>
)

// ── ActivityView ───────────────────────────────────────────────────────────

const ActivityView = ({ showTitle = false }) => {
  const [rawData, setRawData] = useState([])
  const [activityData, setActivityData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedGenes, setExpandedGenes] = useState(new Set())
  const [activeSubstrates, setActiveSubstrates] = useState(new Set(["BHET12.5", "BHET25"]))
  const [scatterXAxis, setScatterXAxis] = useState("BHET12.5")
  const [scatterYAxis, setScatterYAxis] = useState("BHET25")
  const [highlightedGene, setHighlightedGene] = useState(null)
  const [activeTimepoint, setActiveTimepoint] = useState(null)
  const [plotMode, setPlotMode] = useState("intensity")
  const [selectedGenes, setSelectedGenes] = useState(new Set())

  const activeMediaString = useMemo(
    () => [...activeSubstrates].sort().join(","),
    [activeSubstrates]
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`${config.apiUrl}/plate-data/comparison?media=${activeMediaString}`)
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const { timeseries, activity } = await res.json()
        if (!cancelled) {
          setRawData(timeseries)
          setActivityData(activity)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err.toString())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeMediaString])

  useEffect(() => {
    const subs = [...activeSubstrates]
    if (subs.length >= 2) {
      if (!activeSubstrates.has(scatterXAxis)) setScatterXAxis(subs[0])
      if (!activeSubstrates.has(scatterYAxis)) setScatterYAxis(subs[subs.length - 1])
    }
  }, [activeSubstrates, scatterXAxis, scatterYAxis])

  const availableTimepoints = useMemo(() => {
    const tps = new Set(rawData.map(r => r.timepoint_hours))
    return [...tps].sort((a, b) => a - b)
  }, [rawData])

  const geneGroups = useMemo(() => {
    const groups = {}
    rawData.forEach(row => {
      if (!groups[row.gene]) {
        groups[row.gene] = { nickname: row.nickname, accession: row.accession, mediaData: {} }
      }
      if (!groups[row.gene].mediaData[row.media]) {
        groups[row.gene].mediaData[row.media] = []
      }
      groups[row.gene].mediaData[row.media].push({
        timepoint: row.timepoint_hours,
        average_readout: parseFloat(row.average_readout),
        stddev_readout: row.stddev_readout ? parseFloat(row.stddev_readout) : 0,
        sample_count: parseInt(row.sample_count),
      })
    })
    return groups
  }, [rawData])

  const activityByGeneMedia = useMemo(() => {
    const index = {}
    activityData.forEach(row => {
      if (!index[row.gene]) index[row.gene] = {}
      index[row.gene][row.media] = {
        activity: row.activity,
        peak_value: row.peak_value,
        peak_timepoint: row.peak_timepoint,
        min_value: row.min_value,
        min_timepoint: row.min_timepoint,
        flag: row.flag,
        timepoint_count: row.timepoint_count,
      }
    })
    return index
  }, [activityData])

  useEffect(() => {
    setSelectedGenes(new Set(Object.keys(geneGroups)))
  }, [geneGroups])

  const handleSelectAll = useCallback(() => setSelectedGenes(new Set(Object.keys(geneGroups))), [geneGroups])
  const handleDeselectAll = useCallback(() => setSelectedGenes(new Set()), [])

  const handleToggleGeneSelection = useCallback(gene => {
    setSelectedGenes(prev => {
      const next = new Set(prev)
      if (next.has(gene)) next.delete(gene)
      else next.add(gene)
      return next
    })
  }, [])

  const generateIntensityCSV = useCallback(() => ({
    headers: ["gene_id", "nickname", "accession", "source", "substrate", "timepoint_hours", "average_intensity", "stddev_intensity", "sample_count"],
    rows: rawData.filter(row => selectedGenes.has(row.gene)).map(row => [
      row.gene, row.nickname || "", row.accession || "", row.source || "",
      row.media, row.timepoint_hours, row.average_readout, row.stddev_readout || "", row.sample_count,
    ]),
  }), [rawData, selectedGenes])

  const generateActivityCSV = useCallback(() => ({
    headers: ["gene_id", "nickname", "accession", "source", "substrate", "activity", "peak_value", "peak_timepoint_hours", "min_value", "min_timepoint_hours", "flag", "timepoint_count"],
    rows: activityData.filter(row => selectedGenes.has(row.gene)).map(row => [
      row.gene, row.nickname || "", row.accession || "", row.source || "", row.media,
      row.activity !== null ? row.activity : "", row.peak_value !== null ? row.peak_value : "",
      row.peak_timepoint !== null ? row.peak_timepoint : "", row.min_value !== null ? row.min_value : "",
      row.min_timepoint !== null ? row.min_timepoint : "", row.flag || "", row.timepoint_count,
    ]),
  }), [activityData, selectedGenes])

  const handleDownloadIntensity = useCallback(() => {
    const { headers, rows } = generateIntensityCSV()
    if (!rows.length) { alert("No genes selected for download."); return }
    downloadCSV(generateCSV(headers, rows), `petadex_intensity_${new Date().toISOString().slice(0, 10)}`)
  }, [generateIntensityCSV])

  const handleDownloadActivity = useCallback(() => {
    const { headers, rows } = generateActivityCSV()
    if (!rows.length) { alert("No genes selected for download."); return }
    downloadCSV(generateCSV(headers, rows), `petadex_activity_${new Date().toISOString().slice(0, 10)}`)
  }, [generateActivityCSV])

  const heroStats = useMemo(() => {
    const stats = {}
      ;[...activeSubstrates].forEach(substrate => {
        const rows = rawData.filter(r => r.media === substrate)
        if (!rows.length) { stats[substrate] = { geneCount: 0, meanActivity: 0 }; return }
        const genes = new Set(rows.map(r => r.gene))
        const meanActivity = rows.reduce((sum, r) => sum + parseFloat(r.average_readout), 0) / rows.length
        stats[substrate] = { geneCount: genes.size, meanActivity }
      })
    return stats
  }, [rawData, activeSubstrates])

  const scatterData = useMemo(() => {
    if (plotMode === "activity") {
      return Object.entries(geneGroups).map(([gene, data]) => {
        const xActivity = activityByGeneMedia[gene]?.[scatterXAxis]
        const yActivity = activityByGeneMedia[gene]?.[scatterYAxis]
        if (!xActivity || !yActivity || xActivity.activity === null || yActivity.activity === null) return null
        return { gene, nickname: data.nickname, accession: data.accession, x: xActivity.activity, y: yActivity.activity, xActivity, yActivity }
      }).filter(Boolean)
    }
    return Object.entries(geneGroups).map(([gene, data]) => {
      const xMedia = data.mediaData[scatterXAxis]
      const yMedia = data.mediaData[scatterYAxis]
      if (!xMedia || !yMedia) return null
      let xVal, yVal
      if (activeTimepoint === null) {
        xVal = xMedia.reduce((s, p) => s + p.average_readout, 0) / xMedia.length
        yVal = yMedia.reduce((s, p) => s + p.average_readout, 0) / yMedia.length
      } else {
        const xPoint = xMedia.find(p => p.timepoint === activeTimepoint)
        const yPoint = yMedia.find(p => p.timepoint === activeTimepoint)
        if (!xPoint || !yPoint) return null
        xVal = xPoint.average_readout; yVal = yPoint.average_readout
      }
      if (isNaN(xVal) || isNaN(yVal)) return null
      return { gene, nickname: data.nickname, accession: data.accession, x: xVal, y: yVal }
    }).filter(Boolean)
  }, [geneGroups, activityByGeneMedia, scatterXAxis, scatterYAxis, activeTimepoint, plotMode])

  const toggleSubstrate = substrate => {
    setActiveSubstrates(prev => {
      const next = new Set(prev)
      if (next.has(substrate)) {
        if (next.size <= 1) return prev
        next.delete(substrate)
      } else {
        next.add(substrate)
      }
      return next
    })
  }

  const toggleGene = gene => {
    setExpandedGenes(prev => {
      const next = new Set(prev)
      if (next.has(gene)) next.delete(gene)
      else next.add(gene)
      return next
    })
  }

  const handleScatterDotClick = gene => {
    setExpandedGenes(prev => new Set([...prev, gene]))
    setTimeout(() => {
      document.getElementById(`gene-${gene}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }

  const handleScrollToScatter = gene => {
    setHighlightedGene(gene)
    document.getElementById("substrate-scatter")?.scrollIntoView({ behavior: "smooth", block: "center" })
    setTimeout(() => setHighlightedGene(null), 3000)
  }

  const geneEntries = Object.entries(geneGroups)

  return (
    <div>
      {showTitle && (
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-primary mb-1">
            Substrate Activity Comparison
          </h1>
          <p className="text-secondary-foreground text-lg">
            Compare enzyme activity across BHET substrates at different concentrations
          </p>
        </div>
      )}

      <SubstrateToggle activeSubstrates={activeSubstrates} onToggle={toggleSubstrate} />
      <PlotModeToggle plotMode={plotMode} onModeChange={setPlotMode} />

      {plotMode === "intensity" && (
        <TimepointToggle
          availableTimepoints={availableTimepoints}
          activeTimepoint={activeTimepoint}
          onSelect={setActiveTimepoint}
        />
      )}

      {loading ? (
        <p className="text-center text-muted-foreground italic py-12">Loading substrate data…</p>
      ) : error ? (
        <div className="p-6 text-center bg-error/5 border border-error/20 rounded-xl text-destructive">
          Error loading data: {error}
        </div>
      ) : geneEntries.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No substrate data available.</p>
      ) : (
        <>
          <SubstrateHero heroStats={heroStats} activeSubstrates={activeSubstrates} />

          {activeSubstrates.size >= 2 && scatterXAxis !== scatterYAxis && (
            <SubstrateScatter
              scatterData={scatterData}
              activeSubstrates={activeSubstrates}
              scatterXAxis={scatterXAxis}
              scatterYAxis={scatterYAxis}
              onXAxisChange={setScatterXAxis}
              onYAxisChange={setScatterYAxis}
              onDotClick={handleScatterDotClick}
              highlightedGene={highlightedGene}
              activeTimepoint={activeTimepoint}
              plotMode={plotMode}
            />
          )}

          <DownloadControls
            selectedCount={selectedGenes.size}
            totalCount={geneEntries.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onDownloadIntensity={handleDownloadIntensity}
            onDownloadActivity={handleDownloadActivity}
            disabled={loading}
          />

          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-secondary-foreground">
              Showing {geneEntries.length}{" "}
              {geneEntries.length === 1 ? "gene" : "genes"} with substrate data
            </p>
            {scatterData.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {scatterData.length} genes have{" "}
                {plotMode === "activity" ? "activity" : "data"} for both selected substrates
                {plotMode === "intensity" && activeTimepoint !== null && ` at ${activeTimepoint}h`}
              </p>
            )}
          </div>

          {geneEntries.map(([gene, geneData]) => (
            <GeneSubstrateCard
              key={gene}
              gene={gene}
              geneData={geneData}
              isExpanded={expandedGenes.has(gene)}
              onToggle={() => toggleGene(gene)}
              onScrollToScatter={() => handleScrollToScatter(gene)}
              activityData={activityByGeneMedia[gene]}
              isSelected={selectedGenes.has(gene)}
              onSelectionChange={handleToggleGeneSelection}
            />
          ))}
        </>
      )}
    </div>
  )
}

export default ActivityView
