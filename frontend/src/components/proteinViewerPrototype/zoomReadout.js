/** Maximum magnification for protein sequence viewers (toolbar + overview brush). */
export const MAX_SEQUENCE_ZOOM = 45

/**
 * Smallest allowable visible window (inclusive residue count) at max zoom-in.
 * @param {number} seqLen
 * @param {number} [maxZoom]
 */
export function minimumViewportLength(seqLen, maxZoom = MAX_SEQUENCE_ZOOM) {
  if (!Number.isFinite(seqLen) || seqLen <= 0) return 2
  return Math.max(2, Math.ceil(seqLen / maxZoom))
}

/** @param {number} mag */
export function formatMagnification(mag) {
  if (!Number.isFinite(mag) || mag <= 1.001) return "1×"
  if (mag >= 10) return `${Math.round(mag)}×`
  const t = mag.toFixed(1)
  return t.endsWith(".0") ? `${Math.round(mag)}×` : `${t}×`
}
