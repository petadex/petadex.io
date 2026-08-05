/**
 * Pfam-accession formatting helpers shared by the CATH-domain view. The narrative section /
 * in-page-nav config that used to live here belonged to the removed per-Pfam profile pages.
 */

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
