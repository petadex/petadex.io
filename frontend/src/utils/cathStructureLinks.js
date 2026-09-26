/**
 * Build PETadex-internal navigation links for a CATH domain profile.
 *
 * @param {{
 *   cathId?: string,
 *   component?: number|null,
 *   pdbIds?: string[],
 *   resourceLinks?: { label: string, url: string }[],
 * }} domain
 * @returns {{
 *   atlas: { label: string, url: string } | null,
 *   enzymes: { label: string, url: string } | null,
 *   extras: { label: string, url: string, internal: boolean }[],
 * }}
 */
export function buildCathDomainPetadexLinks(domain) {
  const extras = []
  const seen = new Set()

  for (const x of domain.resourceLinks || []) {
    if (!x?.url || !x?.label || seen.has(x.url)) continue
    seen.add(x.url)
    extras.push({
      label: x.label,
      url: x.url,
      internal: x.url.startsWith("/"),
    })
  }

  let atlas = null
  if (domain.component != null && Number.isFinite(Number(domain.component))) {
    const n = Number(domain.component)
    atlas = {
      label: `Family atlas (component ${n})`,
      url: `/atlas?component=${n}`,
    }
  } else {
    const cath = domain.cathId
    if (cath && /^(\d+\.){3}\d+$/.test(String(cath).trim())) {
      const c = String(cath).trim()
      atlas = {
        label: `Family atlas (CATH ${c})`,
        url: `/atlas?cath=${encodeURIComponent(c)}`,
      }
    } else {
      atlas = { label: "Family atlas", url: "/atlas" }
    }
  }

  let enzymes = null
  if (domain.component != null && Number.isFinite(Number(domain.component))) {
    const n = Number(domain.component)
    enzymes = {
      label: `Browse enzymes (component ${n})`,
      url: `/enzymes?component=${n}`,
    }
  }

  return { atlas, enzymes, extras }
}
