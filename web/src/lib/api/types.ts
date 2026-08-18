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

/**
 * One point in the family-atlas UMAP embedding (64,730 of them).
 *
 * Field types verified against the live S3 export (2026-05-27): `family_id` and
 * `component` are JSON numbers, not the strings the counts elsewhere use.
 * `taxonomy` is a semicolon-delimited lineage, not a single rank.
 */
export interface AtlasPoint {
  family_id: number
  umap_x: number
  umap_y: number
  family_size: number
  organism: string | null
  taxonomy: string | null
  country: string | null
  component: number | null
  cath_domain: string | null
  domain_name: string | null
}

/**
 * GET /api/resolve/summary — the single-row `corpus_summary` matview.
 *
 * Every count crosses the wire as a string: they are Postgres `bigint`s, and
 * `pg` returns those as strings rather than silently losing precision past
 * 2^53. Parse before formatting; do not treat these as numbers.
 *
 * The route is a `SELECT *` pass-through, so columns may be added upstream
 * without a backend change. Fields are optional here for that reason.
 */
export interface CorpusSummary {
  id?: number
  /** Every catalytic ORF in the corpus. The widest number on the site. */
  catalytic_core_total?: string
  /** ORFs contributed by the Logan SRA assembly. */
  sra_total?: string
  /** ORFs contributed by NCBI NR. */
  nr_total?: string
  /** Experimentally characterized entries from PAZy. */
  pazy_total?: string
  clusters_90pid?: string
  clusters_60pid?: string
  clusters_30pid?: string
  total_enzymes?: string
  total_families?: string
  total_components?: string
  total_variants?: string
}

/** Envelope returned by GET /api/atlas/umap and by the S3 atlas export. */
export interface AtlasResponse {
  points: AtlasPoint[]
}
