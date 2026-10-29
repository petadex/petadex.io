// Tree and multiple alignment of the search's representative hits: the query,
// every Plasticome hit and the best-ranked hit of each 90 % cluster, aligned
// by FAMSA and treed by FastTree after every search. Two panels share one
// parsed model: a circular tree with leaves colored by origin, and the
// alignment with rows in the tree's leaf order. A hit opens its record.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { parseNewick } from "../../phyloTree/parseNewick"
import {
  coverageDepth,
  layoutRadial,
  parseAfa,
  queryColumns,
  residueClass,
} from "../../../utils/alignment"
import { downloadFile } from "../../../utils/csvDownload"
import { standaloneSvg } from "../../../utils/svgExport"
import { MethodsLink, SectionTitle } from "./parts"

const ORIGIN_COLOR = {
  plasticome: "var(--origin-plasticome)",
  ncbi_nr: "var(--origin-ncbi-nr)",
  logan: "var(--origin-logan)",
}
const ORIGIN_NAME = {
  plasticome: "Plasticome",
  ncbi_nr: "NCBI nr",
  logan: "Logan",
}

const CLASS_VAR = {
  hydrophobic: "--color-aa-hydrophobic",
  aromatic: "--color-aa-aromatic",
  polar: "--color-aa-polar",
  positive: "--color-aa-charged-pos",
  negative: "--color-aa-charged-neg",
  special: "--color-aa-special",
}

const toggle = active =>
  `cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
    active
      ? "border-accent bg-accent-subtle text-foreground"
      : "border-border bg-background text-secondary-foreground hover:bg-surface-raised hover:text-foreground"
  }`

/** Download filename stem for this search's alignment files. */
const fileStem = (alignment, kind) =>
  `petadex-${kind}-${alignment.data?.session_id || "search"}`

/**
 * Parsed tree + alignment, rows in the tree's leaf order. null until the
 * alignment is ready.
 */
export function useAlignmentModel(alignment) {
  const { status, data } = alignment
  return useMemo(() => {
    if (status !== "ready" || !data?.afa || !data?.newick) return null
    const rows = parseAfa(data.afa)
    const parsed = parseNewick(data.newick)
    // Leaf order is the same with or without branch lengths.
    const tree = layoutRadial(parsed)
    const byName = new Map(rows.map(r => [r.id, r]))
    const ordered = tree.leaves.map(l => byName.get(l.name)).filter(Boolean)
    return { rows: ordered, tree, parsed, data }
  }, [status, data])
}

function AlignmentStatus({ alignment }) {
  const { status, data, error } = alignment
  if (status === "loading" || status === "running")
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {status === "running" && data?.n_sequences
          ? `Building the alignment and tree for ${data.n_sequences} sequences…`
          : "Loading the alignment and tree…"}
      </p>
    )
  if (status === "unavailable")
    return (
      <p className="text-sm text-muted-foreground">
        No alignment or tree for this search yet.
      </p>
    )
  if (status === "failed")
    return (
      <p role="status" className="text-sm text-warning">
        The alignment and tree could not be built
        {error ? ` (${error})` : ""}.
      </p>
    )
  return null
}

function OriginLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-secondary-foreground">
      <span className="inline-flex items-center gap-1.5">
        <i
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        query
      </span>
      {Object.keys(ORIGIN_COLOR).map(o => (
        <span key={o} className="inline-flex items-center gap-1.5">
          <i
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: ORIGIN_COLOR[o] }}
          />
          {ORIGIN_NAME[o]}
        </span>
      ))}
    </div>
  )
}

/* ── Circular tree ──────────────────────────────────────────────────────── */

const SIZE = 760
const CENTER = SIZE / 2
const LABEL_ROOM = 92 // between the outermost tip and the edge, for labels

const polar = (r, a) => [CENTER + r * Math.sin(a), CENTER - r * Math.cos(a)]

function arcPath(r, a0, a1) {
  const [x0, y0] = polar(r, a0)
  const [x1, y1] = polar(r, a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${x0},${y0}A${r},${r} 0 ${large} 1 ${x1},${y1}`
}

/** One line on what a hit is: enzyme, organism, or dominant environment. */
function hitSummary(hit) {
  const c = hit?.card || {}
  if (hit?.db === "plasticome")
    return (c.enzyme_names || "").split(/\s*;\s*/)[0] || null
  if (hit?.db === "ncbi_nr") return c.organism || null
  if (hit?.db === "logan")
    return c.prof_dominant ? c.prof_dominant.replace(/_/g, " ") : null
  return null
}

/** Small card that follows the cursor over a leaf. */
function LeafPreview({ tip }) {
  if (!tip) return null
  const { name, hit, x, y } = tip
  const isQuery = name === "query"
  const summary = hitSummary(hit)
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[60] w-max max-w-64 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center gap-1.5 font-mono font-semibold">
        <i
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background: isQuery
              ? "var(--accent)"
              : ORIGIN_COLOR[hit?.db] || "var(--muted-foreground)",
          }}
        />
        {isQuery ? "Your query" : name}
      </div>
      {!isQuery && hit && (
        <>
          <div className="text-muted-foreground">
            {ORIGIN_NAME[hit.db] || "—"} · {hit.identity?.toFixed(1)} % identity
            · {hit.query_coverage ?? "—"} % coverage
          </div>
          {summary && (
            <div className={hit.db === "ncbi_nr" ? "italic" : ""}>
              {summary}
            </div>
          )}
          <div className="mt-1 text-muted-foreground">Click to open record</div>
        </>
      )}
    </div>
  )
}

/** `size` (px) fixes the drawing's size, for focus mode; otherwise it fills
 * the panel width up to max-w-3xl. */
function TreeSvg({
  tree,
  byId,
  hover,
  setHover,
  onOpenRecord,
  size = null,
  zoom = 1,
  colorLabels = false,
}) {
  // Marks keep their on-screen size as the drawing is zoomed, so zooming in
  // pulls close leaves apart instead of enlarging them with everything else.
  const k = 1 / zoom
  const [tip, setTip] = useState(null)
  const showTip = (name, hit, e) => {
    const pad = 14
    let x = e.clientX + pad
    let y = e.clientY + pad
    if (x + 260 > window.innerWidth) x = e.clientX - 260 - pad
    if (y + 100 > window.innerHeight) y = e.clientY - 100 - pad
    setTip({ name, hit, x, y })
  }
  const R = CENTER - LABEL_ROOM
  const sr = r => (r / (tree.depth || 1)) * R
  return (
    <div
      className={size ? "shrink-0" : "mx-auto w-full max-w-3xl"}
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Circular phylogenetic tree of ${tree.leaves.length} sequences, leaves colored by origin`}
      >
        {tree.arcs.map((a, i) =>
          a.a1 > a.a0 ? (
            <path
              key={`a${i}`}
              d={arcPath(sr(a.r), a.a0, a.a1)}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth={0.9 * k}
            />
          ) : null
        )}
        {tree.radials.map((s, i) => {
          const [x0, y0] = polar(sr(s.r0), s.angle)
          const [x1, y1] = polar(sr(s.r1), s.angle)
          return (
            <line
              key={`r${i}`}
              x1={x0}
              y1={y0}
              x2={x1}
              y2={y1}
              stroke="var(--muted-foreground)"
              strokeWidth={0.9 * k}
            />
          )
        })}
        {tree.leaves.map(l => {
          const hit = byId.get(l.name)
          const isQuery = l.name === "query"
          const [x, y] = polar(sr(l.r), l.angle)
          const [gx, gy] = polar(R, l.angle)
          const [tx, ty] = polar(R + 6 * k, l.angle)
          const deg = (l.angle * 180) / Math.PI
          // Labels read outward; the left half is flipped to stay upright.
          const left = l.angle > Math.PI
          const rot = left ? deg + 90 : deg - 90
          const active = hover === l.name
          return (
            <g
              key={l.name}
              className={isQuery ? "" : "cursor-pointer"}
              onMouseEnter={e => {
                setHover(l.name)
                showTip(l.name, hit, e)
              }}
              onMouseMove={e => showTip(l.name, hit, e)}
              onMouseLeave={() => {
                setHover(null)
                setTip(null)
              }}
              onClick={() => !isQuery && onOpenRecord(l.name)}
            >
              <line
                x1={x}
                y1={y}
                x2={gx}
                y2={gy}
                stroke="var(--border)"
                strokeWidth={k}
                strokeDasharray={`${k} ${2 * k}`}
              />
              {/* Invisible, larger target than the visible dot. */}
              <circle cx={x} cy={y} r={8 * k} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={(isQuery ? 5 : active ? 4.5 : 3.2) * k}
                fill={
                  isQuery
                    ? "var(--accent)"
                    : ORIGIN_COLOR[hit?.db] || "var(--muted-foreground)"
                }
              />
              <text
                x={tx}
                y={ty}
                dy="0.32em"
                textAnchor={left ? "end" : "start"}
                transform={`rotate(${rot} ${tx} ${ty})`}
                // Neutral by default; with colorLabels, the origin color. The
                // query stays bold red; hover brightens a neutral name.
                style={{
                  fontSize: 8 * k,
                  fill: isQuery
                    ? "var(--accent)"
                    : !colorLabels
                    ? active
                      ? "var(--foreground)"
                      : "var(--secondary-foreground)"
                    : ORIGIN_COLOR[hit?.db] || "var(--muted-foreground)",
                  fillOpacity: 1,
                }}
                className={`font-mono ${isQuery || active ? "font-bold" : ""}`}
              >
                {l.name}
              </text>
            </g>
          )
        })}
      </svg>
      <LeafPreview tip={tip} />
    </div>
  )
}

/* ── Tree focus mode ────────────────────────────────────────────────────── */

const TREE_ZOOMS = [1, 1.5, 2, 3, 4, 6, 8]

const zoomButton =
  "cursor-pointer rounded-md border border-border bg-background px-2.5 py-1 text-sm text-foreground hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"

/**
 * The tree full screen. Zoom with the scroll wheel (toward the cursor), the
 * buttons, or + − 0; pan by dragging or with the scrollbars. Esc closes, unless a record popout is open above it.
 */
function TreeFocus({
  tree,
  byId,
  onOpenRecord,
  onClose,
  lengths,
  setLengths,
  colorLabels,
  setColorLabels,
}) {
  const [zi, setZi] = useState(0)
  const [hover, setHover] = useState(null)
  const [fit, setFit] = useState(640)
  const zoom = TREE_ZOOMS[zi]
  const boxRef = useRef(null)
  const lastZoom = useRef(zoom)
  const drag = useRef(null)
  const anchor = useRef(null)
  const step = useCallback(
    d => setZi(i => Math.max(0, Math.min(TREE_ZOOMS.length - 1, i + d))),
    []
  )

  // At zoom 1 the whole tree fits the box.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () =>
      setFit(Math.max(320, Math.min(box.clientWidth, box.clientHeight) - 8))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  // Keep the point under the cursor (scroll) or the centre (buttons, keys)
  // fixed when the zoom changes.
  useEffect(() => {
    const box = boxRef.current
    const prev = lastZoom.current
    lastZoom.current = zoom
    if (!box || prev === zoom) return
    const a = anchor.current || {
      x: box.clientWidth / 2,
      y: box.clientHeight / 2,
    }
    anchor.current = null
    // A drawing smaller than the box is centred in it; account for that
    // offset before and after, so the anchored point really stays put.
    const before = fit * prev
    const after = fit * zoom
    const off = (client, size) => Math.max(0, (client - size) / 2)
    const fx = (box.scrollLeft + a.x - off(box.clientWidth, before)) / before
    const fy = (box.scrollTop + a.y - off(box.clientHeight, before)) / before
    box.scrollLeft = fx * after + off(box.clientWidth, after) - a.x
    box.scrollTop = fy * after + off(box.clientHeight, after) - a.y
  }, [zoom, fit])

  // Scroll zooms, toward the cursor. Trackpads send many small deltas, so
  // they accumulate to one step per ~100px of scroll. Non-passive, to stop
  // the box from scrolling instead.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    let acc = 0
    const onWheel = e => {
      e.preventDefault()
      acc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY
      if (Math.abs(acc) < 100) return
      const r = box.getBoundingClientRect()
      anchor.current = { x: e.clientX - r.left, y: e.clientY - r.top }
      step(acc < 0 ? 1 : -1)
      acc = 0
    }
    box.addEventListener("wheel", onWheel, { passive: false })
    return () => box.removeEventListener("wheel", onWheel)
  }, [step])

  useEffect(() => {
    const returnFocus = document.activeElement
    boxRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = e => {
      // The record popout sits above; its own Escape closes it first.
      if (
        document.querySelector(
          '[role="dialog"][aria-labelledby="record-title"]'
        )
      )
        return
      if (e.metaKey || e.ctrlKey) return
      if (e.key === "Escape") onClose()
      else if (e.key === "+" || e.key === "=") step(1)
      else if (e.key === "-") step(-1)
      else if (e.key === "0") setZi(0)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
      returnFocus?.focus?.()
    }
  }, [onClose, step])

  // Drag to pan. A press that moves less than a few pixels stays a click,
  // so leaves remain clickable.
  const onPointerDown = e => {
    if (e.button !== 0) return
    const box = boxRef.current
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      left: box.scrollLeft,
      top: box.scrollTop,
      moved: false,
    }
  }
  const onPointerMove = e => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    d.moved = true
    boxRef.current.scrollLeft = d.left - dx
    boxRef.current.scrollTop = d.top - dy
  }
  const endDrag = () => {
    const d = drag.current
    drag.current = null
    // Swallow the click that follows a drag.
    if (d?.moved) {
      const stop = ev => {
        ev.stopPropagation()
        window.removeEventListener("click", stop, true)
      }
      window.addEventListener("click", stop, true)
    }
  }

  const size = fit * zoom
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tree-focus-title"
      className="fixed inset-0 z-50 flex flex-col gap-3 bg-background p-4 md:p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div id="tree-focus-title">
          <SectionTitle
            title="Phylogenetic tree"
            count={`${tree.leaves.length} sequences`}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={colorLabels}
            className={toggle(colorLabels)}
            onClick={() => setColorLabels(v => !v)}
          >
            Color names by origin
          </button>
          <button
            type="button"
            aria-pressed={lengths}
            className={toggle(lengths)}
            onClick={() => setLengths(v => !v)}
          >
            Branch lengths
          </button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            className={zoomButton}
            onClick={() => step(-1)}
            disabled={zi === 0}
            aria-label="Zoom out"
            title="Zoom out (scroll down, or −)"
          >
            −
          </button>
          <button
            type="button"
            className={`${zoomButton} min-w-16 tabular-nums`}
            onClick={() => setZi(0)}
            title="Fit the whole tree (0)"
          >
            {Math.round(zoom * 100)} %
          </button>
          <button
            type="button"
            className={zoomButton}
            onClick={() => step(1)}
            disabled={zi === TREE_ZOOMS.length - 1}
            aria-label="Zoom in"
            title="Zoom in (scroll up, or +)"
          >
            +
          </button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit focus mode"
            className="btn btn-ghost px-2 py-1 text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>
      <OriginLegend />
      <div
        ref={boxRef}
        tabIndex={-1}
        className={`scrollbar-visible min-h-0 flex-1 overflow-auto rounded-md border border-border focus:outline-none ${
          zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center"
          style={{ width: size, height: size }}
        >
          <TreeSvg
            tree={tree}
            byId={byId}
            hover={hover}
            setHover={setHover}
            onOpenRecord={onOpenRecord}
            size={size}
            zoom={zoom}
            colorLabels={colorLabels}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Scroll to zoom · drag to pan · + / − to zoom · 0 to fit · Esc to exit
      </p>
    </div>
  )
}

export function TreePanel({ alignment, hits, onOpenRecord }) {
  const model = useAlignmentModel(alignment)
  const byId = useMemo(() => new Map(hits.map(h => [h.target_id, h])), [hits])
  const [hover, setHover] = useState(null)
  // To scale by default; off aligns every tip on the outer circle.
  const [lengths, setLengths] = useState(true)
  const [focus, setFocus] = useState(false)
  const [colorLabels, setColorLabels] = useState(false)
  const closeFocus = useCallback(() => setFocus(false), [])
  const figureRef = useRef(null)
  // The tree as drawn: current branch-length and label-color settings.
  const downloadSvg = () => {
    const svg = figureRef.current?.querySelector("svg")
    if (!svg) return
    downloadFile(
      standaloneSvg(svg),
      `${fileStem(alignment, "tree")}.svg`,
      "image/svg+xml"
    )
  }
  const downloadNewick = () =>
    downloadFile(
      model.data.newick.trim() + "\n",
      `${fileStem(alignment, "tree")}.nwk`
    )
  const tree = useMemo(
    () =>
      model ? layoutRadial(model.parsed, { branchLengths: lengths }) : null,
    [model, lengths]
  )

  return (
    <section aria-labelledby="tree-title" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div id="tree-title">
          <SectionTitle
            title="Phylogenetic tree"
            count={model ? `${model.tree.leaves.length} sequences` : null}
          />
        </div>
        {model && (
          <button
            type="button"
            aria-pressed={colorLabels}
            className={`ml-auto ${toggle(colorLabels)}`}
            onClick={() => setColorLabels(v => !v)}
            title="Color each leaf name by where the sequence comes from"
          >
            Color names by origin
          </button>
        )}
        {model && (
          <button
            type="button"
            aria-pressed={lengths}
            className={toggle(lengths)}
            onClick={() => setLengths(v => !v)}
            title="Branches drawn to scale. Turn off to align every tip on the outer circle."
          >
            Branch lengths
          </button>
        )}
        {model && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setFocus(true)}
            title="Open the tree full screen, with zoom"
          >
            ⤢ Focus
          </button>
        )}
      </div>
      {model && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-outline"
            onClick={downloadNewick}
            title="The FastTree tree in Newick format, with branch lengths"
          >
            ⬇ Newick
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={downloadSvg}
            title="The tree as drawn, as an SVG figure in light-theme colors"
          >
            ⬇ SVG
          </button>
          <MethodsLink anchor="phylogenetic-tree" className="ml-auto" />
        </div>
      )}
      <AlignmentStatus alignment={alignment} />
      {model && (
        <>
          <OriginLegend />
          <div ref={figureRef}>
            <TreeSvg
              tree={tree}
              byId={byId}
              hover={hover}
              setHover={setHover}
              onOpenRecord={onOpenRecord}
              colorLabels={colorLabels}
            />
          </div>
          {model.data.tree && (
            <p className="text-xs text-muted-foreground">
              {model.data.aligner?.toUpperCase()} alignment · {model.data.tree}
              {lengths
                ? " · branch lengths in substitutions per site"
                : " · tips aligned, branch lengths not to scale"}
            </p>
          )}
          {focus && (
            <TreeFocus
              tree={tree}
              byId={byId}
              onOpenRecord={onOpenRecord}
              onClose={closeFocus}
              lengths={lengths}
              setLengths={setLengths}
              colorLabels={colorLabels}
              setColorLabels={setColorLabels}
            />
          )}
        </>
      )}
    </section>
  )
}

/* ── Multiple alignment ─────────────────────────────────────────────────── */

const ROW = 12
const CHAR = 8
// Coverage depth over every hit, then the position ruler, above row 0.
const DEPTH_H = 30
const HEAD = DEPTH_H + 16
const ID_W = 112

// Keep the canvas backing store under every browser's limit (iOS Safari's is
// about 16.7 M pixels); a larger request silently draws nothing.
const MAX_CANVAS_PIXELS = 16e6

/** Bumps when the page theme (the root element's class) changes. */
function useThemeVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion(v => v + 1))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])
  return version
}

function MsaCanvas({ rows, columns, qPositions, depth, maxDepth }) {
  const ref = useRef(null)
  const theme = useThemeVersion()
  const width = columns.length * CHAR
  const height = HEAD + rows.length * ROW

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height))
    )
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext("2d")
    ctx.scale(dpr, dpr)
    const css = getComputedStyle(document.documentElement)
    const color = name => css.getPropertyValue(name).trim()
    const fills = Object.fromEntries(
      Object.entries(CLASS_VAR).map(([k, v]) => [k, color(v)])
    )
    const fg = color("--foreground")
    const muted = color("--muted-foreground")
    ctx.clearRect(0, 0, width, height)

    // Depth at each column's query position; nothing where the query has a gap.
    ctx.fillStyle = color("--info")
    ctx.globalAlpha = 0.5
    qPositions.forEach((p, i) => {
      if (p == null) return
      const h = (depth[p - 1] / maxDepth) * (DEPTH_H - 4)
      ctx.fillRect(i * CHAR, DEPTH_H - 2 - h, CHAR, h)
    })
    ctx.globalAlpha = 1

    // Ruler, by query position.
    ctx.fillStyle = muted
    ctx.font = "9px ui-monospace, Menlo, monospace"
    ctx.textAlign = "left"
    qPositions.forEach((p, i) => {
      if (p != null && (p === 1 || p % 10 === 0))
        ctx.fillText(String(p), i * CHAR, HEAD - 5)
    })

    ctx.textAlign = "center"
    rows.forEach((r, ri) => {
      const y = HEAD + ri * ROW
      columns.forEach((ci, i) => {
        const c = r.seq[ci]
        if (!c || c === "-") return
        const cls = residueClass(c)
        if (cls) {
          ctx.globalAlpha = 0.55
          ctx.fillStyle = fills[cls]
          ctx.fillRect(i * CHAR, y, CHAR, ROW - 1)
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = fg
        ctx.fillText(c, i * CHAR + CHAR / 2, y + ROW - 3)
      })
    })
  }, [rows, columns, qPositions, depth, maxDepth, width, height, theme])

  return (
    <canvas
      ref={ref}
      style={{ width, height }}
      role="img"
      aria-label={`Multiple sequence alignment: ${rows.length} sequences, ${columns.length} columns`}
    />
  )
}

// Overview: the whole alignment at one pixel per residue, scaled to fit.
const MINI_W = 240
const MINI_MAX_H = 150

/**
 * Picture-in-picture overview of the alignment, floating over the scroll box.
 * A rectangle marks the part on screen; click or drag to move it.
 */
function MsaMinimap({ rows, columns, scrollRef, onHide }) {
  const canvasRef = useRef(null)
  const theme = useThemeVersion()
  const [box, setBox] = useState(null)
  const nCols = columns.length
  const nRows = rows.length
  const scale = Math.min(MINI_W / nCols, MINI_MAX_H / nRows)
  const w = Math.max(1, Math.round(nCols * scale))
  const h = Math.max(1, Math.round(nRows * scale))

  // Residues, one canvas pixel each; CSS scales the canvas up or down.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = nCols
    canvas.height = nRows
    const ctx = canvas.getContext("2d")
    const css = getComputedStyle(document.documentElement)
    ctx.clearRect(0, 0, nCols, nRows)
    const byClass = {}
    rows.forEach((r, y) =>
      columns.forEach((ci, x) => {
        const c = r.seq[ci]
        if (!c || c === "-") return
        const cls = residueClass(c) || "other"
        if (!byClass[cls]) byClass[cls] = []
        byClass[cls].push(x, y)
      })
    )
    for (const [cls, pts] of Object.entries(byClass)) {
      ctx.fillStyle = css
        .getPropertyValue(CLASS_VAR[cls] || "--muted-foreground")
        .trim()
      for (let i = 0; i < pts.length; i += 2)
        ctx.fillRect(pts[i], pts[i + 1], 1, 1)
    }
  }, [rows, columns, nCols, nRows, theme])

  // The visible window, in alignment columns and rows.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const c0 = el.scrollLeft / CHAR
      const c1 = (el.scrollLeft + el.clientWidth - ID_W) / CHAR
      const r0 = (el.scrollTop - HEAD) / ROW
      const r1 = (el.scrollTop + el.clientHeight - HEAD) / ROW
      const clamp = (v, n) => Math.max(0, Math.min(n, v))
      setBox({
        c0: clamp(c0, nCols),
        c1: clamp(c1, nCols),
        r0: clamp(r0, nRows),
        r1: clamp(r1, nRows),
      })
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [scrollRef, nCols, nRows])

  // Center the main view on the pointer's spot in the overview.
  const jump = e => {
    const el = scrollRef.current
    if (!el) return
    const r = e.currentTarget.getBoundingClientRect()
    const col = ((e.clientX - r.left) / r.width) * nCols
    const row = ((e.clientY - r.top) / r.height) * nRows
    el.scrollLeft = col * CHAR - (el.clientWidth - ID_W) / 2
    el.scrollTop = HEAD + row * ROW - el.clientHeight / 2
  }

  return (
    <div className="pointer-events-auto rounded-md border border-border-strong bg-background/90 p-1.5 shadow-lg backdrop-blur-sm">
      <div className="mb-1 flex items-center justify-between font-mono text-[9px] text-muted-foreground">
        <span>Overview</span>
        <span className="flex items-center gap-2">
          {box && (
            <span>
              cols {Math.floor(box.c0) + 1}–{Math.ceil(box.c1)} · rows{" "}
              {Math.floor(box.r0) + 1}–{Math.ceil(box.r1)}
            </span>
          )}
          <button
            type="button"
            onClick={onHide}
            className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-accent bg-accent-subtle text-sm font-bold leading-none text-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Hide overview"
            title="Hide overview"
          >
            ×
          </button>
        </span>
      </div>
      <div
        className="relative cursor-crosshair touch-none select-none"
        style={{ width: w, height: h }}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          jump(e)
        }}
        onPointerMove={e => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) jump(e)
        }}
        role="slider"
        aria-label="Alignment overview: click or drag to move the view"
        aria-valuenow={box ? Math.round(box.c0) : 0}
        aria-valuemin={0}
        aria-valuemax={nCols}
        tabIndex={-1}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full opacity-80"
          style={{ imageRendering: scale >= 1 ? "pixelated" : "auto" }}
        />
        {box && (
          <div
            className="pointer-events-none absolute border-2 border-accent bg-accent/10"
            style={{
              left: (box.c0 / nCols) * w,
              top: (box.r0 / nRows) * h,
              width: Math.max(4, ((box.c1 - box.c0) / nCols) * w),
              height: Math.max(4, ((box.r1 - box.r0) / nRows) * h),
            }}
          />
        )}
      </div>
    </div>
  )
}

function ResidueLegend() {
  const items = [
    ["hydrophobic", "AVLIM"],
    ["aromatic", "FWY"],
    ["polar", "STNQ"],
    ["positive", "KRH"],
    ["negative", "DE"],
    ["special", "GPC"],
  ]
  return (
    <div className="flex flex-wrap gap-3 text-xs text-secondary-foreground">
      {items.map(([cls, letters]) => (
        <span key={cls} className="inline-flex items-center gap-1.5">
          <i
            className="inline-block h-2.5 w-2.5 rounded-xs opacity-70"
            style={{ background: `var(${CLASS_VAR[cls]})` }}
          />
          <span className="font-mono">{letters}</span>
        </span>
      ))}
    </div>
  )
}

export function MsaPanel({ alignment, hits, onOpenRecord }) {
  const model = useAlignmentModel(alignment)
  const [queryOnly, setQueryOnly] = useState(true)
  const [showOverview, setShowOverview] = useState(true)
  const scrollRef = useRef(null)
  // Rows by identity to the query (query first) by default; or the tree's order.
  const [order, setOrder] = useState("identity")
  const byId = useMemo(() => new Map(hits.map(h => [h.target_id, h])), [hits])
  const rows = useMemo(() => {
    if (!model) return null
    if (order === "tree") return model.rows
    const rank = r =>
      r.id === "query" ? Infinity : byId.get(r.id)?.identity ?? -Infinity
    return [...model.rows].sort((a, b) => rank(b) - rank(a))
  }, [model, order, byId])

  const view = useMemo(() => {
    if (!model) return null
    const query = model.rows.find(r => r.id === "query")
    const qlen = query ? query.seq.replace(/-/g, "").length : 0
    const depth = coverageDepth(hits, qlen)
    const all = model.rows[0].seq.length
    const columns = queryOnly
      ? queryColumns(model.rows) || [...Array(all).keys()]
      : [...Array(all).keys()]
    let pos = 0
    const qAt = new Map()
    if (query)
      for (let i = 0; i < query.seq.length; i++)
        if (query.seq[i] !== "-") qAt.set(i, ++pos)
    return {
      columns,
      qPositions: columns.map(i => qAt.get(i) ?? null),
      depth,
      maxDepth: Math.max(1, ...depth),
    }
  }, [model, queryOnly, hits])

  return (
    <section aria-labelledby="msa-title" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div id="msa-title">
          <SectionTitle
            title="Multiple Sequence Alignment"
            count={
              model
                ? `${model.rows.length} sequences · ${view.columns.length} columns`
                : null
            }
          />
        </div>
        {model && (
          <button
            type="button"
            aria-pressed={queryOnly}
            className={`ml-auto ${toggle(queryOnly)}`}
            onClick={() => setQueryOnly(q => !q)}
            title="Show only the alignment columns where the query has a residue"
          >
            Query columns only
          </button>
        )}
      </div>
      {model && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-secondary-foreground">
            <span className="mr-1">Order</span>
            {[
              ["identity", "Identity to query"],
              ["tree", "Tree"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={order === key}
                className={toggle(order === key)}
                onClick={() => setOrder(key)}
              >
                {label}
              </button>
            ))}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              downloadFile(
                model.data.afa.trim() + "\n",
                `${fileStem(alignment, "msa")}.afa`
              )
            }
            title="The whole FAMSA alignment as aligned FASTA, every column, rows in alignment order"
          >
            ⬇ Aligned FASTA
          </button>
          <button
            type="button"
            aria-pressed={showOverview}
            className={toggle(showOverview)}
            onClick={() => setShowOverview(v => !v)}
            title="A small map of the whole alignment that shows where you are"
          >
            Overview
          </button>
          <MethodsLink anchor="multiple-alignment" className="ml-auto" />
        </div>
      )}
      {model && (
        <p className="text-xs text-muted-foreground">
          {order === "identity"
            ? "The query is first, then hits from highest to lowest percent identity to the query (DIAMOND's identity over each hit's own alignment, not over this MSA). Ties keep tree order."
            : "Rows follow the tree's leaf order, top to bottom."}
        </p>
      )}
      <AlignmentStatus alignment={alignment} />
      {model && view && (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <OriginLegend />
            <ResidueLegend />
          </div>
          {/* One box scrolls both ways, so both scrollbars sit on its
              visible edges; the id column stays pinned on the left. The
              overview floats over its bottom-right corner. */}
          <div className="relative">
            <div
              ref={scrollRef}
              className="scrollbar-visible max-h-[75vh] overflow-auto rounded-md border border-border bg-background"
            >
              <div className="flex w-max">
                <div
                  className="sticky left-0 z-10 shrink-0 border-r border-border bg-background"
                  style={{ width: ID_W }}
                >
                  <div
                    className="flex flex-col px-2 pt-1 font-mono text-[9px] leading-tight text-muted-foreground"
                    style={{ height: HEAD }}
                    title={`Hits covering each query position, over all ${hits.length} hits (not just the rows shown)`}
                  >
                    <span>Depth, {hits.length} hits</span>
                    <span>max {view.maxDepth}</span>
                  </div>
                  {rows.map(r => {
                    const isQuery = r.id === "query"
                    const hit = byId.get(r.id)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={isQuery}
                        onClick={() => onOpenRecord(r.id)}
                        className={`flex w-full items-center gap-1.5 px-2 text-left font-mono text-[9px] ${
                          isQuery
                            ? "font-bold text-accent"
                            : "cursor-pointer text-secondary-foreground hover:text-foreground"
                        }`}
                        style={{ height: ROW, lineHeight: `${ROW}px` }}
                        title={isQuery ? "Your query" : `Open ${r.id}`}
                      >
                        <i
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            background: isQuery
                              ? "var(--accent)"
                              : ORIGIN_COLOR[hit?.db] ||
                                "var(--muted-foreground)",
                          }}
                        />
                        {r.id}
                      </button>
                    )
                  })}
                </div>
                <div>
                  <MsaCanvas
                    rows={rows}
                    columns={view.columns}
                    qPositions={view.qPositions}
                    depth={view.depth}
                    maxDepth={view.maxDepth}
                  />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute right-5 bottom-5 z-20">
              {showOverview ? (
                <MsaMinimap
                  rows={rows}
                  columns={view.columns}
                  scrollRef={scrollRef}
                  onHide={() => setShowOverview(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOverview(true)}
                  className="pointer-events-auto cursor-pointer rounded-md border border-border-strong bg-background/90 px-2 py-1 font-mono text-[10px] text-secondary-foreground shadow-lg backdrop-blur-sm hover:text-foreground"
                  title="Show the overview of the whole alignment"
                >
                  ▣ Overview
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
