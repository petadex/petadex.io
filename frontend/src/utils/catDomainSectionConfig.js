/** Hardcoded narrative sections — every CAT-domain page renders all of these. */
export const CAT_NARRATIVE_SECTIONS = [
  { key: "structuralArchitecture", title: "Structural architecture" },
  { key: "mechanism", title: "Mechanism" },
  { key: "functionalDiversity", title: "Functional diversity" },
  { key: "petRelevance", title: "PET relevance" },
  { key: "interactingDomains", title: "Interacting domains" },
  { key: "representativeStructures", title: "Selected structures for comparison" },
  { key: "memberHmms", title: "HMMs used" },
  { key: "hmmLogos", title: "HMM logos" },
  { key: "sequenceLogos", title: "Sequence logos" },
]

export const CAT_SECTION_PLACEHOLDER = "Curation pending."

/**
 * @param {import("../data/catDomainCatalog.js").CatDomainCatalogEntry} entry
 */
export function isCatDomainStub(entry) {
  return !entry || entry.status === "stub" || entry.status == null
}

/** @returns {typeof CAT_NARRATIVE_SECTIONS} */
export function getAllCatSections() {
  return CAT_NARRATIVE_SECTIONS
}

/**
 * Fixed sidebar / in-page nav for every CAT-domain page.
 * @param {Record<string, unknown>} _catDomain
 */
export function getCatSectionNavItems(_catDomain) {
  const items = [{ id: "cat-overview", label: "Overview" }]
  for (const { key, title } of CAT_NARRATIVE_SECTIONS) {
    items.push({ id: `cat-section-${key}`, label: title })
  }
  items.push({ id: "cat-refs-heading", label: "References" })
  return items
}

/**
 * Label for the CAT-domain selector dropdown.
 * @param {{ cathId: string, displayName: string, memberCount?: number }} catDomain
 */
export function formatCatDomainSelectLabel(catDomain) {
  const id = String(catDomain?.cathId || "").trim()
  const name = String(catDomain?.displayName || "").trim()
  const base = id && name ? `${id} — ${name}` : id || name || "Unresolved CATH domain"
  return catDomain?.memberCount
    ? `${base} (${catDomain.memberCount} HMM${catDomain.memberCount === 1 ? "" : "s"})`
    : base
}

/**
 * M-CSA entry URL for a given entry id (numeric id as used in M-CSA's own links).
 * @param {string} entryId
 */
export function mcsaEntryUrl(entryId) {
  const id = String(entryId || "").trim()
  if (!id) return "https://www.ebi.ac.uk/thornton-srv/m-csa/"
  return `https://www.ebi.ac.uk/thornton-srv/m-csa/entry/${id}/`
}
