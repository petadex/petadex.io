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

/* ── Sequence search (GET /api/search/results/:jobId) ─────────────────────
 * Mirrors the backend's transformResults() and resultMetadata(), plus the
 * Tier-A enrichment contract of search_version 1.5.0. Every enrichment field
 * is optional: results written before 1.5.0 carry none of them.
 */

export type HitOrigin = "plasticome" | "ncbi_nr" | "logan"

/** Store-wide enrichment outcome. `null` (pre-1.5.0) reads as "unavailable". */
export type EnrichmentStatus = "ok" | "partial" | "failed" | "unavailable"

export type ClusterLevel = "c90" | "c60" | "c30"

/** Fields every origin's record carries. Cluster values are full domain_ids. */
interface HitMetadataBase {
  id: string
  /** "C001", or with a sub-component, "C014-3". */
  component: string | null
  c90: string | null
  c60: string | null
  c30: string | null
  n_cores: number | null
}

/**
 * Plasticome (PL…): characterized enzymes. List fields (enzyme_names,
 * substrates, ec, doi, activity_mode, pdb) are "; "-joined strings.
 */
export interface PlasticomeMetadata extends HitMetadataBase {
  enzyme_names?: string | null
  substrates?: string | null
  ec?: string | null
  organism?: string | null
  accession?: string | null
  cath?: string | null
  has_structure?: boolean | null
  pdb?: string | null
  doi?: string | null
  activity_mode?: string | null
  taxid?: number | null
  t_opt_c?: number | null
  ph_opt?: number | null
}

/** NCBI nr (NR…). */
export interface NcbiNrMetadata extends HitMetadataBase {
  organism?: string | null
  lca_rank?: string | null
  taxid?: number | null
  superkingdom?: string | null
  phylum?: string | null
  genus?: string | null
  n_accessions?: number | null
  taxon_conflict?: boolean | null
  core_complete?: boolean | null
  nearest_pl?: string | null
  /** Percent, 0–100. */
  pident_to_pl?: number | null
  n_assemblies?: number | null
  n_biosamples?: number | null
  frac_mag?: number | null
  any_isolate?: boolean | null
  isolation_source?: string | null
  host?: string | null
  country?: string | null
  prof_dominant?: string | null
  t_opt_c?: number | null
  ph_opt?: number | null
  oxygen?: string | null
}

/** Logan (LG…). Describes the samples the sequence was found in, not its organism. */
export interface LoganMetadata extends HitMetadataBase {
  n_biosamples?: number | null
  n_bioprojects?: number | null
  n_runs?: number | null
  support_tier?: "singleton" | "low" | "moderate" | "high" | null
  meas_temp_n?: number | null
  meas_temp_median?: number | null
  meas_ph_median?: number | null
  prof_dominant?: string | null
  /** Fraction, 0–1. */
  prof_dominant_share?: number | null
  /** Profile → BioSample count. */
  prof_hist?: Record<string, number> | null
  tenv?: number | null
  tenv_q25?: number | null
  tenv_q75?: number | null
  phenv?: number | null
}

export type HitMetadata = PlasticomeMetadata | NcbiNrMetadata | LoganMetadata

export interface SearchHit {
  rank: number
  accession: string
  target_id: string
  id_format: "petadex_id" | "v1.1"
  origin: HitOrigin | null
  name: string | null
  organism: string | null
  taxonomy: string | null
  percent_identity: number
  identity: number
  evalue: number
  bitscore: number
  query_coverage: number | null
  alignment_length: number
  query_start: number
  query_end: number
  target_start: number
  target_end: number
  target_sequence: string | null
  /** null when enrichment missed this hit, or the result predates 1.5.0. */
  metadata: HitMetadata | null
}

/** One characterized (PL) member of a cluster. */
export interface PlMember {
  id: string
  enzyme_names?: string | null
  substrates?: string | null
  ec?: string | null
  organism?: string | null
  has_structure?: boolean | null
  pdb?: string | null
  doi?: string | null
}

/**
 * Cluster card, keyed by full domain_id. c90/c30 carry the t1/t2/t3 tier
 * fields; c60 carries the composition fields. Both may carry `pl_members`.
 * Kept open-ended: the card set is wide and still moving between runs.
 */
export interface ClusterCard {
  component?: string | null
  pl_members?: PlMember[] | null
  [field: string]: unknown
}

export interface EnvironmentProfileShare {
  profile: string
  /** Logan sequences from this search weighted into the profile. */
  sequences: number
  /** Fractions, 0–1. */
  share: number
  background_share: number
  /** share / background_share. */
  x_expected: number
}

export interface SearchSummary {
  n_hits: number
  by_origin: Partial<Record<HitOrigin, number>>
  environments?: {
    unit: string
    n_sequences: number
    background_sequences: number
    profiles: EnvironmentProfileShare[]
  } | null
  clusters?: Partial<
    Record<
      ClusterLevel,
      {
        n: number
        top: {
          id: string
          domain_id: string
          hits: number
          by_origin: Partial<Record<HitOrigin, number>>
          best_pident: number
        }[]
      }
    >
  > | null
}

export interface SearchResultMetadata {
  query_header: string | null
  query_sequence: string | null
  query_length: number
  num_results: number
  result_depth: number | null
  database_size: number | null
  search_time_ms: number | null
  timestamp: string | null
  engine: string | null
  database_release: string | null
  database_version: string | null
  search_version: string | null
  enrichment_status: EnrichmentStatus | null
  metadata_version?: string | null
  clusters?: Partial<Record<ClusterLevel, Record<string, ClusterCard>>> | null
  summary?: SearchSummary | null
}

/** GET /api/search/results/:jobId */
export type SearchResultResponse =
  | { status: "processing"; session_id: string }
  | { status: "failed"; session_id: string; error: string }
  | {
      status: "completed"
      job_id: string
      session_id: string
      cached?: boolean
      results: SearchHit[]
      metadata: SearchResultMetadata
    }

/** One BioSample a Logan sequence was found in. */
export interface SequenceSample {
  biosample: string
  bioproject: string | null
  bioproject_title: string | null
  n_runs: number | null
  ka_max: number | null
  profile: string | null
  profile_evidence: string | null
  isolation_source: string | null
  env_broad_scale: string | null
  env_medium: string | null
  host: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  temperature_c: number | null
  ph: number | null
  /** [species name, share 0–1], largest first. */
  top_species: [string, number][] | null
}

/**
 * GET /api/sequence/:id/samples. `samples` is capped (200, by n_runs);
 * `n_biosamples` is the true total.
 */
export interface SequenceSamples {
  id: string
  n_biosamples: number
  n_bioprojects: number
  samples: SequenceSample[]
}
