import { CAT_DOMAIN_CATALOG } from "../data/catDomainCatalog"
import { stripRedundantPfamFromDisplayName } from "./cathDomainSectionConfig"

/**
 * @typedef {Object} CatDomainMemberHmm
 * @property {string} id             Pfam-level domain model id (for linking back to `?id=`)
 * @property {string} pfamAccession
 * @property {string} profileHmm
 * @property {string} displayName
 * @property {number|null} familyCount
 */

/**
 * @typedef {import("../data/catDomainCatalog.js").CatDomainCatalogEntry & {
 *   memberHmms: CatDomainMemberHmm[],
 *   memberCount: number,
 *   totalFamilyCount: number|null,
 * }} CatDomainModel
 */

function emptyCatEntry(cathId) {
  return {
    cathId,
    displayName: cathId,
    lastUpdated: "—",
    overview: "This CATH domain hasn't been curated yet — it was detected from member HMM assignments.",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: { text: "Curation pending.", refs: [] },
    hmmLogos: [],
    sequenceLogos: [],
    references: [],
    status: "stub",
  }
}

/**
 * Build CAT-domain models by grouping merged Pfam/HMM domain models (the output of
 * `mergeCatalogWithAtlasComponents`) by their `cathId`, then attaching curated CAT-level
 * content from `CAT_DOMAIN_CATALOG` when available — or an auto-generated stub when not.
 *
 * @param {ReturnType<typeof import("./mergeCatalogWithAtlas.js").buildDomainModelFromCatalog>[]} pfamDomainModels
 * @returns {CatDomainModel[]}
 */
export function buildCatDomainModels(pfamDomainModels) {
  /** @type {Map<string, CatDomainMemberHmm[]>} */
  const byCath = new Map()

  for (const d of pfamDomainModels) {
    const cathId = d.cathId || "Unknown"
    if (!byCath.has(cathId)) byCath.set(cathId, [])
    byCath.get(cathId).push({
      id: d.id,
      pfamAccession: d.pfamAccession,
      profileHmm: d.profileHmm,
      displayName: stripRedundantPfamFromDisplayName(d.displayName, d.pfamAccession),
      familyCount: d.familyCount ?? null,
    })
  }

  const curatedByCath = new Map(CAT_DOMAIN_CATALOG.map(e => [e.cathId, e]))

  const models = []
  for (const [cathId, memberHmms] of byCath.entries()) {
    const curated = curatedByCath.get(cathId) || emptyCatEntry(cathId)
    memberHmms.sort((a, b) => (b.familyCount ?? -1) - (a.familyCount ?? -1))
    const totalFamilyCount = memberHmms.some(m => m.familyCount != null)
      ? memberHmms.reduce((sum, m) => sum + (m.familyCount ?? 0), 0)
      : null

    models.push({
      ...curated,
      memberHmms,
      memberCount: memberHmms.length,
      totalFamilyCount,
    })
  }

  // Any curated CAT entries with zero current member HMMs still show up (e.g. confirmed CAT
  // domain ahead of Pfam-catalog coverage) so curation work isn't hidden.
  for (const entry of CAT_DOMAIN_CATALOG) {
    if (!byCath.has(entry.cathId)) {
      models.push({ ...entry, memberHmms: [], memberCount: 0, totalFamilyCount: null })
    }
  }

  models.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
  return models
}
