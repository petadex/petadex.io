/**
 * CATH domain mapping and shade color computation for the Family Atlas.
 *
 * Ported from frontend/src/utils/cathColors.js. Source of truth:
 * `family_atlas.cath_domain` from the API (GET /api/atlas/umap). Used as a
 * fallback for charts and rows where the DB `cath_domain` field is null.
 */

export const COMPONENT_TO_CATH: Readonly<Record<number, string>> = {
  1: "3.40.50.1820",
  2: "3.40.50.1820",
  3: "3.40.50.1820",
  4: "3.40.50.1820",
  5: "3.40.50.1820",
  6: "3.40.50.1820",
  7: "3.40.50.1820",
  8: "3.40.710.10",
  9: "3.60.70.12",
  10: "3.90.1300.10",
  11: "2.40.10.10",
  12: "2.40.10.10",
  14: "2.60.40.420",
  15: "NA",
  16: "NA",
  17: "TBDX",
  18: "TBDY",
  19: "TBDZ",
  20: "3.40.50.1820",
  21: "3.40.50.1820",
  22: "3.40.50.1820",
  23: "3.40.50.1820",
  24: "3.40.50.1820",
  25: "3.40.50.1820",
  26: "3.40.50.1820",
  27: "3.40.50.1820",
  28: "3.40.50.1820",
  29: "3.40.50.1820",
  30: "3.40.50.1820",
  31: "3.40.50.1820",
  32: "3.40.50.1820",
  33: "3.40.50.1820",
  34: "3.40.50.1820",
  35: "3.40.50.1820",
  36: "3.40.50.1820",
  37: "3.40.50.1820",
  38: "3.40.50.1820",
  39: "3.40.50.1820",
  40: "3.40.50.1820",
  41: "3.40.710.10",
  42: "3.40.710.10",
  43: "3.40.710.10",
}

/** Base hue (HSL degrees) for each known CATH domain. */
export const CATH_HUE: Readonly<Record<string, number>> = {
  "3.40.50.1820": 210,
  "3.40.710.10": 140,
  "3.60.70.12": 25,
  "3.90.1300.10": 0,
  "2.40.10.10": 270,
  "2.60.40.420": 50,
}

export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ]
}

/** Components grouped by CATH domain, each group sorted numerically. */
export const CATH_GROUPS: Readonly<Record<string, number[]>> = (() => {
  const groups: Record<string, number[]> = {}
  for (const [comp, cath] of Object.entries(COMPONENT_TO_CATH)) {
    if (!groups[cath]) groups[cath] = []
    groups[cath].push(Number(comp))
  }
  for (const g of Object.values(groups)) g.sort((a, b) => a - b)
  return groups
})()
