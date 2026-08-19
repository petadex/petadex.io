/**
 * Plastic-type colors for the literature network (first plastic in plastics_studied).
 * Not CATH colors — fixed categorical map for substrate labels.
 */
export const PLASTIC_COLORS = {
  PET: "#5B9BD5",
  PE: "#E8A0A0",
  PLA: "#B8A4E8",
  PUR: "#D4A84B",
  PHA: "#C4A574",
  PBAT: "#9B7EBD",
  PCL: "#5DA8A0",
  NR: "#4A7C59",
  PBS: "#6B8FCE",
  PS: "#7CB342",
  PBSA: "#8BC34A",
  PA: "#5C6BC0",
  PVC: "#E8D48A",
  PP: "#E07A3D",
  PEF: "#D46A8A",
}

export const PLASTIC_COLOR_FALLBACK = "#94a3b8"

export function plasticColor(plastic) {
  const key = String(plastic || "").trim().toUpperCase()
  return PLASTIC_COLORS[key] || PLASTIC_COLOR_FALLBACK
}

/** Fill color from first plastics_studied entry. */
export function paperNodeColor(paper) {
  const first = paper?.plastics_studied?.[0]
  return plasticColor(first)
}

export function plasticsInDataset(papers) {
  const set = new Set()
  for (const p of papers || []) {
    for (const pl of p.plastics_studied || []) {
      if (pl) set.add(String(pl).toUpperCase())
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
