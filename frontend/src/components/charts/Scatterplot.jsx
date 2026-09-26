import React, { useState, useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { Axes } from "./Axes"
import { Tooltip } from "./Tooltip"
import { familyColor } from "../../utils/familyColor"

// Shared chip used by legend
const LegendChip = ({ label, count, color, onClick }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border-[1.5px] transition-opacity"
    style={{
      borderColor: color,
      background: `${color}10`,
      cursor: onClick ? "pointer" : "default",
    }}
    {...(onClick && {
      role: "button",
      tabIndex: 0,
      onClick,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(e)
        }
      },
    })}
  >
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{ background: color }}
    />
    {label}
    <span className="text-muted-foreground text-[10px] font-normal">
      {count}
    </span>
  </span>
)

export const Scatterplot = ({
  height,
  data,
  familyCounts = {},
  unknownCount = 0,
  total = 0,
}) => {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity)
  const [zoomMode, setZoomMode] = useState(false)
  const [interactionData, setInteractionData] = useState()
  const svgRef = useRef(null)
  const zoomRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width
      if (w && w > 0) setContainerWidth(Math.floor(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const width = containerWidth || 700

  const margin = { top: 20, right: 24, bottom: 72, left: 54 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const xMin = d3.min(data, d => d.x) - 5
  const xMax = d3.max(data, d => d.x) + 5
  const yMin = d3.min(data, d => d.y) - 5
  const yMax = d3.max(data, d => d.y) + 5

  const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth])
  const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0])
  const zoomedX = zoomTransform.rescaleX(xScale)
  const zoomedY = zoomTransform.rescaleY(yScale)
  const sizeScale = d3.scaleSqrt().domain([0, 600]).range([4, 16])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 20])
      .translateExtent([
        [-margin.left, -margin.top],
        [width + margin.right, height + margin.bottom],
      ])
      .on("zoom", e => setZoomTransform(e.transform))
    zoomRef.current = zoom
    svg.call(zoom)
    return () => svg.on(".zoom", null)
  }, [width, height, margin.left, margin.top, margin.right, margin.bottom])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.style("cursor", zoomMode ? "grab" : "default")
    if (!zoomMode) svg.on(".zoom", null)
    else if (zoomRef.current) svg.call(zoomRef.current)
  }, [zoomMode])

  const handleResetZoom = useCallback(() => {
    const svg = d3.select(svgRef.current)
    if (zoomRef.current) {
      svg
        .transition()
        .duration(400)
        .call(zoomRef.current.transform, d3.zoomIdentity)
    }
  }, [])

  const legendEntries = [
    ...Object.entries(familyCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([label, { count, family_num }]) => ({
        label,
        count,
        family_num,
        color: familyColor(family_num),
      })),
    ...(unknownCount > 0
      ? [
          {
            label: "Unknown",
            count: unknownCount,
            family_num: null,
            color: "var(--muted-foreground)",
          },
        ]
      : []),
  ]

  if (!containerWidth) {
    return (
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: height }}
      />
    )
  }

  return (
    <div ref={containerRef} className="relative flex flex-col flex-1">
      {/* Controls */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setZoomMode(z => !z)}
          className={`px-3 py-1 text-xs border rounded transition-colors ${
            zoomMode
              ? "bg-accent text-accent-foreground border-accent"
              : "bg-background text-foreground border-border hover:border-border-strong"
          }`}
        >
          🔍 Zoom {zoomMode ? "On" : "Off"}
        </button>
        <button
          onClick={handleResetZoom}
          className="px-3 py-1 text-xs border border-border rounded bg-background text-foreground hover:border-border-strong transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      {/* Legend */}
      {legendEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {legendEntries.map(({ label, count, family_num, color }) => (
            <LegendChip
              key={label}
              label={label}
              count={count}
              color={color}
              onClick={
                family_num != null
                  ? () => window.open(`/family/${family_num}`, "_blank")
                  : null
              }
            />
          ))}
        </div>
      )}

      {/* SVG wrapper */}
      <div className="relative border border-border rounded-lg overflow-hidden bg-surface-raised flex flex-col flex-1 justify-center">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          shapeRendering="crispEdges"
          className="block select-none"
        >
          <defs>
            <clipPath id="plot-area">
              <rect x={0} y={0} width={innerWidth} height={innerHeight} />
            </clipPath>
          </defs>
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            <Axes
              xScale={zoomedX}
              yScale={zoomedY}
              width={innerWidth}
              height={innerHeight}
            />
            <g clipPath="url(#plot-area)">
              {/* Dots */}
              {[...data].map((d, i) => {
                const r = sizeScale(d.size) / 2
                const cx = zoomedX(d.x)
                const cy = zoomedY(d.y)
                return (
                  <g
                    key={i}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      if (!zoomMode && d.enzyme_id != null)
                        window.open(`/enzyme/${d.enzyme_id}`, "_blank")
                    }}
                    onMouseMove={() =>
                      setInteractionData({
                        xPos: cx + margin.left,
                        yPos: cy + margin.top,
                        ...d,
                      })
                    }
                    onMouseLeave={() => setInteractionData(undefined)}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={
                        d.family != null ? familyColor(d.family) : "var(--info)"
                      }
                      opacity={0.7}
                      stroke="white"
                      strokeWidth={0.5}
                      className="hover:opacity-100 hover:stroke-black hover:stroke-2"
                    />
                  </g>
                )
              })}

              {/* Annotations */}
              {[...data]
                .filter(d => d.annotation)
                .map((d, i) => {
                  const size = sizeScale(d.size)
                  const x = zoomedX(d.x)
                  const y = zoomedY(d.y)
                  const xText =
                    d.annotation === "right"
                      ? x + size / 2 + 5
                      : x - size / 2 - 5
                  return (
                    <g key={i}>
                      <rect
                        x={x - size / 2}
                        y={y - size / 2}
                        fill="none"
                        strokeWidth={1}
                        stroke="var(--foreground)"
                        width={size}
                        height={size}
                      />
                      <text
                        x={xText}
                        y={y}
                        fontSize={12}
                        fontWeight={500}
                        textAnchor={d.annotation === "right" ? "start" : "end"}
                        dominantBaseline="middle"
                        fill="var(--foreground)"
                      >
                        {d.name}
                      </text>
                    </g>
                  )
                })}
            </g>
          </g>
        </svg>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{ width, height }}
        >
          <Tooltip interactionData={interactionData} containerWidth={width} />
        </div>
      </div>
    </div>
  )
}
