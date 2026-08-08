/**
 * Fetch a protein's amino-acid sequence from the UniProt REST API (FASTA), for use in the
 * interactive feature viewer. UniProt sends CORS `*`, so this runs directly from the browser.
 */

/** @param {string} accession UniProt accession, e.g. "Q19462" */
export function uniprotFastaUrl(accession) {
  const acc = String(accession || "").trim()
  return `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(acc)}.fasta`
}

/** @param {string} accession */
export function uniprotEntryUrl(accession) {
  const acc = String(accession || "").trim()
  return `https://www.uniprot.org/uniprotkb/${encodeURIComponent(acc)}/entry`
}

/**
 * Parse a FASTA blob into a bare residue string (drops the header line and whitespace).
 * @param {string} fasta
 * @returns {string}
 */
export function parseFastaSequence(fasta) {
  return String(fasta || "")
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith(">"))
    .join("")
    .replace(/\s+/g, "")
    .toUpperCase()
}

/**
 * Fetch and parse a UniProt sequence.
 * @param {string} accession
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<string>} residue string (throws on HTTP error / empty)
 */
export async function fetchUniprotSequence(accession, options = {}) {
  const acc = String(accession || "").trim()
  if (!acc) throw new Error("Missing UniProt accession")
  const res = await fetch(uniprotFastaUrl(acc), { signal: options.signal })
  if (!res.ok) throw new Error(`UniProt HTTP ${res.status}`)
  const text = await res.text()
  const seq = parseFastaSequence(text)
  if (!seq) throw new Error("Empty UniProt sequence")
  return seq
}
