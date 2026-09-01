import { resolveCathDomain } from "./cathDomainResolve"
import { resolveAtlasComponentForPfam } from "../data/pfamAtlasMap"

/**
 * Build the Pfam-profile model consumed by `buildCatDomainModels` from the catalog entry plus an
 * optional atlas row. These models are never rendered on their own — the CATH-domain view groups
 * them by `cathId` into its "HMMs used" table and aggregate family count.
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

  return {
    id: catalogEntry.id,
    component: component != null && Number.isFinite(Number(component)) ? Number(component) : null,
    familyCount,
    cathId,
    displayName,
    profileHmm: `${catalogEntry.profileHmm} · ${catalogEntry.pfamAccession}`,
    pfamAccession: catalogEntry.pfamAccession,
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
