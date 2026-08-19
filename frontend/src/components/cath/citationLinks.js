import React from "react"

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Pull a matchable "Surname ... YEAR" key out of a curated reference's citation label. */
function citationKeyFromReference(ref) {
  const label = String(ref?.label || "").trim()
  const surname = label.match(/^[A-Za-zÀ-ÖØ-öø-ÿ'-]+/)?.[0]
  const year = label.match(/\((\d{4})\)/)?.[1]
  if (!surname || !year || !ref.url) return null
  return { surname, year, url: ref.url }
}

/** Turns inline "(Author et al., YEAR)" citations in `text` into links to the matching curated
 *  reference's DOI, matched against this domain's own `references`. */
export function renderTextWithCitations(text, references, keyPrefix) {
  const keys = (references || []).map(citationKeyFromReference).filter(Boolean)
  if (!keys.length || !text) return text

  const pattern = keys
    .map(({ surname, year }) => {
      const s = escapeRegExp(surname)
      return [
        `\\([^()]*\\b${s}\\b[^()]*\\b${year}\\b[^()]*\\)`,
        `\\b${s}\\b(?:,?\\s+[A-Z][\\w.]*)*\\s*et al\\.?,?\\s*\\(${year}\\)`,
      ].join("|")
    })
    .join("|")
  const re = new RegExp(pattern, "g")

  const nodes = []
  let lastIndex = 0
  let match
  let i = 0
  while ((match = re.exec(text))) {
    const hit = keys.find(k => match[0].includes(k.surname) && match[0].includes(k.year))
    if (!hit) continue
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    nodes.push(
      <a
        key={`${keyPrefix}-cite-${i++}`}
        href={hit.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:text-accent-hover underline underline-offset-2"
      >
        {match[0]}
      </a>,
    )
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}
