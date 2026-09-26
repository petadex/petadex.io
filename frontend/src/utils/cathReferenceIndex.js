// Pure citation-index helpers (no JSX/React) so they can be required directly
// by Node — e.g. gatsby-node.js onPreBuild loads cathReferencePlan.js, whose
// transitive imports must be parseable by Node's ESM loader. JSX-bearing
// rendering lives in cathCaptionLinks.js, which re-exports these.

export function normalizeUrl(u) {
  return String(u || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase()
}

/**
 * @param {string} urlToken
 * @param {{ label?: string, url?: string|null }[]} references
 */
export function refIndexForUrlToken(urlToken, references) {
  const n = normalizeUrl(urlToken)
  if (!n) return -1
  let exact = -1
  let fuzzy = -1
  references.forEach((r, i) => {
    if (!r?.url) return
    const ru = normalizeUrl(r.url)
    if (!ru) return
    if (n === ru) exact = i
    else if (fuzzy < 0 && (n.startsWith(ru) || ru.startsWith(n))) fuzzy = i
  })
  return exact >= 0 ? exact : fuzzy
}

/**
 * @param {string} pmc
 * @param {{ label?: string, url?: string|null }[]} references
 */
export function refIndexForPmcToken(pmc, references) {
  const id = String(pmc).toUpperCase()
  return references.findIndex(r => r?.url && String(r.url).toUpperCase().includes(id))
}

/**
 * @param {string} token
 * @param {{ label?: string, url?: string|null }[]} references
 * @param {"url"|"pmc"} kind
 */
export function findReferenceIndexInCatalog(token, references, kind) {
  if (kind === "pmc") return refIndexForPmcToken(token, references)
  return refIndexForUrlToken(token, references)
}
