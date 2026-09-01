import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react"
import { hierarchy } from "d3-hierarchy"
import { buildPhylogram, buildRadialTree, countLeaves } from "./layouts"
import {
  enzymeIdFromTip,
  leafDisplayLabel,
  truncateLabel,
} from "./leafUtils"

const LEAF_H = 14
const TREE_W = 580
const LABEL_W = 220
const H_MARGIN = { top: 10, right: 10, bottom: 10, left: 20 }

const LEAF_ARC = 10
const LABEL_SPACE = 150
const MIN_RADIUS = 160

const btnClass =
  "btn btn-secondary px-2 py-0.5 text-sm rounded"

function leafVisualState(
  enzymeId,
  { highlightIds, matchIds, searchActive, focusedLeafId, neighborhoodActive, visibleLeafIds },
) {
  if (!enzymeId) {
    return { dimmed: false, highlighted: false, searchMatch: false, focused: false }
  }
  const id = String(enzymeId)
  const highlighted = highlightIds?.has(id) ?? false
  const searchMatch = searchActive ? matchIds?.has(id) ?? false : false
  const focused = focusedLeafId === id
  const outsideNeighborhood =
    neighborhoodActive && visibleLeafIds instanceof Set && !visibleLeafIds.has(id)
  const dimmed =
    outsideNeighborhood || (searchActive && !searchMatch && !highlighted)
  return { dimmed, highlighted, searchMatch, focused }
}

function leafFill({
  dimmed,
  highlighted,
  searchMatch,
  focused,
  isHovered,
  layout,
  metadataColor,
}) {
  if (dimmed) return layout === "radial" ? "var(--muted-foreground)" : "#ced4da"
  if (focused || isHovered) return layout === "radial" ? "var(--accent-hover, var(--accent))" : "#0056b3"
  if (highlighted || searchMatch) return layout === "radial" ? "#f59e0b" : "#e67700"
  if (metadataColor) return metadataColor
  return layout === "radial" ? "var(--accent)" : "#007bff"
}

export default function PhyloTreeViewer({
  root,
  layout = "horizontal",
  highlightIds = new Set(),
  matchIds = new Set(),
  searchActive = false,
  focusedLeafId = null,
  memberIndex = new Map(),
  containerHeight,
  className = "",
  /** @type {Set<number>|null} */
  pathUids = null,
  neighborhoodActive = false,
  /** @type {Set<string>|null} */
  visibleLeafIds = null,
  /** @type {((enzymeId: string) => string|null)|null} */
  getLeafColor = null,
  /** @type {((enzymeId: string) => void)|null} */
  onLeafSelect = null,
  zoomNonce = 0,
}) {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const transformRef = useRef(transform)
  transformRef.current = transform

  const containerRef = useRef(null)
  const fittedRef = useRef(false)
  const dragRef = useRef(null)
  const [hoveredNode, setHoveredNode] = useState(null)

  const isRadial = layout === "radial"

  const horizontalLayout = useMemo(() => {
    if (!root || isRadial) return null
    const numLeaves = countLeaves(root)
    const treeH = Math.max(numLeaves * LEAF_H, 200)
    const svgW = H_MARGIN.left + TREE_W + LABEL_W + H_MARGIN.right
    const svgH = H_MARGIN.top + treeH + H_MARGIN.bottom
    const layoutRoot = buildPhylogram(
      hierarchy(root, d => d.children),
      TREE_W,
      treeH,
    )
    return {
      numLeaves,
      treeH,
      svgW,
      svgH,
      nodes: layoutRoot.descendants(),
      links: layoutRoot.links(),
      sx: d => H_MARGIN.left + d.y,
      sy: d => H_MARGIN.top + d.x,
    }
  }, [root, isRadial])

  const radialLayout = useMemo(() => {
    if (!root || !isRadial) return null
    const numLeaves = countLeaves(root)
    const radius = Math.max((numLeaves * LEAF_ARC) / (2 * Math.PI), MIN_RADIUS)
    const center = radius + LABEL_SPACE
    const svgSize = 2 * center
    const layoutRoot = buildRadialTree(
      hierarchy(root, d => d.children),
      radius,
    )
    return {
      numLeaves,
      center,
      svgSize,
      radius,
      nodes: layoutRoot.descendants(),
      links: layoutRoot.links(),
      px: d => center + d.radius * Math.cos(d.angle),
      py: d => center + d.radius * Math.sin(d.angle),
    }
  }, [root, isRadial])

  const numLeaves = isRadial
    ? radialLayout?.numLeaves ?? 0
    : horizontalLayout?.numLeaves ?? 0

  const showRadialLabels =
    isRadial &&
    (numLeaves < 40 || transform.k * LEAF_ARC > 14)

  const zoomBy = useCallback((factor, cx, cy) => {
    setTransform(t => {
      const k = Math.min(Math.max(t.k * factor, 0.2), 8)
      const ratio = k / t.k
      return {
        k,
        x: cx - (cx - t.x) * ratio,
        y: cy - (cy - t.y) * ratio,
      }
    })
  }, [])

  const zoomFromCenter = useCallback(
    factor => {
      const el = containerRef.current
      if (!el) return
      zoomBy(factor, el.clientWidth / 2, el.clientHeight / 2)
    },
    [zoomBy],
  )

  const fitRadial = useCallback(() => {
    const el = containerRef.current
    const svgSize = radialLayout?.svgSize
    if (!el || !svgSize) return null
    const W = el.clientWidth
    const H = el.clientHeight
    if (!W || !H) return null
    const k = Math.min(W / svgSize, H / svgSize)
    return { k, x: (W - svgSize * k) / 2, y: (H - svgSize * k) / 2 }
  }, [radialLayout?.svgSize])

  const zoomToLeaf = useCallback(
    enzymeId => {
      if (!enzymeId || !containerRef.current) return
      const el = containerRef.current

      let leafX
      let leafY

      if (isRadial && radialLayout) {
        const node = radialLayout.nodes.find(
          n => !n.children && enzymeIdFromTip(n.data.name) === String(enzymeId),
        )
        if (!node) return
        leafX = radialLayout.px(node)
        leafY = radialLayout.py(node)
      } else if (horizontalLayout) {
        const node = horizontalLayout.nodes.find(
          n => !n.children && enzymeIdFromTip(n.data.name) === String(enzymeId),
        )
        if (!node) return
        leafX = horizontalLayout.sx(node)
        leafY = horizontalLayout.sy(node)
      } else {
        return
      }

      const targetK = Math.min(Math.max(transformRef.current.k, 1.8), 6)
      const cx = el.clientWidth / 2
      const cy = el.clientHeight / 2
      setTransform({
        k: targetK,
        x: cx - leafX * targetK,
        y: cy - leafY * targetK,
      })
    },
    [isRadial, radialLayout, horizontalLayout],
  )

  useEffect(() => {
    if (focusedLeafId) zoomToLeaf(focusedLeafId)
  }, [focusedLeafId, zoomNonce, zoomToLeaf])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const onWheel = e => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [zoomBy])

  useEffect(() => {
    if (!isRadial) return undefined
    const el = containerRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => {
      if (fittedRef.current) return
      const fit = fitRadial()
      if (fit) {
        setTransform(fit)
        fittedRef.current = true
        ro.disconnect()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isRadial, fitRadial])

  const onMouseDown = useCallback(e => {
    if (isRadial) {
      const startX = e.clientX - transformRef.current.x
      const startY = e.clientY - transformRef.current.y
      const onMove = ev => {
        setTransform(t => ({
          ...t,
          x: ev.clientX - startX,
          y: ev.clientY - startY,
        }))
      }
      const onUp = () => {
        window.removeEventListener("mousemove", onMove)
        window.removeEventListener("mouseup", onUp)
      }
      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", onUp)
      return
    }
    dragRef.current = {
      startX: e.clientX - transformRef.current.x,
      startY: e.clientY - transformRef.current.y,
    }
  }, [isRadial])

  const onMouseMove = useCallback(e => {
    const d = dragRef.current
    if (!d || isRadial) return
    setTransform(t => ({
      ...t,
      x: e.clientX - d.startX,
      y: e.clientY - d.startY,
    }))
  }, [isRadial])

  const onMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const resetView = () => {
    if (isRadial) {
      setTransform(fitRadial() || { x: 0, y: 0, k: 1 })
      return
    }
    setTransform({ x: 0, y: 0, k: 1 })
  }

  const renderLeaf = (node, i, coords) => {
    const enzymeId = enzymeIdFromTip(node.data.name)
    const label = node.data.name || ""
    const displayLabel = memberIndex.size
      ? leafDisplayLabel(enzymeId, memberIndex)
      : truncateLabel(label)
    const visual = leafVisualState(enzymeId, {
      highlightIds,
      matchIds,
      searchActive,
      focusedLeafId,
      neighborhoodActive,
      visibleLeafIds,
    })
    const isHovered = hoveredNode === label
    const metadataColor =
      !visual.dimmed && !visual.highlighted && !visual.searchMatch && getLeafColor && enzymeId
        ? getLeafColor(enzymeId)
        : null
    const fill = leafFill({ ...visual, isHovered, layout, metadataColor })
    const onPath = pathUids instanceof Set && node.data.__uid != null && pathUids.has(node.data.__uid)

    const title = enzymeId
      ? [
          `Enzyme ${enzymeId}`,
          memberIndex.get(String(enzymeId))?.accession &&
            `Accession ${memberIndex.get(String(enzymeId)).accession}`,
        ]
          .filter(Boolean)
          .join(" · ")
      : label

    const handleClick = () => {
      if (!enzymeId) return
      if (onLeafSelect) {
        onLeafSelect(String(enzymeId))
        return
      }
      window.open(`/enzyme/${enzymeId}`, "_blank")
    }

    if (isRadial) {
      const onLeft = Math.cos(node.angle) < 0
      const deg = (node.angle * 180) / Math.PI
      const rot = onLeft ? deg + 180 : deg
      const dotR = (isHovered || visual.focused || onPath ? 4 : 2.5) / transform.k
      const hideLabel =
        neighborhoodActive &&
        visual.dimmed &&
        !isHovered &&
        !visual.focused
      return (
        <g
          key={i}
          transform={`translate(${coords.x},${coords.y}) rotate(${rot})`}
          onClick={enzymeId ? handleClick : undefined}
          onMouseEnter={() => setHoveredNode(label)}
          onMouseLeave={() => setHoveredNode(null)}
          style={{
            cursor: enzymeId ? "pointer" : "default",
            opacity: visual.dimmed ? 0.12 : 1,
          }}
        >
          <title>{title}</title>
          <circle r={8 / transform.k} fill="transparent" />
          <circle
            r={dotR}
            fill={fill}
            stroke={onPath ? "#c94141" : "none"}
            strokeWidth={onPath ? 1.5 / transform.k : 0}
          />
          {!hideLabel &&
            (showRadialLabels || isHovered || visual.highlighted || visual.focused) &&
            displayLabel && (
            <text
              x={(onLeft ? -6 : 6) / transform.k}
              dy="0.32em"
              textAnchor={onLeft ? "end" : "start"}
              fontSize={11 / transform.k}
              fontFamily="monospace"
              fill={
                visual.highlighted
                  ? "#e67700"
                  : isHovered
                    ? "var(--accent)"
                    : "var(--foreground)"
              }
              fontWeight={isHovered || visual.focused ? "bold" : "normal"}
              style={{ userSelect: "none" }}
            >
              {displayLabel}
            </text>
          )}
        </g>
      )
    }

    const hideLabel =
      neighborhoodActive && visual.dimmed && !isHovered && !visual.focused

    return (
      <g
        key={i}
        transform={`translate(${coords.x},${coords.y})`}
        onClick={enzymeId ? handleClick : undefined}
        onMouseEnter={() => setHoveredNode(label)}
        onMouseLeave={() => setHoveredNode(null)}
        style={{
          cursor: enzymeId ? "pointer" : "default",
          opacity: visual.dimmed ? 0.12 : 1,
        }}
      >
        <title>{title}</title>
        <circle
          r={isHovered || visual.focused || onPath ? 3.5 : 2.5}
          fill={fill}
          stroke={onPath ? "#c94141" : "none"}
          strokeWidth={onPath ? 1.5 : 0}
        />
        {!hideLabel && displayLabel && (
          <text
            x={6}
            dy="0.32em"
            fontSize={11}
            fontFamily="monospace"
            fill={visual.highlighted ? "#e67700" : "#343a40"}
            fontWeight={isHovered || visual.focused ? "bold" : "normal"}
            style={{ userSelect: "none" }}
          >
            {displayLabel}
          </text>
        )}
      </g>
    )
  }

  const linkOnPath = link => {
    if (!(pathUids instanceof Set)) return false
    const s = link.source?.data?.__uid
    const t = link.target?.data?.__uid
    return s != null && t != null && pathUids.has(s) && pathUids.has(t)
  }

  const heightStyle = containerHeight || (isRadial ? "60vh" : "70vh")
  const minHeight = isRadial ? 300 : 400

  const radialLinkPath = ({ source: p, target: c }) => {
    const center = radialLayout.center
    const r = p.radius
    const x0 = center + r * Math.cos(p.angle)
    const y0 = center + r * Math.sin(p.angle)
    const x1 = center + r * Math.cos(c.angle)
    const y1 = center + r * Math.sin(c.angle)
    const x2 = center + c.radius * Math.cos(c.angle)
    const y2 = center + c.radius * Math.sin(c.angle)
    const largeArc = Math.abs(c.angle - p.angle) > Math.PI ? 1 : 0
    const sweep = c.angle > p.angle ? 1 : 0
    return `M${x0},${y0}A${r},${r} 0 ${largeArc} ${sweep} ${x1},${y1}L${x2},${y2}`
  }

  const horizontalLinkPath = ({ source: p, target: c }) =>
    `M${horizontalLayout.sx(p)},${horizontalLayout.sy(p)} V${horizontalLayout.sy(c)} H${horizontalLayout.sx(c)}`

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-2 right-2 z-10 flex gap-1.5">
        <button type="button" onClick={() => zoomFromCenter(1.3)} className={btnClass}>
          +
        </button>
        <button type="button" onClick={() => zoomFromCenter(0.77)} className={btnClass}>
          −
        </button>
        <button type="button" onClick={resetView} className={btnClass}>
          Reset
        </button>
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={containerRef}
        className={
          isRadial
            ? "w-full overflow-hidden bg-surface-raised border border-border rounded-md cursor-grab"
            : "w-full overflow-hidden bg-[#fafafa] border border-[#e9ecef] rounded-md cursor-grab"
        }
        style={{ height: heightStyle, minHeight }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {isRadial && radialLayout && (
          <svg
            width={radialLayout.svgSize}
            height={radialLayout.svgSize}
            style={{
              display: "block",
              transformOrigin: "0 0",
              transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.k})`,
            }}
          >
            <g fill="none">
              {radialLayout.links.map((link, i) => {
                const onPath = linkOnPath(link)
                return (
                  <path
                    key={i}
                    d={radialLinkPath(link)}
                    stroke={onPath ? "#c94141" : "var(--border-strong)"}
                    strokeWidth={onPath ? 2.2 : 0.8}
                    vectorEffect="non-scaling-stroke"
                    opacity={onPath ? 1 : neighborhoodActive ? 0.35 : 1}
                  />
                )
              })}
            </g>
            {radialLayout.nodes.map((node, i) => {
              if (!node.children) {
                return renderLeaf(node, i, {
                  x: radialLayout.px(node),
                  y: radialLayout.py(node),
                })
              }
              const onPath =
                pathUids instanceof Set &&
                node.data.__uid != null &&
                pathUids.has(node.data.__uid)
              return (
                <g
                  key={i}
                  transform={`translate(${radialLayout.px(node)},${radialLayout.py(node)})`}
                >
                  <circle
                    r={(onPath ? 3 : 2) / transform.k}
                    fill={onPath ? "#c94141" : "var(--muted-foreground)"}
                  />
                </g>
              )
            })}
          </svg>
        )}

        {!isRadial && horizontalLayout && (
          <svg
            width={horizontalLayout.svgW}
            height={horizontalLayout.svgH}
            style={{
              display: "block",
              transformOrigin: "0 0",
              transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.k})`,
            }}
          >
            <g fill="none">
              {horizontalLayout.links.map((link, i) => {
                const onPath = linkOnPath(link)
                return (
                  <path
                    key={i}
                    d={horizontalLinkPath(link)}
                    stroke={onPath ? "#c94141" : "#adb5bd"}
                    strokeWidth={onPath ? 2.2 : 0.8}
                    opacity={onPath ? 1 : neighborhoodActive ? 0.35 : 1}
                  />
                )
              })}
            </g>
            {horizontalLayout.nodes.map((node, i) => {
              if (!node.children) {
                return renderLeaf(node, i, {
                  x: horizontalLayout.sx(node),
                  y: horizontalLayout.sy(node),
                })
              }
              const onPath =
                pathUids instanceof Set &&
                node.data.__uid != null &&
                pathUids.has(node.data.__uid)
              return (
                <g
                  key={i}
                  transform={`translate(${horizontalLayout.sx(node)},${horizontalLayout.sy(node)})`}
                >
                  <circle r={onPath ? 3 : 2} fill={onPath ? "#c94141" : "#6c757d"} />
                </g>
              )
            })}
          </svg>
        )}
      </div>

      <p
        className={
          isRadial
            ? "mt-1.5 text-xs text-muted-foreground"
            : "mt-1.5 text-xs text-[#868e96]"
        }
      >
        {numLeaves} leaves · scroll to zoom · drag to pan · click leaf to{" "}
        {onLeafSelect ? "focus" : "open enzyme"}
        {highlightIds.size > 0 && ` · ${highlightIds.size} from search highlighted`}
        {neighborhoodActive &&
          visibleLeafIds instanceof Set &&
          ` · showing ${visibleLeafIds.size} nearby tips`}
      </p>
    </div>
  )
}
