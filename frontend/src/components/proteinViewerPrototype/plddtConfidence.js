/**
 * AlphaFold pLDDT — thin colour gradient strip (InterPro/AlphaFold scale).
 */

/** @typedef {{ label: string, min: number, color: string, description: string }} PlddtBand */

export const PLDDT_BANDS = [
  {
    label: "Very high",
    min: 90,
    color: "#0053d6",
    description: "Very high (pLDDT > 90)",
  },
  {
    label: "Confident",
    min: 70,
    color: "#72ccf8",
    description: "Confident (90 ≥ pLDDT > 70)",
  },
  {
    label: "Low",
    min: 50,
    color: "#ffdb12",
    description: "Low (70 ≥ pLDDT > 50)",
  },
  {
    label: "Very low",
    min: 0,
    color: "#ff7d45",
    description: "Very low (pLDDT ≤ 50)",
  },
]

/** @param {string} hex */
function hexToRgb(hex) {
  const h = hex.replace("#", "")
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** @param {number} r @param {number} g @param {number} b */
function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map(v =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`
}

/** @param {string} a @param {string} b @param {number} t */
function lerpHex(a, b, t) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  const u = Math.max(0, Math.min(1, t))
  return rgbToHex(
    A.r + (B.r - A.r) * u,
    A.g + (B.g - A.g) * u,
    A.b + (B.b - A.b) * u,
  )
}

/** Smooth AlphaFold-style colour for a single residue score (0–100). */
export function plddtColorForScore(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  const veryLow = PLDDT_BANDS[3].color
  const low = PLDDT_BANDS[2].color
  const conf = PLDDT_BANDS[1].color
  const high = PLDDT_BANDS[0].color

  if (s >= 90) return lerpHex(conf, high, (s - 90) / 10)
  if (s >= 70) return lerpHex(low, conf, (s - 70) / 20)
  if (s >= 50) return lerpHex(veryLow, low, (s - 50) / 20)
  return lerpHex(veryLow, low, s / 50)
}

/**
 * Per-residue colours (smooth gradient when scores change along the chain).
 * @param {number[]} scores
 * @returns {Array<{ start: number, end: number, color: string, score: number, label: string }>}
 */
export function plddtGradientSegmentsFromScores(scores) {
  if (!scores?.length) return []
  return scores.map((score, i) => ({
    start: i + 1,
    end: i + 1,
    color: plddtColorForScore(score),
    score,
    label: `pLDDT ${Number(score).toFixed(1)}`,
  }))
}

/**
 * Deterministic demo pLDDT (no API) — varies like a typical AF model.
 * @param {number} length
 * @returns {number[]}
 */
export function mockPlddtScores(length) {
  const n = Math.max(1, length)
  return Array.from({ length: n }, (_, i) => {
    const t = i / Math.max(1, n - 1)
    const base =
      58 +
      38 * Math.sin(t * Math.PI * 2.1) +
      12 * Math.cos(t * Math.PI * 5.3)
    return Math.round(Math.min(98, Math.max(42, base)))
  })
}

/**
 * @param {number[]} scores
 */
export function featureViewerPlddtDef(scores) {
  const segments = plddtGradientSegmentsFromScores(scores)
  return {
    id: "plddt",
    title: "pLDDT",
    feature: {
      data: segments.map(seg => ({
        x: seg.start,
        y: seg.end,
        color: seg.color,
        description: `${seg.label} (residue ${seg.start}${seg.end > seg.start ? `–${seg.end}` : ""})`,
      })),
      name: "pLDDT",
      className: "fv-track-plddt",
      color: PLDDT_BANDS[0].color,
      type: "rect",
      height: 8,
      showDescriptionRect: false,
    },
  }
}
