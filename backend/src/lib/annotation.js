// backend/src/lib/annotation.js
//
// BioSample annotation layer — the read side of "02 Annotation Layer - Frontend".
// Every query is an indexed lookup against the annotation tables
// (biosample_annotation, cluster_annotation, cluster_profile_distribution,
// profile_summary) plus the existing logan_catalytic_orfs / sra_metadata /
// petadex_clustering joins. Nothing here reads S3 or Athena.
//
// Two rules from the contract are enforced here rather than in each caller:
//   - Coordinates come from biosample_annotation (the stated BioSample lat_lon)
//     ONLY. sra_metadata.latitude/longitude/biome are geocoded from free text
//     (every US run sits on one point in West Virginia) and are never selected.
//   - bigint columns come back from node-postgres as strings. They all fit in a
//     JS number (max orf_id ≈ 1.37e9), so they are converted here, once, with
//     `num()` — never by a global OID-20 type parser, which would silently change
//     the shape of every older route's response.
import { pool } from '../db.js'

/** bigint (string) → number, preserving NULL. */
const num = v => (v == null ? null : Number(v))

// ── Provenance (single + batch) ─────────────────────────────────────────────
// One row per requested orf_id, in request order, even when nothing resolves
// (duplicates included), so the batch response zips straight back onto the hits.
const PROVENANCE_SQL = `
  SELECT q.orf_id,
         l.library_id                    AS run,
         s.biosample,
         s.organism,
         s.geo_loc_name_country_calc     AS country,
         b.latitude,
         b.longitude,
         s.collection_date_sam           AS collection_date,
         s.bioproject,
         b.isolation_source,
         b.env_broad_scale,
         b.env_medium,
         b.profile,
         b.profile_evidence,
         b.profile_tier,
         b.in_universe,
         b.temperature_c                 AS stated_temperature_c,
         b.ph                            AS stated_ph,
         c."90pid_enzyme_id"             AS pid90,
         ca.dominant_profile             AS cluster_dominant_profile,
         ca.dominant_frac                AS cluster_dominant_frac,
         ca.n_orfs_profiled              AS cluster_n_orfs_profiled,
         b.snapshot_id
  FROM unnest($1::bigint[]) WITH ORDINALITY AS q(orf_id, ord)
  LEFT JOIN logan_catalytic_orfs l   ON l.orf_id = q.orf_id
  LEFT JOIN sra_metadata s           ON s.acc = l.library_id
  LEFT JOIN biosample_annotation b   ON b.biosample = s.biosample
  LEFT JOIN petadex_clustering c     ON c.orf_id = q.orf_id
  LEFT JOIN cluster_annotation ca    ON ca.pid90 = c."90pid_enzyme_id"
  ORDER BY q.ord`

function shapeProvenance(r) {
  return { ...r, orf_id: num(r.orf_id), pid90: num(r.pid90) }
}

/** @param {number[]} orfIds */
export async function fetchProvenanceRows(orfIds) {
  if (!orfIds.length) return []
  const { rows } = await pool.query(PROVENANCE_SQL, [orfIds])
  return rows.map(shapeProvenance)
}

// ── BioSample ───────────────────────────────────────────────────────────────
const BIOSAMPLE_SQL = `SELECT * FROM biosample_annotation WHERE biosample = $1`

const BIOSAMPLE_RUNS_SQL = `
  SELECT acc AS run, organism, assay_type, librarysource AS library_source,
         platform, collection_date_sam AS collection_date, releasedate
  FROM sra_metadata
  WHERE biosample = $1
  ORDER BY acc`

/**
 * @returns {Promise<{ annotation: object | null, runs: object[] }>}
 *   `annotation` is null when the accession is outside the annotation snapshot;
 *   the runs may still exist, so both halves are always returned.
 */
export async function fetchBiosample(accession) {
  const [a, r] = await Promise.all([
    pool.query(BIOSAMPLE_SQL, [accession]),
    pool.query(BIOSAMPLE_RUNS_SQL, [accession]),
  ])
  return { annotation: a.rows[0] ?? null, runs: r.rows }
}

// Keyset pagination on orf_id (never OFFSET): the largest sample has 218,510 ORFs.
const BIOSAMPLE_SEQUENCES_SQL = `
  SELECT l.orf_id, l.library_id AS run
  FROM logan_catalytic_orfs l
  WHERE l.library_id IN (SELECT acc FROM sra_metadata WHERE biosample = $1)
    AND l.orf_id > $2
  ORDER BY l.orf_id
  LIMIT $3`

/** @returns {Promise<{ sequences: {orf_id:number, run:string}[], next_after: number | null }>} */
export async function fetchBiosampleSequences(accession, after, limit) {
  const { rows } = await pool.query(BIOSAMPLE_SEQUENCES_SQL, [accession, after, limit])
  const sequences = rows.map(r => ({ orf_id: num(r.orf_id), run: r.run }))
  const next_after = sequences.length === limit ? sequences[sequences.length - 1].orf_id : null
  return { sequences, next_after }
}

// ── Cluster profiles ────────────────────────────────────────────────────────
const CLUSTER_PROFILES_SQL = `
  SELECT pid90, centroid_orf_id, n_orfs, n_orfs_profiled, dominant_profile,
         dominant_frac, n_profiles, shannon_entropy
  FROM cluster_annotation
  WHERE pid90 = $1`

const CLUSTER_PROFILE_DISTRIBUTION_SQL = `
  SELECT profile, n_orfs, n_biosamples, n_bioprojects
  FROM cluster_profile_distribution
  WHERE pid90 = $1
  ORDER BY n_orfs DESC, profile`

/**
 * @returns {Promise<{ summary: object | null, distribution: object[] }>}
 *   summary is null when the cluster is not in cluster_annotation at all. A row
 *   with n_orfs NULL means "no linked ORF" — kept NULL, never coerced to 0.
 */
export async function fetchClusterProfiles(pid90) {
  const [s, d] = await Promise.all([
    pool.query(CLUSTER_PROFILES_SQL, [pid90]),
    pool.query(CLUSTER_PROFILE_DISTRIBUTION_SQL, [pid90]),
  ])
  const row = s.rows[0]
  const summary = row
    ? { ...row, pid90: num(row.pid90), centroid_orf_id: num(row.centroid_orf_id) }
    : null
  return { summary, distribution: d.rows }
}

// ── Profiles ────────────────────────────────────────────────────────────────
const PROFILES_SQL = `
  SELECT profile, n_biosamples, n_in_universe, n_stated, n_inferred,
         n_form_template, n_none, n_bioprojects, snapshot_id
  FROM profile_summary`

const PROFILE_COUNT_COLUMNS = [
  'n_biosamples', 'n_in_universe', 'n_stated', 'n_inferred',
  'n_form_template', 'n_none', 'n_bioprojects',
]

function shapeProfile(r) {
  const out = { ...r }
  for (const k of PROFILE_COUNT_COLUMNS) out[k] = num(r[k])
  return out
}

export async function fetchProfiles() {
  const { rows } = await pool.query(`${PROFILES_SQL} ORDER BY n_biosamples DESC`)
  return rows.map(shapeProfile)
}

// BioSamples carrying a profile, in-universe only (an out-of-universe profile
// rests on the submission form template alone). Keyset on the biosample
// accession; measured ≤ 200 ms cold on the largest profiles.
const PROFILE_BIOSAMPLES_SQL = `
  SELECT biosample, profile_evidence, isolation_source, env_broad_scale,
         country_calc AS country, collection_year,
         latitude IS NOT NULL AND longitude IS NOT NULL AS has_coordinates
  FROM biosample_annotation
  WHERE profile = $1 AND in_universe AND biosample > $2
    AND ($4::text IS NULL OR profile_evidence = $4)
  ORDER BY biosample
  LIMIT $3`

/** @returns {Promise<{ biosamples: object[], next_after: string | null }>} */
export async function fetchProfileBiosamples(slug, after, limit, evidence = null) {
  const { rows } = await pool.query(PROFILE_BIOSAMPLES_SQL, [slug, after, limit, evidence])
  const next_after = rows.length === limit ? rows[rows.length - 1].biosample : null
  return { biosamples: rows, next_after }
}

export async function fetchProfile(slug) {
  const { rows } = await pool.query(`${PROFILES_SQL} WHERE profile = $1`, [slug])
  return rows[0] ? shapeProfile(rows[0]) : null
}
