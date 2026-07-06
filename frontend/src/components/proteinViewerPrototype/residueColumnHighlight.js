/** @param {boolean} light */
export function residueColumnHighlightColor(light) {
  return light
    ? "oklch(0.55 0.14 250 / 0.32)"
    : "oklch(0.72 0.12 250 / 0.38)"
}

/** @param {number} position 1-based residue index */
export function highlightRegionForPosition(position) {
  const p = Math.round(position)
  if (!Number.isFinite(p) || p < 1) return ""
  return `${p}:${p}`
}

/**
 * @param {Record<string, unknown> | null | undefined} feature
 * @returns {number | null}
 */
export function residuePositionFromNightingaleFeature(feature) {
  if (!feature || typeof feature !== "object") return null
  if (typeof feature.position === "number" && Number.isFinite(feature.position)) {
    return Math.round(feature.position)
  }
  return null
}

/**
 * @param {HTMLElement} seqHost
 * @param {number} clientX
 * @param {{ lo: number, hi: number }} viewport
 */
function positionFromNightingaleSequenceLetters(seqHost, clientX, viewport) {
  const letters = seqHost.shadowRoot?.querySelectorAll("g.sequence text.base")
  if (!letters?.length) return null

  let best = /** @type {Element | null} */ (null)
  let bestD = Infinity
  letters.forEach(el => {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const d = Math.abs(clientX - cx)
    if (d < bestD) {
      bestD = d
      best = el
    }
  })
  const ftWidth =
    letters.length > 1
      ? Math.abs(
          letters[1].getBoundingClientRect().left -
            letters[0].getBoundingClientRect().left,
        )
      : letters[0]?.getBoundingClientRect().width || 12
  if (best && bestD <= Math.max(14, ftWidth * 0.85)) {
    const nodes = [...letters]
    const idx = nodes.indexOf(best)
    if (idx >= 0) return viewport.lo + idx
  }
  return null
}

/**
 * Map viewport X to sequence position using nightingale-sequence scale.
 * @param {HTMLElement | null | undefined} seqHost
 * @param {number} clientX
 * @param {{ lo: number, hi: number } | null} [viewport]
 * @param {number} [clientY]
 */
export function clientXToNightingalePosition(
  seqHost,
  clientX,
  viewport,
  clientY,
) {
  if (!seqHost?.shadowRoot) return null

  const ds = Math.round(Number(seqHost["display-start"]) || 1)
  const de = Math.round(
    Number(seqHost["display-end"]) || Number(seqHost.length) || ds,
  )
  const vp = viewport ?? { lo: ds, hi: de }

  const seqG = seqHost.shadowRoot.querySelector("g.sequence")
  if (seqG && clientY != null) {
    const sr = seqG.getBoundingClientRect()
    const pad = 6
    if (clientY >= sr.top - pad && clientY <= sr.bottom + pad) {
      const onLetter = positionFromNightingaleSequenceLetters(
        seqHost,
        clientX,
        vp,
      )
      if (onLetter != null) return onLetter
    }
  }

  const svg = seqHost.shadowRoot.querySelector("svg")
  if (!svg || typeof seqHost.getSeqPositionFromX !== "function") return null

  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = 0
  const ctm = svg.getScreenCTM()
  if (!ctm) return null

  const local = pt.matrixTransform(ctm.inverse())
  const raw = seqHost.getSeqPositionFromX(local.x)
  if (!Number.isFinite(raw)) return null

  const p = Math.round(raw)
  if (p < ds || p > de) return null
  return p
}

/**
 * Column band in coordinates relative to `anchorEl` (plot scale or letter box).
 * @param {HTMLElement | null | undefined} seqHost
 * @param {number} position 1-based residue index
 * @param {HTMLElement} anchorEl
 * @returns {{ left: number, top: number, width: number, height: number } | null}
 */
export function nightingaleColumnBounds(seqHost, position, anchorEl) {
  if (!seqHost?.shadowRoot || !anchorEl) return null
  const p = Math.round(position)
  if (!Number.isFinite(p) || p < 1) return null

  const anchorRect = anchorEl.getBoundingClientRect()
  const ds = Math.max(1, Math.round(Number(seqHost["display-start"]) || 1))
  const letters = seqHost.shadowRoot.querySelectorAll("g.sequence text.base")
  const idx = p - ds
  if (idx >= 0 && idx < letters.length) {
    const letter = letters[idx]
    if (letter instanceof SVGGraphicsElement) {
      const r = letter.getBoundingClientRect()
      if (r.width > 0 || r.height > 0) {
        return {
          left: r.left - anchorRect.left - 1,
          top: r.top - anchorRect.top,
          width: Math.max(6, r.width + 2),
          height: r.height,
        }
      }
    }
  }

  const svg = seqHost.shadowRoot.querySelector("svg")
  if (!svg || typeof seqHost.getXFromSeqPosition !== "function") return null

  const xLocal = seqHost.getXFromSeqPosition(p)
  const baseW =
    typeof seqHost.getSingleBaseWidth === "function"
      ? seqHost.getSingleBaseWidth()
      : 12
  const pt1 = svg.createSVGPoint()
  pt1.x = xLocal
  pt1.y = 0
  const pt2 = svg.createSVGPoint()
  pt2.x = xLocal + baseW
  pt2.y = 0
  const ctm = svg.getScreenCTM()
  if (!ctm) return null

  const p1 = pt1.matrixTransform(ctm)
  const p2 = pt2.matrixTransform(ctm)
  const seqG = seqHost.shadowRoot.querySelector("g.sequence")
  const bandRect = seqG?.getBoundingClientRect() ?? svg.getBoundingClientRect()

  return {
    left: p1.x - anchorRect.left - 1,
    top: bandRect.top - anchorRect.top,
    width: Math.max(4, p2.x - p1.x + 2),
    height: bandRect.height,
  }
}

/**
 * Viewport coordinates for the position callout (center X, top Y above the column).
 * @param {HTMLElement | null | undefined} seqHost
 * @param {number} position 1-based residue index
 * @returns {{ x: number, y: number } | null}
 */
export function nightingaleResidueLabelScreenPoint(seqHost, position) {
  if (!seqHost?.shadowRoot) return null
  const p = Math.round(position)
  if (!Number.isFinite(p) || p < 1) return null

  const ds = Math.max(1, Math.round(Number(seqHost["display-start"]) || 1))
  const letters = seqHost.shadowRoot.querySelectorAll("g.sequence text.base")
  const idx = p - ds
  if (idx >= 0 && idx < letters.length) {
    const letter = letters[idx]
    if (letter instanceof SVGGraphicsElement) {
      const letterRect = letter.getBoundingClientRect()
      if (letterRect.width > 0 || letterRect.height > 0) {
        return {
          x: letterRect.left + letterRect.width / 2,
          y: letterRect.top,
        }
      }
    }
  }

  const svg = seqHost.shadowRoot.querySelector("svg")
  if (!svg || typeof seqHost.getXFromSeqPosition !== "function") return null

  const xLocal = seqHost.getXFromSeqPosition(p)
  const baseW =
    typeof seqHost.getSingleBaseWidth === "function"
      ? seqHost.getSingleBaseWidth()
      : 12
  const pt = svg.createSVGPoint()
  pt.x = xLocal + baseW / 2
  pt.y = 0
  const ctm = svg.getScreenCTM()
  if (!ctm) return null

  const screen = pt.matrixTransform(ctm)
  const seqG = seqHost.shadowRoot.querySelector("g.sequence")
  const bandRect = seqG?.getBoundingClientRect() ?? svg.getBoundingClientRect()
  return { x: screen.x, y: bandRect.top }
}

/**
 * Linear map across the visible sequence band when letters / CTM are unavailable.
 * @param {HTMLElement} seqHost
 * @param {number} position 1-based
 * @returns {{ x: number, y: number } | null}
 */
function nightingaleResidueLabelBandFallback(seqHost, position) {
  const p = Math.round(position)
  if (!Number.isFinite(p) || p < 1) return null

  const ds = Math.max(1, Math.round(Number(seqHost["display-start"]) || 1))
  const de = Math.round(
    Number(seqHost["display-end"]) || Number(seqHost.length) || ds,
  )
  const root = seqHost.shadowRoot
  const seqG = root?.querySelector("g.sequence")
  const band =
    seqG?.getBoundingClientRect() ?? seqHost.getBoundingClientRect()
  if (!band.width) return null

  const span = Math.max(1, de - ds)
  const t = Math.max(0, Math.min(1, (p - ds) / span))
  return {
    x: band.left + t * band.width,
    y: band.top,
  }
}

/**
 * @param {HTMLElement | null | undefined} seqHost
 * @param {number | null} position
 * @param {string | undefined} sequence
 * @param {number} [clientX]
 * @param {number} [clientY]
 * @returns {{ text: string, left: number, top: number } | null}
 */
export function buildNightingaleResidueLabel(
  seqHost,
  position,
  sequence,
  clientX,
  clientY,
) {
  if (position == null || !Number.isFinite(position) || position < 1) {
    return null
  }

  const text = residueHighlightLabel(position, sequence)
  if (!text) return null

  let screen = seqHost
    ? nightingaleResidueLabelScreenPoint(seqHost, position)
    : null
  if (!screen && seqHost) {
    screen = nightingaleResidueLabelBandFallback(seqHost, position)
  }
  if (!screen && clientX != null && clientY != null) {
    const seqG = seqHost?.shadowRoot?.querySelector("g.sequence")
    const bandTop = seqG?.getBoundingClientRect().top
    screen = {
      x: clientX,
      y: bandTop != null && Number.isFinite(bandTop) ? bandTop : clientY,
    }
  }
  if (!screen) return null

  return { text, left: screen.x, top: screen.y }
}

/**
 * Center of a visible sequence letter in coordinates relative to `anchorEl`.
 * @param {HTMLElement | null | undefined} seqHost
 * @param {number} position 1-based residue index
 * @param {HTMLElement} anchorEl positioned container (e.g. `.nightingale-chrome`)
 * @returns {{ left: number, top: number } | null}
 */
export function nightingaleResidueLabelAnchor(seqHost, position, anchorEl) {
  const pt = nightingaleResidueLabelScreenPoint(seqHost, position)
  if (!pt || !anchorEl) return null
  const anchorRect = anchorEl.getBoundingClientRect()
  return { left: pt.x - anchorRect.left, top: pt.y - anchorRect.top }
}

/**
 * @param {number} position 1-based
 * @param {string | undefined} sequence full protein sequence
 */
export function residueHighlightLabel(position, sequence) {
  const p = Math.round(position)
  if (!Number.isFinite(p) || p < 1) return ""
  const aa = sequence?.[p - 1]
  return aa ? `${p} · ${aa}` : String(p)
}

/** @deprecated use {@link residueHighlightLabel} */
export const nightingaleResidueHighlightLabel = residueHighlightLabel

const FV_HIGHLIGHT_CLASS = "fv-residue-column-highlight"
const FV_SELECTION_CLASS = "fv-residue-selection-highlight"
const FV_SELECTION_LAYER_CLASS = "fv-residue-selection-layer"
const FV_LABEL_CLASS = "fv-residue-position-label"
const NG_LABEL_CLASS = "nightingale-residue-position-label"

/** @param {boolean} light */
export function residueSelectionHighlightColor(light) {
  return light
    ? "oklch(0.55 0.12 165 / 0.38)"
    : "oklch(0.68 0.1 165 / 0.42)"
}

/** @returns {HTMLElement | null} */
function ensureNgLabelEl() {
  if (typeof document === "undefined") return null
  let el = document.body.querySelector(`.${NG_LABEL_CLASS}`)
  if (!el) {
    el = document.createElement("div")
    el.className = NG_LABEL_CLASS
    el.setAttribute("aria-hidden", "true")
    el.style.pointerEvents = "none"
    document.body.appendChild(el)
  }
  return /** @type {HTMLElement} */ (el)
}

/** @param {HTMLElement} el */
function paintNgLabelShell(el) {
  const light =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("light")
  el.style.position = "fixed"
  el.style.zIndex = "9999"
  el.style.transform = "translate(-50%, calc(-100% - 6px))"
  el.style.padding = "2px 6px"
  el.style.borderRadius = "4px"
  el.style.fontSize = "10px"
  el.style.fontWeight = "600"
  el.style.fontVariantNumeric = "tabular-nums"
  el.style.lineHeight = "1.2"
  el.style.whiteSpace = "nowrap"
  el.style.pointerEvents = "none"
  el.style.color = "oklch(0.98 0 0)"
  if (light) {
    el.style.background = "oklch(0.42 0.12 250)"
    el.style.border = "1px solid oklch(0.38 0.1 250 / 0.5)"
    el.style.boxShadow = "0 1px 4px oklch(0 0 0 / 0.12)"
  } else {
    el.style.background = "oklch(0.32 0.1 250)"
    el.style.border = "1px solid oklch(0.55 0.12 250 / 0.65)"
    el.style.boxShadow = "0 1px 6px oklch(0 0 0 / 0.35)"
  }
}

/**
 * Position callout (`142 · K`) above the highlighted column — mirrors feature-viewer.
 * Mounted on `document.body` so shadow DOM / overflow cannot hide it.
 * @param {HTMLElement | null | undefined} seqHost
 * @param {number | null} position
 * @param {string | undefined} sequence
 */
export function syncNightingaleResidueLabel(seqHost, position, sequence) {
  const el = ensureNgLabelEl()
  if (!el) return
  if (
    position == null ||
    !Number.isFinite(position) ||
    position < 1 ||
    !seqHost
  ) {
    el.style.display = "none"
    return
  }

  const screen = nightingaleResidueLabelScreenPoint(seqHost, position)
  if (!screen) {
    el.style.display = "none"
    return
  }

  paintNgLabelShell(el)
  el.textContent = residueHighlightLabel(position, sequence)
  el.style.display = "block"
  el.style.left = `${screen.x}px`
  el.style.top = `${screen.y}px`
}

/** Remove the floating Nightingale position callout. */
export function clearNightingaleResidueLabel() {
  if (typeof document === "undefined") return
  document.body.querySelector(`.${NG_LABEL_CLASS}`)?.remove()
}

/**
 * Push column highlight to Nightingale manager children. `highlight` is reflected
 * by the manager; `highlight-color` must be set on each child explicitly.
 * @param {{
 *   manager?: HTMLElement | null,
 *   navigation?: HTMLElement | null,
 *   sequence?: HTMLElement | null,
 *   tracks?: (HTMLElement | null | undefined)[],
 *   chrome?: HTMLElement | null,
 *   wrap?: HTMLElement | null,
 * }} hosts
 * @param {number | null} position 1-based residue index
 * @param {boolean} light
 * @param {string | undefined} [sequence]
 */
export function syncNightingaleResidueHighlight(hosts, position, light, sequence) {
  const color = residueColumnHighlightColor(light)
  const region =
    position != null && Number.isFinite(position) && position >= 1
      ? highlightRegionForPosition(position)
      : null

  if (hosts.navigation) {
    hosts.navigation.setAttribute("show-highlight", "true")
  }

  const mgr = hosts.manager
  if (mgr) {
    if (region) {
      mgr.setAttribute("highlight", region)
    } else {
      mgr.removeAttribute("highlight")
    }
  }

  for (const el of [
    hosts.navigation,
    hosts.sequence,
    ...(hosts.tracks ?? []),
  ]) {
    if (!el) continue
    el.setAttribute("highlight-color", color)
  }

}

/**
 * @param {HTMLElement} host
 */
function ensureFvHighlightEl(host) {
  let el = host.querySelector(`.${FV_HIGHLIGHT_CLASS}`)
  if (!el) {
    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative"
    }
    el = document.createElement("div")
    el.className = FV_HIGHLIGHT_CLASS
    el.setAttribute("aria-hidden", "true")
    el.style.position = "absolute"
    host.appendChild(el)
  }
  return el
}

/**
 * @param {HTMLElement} host
 */
function ensureFvLabelEl(host) {
  let el = host.querySelector(`.${FV_LABEL_CLASS}`)
  if (!el) {
    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative"
    }
    el = document.createElement("div")
    el.className = FV_LABEL_CLASS
    el.setAttribute("aria-hidden", "true")
    el.style.position = "absolute"
    host.appendChild(el)
  }
  return el
}

/**
 * Label anchor above the hovered column (letter when visible, else column center).
 * @param {HTMLElement} host
 * @param {number} position
 * @param {{ lo: number, hi: number }} viewport
 * @param {number} columnLeft
 * @param {number} columnWidth
 * @param {number} columnTop
 */
function featureViewerLabelAnchor(
  host,
  position,
  viewport,
  columnLeft,
  columnWidth,
  columnTop,
) {
  const letters = host.querySelectorAll(".seqGroup text.AA")
  const idx = position - viewport.lo
  const letter = letters[idx]
  if (letter) {
    const hostRect = host.getBoundingClientRect()
    const r = letter.getBoundingClientRect()
    if (r.width > 0 || r.height > 0) {
      return {
        left: r.left + r.width / 2 - hostRect.left,
        top: r.top - hostRect.top,
      }
    }
  }
  return {
    left: columnLeft + columnWidth / 2,
    top: columnTop,
  }
}

/**
 * @param {HTMLElement} host
 * @param {number} clientX
 * @param {{ lo: number, hi: number }} viewport
 * @returns {number | null}
 */
function positionFromSequenceLetters(host, clientX, viewport) {
  const letters = host.querySelectorAll(".seqGroup text.AA")
  if (!letters.length) return null

  let best = /** @type {Element | null} */ (null)
  let bestD = Infinity
  letters.forEach(el => {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const d = Math.abs(clientX - cx)
    if (d < bestD) {
      bestD = d
      best = el
    }
  })
  const ftWidth =
    letters.length > 1
      ? Math.abs(
          letters[1].getBoundingClientRect().left -
            letters[0].getBoundingClientRect().left,
        )
      : letters[0]?.getBoundingClientRect().width || 12
  if (best && bestD <= Math.max(14, ftWidth * 0.85)) {
    const nodes = [...host.querySelectorAll(".seqGroup text.AA")]
    const idx = nodes.indexOf(best)
    if (idx >= 0) return viewport.lo + idx
  }
  return null
}

/**
 * Horizontal padding (in plot-local SVG units) inside the feature-viewer clip. The forward
 * (pointer → residue) and inverse (residue → pixel) mappings MUST use the same value or the
 * highlight/label drifts from the cursor when residues are sub-pixel wide (zoomed out).
 */
const PLOT_PAD = 5

/**
 * Plot drawable width inside feature-viewer clip (matches stripe/zoom scale).
 * @param {HTMLElement} host
 */
function plotInnerWidth(host) {
  const clipRect =
    host.querySelector("#clip rect") ?? host.querySelector("clipPath rect")
  const w = clipRect ? parseFloat(clipRect.getAttribute("width") || "") : NaN
  if (Number.isFinite(w) && w > 0) return w
  const plot = host.querySelector("#svg-container")
  if (!plot) return 0
  try {
    return plot.getBBox().width
  } catch {
    return 0
  }
}

/**
 * Read the visible residue window from axis ticks + rendered letters (source of truth when zoomed).
 * @param {HTMLElement | null | undefined} host
 * @param {number} seqLen
 * @param {{ lo: number, hi: number } | null | undefined} fallback
 */
export function readFeatureViewerViewport(host, seqLen, fallback, sequence) {
  const fb = fallback ?? { lo: 1, hi: Math.max(1, seqLen) }
  if (!host || seqLen <= 0) return fb

  const letters = host.querySelectorAll(".seqGroup text.AA")
  const lo = Math.max(1, Math.min(Math.round(fb.lo), seqLen))
  const hiFallback = Math.min(seqLen, Math.max(lo, Math.round(fb.hi)))

  // Prefer recovering absolute start from the rendered letter string itself.
  // This avoids stale fallback windows causing AA label offsets.
  if (letters.length > 0) {
    const seqText = typeof sequence === "string" ? sequence : ""
    const rendered = [...letters]
      .map(el => String(el.textContent || "").trim())
      .join("")
    if (rendered.length >= 8 && seqText.length >= rendered.length) {
      /** @type {number[]} */
      const starts = []
      let from = 0
      while (from <= seqText.length - rendered.length) {
        const hit = seqText.indexOf(rendered, from)
        if (hit < 0) break
        starts.push(hit + 1) // 1-based
        from = hit + 1
      }
      if (starts.length) {
        const bestLo = starts.reduce((best, cur) =>
          Math.abs(cur - lo) < Math.abs(best - lo) ? cur : best,
        starts[0])
        const hiFromRendered = Math.min(seqLen, bestLo + letters.length - 1)
        return { lo: bestLo, hi: Math.max(bestLo, hiFromRendered) }
      }
    }

    const hiFromLetters = Math.min(seqLen, lo + letters.length - 1)
    return { lo, hi: Math.max(lo, hiFromLetters) }
  }

  return { lo, hi: hiFallback }
}

/**
 * @param {number | null} position
 * @param {number} seqLen
 * @param {{ lo: number, hi: number }} viewport
 * @returns {number | null}
 */
export function clampResiduePosition(position, seqLen, viewport) {
  if (position == null || !Number.isFinite(position)) return null
  const p = Math.round(position)
  if (p < 1 || p > seqLen) return null
  if (p < viewport.lo || p > viewport.hi) return null
  return p
}

/**
 * @param {HTMLElement} host
 * @param {number} clientX
 * @param {{ lo: number, hi: number }} viewport
 * @returns {number | null}
 */
function positionFromPlotX(host, clientX, viewport) {
  const plot = host.querySelector("#svg-container")
  const svg = host.querySelector("svg")
  if (!plot || !svg) return null

  const innerW = plotInnerWidth(host)
  if (innerW <= 0) return null

  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = 0
  const ctm = plot.getScreenCTM()
  if (!ctm) return null
  const local = pt.matrixTransform(ctm.inverse())
  const plotX = local.x

  const drawable = Math.max(1, innerW - 2 * PLOT_PAD)
  const rel = plotX - PLOT_PAD
  if (rel < 0 || rel > drawable) return null

  const span = Math.max(1, viewport.hi - viewport.lo)
  return Math.round(viewport.lo + (rel / drawable) * span)
}

/**
 * Map pointer position to a 1-based residue index (sequence letters or track column).
 * @param {HTMLElement} host
 * @param {number} clientX
 * @param {{ lo: number, hi: number }} viewport
 * @param {number} [clientY]
 * @returns {number | null}
 */
export function clientXToFeatureViewerPosition(
  host,
  clientX,
  viewport,
  clientY,
  seqLen,
  sequence,
) {
  if (!host) return null
  const L = Math.max(1, seqLen || 1)
  const vp = readFeatureViewerViewport(host, L, viewport, sequence)

  const seqGroup = host.querySelector(".seqGroup")
  if (seqGroup && clientY != null) {
    const sr = seqGroup.getBoundingClientRect()
    const pad = 6
    if (clientY >= sr.top - pad && clientY <= sr.bottom + pad) {
      const onLetter = positionFromSequenceLetters(host, clientX, vp)
      if (onLetter != null) return clampResiduePosition(onLetter, L, vp)
    }
  }

  const onLetter = positionFromSequenceLetters(host, clientX, vp)
  if (onLetter != null) return clampResiduePosition(onLetter, L, vp)

  const onPlot = positionFromPlotX(host, clientX, vp)
  return clampResiduePosition(onPlot, L, vp)
}

/**
 * @param {HTMLElement} host
 * @param {number} position 1-based
 * @param {{ lo: number, hi: number }} viewport
 * @returns {{ left: number, width: number, bandTop: number, bandHeight: number } | null}
 */
function featureViewerColumnBounds(host, position, viewport) {
  const p = Math.round(position)
  if (!Number.isFinite(p) || p < 1) return null
  if (p < viewport.lo || p > viewport.hi) return null

  const svg = host.querySelector("svg")
  if (!svg) return null

  const letters = host.querySelectorAll(".seqGroup text.AA")
  let left
  let width = 10

  if (letters.length) {
    const idx = p - viewport.lo
    const letter = letters[idx]
    if (letter) {
      const hostRect = host.getBoundingClientRect()
      const r = letter.getBoundingClientRect()
      left = r.left - hostRect.left
      width = Math.max(6, r.width + 2)
    }
  }

  if (left == null) {
    const plot = host.querySelector("#svg-container")
    if (!plot) return null
    const ctm = plot.getScreenCTM()
    const innerW = plotInnerWidth(host)
    const hostRect = host.getBoundingClientRect()

    if (ctm && innerW > 0) {
      // Exact inverse of positionFromPlotX: work in plot-local units, then project to screen with
      // the same CTM so the highlight lands on the residue the pointer actually maps to.
      const drawable = Math.max(1, innerW - 2 * PLOT_PAD)
      const span = Math.max(1, viewport.hi - viewport.lo)
      const widthLocal = drawable / span
      const centerLocal = PLOT_PAD + ((p - viewport.lo) / span) * drawable
      const toScreenX = xLocal => {
        const q = svg.createSVGPoint()
        q.x = xLocal
        q.y = 0
        return q.matrixTransform(ctm).x
      }
      const centerScreen = toScreenX(centerLocal)
      const edgeSpan = Math.abs(toScreenX(centerLocal + widthLocal / 2) - centerScreen)
      width = Math.max(4, edgeSpan * 2)
      left = centerScreen - hostRect.left - width / 2
    } else {
      const pr = plot.getBoundingClientRect()
      const span = Math.max(1, viewport.hi - viewport.lo)
      const t = (p - viewport.lo) / span
      width = Math.max(4, pr.width / span)
      left = pr.left - hostRect.left + t * pr.width - width / 2
    }
  }

  const hostRect = host.getBoundingClientRect()
  const plot = host.querySelector("#svg-container")
  const bandRect = plot?.getBoundingClientRect() ?? svg.getBoundingClientRect()
  const bandTop = bandRect.top - hostRect.top

  return {
    left,
    width,
    bandTop,
    bandHeight: bandRect.height,
  }
}

/**
 * @param {HTMLElement} host
 */
function ensureFvSelectionLayer(host) {
  if (getComputedStyle(host).position === "static") {
    host.style.position = "relative"
  }
  let layer = host.querySelector(`.${FV_SELECTION_LAYER_CLASS}`)
  if (!layer) {
    layer = document.createElement("div")
    layer.className = FV_SELECTION_LAYER_CLASS
    layer.setAttribute("aria-hidden", "true")
    layer.style.position = "absolute"
    layer.style.left = "0"
    layer.style.top = "0"
    layer.style.right = "0"
    layer.style.bottom = "0"
    layer.style.pointerEvents = "none"
    layer.style.zIndex = "1"
    host.appendChild(layer)
  }
  return /** @type {HTMLElement} */ (layer)
}

/**
 * @param {HTMLElement | null | undefined} host
 * @param {number[]} positions 1-based
 * @param {{ lo: number, hi: number }} viewport
 * @param {boolean} light
 */
export function syncFeatureViewerSelectionHighlights(
  host,
  positions,
  viewport,
  light,
) {
  if (!host) return
  const layer = ensureFvSelectionLayer(host)
  layer.innerHTML = ""
  const color = residueSelectionHighlightColor(light)

  for (const pos of positions) {
    const bounds = featureViewerColumnBounds(host, pos, viewport)
    if (!bounds) continue
    const el = document.createElement("div")
    el.className = FV_SELECTION_CLASS
    el.style.position = "absolute"
    el.style.left = `${bounds.left}px`
    el.style.width = `${bounds.width}px`
    el.style.top = `${bounds.bandTop}px`
    el.style.height = `${bounds.bandHeight}px`
    el.style.backgroundColor = color
    layer.appendChild(el)
  }
}

/** @param {HTMLElement | null | undefined} host */
export function clearFeatureViewerSelectionHighlights(host) {
  host?.querySelector(`.${FV_SELECTION_LAYER_CLASS}`)?.remove()
}

/**
 * @param {HTMLElement | null | undefined} host
 * @param {number | null} position
 * @param {{ lo: number, hi: number }} viewport
 * @param {boolean} light
 * @param {string | undefined} [sequence]
 */
export function syncFeatureViewerColumnHighlight(
  host,
  position,
  viewport,
  light,
  sequence,
) {
  if (!host) return
  const el = ensureFvHighlightEl(host)
  const labelEl = ensureFvLabelEl(host)
  const svg = host.querySelector("svg")
  if (
    position == null ||
    !Number.isFinite(position) ||
    position < 1 ||
    !svg
  ) {
    el.style.display = "none"
    labelEl.style.display = "none"
    return
  }

  const bounds = featureViewerColumnBounds(host, position, viewport)
  if (!bounds) {
    el.style.display = "none"
    labelEl.style.display = "none"
    return
  }

  el.style.display = "block"
  el.style.position = "absolute"
  el.style.zIndex = "2"
  el.style.left = `${bounds.left}px`
  el.style.width = `${bounds.width}px`
  el.style.top = `${bounds.bandTop}px`
  el.style.height = `${bounds.bandHeight}px`
  el.style.backgroundColor = residueColumnHighlightColor(light)

  const anchor = featureViewerLabelAnchor(
    host,
    position,
    viewport,
    bounds.left,
    bounds.width,
    bounds.bandTop,
  )
  labelEl.textContent = residueHighlightLabel(position, sequence)
  labelEl.style.display = "block"
  labelEl.style.position = "absolute"
  labelEl.style.left = `${anchor.left}px`
  labelEl.style.top = `${anchor.top}px`
}

/**
 * @param {HTMLElement | null | undefined} host
 */
export function clearFeatureViewerColumnHighlight(host) {
  host?.querySelector(`.${FV_HIGHLIGHT_CLASS}`)?.remove()
  host?.querySelector(`.${FV_LABEL_CLASS}`)?.remove()
}
