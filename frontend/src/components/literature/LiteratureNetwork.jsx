import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "gatsby"
import * as d3 from "d3"
import {
  buildLiteratureGraph,
  edgesForDoi,
  layoutChronological,
  radiusForProteinCount,
} from "./literatureGraph"
import {
  paperNodeColor,
  plasticColor,
  plasticsInDataset,
} from "./plasticColors"
import { paperPath } from "./doiPath"

function formatAuthors(authors) {
  if (!authors?.length) return "—"
  if (authors.length <= 3) return authors.join(", ")
  return `${authors.slice(0, 2).join(", ")}, et al.`
}

function PaperInfoPanel({ paper, onClose, pinned }) {
  if (!paper) return null
  const doiHref = `https://doi.org/${paper.doi}`
  return (
    <aside
      className="absolute z-20 w-[min(360px,calc(100%-1.5rem))] max-h-[70%] overflow-y-auto rounded-lg border border-border bg-card shadow-lg p-4 text-sm"
      style={{ top: 12, left: 72 }}
      role="dialog"
      aria-label="Paper details"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h2 className="m-0 text-base font-semibold text-foreground leading-snug">
          {paper.paper_title || paper.doi}
        </h2>
        {pinned && (
          <button
            type="button"
            className="btn btn-ghost btn-sm shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
      <dl className="m-0 space-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Date</dt>
          <dd className="m-0 font-mono">{paper.date_published || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Authors</dt>
          <dd className="m-0">{formatAuthors(paper.authors)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">DOI</dt>
          <dd className="m-0">
            <a
              href={doiHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline break-all font-mono"
            >
              {paper.doi}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Overview</dt>
          <dd className="m-0 text-foreground/90">{paper.paper_summary || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Plastics</dt>
          <dd className="m-0 flex flex-wrap gap-1 mt-0.5">
            {(paper.plastics_studied || []).length === 0
              ? "—"
              : paper.plastics_studied.map(pl => (
                  <span
                    key={pl}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 border border-border"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-sm"
                      style={{ background: plasticColor(pl) }}
                    />
                    {pl}
                  </span>
                ))}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Proteins studied</dt>
          <dd className="m-0 font-mono">
            {paper.proteins_studied_count == null
              ? "—"
              : paper.proteins_studied_count}
          </dd>
        </div>
      </dl>
      {pinned && (
        <Link
          to={paperPath(paper.doi)}
          className="btn btn-primary btn-sm mt-3 inline-flex"
        >
          Go to paper
        </Link>
      )}
    </aside>
  )
}

/**
 * Chronological citation network (y = year, color by first plastic, size by protein count).
 */
export default function LiteratureNetwork({ papers = [] }) {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 560 })
  const [hoverDoi, setHoverDoi] = useState(null)
  const [selectedDoi, setSelectedDoi] = useState(null)

  const { nodes: rawNodes, edges } = useMemo(
    () => buildLiteratureGraph(papers),
    [papers],
  )

  const refMax = useMemo(() => {
    let m = 1
    for (const p of papers) {
      const n = Number(p.proteins_studied_count)
      if (Number.isFinite(n) && n > m) m = n
    }
    return m
  }, [papers])

  const layoutNodes = useMemo(
    () =>
      layoutChronological(rawNodes, {
        width: size.width,
        height: size.height,
      }),
    [rawNodes, size.width, size.height],
  )

  const byId = useMemo(() => {
    const m = new Map()
    for (const n of layoutNodes) m.set(n.id, n)
    return m
  }, [layoutNodes])

  const activeDoi = selectedDoi || hoverDoi
  const activeEdges = useMemo(
    () => (activeDoi ? edgesForDoi(edges, activeDoi) : []),
    [edges, activeDoi],
  )
  const activeEdgeSet = useMemo(() => {
    const s = new Set()
    for (const e of activeEdges) {
      s.add(`${e.source}→${e.target}`)
    }
    return s
  }, [activeEdges])

  const panelPaper = selectedDoi
    ? byId.get(selectedDoi) || papers.find(p => p.doi === selectedDoi)
    : hoverDoi
      ? byId.get(hoverDoi) || papers.find(p => p.doi === hoverDoi)
      : null

  const plastics = useMemo(() => plasticsInDataset(papers), [papers])

  const yearTicks = useMemo(() => {
    const years = layoutNodes.map(n => n.year).filter(y => y != null)
    if (!years.length) return []
    const yMin = Math.min(...years)
    const yMax = Math.max(...years)
    const start = Math.floor(yMin / 5) * 5
    const end = Math.ceil(yMax / 5) * 5
    const ticks = []
    for (let y = start; y <= end; y += 5) ticks.push(y)
    return ticks
  }, [layoutNodes])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setSize({
        width: Math.max(320, Math.floor(cr.width)),
        height: Math.max(400, Math.floor(cr.height)),
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const { width, height } = size
    const padding = 56
    const years = layoutNodes.map(n => n.year).filter(y => y != null)
    const yMin = years.length ? Math.min(...years) : 1995
    const yMax = years.length ? Math.max(...years) : 2025
    const ySpan = Math.max(yMax - yMin, 1)
    const yScale = y => padding + ((y - yMin) / ySpan) * (height - padding * 2)

    const g = svg.attr("viewBox", `0 0 ${width} ${height}`).append("g")

    // Year grid
    const axisG = g.append("g").attr("class", "year-axis")
    for (const y of yearTicks) {
      const yy = yScale(y)
      axisG
        .append("line")
        .attr("x1", padding)
        .attr("x2", width - padding / 2)
        .attr("y1", yy)
        .attr("y2", yy)
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.15)
      axisG
        .append("text")
        .attr("x", 8)
        .attr("y", yy)
        .attr("dy", "0.35em")
        .attr("fill", "currentColor")
        .attr("fill-opacity", 0.7)
        .attr("font-size", 14)
        .attr("font-family", "ui-monospace, monospace")
        .text(String(y))
    }
    axisG
      .append("text")
      .attr("x", 8)
      .attr("y", 20)
      .attr("fill", "currentColor")
      .attr("fill-opacity", 0.65)
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text("Year")

    // Edges
    const edgeG = g.append("g").attr("class", "edges")
    edgeG
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("x1", d => byId.get(d.source)?.x ?? 0)
      .attr("y1", d => byId.get(d.source)?.y ?? 0)
      .attr("x2", d => byId.get(d.target)?.x ?? 0)
      .attr("y2", d => byId.get(d.target)?.y ?? 0)
      .attr("stroke", d => {
        const key = `${d.source}→${d.target}`
        if (!activeDoi) return "currentColor"
        return activeEdgeSet.has(key) ? "#f59e0b" : "currentColor"
      })
      .attr("stroke-opacity", d => {
        const key = `${d.source}→${d.target}`
        if (!activeDoi) return 0.2
        return activeEdgeSet.has(key) ? 0.95 : 0.05
      })
      .attr("stroke-width", d => {
        const key = `${d.source}→${d.target}`
        return activeEdgeSet.has(key) ? 2.2 : 1
      })

    // Nodes + size labels
    const nodeG = g.append("g").attr("class", "nodes")
    const nodeSel = nodeG
      .selectAll("g.node")
      .data(layoutNodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .attr("opacity", d => {
        if (!activeDoi) return 1
        const incident = activeEdges.some(
          e => e.source === d.id || e.target === d.id,
        )
        return d.id === activeDoi || incident ? 1 : 0.25
      })
      .on("mouseenter", (_event, d) => setHoverDoi(d.id))
      .on("mouseleave", () => setHoverDoi(null))
      .on("click", (event, d) => {
        event.stopPropagation()
        setSelectedDoi(prev => (prev === d.id ? null : d.id))
      })

    nodeSel
      .append("circle")
      .attr("r", d => radiusForProteinCount(d.proteins_studied_count, { refMax }))
      .attr("fill", d => paperNodeColor(d))
      .attr("stroke", d => {
        if (d.id === selectedDoi) return "#f8fafc"
        if (d.id === hoverDoi) return "#e2e8f0"
        return "rgba(15,23,42,0.35)"
      })
      .attr("stroke-width", d => (d.id === selectedDoi || d.id === hoverDoi ? 2.5 : 1))

    nodeSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#0f172a")
      .attr("font-size", d => {
        const r = radiusForProteinCount(d.proteins_studied_count, { refMax })
        return r >= 14 ? 11 : 9
      })
      .attr("font-weight", 700)
      .attr("font-family", "ui-monospace, monospace")
      .attr("pointer-events", "none")
      .text(d =>
        d.proteins_studied_count == null ? "—" : String(d.proteins_studied_count),
      )

    nodeSel.append("title").text(d => d.paper_title || d.doi)

    // Background click to clear
    svg.on("click", () => setSelectedDoi(null))
  }, [
    layoutNodes,
    edges,
    byId,
    size,
    yearTicks,
    activeDoi,
    activeEdgeSet,
    activeEdges,
    selectedDoi,
    hoverDoi,
    refMax,
  ])

  if (!papers.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        Error, please try again
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-[480px]">
      <div className="relative flex-1 min-h-[420px]" ref={wrapRef}>
        <svg
          ref={svgRef}
          className="w-full h-full text-foreground bg-background rounded-lg border border-border"
          role="img"
          aria-label="literature network (wip)"
        />

        <PaperInfoPanel
          paper={panelPaper}
          pinned={Boolean(selectedDoi)}
          onClose={() => setSelectedDoi(null)}
        />
      </div>

      <div className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-xs">
        <div className="font-semibold text-muted-foreground mb-1">
          Legend for types of plastic
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
          {plastics.map(pl => (
            <span key={pl} className="inline-flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: plasticColor(pl) }}
              />
              {pl}
            </span>
          ))}
        </div>
        <div className="text-muted-foreground">
          Node size is the proteins studied, while edges are citations in the
          dataset, and colors are the first plastic listed. Numbers on nodes =
          protein count.
        </div>
      </div>
    </div>
  )
}
