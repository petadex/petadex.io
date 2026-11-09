// backend/src/lib/v260701.js
//
// Read side of the v260701 sequence + cluster pages.
//
// Naming (see vault "Sequence and Cluster Pages - Data Check" and the naming plan): every sequence is keyed on
// its petadex_id (PL… / NR… / LG… + integer). A cluster is named after its centroid's petadex_id, and the level
// always travels with the name (/cluster/90/PL228). Each sequence belongs to exactly one cluster per level.
//
// Storage:
//   - Per-sequence records (sequence, core, clusters, provenance) live in a static block store on S3, because
//     298,687,346 rows do not fit the RDS instance:
//       s3://petadex/site/v260701/seq/{PL|NR|LG}/{n // BS}.ndjson.gz   (BS: PL/NR 1000, LG 4000)
//   - Member lists are one global ranking in which every cluster is a contiguous range:
//       s3://petadex/site/v260701/members/{rank // 10000}.tsv.gz        (petadex_id, length, c90, c60)
//   - RDS schema `v260701`: `clusters` (one row per level + cluster_id, with rank_start), `accessions`
//     (accession -> petadex_id), `release` (store metadata).
import { gunzipSync } from 'zlib'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { pool } from '../db.js'
import { getPublicReadS3Client } from './s3Public.js'

export const SCHEMA = process.env.V260701_SCHEMA || 'v260701'
const BUCKET = process.env.V260701_STORE_BUCKET || 'petadex'
const PREFIX = process.env.V260701_STORE_PREFIX || 'site/v260701'
const SEQ_BLOCK = { PL: 1000, NR: 1000, LG: 4000 }
const MEMBER_BLOCK = 10000

export const PETADEX_ID_RE = /^(PL|NR|LG)([1-9]\d{0,11})$/
export const LEVELS = [90, 60, 30]
export const SOURCE_LABELS = { PL: 'Plasticome', NR: 'NCBI nr', LG: 'Logan' }

/** { prefix, n } for a petadex_id, else null. */
export function parseId(id) {
  const m = PETADEX_ID_RE.exec(String(id ?? '').trim())
  return m ? { prefix: m[1], n: Number(m[2]) } : null
}

// Small LRU of decompressed blocks; a warm Lambda serves repeat views of a neighbourhood without S3.
const CACHE_MAX = 24
const cache = new Map()
function cacheGet(k) {
  if (!cache.has(k)) return undefined
  const v = cache.get(k); cache.delete(k); cache.set(k, v); return v
}
function cachePut(k, v) {
  cache.set(k, v)
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
}

async function readGzObject(key) {
  const hit = cacheGet(key)
  if (hit !== undefined) return hit
  let text = null
  try {
    const resp = await getPublicReadS3Client().send(new GetObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}/${key}` }))
    const bytes = Buffer.from(await resp.Body.transformToByteArray())
    text = gunzipSync(bytes).toString('utf8')
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404 || err?.$metadata?.httpStatusCode === 403) text = null
    else throw err
  }
  cachePut(key, text)
  return text
}

/** The stored record for one sequence, or null if the id is not in v260701. */
export async function fetchSequenceRecord(id) {
  const p = parseId(id)
  if (!p) return null
  const text = await readGzObject(`seq/${p.prefix}/${Math.floor(p.n / SEQ_BLOCK[p.prefix])}.ndjson.gz`)
  if (!text) return null
  const needle = `"id":"${p.prefix}${p.n}"`
  for (const line of text.split('\n')) {
    if (line.includes(needle)) return JSON.parse(line)
  }
  return null
}

/** Members [rankStart + offset, rankStart + offset + limit) of a cluster range. */
export async function fetchMemberRange(rankStart, offset, limit) {
  const lines = await readRankRange('members', rankStart, offset, limit)
  return lines.map(([id, length, c90, c60]) => ({ id, source: id.slice(0, 2), length: Number(length), c90, c60 }))
}

/**
 * Lines [rankStart + offset, rankStart + offset + limit) of a ranked TSV block store (`{prefix}/{rank // 10000}.tsv.gz`).
 * Every rank below the store's total lies in some block, so a missing block is a store fault (STORE_MISSING).
 */
async function readRankRange(prefix, rankStart, offset, limit) {
  const start = Number(rankStart) + offset
  const end = start + limit
  const out = []
  for (let b = Math.floor(start / MEMBER_BLOCK); b * MEMBER_BLOCK < end; b++) {
    const text = await readGzObject(`${prefix}/${b}.tsv.gz`)
    if (!text) throw Object.assign(new Error(`${prefix} block ${b} missing from the store`), { code: 'STORE_MISSING' })
    const lines = text.split('\n')
    const lo = Math.max(start, b * MEMBER_BLOCK) - b * MEMBER_BLOCK
    const hi = Math.min(end, (b + 1) * MEMBER_BLOCK) - b * MEMBER_BLOCK
    for (const line of lines.slice(lo, hi)) if (line) out.push(line.split('\t'))
  }
  return out
}

const optNum = v => (v === undefined || v === '' ? null : Number(v))

/**
 * Logan sequences (LGs) assembled from a BioSample's runs, highest contig k-mer abundance first.
 * @returns {Promise<null | {biosample, bioproject, n_lg, offset, limit, sequences: [{id, ka_max, n_runs}]}>}
 *   null when the BioSample carries no PETadex sequence.
 */
export async function fetchBiosampleLgs(biosample, offset = 0, limit = 100) {
  const { rows } = await pool.query(
    `SELECT biosample, bioproject, n_lg, rank_start FROM ${SCHEMA}.biosample_lgs WHERE biosample = $1`, [biosample])
  const r = rows[0]
  if (!r) return null
  const n = Number(r.n_lg)
  const take = Math.max(0, Math.min(limit, n - offset))
  const lines = take ? await readRankRange('biosample_lg', r.rank_start, offset, take) : []
  return {
    biosample: r.biosample, bioproject: r.bioproject, n_lg: n, offset, limit,
    sequences: lines.map(([id, ka, runs]) => ({ id, ka_max: optNum(ka), n_runs: optNum(runs) })),
  }
}

/**
 * Logan sequences (LGs) assembled from one sequencing run, highest contig k-mer abundance first.
 * @returns {Promise<null | {run, n_lg, offset, limit, sequences: [{id, ka}]}>}
 */
export async function fetchRunLgs(run, offset = 0, limit = 100) {
  const { rows } = await pool.query(`SELECT run, n_lg, rank_start FROM ${SCHEMA}.run_lgs WHERE run = $1`, [run])
  const r = rows[0]
  if (!r) return null
  const n = Number(r.n_lg)
  const take = Math.max(0, Math.min(limit, n - offset))
  const lines = take ? await readRankRange('run_lg', r.rank_start, offset, take) : []
  return { run: r.run, n_lg: n, offset, limit, sequences: lines.map(([id, ka]) => ({ id, ka: optNum(ka) })) }
}

const CLUSTER_COLS = `level, cluster_id, member_count, n_pl, n_nr, n_lg, n_components, rank_start, child_count,
  parent_60, parent_30, centroid_source, centroid_length, centroid_component, cath_fold, cath_code, domain_name,
  dominant_organism, n_organisms, n_with_organism, t3_n_biosamples, t3_n_bioprojects, t3_n_profiled, t3_n_in_universe,
  t3_prof_dominant, t3_prof_dominant_share, t3_prof_hist, t3_support_tier, t3_meas_temp_median, t3_meas_ph_median,
  t3_inf_tenv_median, t3_inf_phenv_median, t2_n_species, t2_n_genera, t2_phylum_mode, t1_enzymes, t1_substrates`

const num = v => (v == null ? null : Number(v))
function shapeCluster(r) {
  if (!r) return null
  const out = { ...r }
  for (const k of ['member_count', 'n_pl', 'n_nr', 'n_lg', 'n_components', 'rank_start', 'child_count', 'n_organisms',
    'n_with_organism', 't3_n_biosamples', 't3_n_bioprojects', 't3_n_profiled', 't3_n_in_universe', 't2_n_species',
    't2_n_genera']) out[k] = num(r[k])
  out.level = Number(r.level)
  return out
}

/** One cluster row, or null. */
export async function fetchCluster(level, clusterId) {
  const { rows } = await pool.query(
    `SELECT ${CLUSTER_COLS} FROM ${SCHEMA}.clusters WHERE level = $1 AND cluster_id = $2`, [level, clusterId])
  return shapeCluster(rows[0])
}

/** The 90 / 60 / 30 % cluster rows of one sequence, keyed by level. */
export async function fetchClustersOf({ c90, c60, c30 }) {
  const { rows } = await pool.query(
    `SELECT ${CLUSTER_COLS} FROM ${SCHEMA}.clusters
     WHERE (level, cluster_id) IN ((90, $1), (60, $2), (30, $3))`, [c90, c60, c30])
  const byLevel = {}
  for (const r of rows) byLevel[Number(r.level)] = shapeCluster(r)
  return byLevel
}

/**
 * Child clusters one level down (a 60 % cluster's 90 % clusters, a 30 % cluster's 60 % clusters), largest first,
 * keyset-paginated on (member_count desc, cluster_id).
 */
export async function fetchChildren(level, clusterId, { afterCount = null, afterId = null, limit = 50 } = {}) {
  const childLevel = level === 30 ? 60 : level === 60 ? 90 : null
  if (!childLevel) return { children: [], next: null }
  const parentCol = level === 30 ? 'parent_30' : 'parent_60'
  const params = [childLevel, clusterId, limit]
  let keyset = ''
  if (afterCount != null && afterId != null) {
    params.push(afterCount, afterId)
    keyset = `AND (member_count < $4 OR (member_count = $4 AND cluster_id > $5))`
  }
  const { rows } = await pool.query(
    `SELECT level, cluster_id, member_count, n_pl, n_nr, n_lg, child_count, centroid_source, centroid_length,
            dominant_organism, t3_prof_dominant
     FROM ${SCHEMA}.clusters
     WHERE level = $1 AND ${parentCol} = $2 ${keyset}
     ORDER BY member_count DESC, cluster_id
     LIMIT $3`, params)
  const children = rows.map(shapeCluster)
  const last = children[children.length - 1]
  return { children, next: children.length === limit ? { after_count: last.member_count, after_id: last.cluster_id } : null }
}

/** petadex_ids carrying an external accession (exact match, case-sensitive as stored, then upper-cased). */
export async function lookupAccession(q) {
  const { rows } = await pool.query(
    `SELECT accession, petadex_id FROM ${SCHEMA}.accessions WHERE accession = $1 OR accession = upper($1)
     ORDER BY petadex_id LIMIT 50`, [q])
  return rows
}

/** Stated BioSample annotation (public.biosample_annotation; coordinates are the stated lat_lon only). */
export async function fetchBiosampleAnnotation(biosample) {
  if (!biosample) return null
  const { rows } = await pool.query(
    `SELECT biosample, profile, profile_evidence, in_universe, isolation_source, env_broad_scale, env_medium, host,
            country_calc AS country, continent_calc AS continent, collection_year, latitude, longitude,
            temperature_c, ph, metagenome_label, species, library_source, assay_type
     FROM biosample_annotation WHERE biosample = $1`, [biosample])
  return rows[0] ?? null
}

/** Curated PDB structures for any of a sequence's accessions. */
export async function fetchPdbFor(accessions) {
  if (!accessions?.length) return []
  const { rows } = await pool.query(
    `SELECT pdb_id, accession, technique FROM pdb_accessions WHERE accession = ANY($1::text[]) ORDER BY pdb_id`,
    [accessions])
  return rows
}

/** Store metadata written by the loader (release, store prefix, block sizes, counts, build time). */
export async function fetchRelease() {
  const { rows } = await pool.query(`SELECT info FROM ${SCHEMA}.release WHERE id = 1`)
  return rows[0]?.info ?? null
}
