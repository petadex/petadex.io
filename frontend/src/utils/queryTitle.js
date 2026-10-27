/**
 * Query titles for the search results page.
 *
 * A query's title is its FASTA header line, which has no length limit
 * upstream. Two wrinkles:
 *
 *  - The search form prefixes a bare paste with ">query", so that exact
 *    header means "untitled", not a name the user chose.
 *  - Results are cached by sequence alone, so a cached result carries the
 *    header of whoever searched that sequence FIRST. The form remembers the
 *    title this browser submitted, and the results page prefers it.
 */

// The header SequenceSearch inserts when the user pastes no header.
export const DEFAULT_QUERY_HEADER = "query"

const TITLES_KEY = "petadex_query_titles"
const MAX_STORED_TITLES = 100

/** The header line of a FASTA paste (without ">"), or null. */
export function headerOf(fasta) {
  const match = /^>([^\n\r]*)/.exec((fasta || "").trimStart())
  const header = match?.[1].trim()
  return header || null
}

function isUntitled(header) {
  const h = header?.trim()
  return !h || h === DEFAULT_QUERY_HEADER
}

/**
 * Short page name: the header's first word (its ID, as NCBI BLAST labels a
 * query), or "Untitled query · 290 aa".
 */
export function queryDisplayName(header, queryLength) {
  if (isUntitled(header)) {
    return queryLength ? `Untitled query · ${queryLength} aa` : "Untitled query"
  }
  return header.trim().split(/\s+/)[0]
}

/** Full title for hover text and the query bar; null when untitled. */
export function queryFullTitle(header) {
  return isUntitled(header) ? null : header.trim()
}

function readTitles() {
  try {
    return JSON.parse(localStorage.getItem(TITLES_KEY)) || {}
  } catch {
    return {}
  }
}

/** Remember the title this browser submitted for a search session. */
export function rememberQueryTitle(sessionId, header) {
  if (typeof window === "undefined" || !sessionId || isUntitled(header)) return
  try {
    const titles = readTitles()
    delete titles[sessionId]
    titles[sessionId] = header
    // Insertion order is age order; drop the oldest beyond the cap.
    const ids = Object.keys(titles)
    for (const id of ids.slice(0, Math.max(0, ids.length - MAX_STORED_TITLES)))
      delete titles[id]
    localStorage.setItem(TITLES_KEY, JSON.stringify(titles))
  } catch {
    // Storage unavailable: the stored result's header is used instead.
  }
}

/** The title this browser submitted for a session, if any. */
export function recallQueryTitle(sessionId) {
  if (typeof window === "undefined" || !sessionId) return null
  return readTitles()[sessionId] ?? null
}
