// backend/src/lib/explore.js
//
// Read side of the /explore page (PETadex v260701).
//   - Release-level summaries (levels, folds, the Plasticome list) are static JSON in the site store,
//     s3://petadex/site/v260701/explore/{summary,plasticome}.json.gz, built by v260701 build stage s10_explore.
//   - Superfamily lists come from RDS v260701.clusters (level 30, 65,769 rows).
//   - Random picks: a uniformly random protein (random rank in the member order) or cluster.
import { pool } from '../db.js'
import { SCHEMA, readStoreJson, fetchMemberRange } from './v260701.js'

/** The parsed explore file `name` (summary | plasticome); throws STORE_MISSING if it is not in the store. */
export async function fetchExploreFile(name) {
  const obj = await readStoreJson(`explore/${name}.json.gz`)
  if (obj == null) throw Object.assign(new Error(`explore/${name} missing from the store`), { code: 'STORE_MISSING' })
  return obj
}

// Viewer-chosen sorts. Each is a plain fact about the cluster; none is a ranking of enzymes.
export const SUPERFAMILY_SORTS = {
  size: 'member_count',
  families: 'child_count',
  plasticome: 'n_pl',
  nr: 'n_nr',
  logan_share: '(n_lg / NULLIF(member_count, 0))',
  biosamples: 't3_n_biosamples',
}

const num = v => (v == null ? null : Number(v))
const LIST_NAMES = 3

/** The first few names of a "; "-separated list, and how many there are in all. */
function nameList(s) {
  const all = (s || '').split(';').map(x => x.trim()).filter(Boolean)
  return { names: all.slice(0, LIST_NAMES), n: all.length }
}

/**
 * Superfamilies (30 % clusters), optionally within one fold.
 * @returns {Promise<{total:number, rows:object[]}>}
 */
export async function fetchSuperfamilies({ fold = null, hasPlasticome = false, env = null, sort = 'size',
  order = 'desc', offset = 0, limit = 50 } = {}) {
  const where = ['level = 30']
  const params = []
  if (fold) { params.push(fold); where.push(`cath_fold = $${params.length}`) }
  if (hasPlasticome) where.push('n_pl > 0')
  if (env) { params.push(env); where.push(`t3_prof_dominant = $${params.length}`) }
  const col = SUPERFAMILY_SORTS[sort] || SUPERFAMILY_SORTS.size
  const dir = order === 'asc' ? 'ASC' : 'DESC'
  const w = where.join(' AND ')
  const [{ rows: [{ total }] }, { rows }] = await Promise.all([
    pool.query(`SELECT count(*)::bigint total FROM ${SCHEMA}.clusters WHERE ${w}`, params),
    pool.query(
      `SELECT cluster_id, member_count, n_pl, n_nr, n_lg, child_count, centroid_source, centroid_length,
              cath_fold, domain_name, cath_code, dominant_organism, t3_prof_dominant, t3_n_biosamples, t1_enzymes,
              t1_substrates
       FROM ${SCHEMA}.clusters WHERE ${w}
       ORDER BY ${col} ${dir} NULLS LAST, cluster_id
       OFFSET $${params.length + 1} LIMIT $${params.length + 2}`, [...params, offset, limit]),
  ])
  return {
    total: Number(total),
    rows: rows.map(r => {
      const enz = nameList(r.t1_enzymes)
      const subs = [...new Set((r.t1_substrates || '').split(';').map(x => x.trim()).filter(Boolean))].sort()
      return {
        id: r.cluster_id, level: 30,
        member_count: num(r.member_count), n_pl: num(r.n_pl), n_nr: num(r.n_nr), n_lg: num(r.n_lg),
        child_count: num(r.child_count), centroid_source: r.centroid_source, centroid_length: num(r.centroid_length),
        fold: r.cath_fold, domain_name: r.domain_name, cath_code: r.cath_code,
        dominant_organism: r.dominant_organism, env_dominant: r.t3_prof_dominant,
        n_biosamples: num(r.t3_n_biosamples),
        plasticome_names: enz.names, n_plasticome_names: enz.n, substrates: subs,
      }
    }),
  }
}

/** Environment profiles that are some superfamily's dominant profile, with how many superfamilies each covers. */
export async function fetchSuperfamilyEnvs(fold = null) {
  const params = fold ? [fold] : []
  const { rows } = await pool.query(
    `SELECT t3_prof_dominant env, count(*)::int n FROM ${SCHEMA}.clusters
     WHERE level = 30 AND t3_prof_dominant IS NOT NULL ${fold ? 'AND cath_fold = $1' : ''}
     GROUP BY 1 ORDER BY 1`, params)
  return rows
}

const SAMPLE_TRIES = 4

/** A uniformly random cluster id at `level` (90 | 60 | 30). `n` is the level's cluster count. */
export async function randomCluster(level, n) {
  if (level === 30) {
    const { rows } = await pool.query(
      `SELECT cluster_id FROM ${SCHEMA}.clusters WHERE level = 30 ORDER BY cluster_id OFFSET $1 LIMIT 1`,
      [Math.floor(Math.random() * n)])
    return rows[0]?.cluster_id ?? null
  }
  // 60 / 90 %: a deep OFFSET is slow (1.5 s at 90 %), so sample random table pages and pick a random row of the level.
  for (let i = 0; i < SAMPLE_TRIES; i++) {
    const { rows } = await pool.query(
      `SELECT cluster_id FROM ${SCHEMA}.clusters TABLESAMPLE SYSTEM (0.01) WHERE level = $1
       ORDER BY random() LIMIT 1`, [level])
    if (rows[0]) return rows[0].cluster_id
  }
  const { rows } = await pool.query(
    `SELECT cluster_id FROM ${SCHEMA}.clusters WHERE level = $1 ORDER BY cluster_id OFFSET $2 LIMIT 1`,
    [level, Math.floor(Math.random() * n)])
  return rows[0]?.cluster_id ?? null
}

/** A uniformly random protein: a random rank of the global member order (every sequence appears exactly once). */
export async function randomProtein(total) {
  const [m] = await fetchMemberRange(Math.floor(Math.random() * total), 0, 1)
  return m?.id ?? null
}
