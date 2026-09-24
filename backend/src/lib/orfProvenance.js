// backend/src/lib/orfProvenance.js
//
// Provenance dispatch for a corpus ORF, branching on `orf_origins.orf_origin`
// (0=PAZy, 1=NR, 2=Logan) — the dispatcher table. Each block is a PROVENANCE
// FACT (where the sequence came from), never a homology/function claim. Shapes
// are folded into GET /api/orf/:orfId for first paint (see "03 - Frontend
// Wiring") and match the frontend ProvenancePanel sub-object keys
// (`pazy` / `nr` / `sra`).
import { pool } from '../db.js'

const NCBI_PROTEIN = acc =>
  `https://www.ncbi.nlm.nih.gov/protein/${encodeURIComponent(acc)}`
const NCBI_SRA = lib =>
  `https://www.ncbi.nlm.nih.gov/sra/?term=${encodeURIComponent(lib)}`

/** Drop null/empty values so the panel only renders populated fields. */
function clean(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && v !== '') out[k] = v
  }
  return out
}

/**
 * @param {number} orfId
 * @param {number} orfOrigin  0=PAZy 1=NR 2=Logan
 * @returns {Promise<{
 *   provenance: object | null,
 *   genbank_accession_id: string | null,
 *   orf_type: number | null,
 * }>}
 */
export async function fetchProvenance(orfId, orfOrigin) {
  // ── Logan (2): logan_catalytic_orfs → sra_metadata (acc = library_id) ──
  if (orfOrigin === 2) {
    const { rows } = await pool.query(
      `SELECT l.library_id, l.contig, l.orf_start, l.orf_end, l.orf_type,
              s.organism, s.bioproject, s.biosample, s.platform, s.assay_type,
              s.sra_study, s.geo_loc_name_country_calc, s.geo_loc_name_country_continent_calc,
              s.collection_date_sam, b.latitude, b.longitude
       FROM logan_catalytic_orfs l
       LEFT JOIN sra_metadata s ON s.acc = l.library_id
       -- Coordinates are the stated BioSample lat_lon. sra_metadata.latitude/
       -- longitude/biome are geocoded from free text (every US run lands on one
       -- point in West Virginia) and must never be served.
       LEFT JOIN biosample_annotation b ON b.biosample = s.biosample
       WHERE l.orf_id = $1`,
      [orfId],
    )
    const r = rows[0]
    if (!r) return { provenance: null, genbank_accession_id: null, orf_type: null }
    const provenance = clean({
      library_id: r.library_id,
      contig: r.contig,
      orf_start: r.orf_start,
      orf_end: r.orf_end,
      external_link: r.library_id ? NCBI_SRA(r.library_id) : null,
      sra: clean({
        organism: r.organism,
        bioproject: r.bioproject,
        biosample: r.biosample,
        platform: r.platform,
        assay: r.assay_type,
        study: r.sra_study,
        geo_loc_country: r.geo_loc_name_country_calc,
        geo_loc_continent: r.geo_loc_name_country_continent_calc,
        collection_date: r.collection_date_sam,
        lat: r.latitude,
        lon: r.longitude,
      }),
    })
    return { provenance, genbank_accession_id: null, orf_type: r.orf_type ?? null }
  }

  // ── NR (1) and PAZy (0): {nr,pazy}_catalytic_orfs → blast_nr_metadata ──
  const sourceTable = orfOrigin === 0 ? 'pazy_catalytic_orfs' : 'nr_catalytic_orfs'
  const subKey = orfOrigin === 0 ? 'pazy' : 'nr'
  const { rows } = await pool.query(
    `SELECT t.genbank_accession_id, b.organism, b.definition, b.taxonomy,
            b.journal, b.country
     FROM ${sourceTable} t
     LEFT JOIN blast_nr_metadata b
       ON b.genbank_accession_id = t.genbank_accession_id
     WHERE t.orf_id = $1`,
    [orfId],
  )
  const r = rows[0]
  if (!r) return { provenance: null, genbank_accession_id: null, orf_type: null }

  const acc = r.genbank_accession_id || null
  const provenance = clean({
    genbank_accession_id: acc,
    external_link: acc ? NCBI_PROTEIN(acc) : null,
    [subKey]: clean({
      organism: r.organism,
      definition: r.definition,
      taxonomy: r.taxonomy,
      journal: r.journal,
      country: r.country,
    }),
  })
  return { provenance, genbank_accession_id: acc, orf_type: null }
}
