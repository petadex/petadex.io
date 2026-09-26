/** @param {boolean} light */
export function residueColumnHighlightColor(light) {
  return light
    ? "oklch(0.55 0.14 250 / 0.32)"
    : "oklch(0.72 0.12 250 / 0.38)"
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

const FV_HIGHLIGHT_CLASS = "fv-residue-column-highlight"
const FV_SELECTION_CLASS = "fv-residue-selection-highlight"
const FV_SELECTION_LAYER_CLASS = "fv-residue-selection-layer"
const FV_LABEL_CLASS = "fv-residue-position-label"
/** @param {boolean} light */
export function residueSelectionHighlightColor(light) {
  return light
    ? "oklch(0.55 0.12 165 / 0.38)"
    : "oklch(0.68 0.1 165 / 0.42)"
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

  const pad = 5
  const drawable = Math.max(1, innerW - 2 * pad)
  const rel = plotX - pad
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
    const hostRect = host.getBoundingClientRect()
    if (!plot) return null
    const pr = plot.getBoundingClientRect()
    const span = Math.max(1, viewport.hi - viewport.lo)
    const t = (p - viewport.lo) / span
    width = Math.max(4, pr.width / span)
    left = pr.left - hostRect.left + t * pr.width - width / 2
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
