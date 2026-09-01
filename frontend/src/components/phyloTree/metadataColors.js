import { COMPONENT_SHADE_CSS } from "../../utils/cathColors"

export const COLOR_MODES = [
  { id: "none", label: "None" },
  { id: "component", label: "Component" },
  { id: "family_pid", label: "Identity to centroid" },
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

function pctLabel(count, total) {
  if (!total) return "0%"
  return `${((100 * count) / total).toFixed(count === total || count === 0 ? 0 : 1)}%`
}

/**
 * Legend entries for the current color mode (includes % of family tips).
 * @returns {{ label: string, color: string, pct?: string, count?: number }[]}
 */
export function buildColorLegend(mode, memberIndex) {
  if (!mode || mode === "none") return []
  const total = memberIndex.size || 0

  if (mode === "family_pid") {
    return [
      { label: "0%", color: familyPidColor(0) },
      { label: "50%", color: familyPidColor(50) },
      { label: "100%", color: familyPidColor(100) },
      { label: "Unknown", color: UNKNOWN },
    ]
  }

  if (mode === "component") {
    const counts = new Map()
    let unknown = 0
    for (const m of memberIndex.values()) {
      if (m.component == null) {
        unknown += 1
        continue
      }
      const c = Number(m.component)
      counts.set(c, (counts.get(c) || 0) + 1)
    }
    const entries = [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([c, n]) => ({
        label: `Component ${c}`,
        color: COMPONENT_SHADE_CSS[c] || UNKNOWN,
        count: n,
        pct: pctLabel(n, total),
      }))
    if (unknown) {
      entries.push({
        label: "Unknown",
        color: UNKNOWN,
        count: unknown,
        pct: pctLabel(unknown, total),
      })
    }
    return entries
  }

  if (mode === "organism" || mode === "country") {
    const counts = new Map()
    for (const m of memberIndex.values()) {
      const key = String(m[mode] || "").trim() || "Unknown"
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    const colorMap = buildCategoryColorMap(counts.keys())
    const entries = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, n]) => ({
        label,
        color: colorMap.get(label) || UNKNOWN,
        count: n,
        pct: pctLabel(n, total),
      }))
    if (entries.length <= 12) return entries
    const shown = entries.slice(0, 11)
    const restCount = entries.slice(11).reduce((s, e) => s + e.count, 0)
    return [
      ...shown,
      {
        label: `+${entries.length - 11} more`,
        color: UNKNOWN,
        count: restCount,
        pct: pctLabel(restCount, total),
      },
    ]
  }

  return []
}
