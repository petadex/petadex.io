/**
 * Detect optional relations (materialized views / views) present in production
 * but sometimes absent on trimmed RDS snapshots. Cached for process lifetime.
 */

let cache = null;

/**
 * @param {import('pg').Pool} pool
 * @returns {Promise<{
 *   familyAtlas: boolean,
 *   enzymeStatsOverview: boolean,
 *   enzymeFamilySummary: boolean,
 *   signalp6OrfPredictions: boolean,
 *   deeploc21OrfPredictions: boolean,
 *   orfBiochemicalProperties: boolean,
 * }>}
 */
export async function getSchemaFlags(pool) {
  if (cache) return cache;
  const { rows } = await pool.query(`
    SELECT c.relname, c.relkind
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY($1::text[])
      AND c.relkind IN ('r', 'v', 'm', 'p')
  `, [[
    'family_atlas',
    'enzyme_stats_overview',
    'enzyme_family_summary',
    'signalp6_orf_predictions',
    'deeploc21_orf_predictions',
    'orf_biochemical_properties',
  ]]);
  const found = new Set(rows.map((r) => r.relname));
  cache = {
    familyAtlas: found.has('family_atlas'),
    enzymeStatsOverview: found.has('enzyme_stats_overview'),
    enzymeFamilySummary: found.has('enzyme_family_summary'),
    signalp6OrfPredictions: found.has('signalp6_orf_predictions'),
    deeploc21OrfPredictions: found.has('deeploc21_orf_predictions'),
    orfBiochemicalProperties: found.has('orf_biochemical_properties'),
  };
  return cache;
}
