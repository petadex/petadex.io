#!/usr/bin/env node
/**
 * Build SRA hub aggregate tables owned by the app DB user.
 *
 * Note: creating indexes ON sra_metadata requires table ownership (often
 * unavailable to the app role). Aggregates still make search fast:
 *   - sra_organism_stats  (~144k rows)
 *   - sra_summary_stats   (1 row)
 *
 * Re-run after Denis reloads sra_metadata from S3.
 *
 * Usage: cd backend && npm run ensure-sra-indexes
 */
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  // Building aggregates over ~8M rows can take several minutes.
  statement_timeout: 0,
});

async function tryIndex(label, sql) {
  const t0 = Date.now();
  process.stdout.write(`${label}… `);
  try {
    await pool.query(sql);
    console.log(`ok (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (err) {
    if (err.code === '42501') {
      console.log(`skipped (need table owner): ${err.message}`);
      return;
    }
    if (err.code === '42P07' || /already exists/i.test(err.message)) {
      console.log(`exists (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      return;
    }
    console.log('FAIL');
    throw err;
  }
}

async function run(label, sql) {
  const t0 = Date.now();
  process.stdout.write(`${label}… `);
  await pool.query(sql);
  console.log(`ok (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

async function main() {
  console.log('Building SRA hub aggregates (and indexes if permitted)…');

  await tryIndex(
    'index sra_metadata(organism)',
    `CREATE INDEX IF NOT EXISTS sra_metadata_organism_idx ON sra_metadata (organism)`,
  );
  await tryIndex(
    'index sra_metadata(biosample)',
    `CREATE INDEX IF NOT EXISTS sra_metadata_biosample_idx ON sra_metadata (biosample)`,
  );
  await tryIndex(
    'index sra_metadata(lower(organism) pattern)',
    `CREATE INDEX IF NOT EXISTS sra_metadata_organism_lower_pattern_idx
       ON sra_metadata (lower(organism) text_pattern_ops)`,
  );

  await run(
    'sra_organism_stats',
    `DROP TABLE IF EXISTS sra_organism_stats;
     CREATE TABLE sra_organism_stats AS
       SELECT organism,
              COUNT(*)::int AS n_runs,
              COUNT(DISTINCT biosample) FILTER (WHERE biosample IS NOT NULL)::int AS n_biosamples
       FROM sra_metadata
       WHERE organism IS NOT NULL AND organism <> ''
       GROUP BY organism;
     CREATE INDEX sra_organism_stats_organism_idx ON sra_organism_stats (organism);
     CREATE INDEX sra_organism_stats_organism_lower_pattern_idx
       ON sra_organism_stats (lower(organism) text_pattern_ops);
     CREATE INDEX sra_organism_stats_n_runs_idx ON sra_organism_stats (n_runs DESC);`,
  );

  await run(
    'sra_summary_stats',
    `DROP TABLE IF EXISTS sra_summary_stats;
     CREATE TABLE sra_summary_stats AS
       SELECT
         (SELECT COUNT(*)::bigint FROM sra_metadata) AS n_runs,
         (SELECT COUNT(DISTINCT biosample)::bigint FROM sra_metadata WHERE biosample IS NOT NULL) AS n_biosamples,
         (SELECT COUNT(*)::bigint FROM sra_organism_stats) AS n_organisms,
         NOW() AS refreshed_at;`,
  );

  const { rows } = await pool.query(`SELECT * FROM sra_summary_stats`);
  console.log('summary:', rows[0]);
  const { rows: top } = await pool.query(
    `SELECT organism, n_runs FROM sra_organism_stats ORDER BY n_runs DESC LIMIT 3`,
  );
  console.log('top organisms:', top);
  console.log('Done. Restart/nodemon will pick up routes that use these tables.');
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
