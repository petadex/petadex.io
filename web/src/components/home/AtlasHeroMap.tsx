"use client"

/**
 * Decorative interactive UMAP canvas behind the homepage hero title.
 *
 * Ported from frontend/src/components/AtlasMap.jsx — a lightweight canvas
 * renderer distinct from components/atlas/AtlasMap.tsx (the deck.gl-based
 * `/atlas` page). This one has no color-by controls or legend UI of its own;
 * it just draws points and lets the page compose chrome (vignette, legend
 * chips) around it, and falls back to a seeded synthetic point cloud shaped
 * like the real embedding when the S3 export is unreachable — the hero must
 * never show an empty canvas.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { env } from "@/lib/env"
import { cathDomainPathForComponent } from "@/lib/cathDomainLookup"
import type { AtlasPoint, AtlasResponse } from "@/lib/api"

interface FallbackCluster {
  label: string
  color: string
  cx: number
  cy: number
  sx: number
  sy: number
  n: number
}

const FALLBACK_CLUSTERS: readonly FallbackCluster[] = [
  { label: "α/β Hydrolase", color: "#4F8FE8", cx: 0.3, cy: 0.05, sx: 0.18, sy: 0.16, n: 720 },
  { label: "α/β Hydrolase", color: "#4F8FE8", cx: -0.18, cy: -0.02, sx: 0.07, sy: 0.07, n: 110 },
  { label: "DD-peptidase", color: "#2ECC71", cx: -0.3, cy: 0.5, sx: 0.08, sy: 0.07, n: 240 },
  { label: "Amidase", color: "#E74C4C", cx: 0.34, cy: 0.55, sx: 0.07, sy: 0.07, n: 220 },
  { label: "Trypsin-like", color: "#9B5BE0", cx: -0.42, cy: -0.05, sx: 0.05, sy: 0.06, n: 95 },
  { label: "Arylesterase", color: "#F2C94C", cx: 0.04, cy: 0.42, sx: 0.05, sy: 0.04, n: 70 },
  { label: "Arylesterase", color: "#F2C94C", cx: -0.05, cy: -0.3, sx: 0.04, sy: 0.04, n: 60 },
  { label: "Cupredoxin", color: "#F2994A", cx: 0.02, cy: 0.05, sx: 0.025, sy: 0.025, n: 40 },
  { label: "L-amino peptidase", color: "#6FB7E8", cx: 0.42, cy: 0.42, sx: 0.05, sy: 0.04, n: 80 },
  { label: "Other", color: "#EC4899", cx: -0.1, cy: 0.35, sx: 0.02, sy: 0.02, n: 18 },
  { label: "Other", color: "#14B8A6", cx: 0.4, cy: -0.3, sx: 0.02, sy: 0.02, n: 12 },
]

const COMPONENT_COLORS: Readonly<Record<number, string>> = {
  0: "#4F8FE8",
  1: "#2ECC71",
  2: "#E74C4C",
  3: "#9B5BE0",
  4: "#F2C94C",
  5: "#F2994A",
  6: "#6FB7E8",
  7: "#EC4899",
  8: "#14B8A6",
  9: "#F97316",
}

interface HeroPoint {
  x: number
  y: number
  color: string
  label: string
  size: number
  familyId?: number
  component?: number | null
  cathDomain?: string | null
  familySize?: number | null
}

function seededRng(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededGaussian(rand: () => number): number {
  let u = 0
  let v = 0
  while (!u) u = rand()
  while (!v) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function generateFallbackPoints(): HeroPoint[] {
  const rand = seededRng(42)
  const pts: HeroPoint[] = []
  for (const c of FALLBACK_CLUSTERS) {
    for (let i = 0; i < c.n; i++) {
      const gx = seededGaussian(rand) * c.sx
      const gy = seededGaussian(rand) * c.sy
      pts.push({
        x: c.cx + gx,
        y: c.cy + gy,
        color: c.color,
        label: c.label,
        size: 1 + Math.floor(Math.pow(rand(), 3) * 24),
      })
    }
  }
  return pts
}

function normalizeApiPoints(apiPoints: AtlasPoint[] | null): HeroPoint[] | null {
  if (!apiPoints?.length) return null
  const xs = apiPoints.map(p => p.umap_x)
  const ys = apiPoints.map(p => p.umap_y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  return apiPoints.map(p => ({
    x: ((p.umap_x - minX) / rangeX - 0.5) * 0.9,
    y: ((p.umap_y - minY) / rangeY - 0.5) * 0.9,
    color:
      p.component != null
        ? COMPONENT_COLORS[p.component % 10] || "#64748b"
        : "#64748b",
    label: p.domain_name || (p.component != null ? `Component ${p.component}` : "Unassigned"),
    size: Math.max(1, Math.min(25, p.family_size || 1)),
    familyId: p.family_id,
    component: p.component,
    cathDomain: p.cath_domain,
    familySize: p.family_size,
  }))
}

interface CanvasSize {
  w: number
  h: number
  dpr: number
}

interface Camera {
  zoom: number
  cx: number
  cy: number
}

interface DragState {
  x: number
  y: number
  cx: number
  cy: number
  moved: boolean
}

interface PinchState {
  dist: number
  startZoom: number
}

interface HoverState {
  px: number
  py: number
  point: HeroPoint
}

export interface AtlasHeroMapProps {
  interactive?: boolean
  className?: string
}

/**
 * Default camera, nudged left on a narrow viewport so clusters sit better in
 * the shorter, narrower mobile canvas. Computed once at mount rather than in
 * an effect so there's no post-mount camera jump.
 */
function computeInitialCam(): Camera {
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return { zoom: 1.0, cx: 0, cy: -0.03 }
  }
  return { zoom: 1.0, cx: -0.2, cy: 0.05 }
}

export function AtlasHeroMap({ interactive = true, className = "" }: AtlasHeroMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<CanvasSize>({ w: 1000, h: 600, dpr: 1 })
  const [hover, setHover] = useState<HoverState | null>(null)
  const [cam, setCam] = useState<Camera>(computeInitialCam)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  const camRef = useRef<Camera>(cam)
  const pinchRef = useRef<PinchState | null>(null)
  const [apiPoints, setApiPoints] = useState<AtlasPoint[] | null>(null)

  const points = useMemo(
    () => normalizeApiPoints(apiPoints) ?? generateFallbackPoints(),
    [apiPoints]
  )

  // Fetch real atlas data — silently falls back to the synthetic cloud above.
  useEffect(() => {
    fetch(env.atlasDataUrl)
      .then(r => (r.ok ? (r.json() as Promise<AtlasResponse>) : null))
      .then(data => {
        if (data?.points?.length) setApiPoints(data.points)
      })
      .catch(() => {})
  }, [])

  // Resize observer
  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      setSize({
        w: Math.max(200, Math.floor(width)),
        h: Math.max(200, Math.floor(height)),
        dpr,
      })
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const project = useCallback(
    (x: number, y: number): [number, number] => {
      const { w, h } = size
      const scale = Math.min(w, h) * 0.9 * cam.zoom
      return [w / 2 + (x - cam.cx) * scale, h / 2 + (y - cam.cy) * scale]
    },
    [size, cam]
  )

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !points) return
    const { w, h, dpr } = size
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = w + "px"
    canvas.style.height = h + "px"
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = "#0e0e0e"
    ctx.fillRect(0, 0, w, h)

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)"
    ctx.lineWidth = 1
    for (let gx = 0; gx < w; gx += 40) {
      ctx.beginPath()
      ctx.moveTo(gx, 0)
      ctx.lineTo(gx, h)
      ctx.stroke()
    }
    for (let gy = 0; gy < h; gy += 40) {
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
      ctx.stroke()
    }

    // Points — screen blend with low alpha to glow without blowing out
    ctx.globalCompositeOperation = "screen"
    for (const p of points) {
      const [px, py] = project(p.x, p.y)
      if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue
      const r = (1.4 + Math.log2(p.size + 1) * 0.45) * Math.min(2, cam.zoom)
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.min(0.35, (0.04 + p.size * 0.003) * Math.min(cam.zoom, 3))
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = "source-over"
    ctx.globalAlpha = 1

    // Hover ring
    if (hover) {
      const [px, py] = project(hover.point.x, hover.point.y)
      const r = (1.4 + Math.log2(hover.point.size + 1) * 0.45) * Math.min(2, cam.zoom)
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(px, py, r + 4, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [size, points, project, cam, hover])

  // Interaction handlers
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return
    // Don't capture touch pointers — lets single-finger vertical swipes scroll the page natively
    if (e.pointerType !== "touch") e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, cx: cam.cx, cy: cam.cy, moved: false }
    setIsDragging(true)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top

    const drag = dragRef.current
    if (drag) {
      drag.moved = true
      const { w, h } = size
      const scale = Math.min(w, h) * 0.9 * cam.zoom
      const dx = (e.clientX - drag.x) / scale
      const dy = (e.clientY - drag.y) / scale
      setCam(c => ({ ...c, cx: drag.cx - dx, cy: drag.cy - dy }))
      return
    }

    // No hover tooltip on touch — there's no finger-hover on mobile
    if (e.pointerType === "touch") return

    if (!points) return
    let best: HeroPoint | null = null
    let bestD = 64
    for (const p of points) {
      const [px, py] = project(p.x, p.y)
      const d = (px - localX) ** 2 + (py - localY) ** 2
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    setHover(best ? { px: localX, py: localY, point: best } : null)
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (e.pointerType !== "touch") e.currentTarget.releasePointerCapture?.(e.pointerId)
    dragRef.current = null
    setIsDragging(false)

    // Tap (no drag) — navigate to family page
    if (drag && !drag.moved && hover?.point?.familyId != null) {
      window.open(`/family/${hover.point.familyId}`, "_blank", "noopener,noreferrer")
    }
  }

  // Keep camRef in sync so touch handlers can read the latest zoom without stale closures
  useEffect(() => {
    camRef.current = cam
  }, [cam])

  // Wheel zoom
  useEffect(() => {
    const el = canvasRef.current
    if (!el || !interactive) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * 0.0015)
      setCam(c => ({ ...c, zoom: Math.min(8, Math.max(0.5, c.zoom * factor)) }))
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
  })

  // Pinch-to-zoom (touch)
  useEffect(() => {
    const el = canvasRef.current
    if (!el || !interactive) return
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinchRef.current = { dist: Math.hypot(dx, dy), startZoom: camRef.current.zoom }
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current) return
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const scale = Math.hypot(dx, dy) / pinchRef.current.dist
      const startZoom = pinchRef.current.startZoom
      setCam(c => ({ ...c, zoom: Math.min(8, Math.max(0.5, startZoom * scale)) }))
    }
    const onTouchEnd = () => {
      pinchRef.current = null
    }
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [interactive])

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-pan-y select-none"
        style={{
          cursor: interactive
            ? isDragging
              ? "grabbing"
              : hover?.point?.familyId != null
                ? "pointer"
                : "grab"
            : "default",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setHover(null)
          dragRef.current = null
          setIsDragging(false)
        }}
      />
      {hover && (
        <div
          className="text-2xs border-border pointer-events-none absolute z-20 rounded-md border px-2.5 py-1.5 font-mono shadow-lg"
          style={{
            left: Math.min(hover.px + 12, size.w - 220),
            top: Math.min(hover.py + 12, size.h - 120),
            background: "rgba(10,10,10,0.95)",
            color: "var(--foreground)",
            minWidth: 180,
            maxWidth: 280,
          }}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: hover.point.color }}
              />
              <span className="text-foreground">{hover.point.label}</span>
            </div>
            {hover.point.cathDomain != null && String(hover.point.cathDomain).trim() !== "" && (
              <div className="text-muted-foreground mt-0.5">
                CATH: {hover.point.cathDomain}
              </div>
            )}
            {hover.point.component != null && (
              <div className="text-muted-foreground mt-0.5">
                Component: {hover.point.component}
              </div>
            )}
            <div className="text-muted-foreground mt-0.5">
              Family size:{" "}
              {hover.point.familySize != null
                ? Number(hover.point.familySize).toLocaleString()
                : "—"}
            </div>
          </div>
          <div className="border-border/60 pointer-events-auto mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2">
            {hover.point.component != null && (
              <a
                href={cathDomainPathForComponent(hover.point.component)}
                className="text-accent hover:text-accent-hover underline underline-offset-2"
              >
                CATH domain page
              </a>
            )}
            {hover.point.familyId != null && (
              <a
                href={`/family/${hover.point.familyId}`}
                className="text-accent hover:text-accent-hover underline underline-offset-2"
              >
                Family page
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
