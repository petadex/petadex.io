/**
 * Stable per-family colour: golden-angle hue spacing so adjacent family ids
 * land far apart on the wheel. Shared by /enzymes, search results, the results
 * scatterplot and the atlas so a family reads the same colour everywhere.
 */
const HUE_STEP = 137.508
const SATURATION = 0.6
const LIGHTNESS = 0.45

/** @param {number} familyId */
const familyHue = familyId => (familyId * HUE_STEP) % 360

/** @param {number} familyId CSS colour string. */
export function familyColor(familyId) {
  return `hsl(${familyHue(familyId)}, ${SATURATION * 100}%, ${
    LIGHTNESS * 100
  }%)`
}

/**
 * Same colour as {@link familyColor}, as a deck.gl RGBA tuple.
 * @param {number} familyId
 * @returns {[number, number, number, number]}
 */
export function familyColorRGBA(familyId) {
  const h = familyHue(familyId) / 360
  const a = SATURATION * Math.min(LIGHTNESS, 1 - LIGHTNESS)
  const f = n => {
    const k = (n + h * 12) % 12
    return LIGHTNESS - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
  }
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
    255,
  ]
}
