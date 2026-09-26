/** Hardcoded narrative sections — every CATH domain profile renders all of these. */
export const CATH_NARRATIVE_SECTIONS = [
  { key: "localization", title: "Localization" },
  { key: "ptms", title: "Post-translational modifications" },
  { key: "catalyticResidues", title: "Catalytic residues" },
  { key: "mechanisms", title: "Mechanisms" },
  { key: "interactingDomains", title: "Interacting domains" },
  { key: "function", title: "Function" },
  { key: "regulation", title: "Regulation" },
  { key: "variability", title: "Variability in sequence/structure" },
  { key: "structure", title: "Structure (PDB)" },
]

export const CATH_SECTION_PLACEHOLDER = "No curated notes yet for this section."

/** @type {Record<string, string[]>} */
const TABLE_KEYS_BY_SECTION = {
  localization: ["preLocalizationTable", "postLocalizationTable"],
  ptms: ["prePtmsTable"],
  catalyticResidues: ["postCatalyticResiduesTable"],
  structure: ["postStructureTable"],
}

/**
 * @param {Record<string, unknown>} domain
 * @param {string} key
 */
export function hasCathSectionContent(domain, key) {
  for (const tableKey of TABLE_KEYS_BY_SECTION[key] || []) {
    const table = domain[tableKey]
    if (
      table &&
      Array.isArray(table.headers) &&
      table.headers.length &&
      Array.isArray(table.rows) &&
      table.rows.length
    ) {
      return true
    }
  }
  const raw = domain[key]
  if (raw == null) return false
  const text = String(raw).trim()
  if (!text || text === CATH_SECTION_PLACEHOLDER || text === "No curated notes yet.") return false
  return true
}

/**
 * @param {Record<string, unknown>} domain
 * @param {string} key
 */
export function getCathSectionNarrativeText(domain, key) {
  if (!hasCathSectionContent(domain, key)) return ""
  const text = String(domain[key] ?? "").trim()
  if (!text || text === CATH_SECTION_PLACEHOLDER || text === "No curated notes yet.") return ""
  return text
}

/**
 * @param {string} pfamAccession e.g. PF01674
 */
export function pfamEntryUrl(pfamAccession) {
  const acc = String(pfamAccession || "").replace(/^PF/i, "")
  if (!acc) return "https://www.ebi.ac.uk/interpro/entry/pfam/"
  return `https://www.ebi.ac.uk/interpro/entry/pfam/PF${acc}/`
}

/**
 * Remove Pfam accession echoes from displayName when the accession is shown separately in the UI.
 * @param {string} displayName
 * @param {string} [pfamAccession]
 */
export function stripRedundantPfamFromDisplayName(displayName, pfamAccession) {
  let name = String(displayName || "").trim()
  const pf = String(pfamAccession || "").trim()
  if (!name || !pf) return name

  const pfEsc = pf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  name = name.replace(new RegExp(`[,\\s]+domain\\s+${pfEsc}\\s*$`, "i"), "")

  name = name.replace(new RegExp(`\\s*\\([^)]*\\b${pfEsc}\\b[^)]*\\)\\s*$`, "i"), match => {
    const inner = match.replace(/^\s*\(|\)\s*$/g, "").trim()
    if (inner.toUpperCase() === pf.toUpperCase()) return ""
    const parts = inner
      .split(/,\s*/)
      .map(part => part.trim())
      .filter(part => part.toUpperCase() !== pf.toUpperCase())
    return parts.length ? ` (${parts.join(", ")})` : ""
  })

  return name.trim().replace(/\s{2,}/g, " ")
}

/**
 * Profile selector label: PFxxxxx — human-readable name (Pfam id once).
 * @param {{ displayName?: string, pfamAccession?: string }} domain
 */
export function formatCathDomainSelectLabel(domain) {
  const pf = String(domain?.pfamAccession || "").trim()
  const name = stripRedundantPfamFromDisplayName(domain?.displayName, pf)
  if (pf && name) return `${pf} — ${name}`
  return pf || name || ""
}

/** @returns {typeof CATH_NARRATIVE_SECTIONS} */
export function getAllCathSections() {
  return CATH_NARRATIVE_SECTIONS
}

/**
 * Fixed sidebar / in-page nav for every profile.
 * @param {Record<string, unknown>} _domain
 */
export function getCathSectionNavItems(_domain) {
  const items = [{ id: "cath-overview", label: "Overview" }]
  for (const { key, title } of CATH_NARRATIVE_SECTIONS) {
    items.push({ id: `cath-section-${key}`, label: title })
  }
  items.push({ id: "cath-refs-heading", label: "References" })
  return items
}
