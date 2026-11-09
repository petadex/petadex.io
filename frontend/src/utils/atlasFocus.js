import { CATH_GROUPS, COMPONENT_TO_CATH } from "./cathColors"

/**
 * `component` is a legacy integer (family atlas, e.g. 8) or a v260701 label (superfamily
 * atlas, e.g. C001 or C001-2).
 * @param {string|undefined} search
 * @returns {{ focusComponent: number|string|null, focusCathDomain: string|null }}
 */
export function parseAtlasQuery(search) {
  const params = new URLSearchParams(search || "")
  const componentRaw = (params.get("component") || "").trim()
  const cathRaw = params.get("cath")
  let focusComponent = null
  if (/^\d+$/.test(componentRaw)) focusComponent = parseInt(componentRaw, 10)
  else if (/^C\d{3}(-\d+)?$/i.test(componentRaw)) focusComponent = componentRaw.toUpperCase()
  const focusCathDomain =
    cathRaw != null && cathRaw !== "" ? decodeURIComponent(cathRaw.trim()) : null
  return { focusComponent, focusCathDomain }
}

/**
 * @param {{ component?: number|null, cath_domain?: string|null }[]} points
 * @param {number|string|null} focusComponent
 * @param {string|null} focusCathDomain
 * @returns {Set<string>|null} visible component keys, or null when no focus
 */
export function resolveVisibleComponents(points, focusComponent, focusCathDomain) {
  if (focusComponent != null) {
    const key = String(focusComponent)
    // a bare v260701 label (C014) also covers its subcomponents (C014-1, C014-2, ...);
    // some components exist only as subcomponents
    if (/^C\d{3}$/.test(key)) {
      const visible = new Set()
      for (const p of points) {
        const c = p.component == null ? null : String(p.component)
        if (c === key || c?.startsWith(`${key}-`)) visible.add(c)
      }
      if (visible.size) return visible
    }
    return new Set([key])
  }
  if (!focusCathDomain) return null

  const visible = new Set()
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

/**
 * @param {{ component?: number|null }[]} points
 * @param {Set<string>} visibleComponents
 * @returns {Set<string>}
 */
export function hiddenForFocus(points, visibleComponents) {
  const allKeys = new Set()
  for (const p of points) {
    if (p.component != null) allKeys.add(String(p.component))
  }
  const hidden = new Set()
  for (const key of allKeys) {
    if (!visibleComponents.has(key)) hidden.add(key)
  }
  hidden.add("Unassigned")
  return hidden
}

/**
 * @param {{ umap_x: number, umap_y: number }[]} points
 * @param {object} deckRef
 * @param {object} containerRef
 */
export function fitDeckToPoints(points, deckRef, containerRef, { duration = 800, easing } = {}) {
  if (!points.length || !deckRef?.current || !containerRef?.current) return

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
    initialViewState: {
      target: [cx, cy, 0],
      zoom,
      transitionDuration: duration,
      ...(easing ? { transitionEasing: easing } : {}),
      _ts: Date.now(),
    },
  })
}

/**
 * @param {{ component?: number|null }[]} points
 * @param {Set<string>} visibleComponents
 * @returns {{ umap_x: number, umap_y: number }[]}
 */
export function filterPointsByComponents(points, visibleComponents) {
  return points.filter(
    p => p.component != null && visibleComponents.has(String(p.component)),
  )
}
