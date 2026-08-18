/**
 * Link target for a structural component's CATH domain page.
 *
 * frontend/src/utils/cathDomainCatalogLookup.js resolves a stable `?id=`
 * against a 1,471-line catalog (frontend/src/data/cathDomainCatalog.js) when
 * exactly one profile matches a component, falling back to `?component=`
 * otherwise. That catalog is Phase-3-and-later content for a `/cath-domains`
 * page that doesn't exist in web/ yet, so this only ports the fallback leg —
 * revisit once the catalog and page are ported.
 */
export function cathDomainPathForComponent(component: number): string {
  return `/cath-domains?component=${component}`
}
