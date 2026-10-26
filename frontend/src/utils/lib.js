export function formatSeq(seq, maxLen = 80) {
  if (!seq) return ""
  return seq.length > maxLen ? seq.slice(0, maxLen) + "…" : seq
}
export function cleanSequence(sequence) {
  return sequence
    .split("\n")
    .filter(line => !line.trim().startsWith(">"))
    .join("")
    .replace(/[\s\r]/g, "")
    .toUpperCase()
}

// v260701 subject ids are a bare petadex_id: two-letter source prefix +
// integer ("PL1", "NR223", "LG113721682"). Both formats are live until the
// Upcycle cutover, and a result can mix them, so detect per id.
const PETADEX_ID_RE = /^(PL|NR|LG)(\d+)$/

export const PETADEX_ID_ORIGIN_LABELS = {
  PL: "PAZy / Plasticome",
  NR: "NCBI nr",
  LG: "Logan",
}

/**
 * Parse a PETadex corpus FASTA header / DIAMOND subject id.
 *
 * Production headers follow the fixed schema (see "MWAS Experimental Design"
 * and the search runtime docs):
 *   orf_id | genbank_accession_id | library_id | contig_id | orf_start | orf_end | orf_types
 *
 * Examples:
 *   "1|WP_054022242.1|||||"               → orfId 1,        genbank WP_054022242.1
 *   "114593962||ERR1748848|1092|529|1933|0" → orfId 114593962, libraryId ERR1748848
 *   "WP_054022242.1"                       → no pipes; a bare accession (legacy/nr corpus)
 *   "LG113721682"                          → v260701 petadex_id (origin Logan); NOT an accession
 *
 * Returns null for empty input. `orfId` is only set when the first field is a
 * pure integer (the corpus native key); otherwise the value is treated as a
 * bare accession.
 *
 * @param {string | null | undefined} targetId
 * @returns {{
 *   orfId: string | null,
 *   genbank: string | null,
 *   libraryId: string | null,
 *   accession: string | null,
 *   petadexId: string | null,
 *   origin: string | null,
 * } | null}
 */
export function parseCorpusTargetId(targetId) {
  if (targetId == null) return null
  const raw = String(targetId).trim()
  if (!raw) return null

  const petadex = PETADEX_ID_RE.exec(raw)
  if (petadex) {
    return {
      orfId: null,
      genbank: null,
      libraryId: null,
      accession: null,
      petadexId: raw,
      origin: PETADEX_ID_ORIGIN_LABELS[petadex[1]],
    }
  }

  const parts = raw.split("|")
  const first = (parts[0] || "").trim()
  const genbank = (parts[1] || "").trim() || null
  const libraryId = (parts[2] || "").trim() || null

  // No pipes → bare token. A pure integer is still an orf_id; anything else is
  // treated as a GenBank-style accession.
  const orfId = /^\d+$/.test(first) ? first : null

  return {
    orfId,
    genbank,
    libraryId,
    // Best external/display accession: explicit genbank field, else a bare
    // non-numeric token (legacy accession-only headers).
    accession: genbank || (orfId ? null : first || null),
    petadexId: null,
    origin: null,
  }
}

/**
 * Canonical sequence-page href for a DIAMOND hit / corpus target id.
 * Corpus ORFs (numeric first field) → /sequence/orf/{orfId}. A bare accession
 * with no orf_id → /sequence/{accession} (curated path). Null if unparseable,
 * and null for v260701 petadex_ids: no page exists for them yet, and the v1.1
 * pages would resolve the wrong record.
 *
 * @param {string | null | undefined} targetId
 * @returns {string | null}
 */
export function sequenceHrefForTargetId(targetId) {
  const parsed = parseCorpusTargetId(targetId)
  if (!parsed) return null
  if (parsed.orfId) return `/sequence/orf/${encodeURIComponent(parsed.orfId)}`
  if (parsed.accession)
    return `/sequence/${encodeURIComponent(parsed.accession)}`
  return null
}

/**
 * Human-friendly label for a corpus target id (avoids dumping the raw
 * pipe-delimited header into the UI). Prefers the GenBank accession, then the
 * ORF id, then the library id.
 *
 * @param {string | null | undefined} targetId
 * @returns {string}
 */
export function formatTargetIdLabel(targetId) {
  const parsed = parseCorpusTargetId(targetId)
  if (!parsed) return String(targetId ?? "")
  if (parsed.petadexId) return parsed.petadexId
  if (parsed.genbank) return parsed.genbank
  if (parsed.orfId) return `ORF ${parsed.orfId}`
  if (parsed.accession) return parsed.accession
  if (parsed.libraryId) return parsed.libraryId
  return String(targetId ?? "")
}
