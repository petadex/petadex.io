/**
 * Query-param-driven focus filtering for the Family Atlas.
 *
 * Ported from frontend/src/utils/atlasFocus.js. `?component=` and `?cath=`
 * narrow the visible point set to one structural component or every
 * component under one CATH domain — used when the atlas is linked to from a
 * component or CATH domain page.
 */

import { CATH_GROUPS, COMPONENT_TO_CATH } from "./cathColors"

export interface AtlasFocusPoint {
  component?: number | null
  cath_domain?: string | null
}

export interface AtlasFocusQuery {
  focusComponent: number | null
  focusCathDomain: string | null
}

export function parseAtlasQuery(
  search: URLSearchParams | string | null | undefined
): AtlasFocusQuery {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search ?? "")
  const componentRaw = params.get("component")
  const cathRaw = params.get("cath")
  const parsed =
    componentRaw != null && componentRaw !== ""
      ? parseInt(componentRaw, 10)
      : NaN
  const focusComponent = Number.isFinite(parsed) ? parsed : null
  const focusCathDomain =
    cathRaw != null && cathRaw !== ""
      ? decodeURIComponent(cathRaw.trim())
      : null
  return { focusComponent, focusCathDomain }
}

/** Visible component keys, or null when no focus is active. */
export function resolveVisibleComponents<P extends AtlasFocusPoint>(
  points: readonly P[],
  focusComponent: number | null,
  focusCathDomain: string | null
): Set<string> | null {
  if (focusComponent != null) {
    return new Set([String(focusComponent)])
  }
  if (!focusCathDomain) return null

  const visible = new Set<string>()
  for (const p of points) {
    if (p.component == null) continue
    const cath = p.cath_domain || COMPONENT_TO_CATH[p.component]
    if (cath === focusCathDomain) visible.add(String(p.component))
  }

  if (visible.size === 0 && CATH_GROUPS[focusCathDomain]) {
    for (const comp of CATH_GROUPS[focusCathDomain]) {
      visible.add(String(comp))
    }
  }

  return visible.size ? visible : null
}

export function hiddenForFocus<P extends AtlasFocusPoint>(
  points: readonly P[],
  visibleComponents: Set<string>
): Set<string> {
  const allKeys = new Set<string>()
  for (const p of points) {
    if (p.component != null) allKeys.add(String(p.component))
  }
  const hidden = new Set<string>()
  for (const key of allKeys) {
    if (!visibleComponents.has(key)) hidden.add(key)
  }
  hidden.add("Unassigned")
  return hidden
}

/** Minimal shape of a deck.gl `Deck` instance — avoids a static deck.gl import here. */
export interface DeckLike {
  setProps: (props: Record<string, unknown>) => void
}

export function fitDeckToPoints(
  points: readonly { umap_x: number; umap_y: number }[],
  deckRef: React.RefObject<DeckLike | null>,
  containerRef: React.RefObject<HTMLElement | null>
): void {
  if (!points.length || !deckRef.current || !containerRef.current) return

  const xs = points.map(p => p.umap_x)
  const ys = points.map(p => p.umap_y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const xRange = Math.max(maxX - minX, 1e-6)
  const yRange = Math.max(maxY - minY, 1e-6)

  const w = containerRef.current.clientWidth * 0.85
  const h = containerRef.current.clientHeight * 0.85
  const zoom = Math.log2(Math.min(w / xRange, h / yRange))

  deckRef.current.setProps({
    initialViewState: { target: [cx, cy, 0], zoom, transitionDuration: 800 },
  })
}

export function filterPointsByComponents<P extends AtlasFocusPoint>(
  points: readonly P[],
  visibleComponents: Set<string>
): P[] {
  return points.filter(
    p => p.component != null && visibleComponents.has(String(p.component))
  )
}
