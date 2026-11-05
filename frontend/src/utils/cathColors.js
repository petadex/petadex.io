// CATH domain mapping and shade color computation for the Family Atlas
//
// Source of truth: `family_atlas.cath_domain` from the API (see the S3 atlas export
// atlas/umap.json.gz and GET /api/atlas/components). Use `resolveCathDomain()` from cathDomainResolve.js when both
// `component` and DB `cath_domain` are available. COMPONENT_TO_CATH remains a fallback for
// charts and rows where the DB field is null.

export const COMPONENT_TO_CATH = {
  1:  '3.40.50.1820', 2:  '3.40.50.1820', 3:  '3.40.50.1820',
  4:  '3.40.50.1820', 5:  '3.40.50.1820', 6:  '3.40.50.1820',
  7:  '3.40.50.1820', 8:  '3.40.710.10',  9:  '3.60.70.12',
  10: '3.90.1300.10', 11: '2.40.10.10',   12: '2.40.10.10',
  14: '2.60.40.420',  15: 'NA',            16: 'NA',
  17: 'TBDX',         18: 'TBDY',          19: 'TBDZ',
  20: '3.40.50.1820', 21: '3.40.50.1820', 22: '3.40.50.1820',
  23: '3.40.50.1820', 24: '3.40.50.1820', 25: '3.40.50.1820',
  26: '3.40.50.1820', 27: '3.40.50.1820', 28: '3.40.50.1820',
  29: '3.40.50.1820', 30: '3.40.50.1820', 31: '3.40.50.1820',
  32: '3.40.50.1820', 33: '3.40.50.1820', 34: '3.40.50.1820',
  35: '3.40.50.1820', 36: '3.40.50.1820', 37: '3.40.50.1820',
  38: '3.40.50.1820', 39: '3.40.50.1820', 40: '3.40.50.1820',
  41: '3.40.710.10',  42: '3.40.710.10',  43: '3.40.710.10',
}

// Base hue (HSL degrees) for each known CATH domain; null → grey
export const CATH_HUE = {
  '3.40.50.1820': 210,
  '3.40.710.10':  140,
  '3.60.70.12':    25,
  '3.90.1300.10':   0,
  '2.40.10.10':   270,
  '2.60.40.420':   50,
}

export function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

// Components grouped by CATH domain, each group sorted numerically
export const CATH_GROUPS = {}
for (const [comp, cath] of Object.entries(COMPONENT_TO_CATH)) {
  if (!CATH_GROUPS[cath]) CATH_GROUPS[cath] = []
  CATH_GROUPS[cath].push(Number(comp))
}
for (const g of Object.values(CATH_GROUPS)) g.sort((a, b) => a - b)

// Deck.GL RGBA arrays per component
export const COMPONENT_SHADE_RGBA = {}
// CSS color strings per component (for Cytoscape)
export const COMPONENT_SHADE_CSS = {}
// CSS color strings per CATH domain (for Cytoscape domain nodes)
export const CATH_BASE_CSS = {}

for (const [cath, comps] of Object.entries(CATH_GROUPS)) {
  const hue = CATH_HUE[cath]

  if (hue != null) {
    const [r, g, b] = hslToRgb(hue, 60, 38)
    CATH_BASE_CSS[cath] = `rgb(${r},${g},${b})`
  } else {
    CATH_BASE_CSS[cath] = '#475569'
  }

  comps.forEach((comp, i) => {
    if (hue == null) {
      COMPONENT_SHADE_RGBA[comp] = [148, 163, 184, 160]
      COMPONENT_SHADE_CSS[comp] = 'rgba(148,163,184,0.63)'
    } else {
      const n = comps.length
      const lightness = n === 1 ? 55 : 35 + (i / (n - 1)) * 35
      const [r, g, b] = hslToRgb(hue, 70, lightness)
      COMPONENT_SHADE_RGBA[comp] = [r, g, b, 220]
      COMPONENT_SHADE_CSS[comp] = `rgba(${r},${g},${b},0.86)`
    }
  })
}
