import { PFAM_PROFILE_CATALOG } from "../data/pfamProfileCatalog"
import { resolveAtlasComponentForPfam } from "../data/pfamAtlasMap"

/**
 * @param {number} component
 * @returns {import("../data/pfamProfileCatalog.js").PfamProfileCatalogEntry[]}
 */
export function findCatalogEntriesByComponent(component) {
  const n = Number(component)
  if (!Number.isFinite(n)) return []
  return PFAM_PROFILE_CATALOG.filter(entry => {
    const comp = resolveAtlasComponentForPfam(entry.pfamAccession, entry.atlasComponent)
    return comp === n
  })
}

/**
 * Resolves a component to its `/cath-domains` URL via the first matching entry's `cathId`,
 * falling back to the dashboard if there's no match.
 * @param {number} component
 * @returns {string}
 */
export function cathDomainPathForComponent(component) {
  const matches = findCatalogEntriesByComponent(component)
  const cathId = matches[0]?.cathId
  return cathId ? `/cath-domains?cath=${encodeURIComponent(cathId)}` : "/cath-domains"
}

/**
 * @param {import("../data/pfamProfileCatalog.js").PfamProfileCatalogEntry[]} catalog
 * @param {number} component
 * @returns {import("../data/pfamProfileCatalog.js").PfamProfileCatalogEntry[]}
 */
export function domainsSharingComponent(catalog, component) {
  const n = Number(component)
  return catalog.filter(d => d.component === n)
}
