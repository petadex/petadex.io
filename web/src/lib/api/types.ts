/**
 * Response types for the Express API.
 *
 * These are hand-written on purpose. The plan calls for generating them from
 * `backend/docs/openapi.yaml`, but that spec currently documents 4 of roughly 25
 * mounted routes, so generation would produce a client that cannot reach most of
 * the API. Completing the spec and switching to generation is tracked as its own
 * task; until then, add a type here as each page in Phase 3 needs one, and keep
 * the field names exactly as the API returns them.
 */

/** GET /health — mounted at the API origin root, not under /api. */
export interface HealthResponse {
  status: "ok" | "error"
}

/**
 * GET /api/fastaa, GET /api/fastaa/:accession
 *
 * The table column is `aa_sequence`; the route renames it to `sequence` on the
 * way out. Do not "fix" this to match the schema.
 */
export interface Fastaa {
  accession: string
  sequence: string
  source: string | null
  synonyms: string | null
  date_entered: string | null
  in_gene_metadata: boolean | null
}

/** GET /api/enzymes — BLAST-NR enzymes joined to their taxonomy classification. */
export interface Enzyme {
  enzyme_id: number
  genbank_accession_id: string | null
  translated_sequence: string | null
  contig_id: string | null
  orf_start: number | null
  orf_end: number | null
  orf_type: string | null
  library_id: string | null
  family: string | null
  family_pid: number | null
  component: string | null
}

/** GET /api/gene-metadata/by-accession/:accession returns an array of these. */
export interface GeneMetadata {
  gene: string
  nickname: string | null
  accession: string | null
  orf_nt_sequence: string | null
  left_homology_arm: string | null
  right_homology_arm: string | null
  batch: string | null
  genetic_code: string | null
  date_entered: string | null
}

/** One point in the family-atlas UMAP embedding (~64k of them). */
export interface AtlasPoint {
  family_id: string
  umap_x: number
  umap_y: number
  family_size: number
  organism: string | null
  taxonomy: string | null
  country: string | null
  component: string | null
  cath_domain: string | null
  domain_name: string | null
}

/** Envelope returned by GET /api/atlas/umap and by the S3 atlas export. */
export interface AtlasResponse {
  points: AtlasPoint[]
}
