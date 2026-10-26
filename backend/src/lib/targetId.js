/**
 * DIAMOND subject-id formats, both live at once until the Upcycle cutover:
 *
 *   v1.1 (catalytic_orfs_v1.1_*, diamond/LATEST): pipe-delimited FASTA header
 *     orf_id|genbank|library_id|contig_id|orf_start|orf_end|orf_types
 *     "114593962||ERR1748848|1092|529|1933|0", "1|WP_054022242.1|||||"
 *
 *   v260701 (petadex_seq_v260701_*): the bare petadex_id, a two-letter source
 *     prefix + integer — "PL1" (PAZy/plasticome), "NR223" (NCBI nr),
 *     "LG113721682" (Logan).
 *
 * A v260701 id must never be read as a GenBank accession: "NR223" would feed
 * family enrichment and /sequence/NR223 links that resolve to nothing (or worse,
 * to an unrelated v1.1 record).
 */

const PETADEX_ID_RE = /^(PL|NR|LG)(\d+)$/;

export const PETADEX_ID_ORIGINS = {
  PL: 'plasticome',
  NR: 'ncbi_nr',
  LG: 'logan',
};

// { prefix, origin } for a v260701 petadex_id, else null.
export function parsePetadexId(targetId) {
  const m = PETADEX_ID_RE.exec(String(targetId ?? '').trim());
  if (!m) return null;
  return { prefix: m[1], origin: PETADEX_ID_ORIGINS[m[1]] };
}

export function isPetadexId(targetId) {
  return parsePetadexId(targetId) !== null;
}
