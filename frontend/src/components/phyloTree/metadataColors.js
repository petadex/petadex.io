import { COMPONENT_SHADE_CSS } from "../../utils/cathColors"

export const COLOR_MODES = [
  { id: "none", label: "None (search highlights only)" },
  { id: "component", label: "Component (CATH atlas)" },
  { id: "family_pid", label: "Identity to centroid (family_pid)" },
  { id: "organism", label: "Organism" },
  { id: "country", label: "Country" },
]

const UNKNOWN = "#94a3b8"

const CATEGORY_PALETTE = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#84cc16",
  "#f97316",
  "#06b6d4",
  "#a855f7",
]

function lerp(a, b, t) {
  return a + (b - a) * t
}

/** Blue → amber continuous scale for family_pid (0–100). */
export function familyPidColor(pid) {
  const t = Math.min(1, Math.max(0, Number(pid) / 100))
  if (!Number.isFinite(t)) return UNKNOWN
  const r = Math.round(lerp(14, 245, t))
  const g = Math.round(lerp(165, 158, t))
  const b = Math.round(lerp(233, 11, t))
  return `rgb(${r},${g},${b})`
}

/**
 * Build a stable categorical color map for string values.
 * @param {Iterable<string|null|undefined>} values
 * @returns {Map<string, string>}
 */
export function buildCategoryColorMap(values) {
  const unique = []
  const seen = new Set()
  for (const raw of values) {
    const key = String(raw || "").trim() || "Unknown"
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(key)
  }
  unique.sort((a, b) => a.localeCompare(b))
  const map = new Map()
  unique.forEach((key, i) => {
    map.set(key, key === "Unknown" ? UNKNOWN : CATEGORY_PALETTE[i % CATEGORY_PALETTE.length])
  })
  return map
}

/**
 * @param {"none"|"component"|"family_pid"|"organism"|"country"} mode
 * @param {Map<string, { component?: number|null, family_pid?: number|null, organism?: string|null, country?: string|null }>} memberIndex
 */
export function createLeafColorGetter(mode, memberIndex) {
  if (!mode || mode === "none") return null

  if (mode === "component") {
    return enzymeId => {
      const m = memberIndex.get(String(enzymeId))
      const comp = m?.component
      if (comp == null) return UNKNOWN
      return COMPONENT_SHADE_CSS[Number(comp)] || UNKNOWN
    }
  }

  if (mode === "family_pid") {
    return enzymeId => {
      const m = memberIndex.get(String(enzymeId))
      if (m?.family_pid == null) return UNKNOWN
      return familyPidColor(m.family_pid)
    }
  }

  if (mode === "organism" || mode === "country") {
    const values = []
    for (const m of memberIndex.values()) values.push(m[mode])
    const colorMap = buildCategoryColorMap(values)
    return enzymeId => {
      const m = memberIndex.get(String(enzymeId))
      const key = String(m?.[mode] || "").trim() || "Unknown"
      return colorMap.get(key) || UNKNOWN
    }
  }

  return null
}

/**
 * Legend entries for the current color mode.
 * @returns {{ label: string, color: string }[]}
 */
export function buildColorLegend(mode, memberIndex) {
  if (!mode || mode === "none") return []

  if (mode === "family_pid") {
    return [
      { label: "0% identity", color: familyPidColor(0) },
      { label: "50%", color: familyPidColor(50) },
      { label: "100% identity", color: familyPidColor(100) },
      { label: "Unknown", color: UNKNOWN },
    ]
  }

  if (mode === "component") {
    const comps = new Set()
    for (const m of memberIndex.values()) {
      if (m.component != null) comps.add(Number(m.component))
    }
    return [...comps]
      .sort((a, b) => a - b)
      .map(c => ({
        label: `Component ${c}`,
        color: COMPONENT_SHADE_CSS[c] || UNKNOWN,
      }))
      .concat([{ label: "Unknown", color: UNKNOWN }])
  }

  if (mode === "organism" || mode === "country") {
    const values = []
    for (const m of memberIndex.values()) values.push(m[mode])
    const colorMap = buildCategoryColorMap(values)
    const entries = [...colorMap.entries()].map(([label, color]) => ({ label, color }))
    // Cap legend length for readability
    if (entries.length <= 12) return entries
    return [
      ...entries.slice(0, 11),
      { label: `+${entries.length - 11} more`, color: UNKNOWN },
    ]
  }

  return []
}
