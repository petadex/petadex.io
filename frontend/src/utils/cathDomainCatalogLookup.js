import { CATH_DOMAIN_CATALOG } from "../data/cathDomainCatalog"
import { resolveAtlasComponentForPfam } from "../data/pfamAtlasMap"

/**
 * @param {number} component
 * @returns {import("../data/cathDomainCatalog.js").CathDomainCatalogEntry[]}
 */
export function findCatalogEntriesByComponent(component) {
  const n = Number(component)
  if (!Number.isFinite(n)) return []
  return CATH_DOMAIN_CATALOG.filter(entry => {
    const comp = resolveAtlasComponentForPfam(entry.pfamAccession, entry.atlasComponent)
    return comp === n
  })
}

/**
 * Prefer stable ?id= when exactly one catalog profile maps to a component.
 * @param {number} component
 * @returns {string}
 */
export function cathDomainPathForComponent(component) {
  const matches = findCatalogEntriesByComponent(component)
  if (matches.length === 1) return `/cath-domains?id=${encodeURIComponent(matches[0].id)}`
  return `/cath-domains?component=${component}`
}
