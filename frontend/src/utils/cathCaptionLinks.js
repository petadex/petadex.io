import React from "react"

// Pure citation-index helpers live in a JSX-free module so Node can require
// them via cathReferencePlan.js (gatsby-node onPreBuild). Imported here for the
// renderer below and re-exported for existing consumers that import them from
// cathCaptionLinks.
import {
  refIndexForUrlToken,
  refIndexForPmcToken,
  findReferenceIndexInCatalog,
} from "./cathReferenceIndex.js"

export { refIndexForUrlToken, refIndexForPmcToken, findReferenceIndexInCatalog }

/**
 * @param {{ numbered?: boolean, linkClassName?: string }} [options]
 */
function resolveOptions(linkClassNameOrOptions) {
  if (typeof linkClassNameOrOptions === "string") {
    return { numbered: true, linkClassName: linkClassNameOrOptions }
  }
  return { numbered: true, linkClassName: undefined, ...linkClassNameOrOptions }
}

/**
 * Render caption with citations linking to `#cath-ref-N`. URLs / PMC ids that match the
 * references list render as numbered links like [1] when `numbered` is true and the ref
 * appears in `displayNumberByCatalogIndex`.
 *
 * @param {string} caption
 * @param {{ label?: string, url?: string|null }[]} references
 * @param {string | { numbered?: boolean, linkClassName?: string }} [linkClassNameOrOptions]
 * @param {Map<number, number>} [displayNumberByCatalogIndex] catalog index → in-text number
 */
export function renderCaptionWithReferenceAnchors(
  caption,
  references,
  linkClassNameOrOptions,
  displayNumberByCatalogIndex,
) {
  const refs = references || []
  const { numbered, linkClassName } = resolveOptions(linkClassNameOrOptions)
  const cls =
    linkClassName ||
    "text-accent font-semibold no-underline hover:underline decoration-accent/50 hover:text-accent-hover"

  const URL_SPLIT_RE = /(https?:\/\/[^\s)\]]+)/gi
  const segments = String(caption || "").split(URL_SPLIT_RE)
  const nodes = []

  const linkForCatalogIndex = catalogIndex => {
    const displayNum = displayNumberByCatalogIndex?.get(catalogIndex)
    if (displayNum == null) {
      const ref = refs[catalogIndex]
      if (ref?.url) {
        return (
          <a
            key={`uncited-${catalogIndex}-${nodes.length}`}
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cls}
          >
            {ref.url}
          </a>
        )
      }
      return null
    }
    return (
      <a
        key={`ref-${catalogIndex}-${nodes.length}`}
        href={`#cath-ref-${displayNum}`}
        className={cls}
        aria-label={`Reference ${displayNum}`}
      >
        {numbered ? `[${displayNum}]` : refs[catalogIndex]?.url || `[${displayNum}]`}
      </a>
    )
  }

  segments.forEach((seg, i) => {
    if (i % 2 === 0) {
      if (!seg) return
      const PMC_TOKEN = /\b(PMC\d+)\b/gi
      let last = 0
      let m
      while ((m = PMC_TOKEN.exec(seg)) !== null) {
        if (m.index > last) nodes.push(seg.slice(last, m.index))
        const pmc = m[1]
        const ri = refIndexForPmcToken(pmc, refs)
        if (ri >= 0) {
          const link = linkForCatalogIndex(ri)
          nodes.push(
            link ?? (
              <a
                key={`pmc-ext-${i}-${m.index}`}
                href={`https://pmc.ncbi.nlm.nih.gov/articles/${pmc}/`}
                target="_blank"
                rel="noopener noreferrer"
                className={cls}
              >
                {pmc}
              </a>
            ),
          )
        } else {
          nodes.push(pmc)
        }
        last = m.index + m[0].length
      }
      if (last < seg.length) nodes.push(seg.slice(last))
      return
    }

    const ri = refIndexForUrlToken(seg, refs)
    if (ri >= 0) {
      const link = linkForCatalogIndex(ri)
      nodes.push(
        link ?? (
          <a key={`url-ext-${i}`} href={seg} target="_blank" rel="noopener noreferrer" className={cls}>
            {seg}
          </a>
        ),
      )
    } else {
      nodes.push(
        <a key={`url-ext-${i}`} href={seg} target="_blank" rel="noopener noreferrer" className={cls}>
          {seg}
        </a>,
      )
    }
  })

  return nodes.length ? nodes : null
}
