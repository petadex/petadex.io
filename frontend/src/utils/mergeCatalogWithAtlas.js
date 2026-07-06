import { resolveCathDomain } from "./cathDomainResolve"
import { resolveAtlasComponentForPfam } from "../data/pfamAtlasMap"

/**
 * Normalize catalog figures: strings become { caption }.
 * @param {(string|{ caption: string, imageSrc?: string|null, alt?: string })[]|undefined} raw
 * @returns {{ caption: string, imageSrc?: string|null, alt?: string }[]}
 */
export function normalizeFigureList(raw) {
  if (!raw?.length) return []
  return raw.map(f =>
    typeof f === "string"
      ? { caption: f, imageSrc: null, alt: "" }
      : {
          caption: f.caption || "",
          imageSrc: f.imageSrc ?? null,
          alt: f.alt ?? "",
        },
  )
}

/**
 * Build the unified domain model for `/cath-domains` from curated catalog + optional atlas row.
 *
 * @param {import("../data/cathDomainCatalog.js").CathDomainCatalogEntry} catalogEntry
 * @param {{ component: number, cath_domain?: string|null, domain_name?: string|null, family_count: number }|null} atlasRow
 */
export function buildDomainModelFromCatalog(catalogEntry, atlasRow) {
  const component =
    atlasRow?.component ??
    resolveAtlasComponentForPfam(catalogEntry.pfamAccession, catalogEntry.atlasComponent)

  const cathFromAtlas = atlasRow?.cath_domain
  const resolvedCath = resolveCathDomain(component ?? -1, cathFromAtlas)
  const cathId =
    resolvedCath !== "Unknown" && resolvedCath != null ? resolvedCath : catalogEntry.cathId

  const familyCount =
    atlasRow != null && atlasRow.family_count != null ? atlasRow.family_count : null

  const displayName =
    (atlasRow?.domain_name && String(atlasRow.domain_name).trim()) || catalogEntry.displayName

  const profileHmmLabel = `${catalogEntry.profileHmm} · ${catalogEntry.pfamAccession}`

  let sourceLabel = "Pfam literature review (PETadex)"
  if (familyCount != null && Number.isFinite(Number(familyCount))) {
    sourceLabel = `PETadex family atlas (${Number(familyCount).toLocaleString()} families)`
  }

  const figures = normalizeFigureList(catalogEntry.figures)

  return {
    id: catalogEntry.id,
    component: component != null && Number.isFinite(Number(component)) ? Number(component) : null,
    familyCount,
    cathId,
    displayName,
    profileHmm: profileHmmLabel,
    pfamAccession: catalogEntry.pfamAccession,
    sourceLabel,
    lastUpdated: catalogEntry.lastUpdated,
    summary: catalogEntry.summary,
    moreInformation: catalogEntry.moreInformation,
    moreInformationFigure: catalogEntry.moreInformationFigure,
    postLocalizationTable: catalogEntry.postLocalizationTable,
    preLocalizationTable: catalogEntry.preLocalizationTable,
    prePtmsTable: catalogEntry.prePtmsTable,
    postCatalyticResiduesTable: catalogEntry.postCatalyticResiduesTable,
    postStructureTable: catalogEntry.postStructureTable,
    localization: catalogEntry.localization,
    ptms: catalogEntry.ptms,
    catalyticResidues: catalogEntry.catalyticResidues,
    mechanisms: catalogEntry.mechanisms,
    interactingDomains: catalogEntry.interactingDomains,
    function: catalogEntry.function,
    regulation: catalogEntry.regulation,
    variability: catalogEntry.variability,
    structure: catalogEntry.structure,
    labNotes: catalogEntry.labNotes,
    figures,
    figureCaptions: figures.map(f => f.caption),
    references: catalogEntry.references?.length ? catalogEntry.references : [],
    legendSegments:
      catalogEntry.legendSegments?.length > 0
        ? catalogEntry.legendSegments
        : [{ label: "Representative CATH", cathId }],
    pdbIds: Array.isArray(catalogEntry.pdbIds) ? catalogEntry.pdbIds : [],
    resourceLinks: Array.isArray(catalogEntry.resourceLinks) ? catalogEntry.resourceLinks : [],
    hmmLogoImage: catalogEntry.hmmLogoImage ?? null,
  }
}

/**
 * Merge full catalog with atlas `/components` array.
 * @param {import("../data/cathDomainCatalog.js").CathDomainCatalogEntry[]} catalog
 * @param {{ component: number, cath_domain?: string|null, domain_name?: string|null, family_count: number }[]} atlasComponents
 */
export function mergeCatalogWithAtlasComponents(catalog, atlasComponents) {
  const byComponent = new Map()
  for (const row of atlasComponents) {
    if (row && row.component != null) byComponent.set(Number(row.component), row)
  }

  return catalog.map(entry => {
    const resolvedComp = resolveAtlasComponentForPfam(entry.pfamAccession, entry.atlasComponent)
    const atlasRow =
      resolvedComp != null ? byComponent.get(Number(resolvedComp)) ?? null : null
    return buildDomainModelFromCatalog(entry, atlasRow)
  })
}
