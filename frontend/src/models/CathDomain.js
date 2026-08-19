import { CATH_DOMAIN_CATALOG } from "../data/cathDomainCatalog"
import { stripRedundantPfamFromDisplayName } from "../utils/cathDomainSectionConfig"

const CATH_CLASS_LABELS = {
  "1": "Mainly alpha",
  "2": "Mainly beta",
  "3": "Alpha / beta",
  "4": "Few secondary structures",
  "6": "Special",
}

/** CATH Architecture/Topology names, verified against cathdb.info. Covers only the folds
 *  present in PETadex. */
const CATH_ARCHITECTURE_NAMES = {
  "2.40": "Beta Barrel",
  "2.60": "Sandwich",
  "3.40": "3-Layer(aba) Sandwich",
  "3.60": "4-Layer Sandwich",
  "3.90": "Alpha-Beta Complex",
}

const CATH_TOPOLOGY_NAMES = {
  "2.40.10": "Thrombin, subunit H",
  "2.60.40": "Immunoglobulin-like",
  "3.40.50": "Rossmann fold",
  "3.40.710": "Beta-lactamase",
  "3.60.70": "L-amino peptidase D-ALA esterase/amidase",
  "3.90.1300": "Amidase signature (AS) enzymes",
}

/** Curated "known functions" text per `cathId`, preferred over the live GenBank-derived list. */
const KNOWN_FUNCTIONS_OVERRIDE = {
  "3.40.50.1820":
    "esterases/lipases, proteases/peptidases, epoxide hydrolases, dehalogenases, thioesterases, haloperoxidases",
}

/** Fixed narrative sections rendered on every CATH domain page, in order. */
export const CATH_NARRATIVE_SECTIONS = [
  { key: "introduction", title: "Introduction" },
  { key: "structure", title: "Structure" },
  { key: "structuralArchitecture", title: "Structural architecture" },
  { key: "mechanism", title: "Mechanism" },
  { key: "petRelevance", title: "PET relevance" },
  { key: "plateActivity", title: "BHET halo assay activity" },
  { key: "representativeStructures", title: "Selected structures for comparison" },
  { key: "memberHmms", title: "HMMs used" },
  { key: "functionalDiversity", title: "Functional diversity" },
  { key: "interactingDomains", title: "Lids and intradomain structures" },
  { key: "hmmLogos", title: "HMM logos" },
  { key: "sequenceLogos", title: "Sequence logos" },
]

/**
 * @typedef {Object} CathDomainMemberHmm
 * @property {string} id             Pfam-level domain model id (for linking back to `?id=`)
 * @property {string} pfamAccession
 * @property {string} profileHmm
 * @property {string} displayName
 * @property {number|null} familyCount
 * @property {number|null} atlasComponent  Atlas component id; several Pfams may share one.
 */

function emptyCatalogEntry(cathId) {
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
 * Sums `familyCount` across member HMMs, deduping by atlas `component`.
 *
 * Fallback used only when atlas component data is missing; undercounts uncurated Pfams.
 * @param {CathDomainMemberHmm[]} memberHmms
 * @returns {number|null}
 */
function sumFamilyCountsDedupingSharedComponents(memberHmms) {
  if (!memberHmms.some(m => m.familyCount != null)) return null

  const seenComponents = new Set()
  let total = 0
  for (const m of memberHmms) {
    if (m.familyCount == null) continue
    if (m.atlasComponent != null) {
      if (seenComponents.has(m.atlasComponent)) continue
      seenComponents.add(m.atlasComponent)
    }
    total += m.familyCount
  }
  return total
}

/**
 * The authoritative per-fold family total: sums every atlas `/components` row sharing a
 * `cath_domain`, independent of which Pfams have been curated or mapped. Matches the number the
 * Atlas page itself shows.
 * @param {{ cath_domain?: string|null, family_count?: number|null }[]} atlasComponents
 * @returns {Map<string, number>}
 */
function sumFamilyCountByCathDomain(atlasComponents) {
  const totals = new Map()
  for (const row of atlasComponents || []) {
    const cathId = row?.cath_domain
    if (!cathId || row.family_count == null) continue
    totals.set(cathId, (totals.get(cathId) || 0) + Number(row.family_count))
  }
  return totals
}

/**
 * One CATH superfamily as shown on `/cath-domains`: curated catalog content (overview, mechanism,
 * references, ...) plus member HMMs and family totals, rolled up at build time.
 */
export class CathDomain {
  /** @param {Object} data Catalog entry fields plus memberHmms/memberCount/totalFamilyCount */
  constructor(data) {
    Object.assign(this, data)
  }

  isStub() {
    return !this.status || this.status === "stub"
  }

  hasCatalyticResidues() {
    return Boolean(this.catalyticResidues)
  }

  hasMechanismComment() {
    return Boolean(this.mechanismComment)
  }

  hasStructureAnnotations() {
    return Boolean(this.structureAnnotations)
  }

  classLabel() {
    const digit = String(this.cathId || "").split(".")[0]
    return CATH_CLASS_LABELS[digit] || "Structural class"
  }

  architectureName() {
    const parts = String(this.cathId || "").split(".")
    return CATH_ARCHITECTURE_NAMES[parts.slice(0, 2).join(".")] || null
  }

  topologyName() {
    const parts = String(this.cathId || "").split(".")
    return CATH_TOPOLOGY_NAMES[parts.slice(0, 3).join(".")] || null
  }

  /** Spelled-out C.A.T breakdown for the card's classification box. A `null` field means this
   *  fold's value hasn't been verified yet; the UI should simply omit that row rather than guess. */
  breakdown() {
    return {
      className: this.classLabel(),
      architectureName: this.architectureName(),
      topologyName: this.topologyName(),
    }
  }

  /** Curated "Examples of known functions" override text, or null if this fold has none. When
   *  null, the caller falls back to the live GenBank-derived list. */
  knownFunctionsOverride() {
    return KNOWN_FUNCTIONS_OVERRIDE[this.cathId] || null
  }

  /** Sidebar nav items; titles swap to match what's actually rendered for this fold (see
   *  CathDomainProseSections.js, which branches on these same flags). */
  sectionNavItems() {
    const hasCatalyticResidues = this.hasCatalyticResidues()
    const hasMechanismComment = this.hasMechanismComment()

    const items = [{ id: "cat-overview", label: "Overview" }]
    for (const { key, title } of CATH_NARRATIVE_SECTIONS) {
      let label = title
      if (key === "structuralArchitecture" && hasCatalyticResidues) label = "Catalytic Residues"
      if (key === "representativeStructures" && hasCatalyticResidues) label = "Secondary Residues"
      if (key === "mechanism" && hasMechanismComment) label = "Comment"
      items.push({ id: `cat-section-${key}`, label })
    }
    items.push({ id: "cat-refs-heading", label: "References" })
    return items
  }

  /**
   * Build every `CathDomain` for `/cath-domains`: group merged Pfam/HMM domain models by
   * `cathId`, then attach curated content from `CATH_DOMAIN_CATALOG` (or an auto-stub).
   *
   * @param {ReturnType<typeof import("../utils/mergeCatalogWithAtlas.js").buildDomainModelFromCatalog>[]} pfamDomainModels
   * @param {{ cath_domain?: string|null, family_count?: number|null }[]} [atlasComponents]
   *        Raw `/atlas/components` rows (same array passed to `mergeCatalogWithAtlasComponents`),
   *        used to compute the true per-fold family total instead of only the curated-Pfam subset.
   * @returns {CathDomain[]}
   */
  static buildAll(pfamDomainModels, atlasComponents = []) {
    /** @type {Map<string, CathDomainMemberHmm[]>} */
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
        atlasComponent: d.component ?? null,
      })
    }

    const curatedByCath = new Map(CATH_DOMAIN_CATALOG.map(e => [e.cathId, e]))
    const atlasTotalsByCath = sumFamilyCountByCathDomain(atlasComponents)

    const domains = []
    for (const [cathId, memberHmms] of byCath.entries()) {
      const curated = curatedByCath.get(cathId) || emptyCatalogEntry(cathId)
      memberHmms.sort((a, b) => (b.familyCount ?? -1) - (a.familyCount ?? -1))
      const totalFamilyCount = atlasTotalsByCath.has(cathId)
        ? atlasTotalsByCath.get(cathId)
        : sumFamilyCountsDedupingSharedComponents(memberHmms)

      domains.push(
        new CathDomain({
          ...curated,
          memberHmms,
          memberCount: memberHmms.length,
          totalFamilyCount,
        }),
      )
    }

    // Curated entries with zero current member HMMs still show up, keeping curation visible.
    for (const entry of CATH_DOMAIN_CATALOG) {
      if (!byCath.has(entry.cathId)) {
        domains.push(
          new CathDomain({
            ...entry,
            memberHmms: [],
            memberCount: 0,
            totalFamilyCount: atlasTotalsByCath.get(entry.cathId) ?? null,
          }),
        )
      }
    }

    // Atlas components whose cath_domain has no catalog entry yet (e.g. "TBDX" placeholders)
    // also get an auto-stub, keeping them visible instead of silently dropped. "NA" is atlas's
    // own unassigned bucket.
    const coveredCathIds = new Set(domains.map(m => m.cathId))
    for (const cathId of atlasTotalsByCath.keys()) {
      if (cathId === "NA" || coveredCathIds.has(cathId)) continue
      domains.push(
        new CathDomain({
          ...emptyCatalogEntry(cathId),
          memberHmms: [],
          memberCount: 0,
          totalFamilyCount: atlasTotalsByCath.get(cathId) ?? null,
        }),
      )
      coveredCathIds.add(cathId)
    }

    domains.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
    return domains
  }
}
