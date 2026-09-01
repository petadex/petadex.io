#!/usr/bin/env node
/**
 * One-shot CSV → RDS loader for the PETadex Organism Atlas.
 * Run from your local machine or a CI job, never from the Lambda.
 *
 * Prerequisites:
 *   1. Run backend/migrations/002_organisms.sql on the RDS instance first.
 *   2. Ensure csv-parse is installed:  cd backend && npm install
 *
 * Usage:
 *   DATABASE_URL=postgres://petadex:<PASS>@petadex.c6dcs4m8a2uy.us-east-1.rds.amazonaws.com:5432/petadex \
 *     node backend/scripts/migrate-organisms.js organisms_full.csv organism_entries.csv
 *
 * Both CSV files are in the Replit workspace root and can be downloaded from there.
 * The script is idempotent: organisms use ON CONFLICT DO UPDATE; entries are
 * truncated then reloaded so a re-run always leaves a clean state.
 */

import { createReadStream } from 'fs';
import { parse }            from 'csv-parse';
import pg                   from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL env var is required.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const [,, organismsFile = 'organisms_full.csv', entriesFile = 'organism_entries.csv'] =
  process.argv;

// ── Helpers ───────────────────────────────────────────────────────────────────

function bool(v) {
  if (v === null || v === undefined || v === '') return null;
  return v === '1' || v === 'true' || v === 'True' || v === 't';
}
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function txt(v) { return (v === '' || v === undefined || v === null) ? null : v; }
function jsonText(v, field, organism) {
  const value = txt(v);
  if (value === null) return null;
  try {
    JSON.parse(value);
    return value;
  } catch {
    throw new Error(`Invalid JSON in ${field} for organism "${organism || 'unknown'}"`);
  }
}

// ── Organism loader ───────────────────────────────────────────────────────────
// INSERT column list, 68 columns, matches flat() array exactly.
const ORG_COLS = `
  taxid, name, rank, phylum, class, "order", family, genus, confidence_tier,
  n_entries, n_plastics, n_bioplastic, n_conventional,
  bioplastic_relevant, has_sequence, has_enzyme, has_genbank,
  plastics, plastics_cls, first_year, last_year, isolation_envs, isolation_locs,
  is_extra, is_expanded, is_thermo, is_rt,
  genome_size, genome_level, genome_acc, genome_name, genome_n50, genome_cov, genome_taxid,
  bd_found, bd_id, bd_url, bd_temp, bd_ph, bd_oxy, bd_morph, bd_iso,
  pm_plastic, pm_total, sra_rc, sra_plat, sra_strat, sra_bases, sra_dates,
  nov, nov_breadth, nov_rarity, nov_recency, nov_gap, nov_last_yr, nov_n_plastics,
  rt_max, rt_mean, pp,
  ch_pl_labels, ch_pl_values, ch_pl_colors,
  ch_yr_labels, ch_yr_values, ch_ev_labels, ch_ev_values, ch_fam_labels, ch_fam_values
`.trim();

const NUM_ORG_COLS = 68;
// PostgreSQL bind-param limit is 65535; keep well below it.
const ORG_BATCH   = Math.floor(65000 / NUM_ORG_COLS); // 955

function rowToOrgFlat(r) {
  return [
    num(r.taxid),         r.name,                r.rank,           r.phylum,
    r.class,              r.order,               r.family,         r.genus,
    r.confidence_tier,
    num(r.n_entries),     num(r.n_plastics),     num(r.n_bioplastic),  num(r.n_conventional),
    bool(r.bioplastic_relevant), bool(r.has_sequence), bool(r.has_enzyme), bool(r.has_genbank),
    jsonText(r.plastics, 'plastics', r.name), jsonText(r.plastics_cls, 'plastics_cls', r.name),
    num(r.first_year),    num(r.last_year),
    txt(r.isolation_envs), txt(r.isolation_locs),
    bool(r.is_extra),     bool(r.is_expanded),   bool(r.is_thermo),  bool(r.is_rt),
    num(r.genome_size),   txt(r.genome_level),   txt(r.genome_acc),
    txt(r.genome_name),   num(r.genome_n50),     num(r.genome_cov),  num(r.genome_taxid),
    bool(r.bd_found),     num(r.bd_id),          txt(r.bd_url),
    txt(r.bd_temp),       txt(r.bd_ph),          txt(r.bd_oxy),      txt(r.bd_morph),  txt(r.bd_iso),
    num(r.pm_plastic),    num(r.pm_total),
    num(r.sra_rc),        txt(r.sra_plat),       txt(r.sra_strat),   num(r.sra_bases), txt(r.sra_dates),
    num(r.nov),           num(r.nov_breadth),    num(r.nov_rarity),  num(r.nov_recency),
    num(r.nov_gap),       num(r.nov_last_yr),    num(r.nov_n_plastics),
    num(r.rt_max),        num(r.rt_mean),        jsonText(r.pp, 'pp', r.name),
    jsonText(r.ch_pl_labels, 'ch_pl_labels', r.name),
    jsonText(r.ch_pl_values, 'ch_pl_values', r.name),
    jsonText(r.ch_pl_colors, 'ch_pl_colors', r.name),
    jsonText(r.ch_yr_labels, 'ch_yr_labels', r.name),
    jsonText(r.ch_yr_values, 'ch_yr_values', r.name),
    jsonText(r.ch_ev_labels, 'ch_ev_labels', r.name),
    jsonText(r.ch_ev_values, 'ch_ev_values', r.name),
    jsonText(r.ch_fam_labels, 'ch_fam_labels', r.name),
    jsonText(r.ch_fam_values, 'ch_fam_values', r.name),
  ];
}

async function loadOrganismsToStage(client, file) {
  console.log(`\nLoading organisms from ${file} into staging table…`);
  await client.query(`
    CREATE TEMP TABLE organisms_stage
    (LIKE organisms INCLUDING DEFAULTS)
    ON COMMIT PRESERVE ROWS
  `);

  let rows = [], total = 0;

  async function flush() {
    if (!rows.length) return;
    const n    = rows.length;
    const vals = rows.map((_, i) => {
      const b = i * NUM_ORG_COLS;
      return '(' + Array.from({ length: NUM_ORG_COLS }, (__, j) => `$${b + j + 1}`).join(',') + ')';
    }).join(',');
    const flat = rows.flatMap(rowToOrgFlat);
    await client.query(
      `INSERT INTO organisms_stage (${ORG_COLS}) VALUES ${vals}`,
      flat
    );
    total += n;
    process.stdout.write(`\r  ${total.toLocaleString()} rows…`);
    rows = [];
  }

  const parser = createReadStream(file).pipe(
    parse({ columns: true, trim: true, skip_empty_lines: true, relax_column_count: true })
  );
  for await (const row of parser) {
    rows.push(row);
    if (rows.length >= ORG_BATCH) await flush();
  }
  await flush();
  console.log(`\n  ${total.toLocaleString()} organisms staged`);
  return total;
}

// ── Entry loader ──────────────────────────────────────────────────────────────
// CSV header: id,organism,plastic,cls,year,enzyme,family,has_seq,has_gb,env,loc,doi
const NUM_ENT_COLS = 11; // organism,plastic,cls,year,enzyme,family,has_seq,has_gb,env,loc,doi
const ENT_BATCH    = Math.floor(65000 / NUM_ENT_COLS); // 5909

async function loadEntriesToStage(client, file) {
  console.log(`\nLoading organism_entries from ${file} into staging table…`);
  await client.query(`
    CREATE TEMP TABLE organism_entries_stage
    (LIKE organism_entries INCLUDING DEFAULTS)
    ON COMMIT PRESERVE ROWS
  `);

  let rows = [], total = 0;

  async function flush() {
    if (!rows.length) return;
    const vals = rows.map((_, i) => {
      const b = i * NUM_ENT_COLS;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11})`;
    }).join(',');
    const flat = rows.flatMap(r => [
      r.organism, txt(r.plastic), txt(r.cls), num(r.year),
      txt(r.enzyme), txt(r.family),
      bool(r.has_seq), bool(r.has_gb),
      txt(r.env), txt(r.loc), txt(r.doi),
    ]);
    await client.query(
      `INSERT INTO organism_entries_stage
         (organism,plastic,cls,year,enzyme,family,has_seq,has_gb,env,loc,doi)
       VALUES ${vals}`,
      flat
    );
    total += rows.length;
    process.stdout.write(`\r  ${total.toLocaleString()} entries…`);
    rows = [];
  }

  const parser = createReadStream(file).pipe(
    parse({ columns: true, trim: true, skip_empty_lines: true })
  );
  for await (const row of parser) {
    rows.push(row);
    if (rows.length >= ENT_BATCH) await flush();
  }
  await flush();
  console.log(`\n  ${total.toLocaleString()} entries staged`);
  return total;
}

async function validateStages(client) {
  const [{ rows: duplicateNames }, { rows: orphanEntries }] = await Promise.all([
    client.query(`
      SELECT name
      FROM organisms_stage
      GROUP BY name
      HAVING COUNT(*) > 1
      LIMIT 5
    `),
    client.query(`
      SELECT DISTINCT e.organism
      FROM organism_entries_stage e
      LEFT JOIN organisms_stage o ON o.name = e.organism
      WHERE o.taxid IS NULL
      LIMIT 5
    `),
  ]);

  if (duplicateNames.length) {
    throw new Error(
      `Refusing to load ambiguous organism names: ${duplicateNames.map(r => r.name).join(', ')}`
    );
  }
  if (orphanEntries.length) {
    throw new Error(
      `Refusing to load PlasticDB entries with no matching organism: ${orphanEntries.map(r => r.organism).join(', ')}`
    );
  }
}

async function replaceLiveTables(client) {
  console.log('\nValidating and atomically replacing live atlas tables…');
  const [{ rows: stagedOrganisms }, { rows: stagedEntries }] = await Promise.all([
    client.query('SELECT COUNT(*) AS count FROM organisms_stage'),
    client.query('SELECT COUNT(*) AS count FROM organism_entries_stage'),
  ]);
  const expectedOrganisms = Number(stagedOrganisms[0].count);
  const expectedEntries = Number(stagedEntries[0].count);

  await client.query('BEGIN');
  try {
    // This is intentionally the only exclusive lock window: CSV parsing and
    // validation happen in staging before production tables are touched.
    await client.query('LOCK TABLE organisms, organism_entries IN ACCESS EXCLUSIVE MODE');
    await client.query('TRUNCATE organism_entries RESTART IDENTITY');
    await client.query('TRUNCATE organisms');
    await client.query(`
      INSERT INTO organisms (${ORG_COLS})
      SELECT ${ORG_COLS}
      FROM organisms_stage
    `);
    await client.query(`
      INSERT INTO organism_entries (organism,plastic,cls,year,enzyme,family,has_seq,has_gb,env,loc,doi)
      SELECT organism,plastic,cls,year,enzyme,family,has_seq,has_gb,env,loc,doi
      FROM organism_entries_stage
    `);
    const [{ rows: loadedOrganisms }, { rows: loadedEntries }] = await Promise.all([
      client.query('SELECT COUNT(*) AS count FROM organisms'),
      client.query('SELECT COUNT(*) AS count FROM organism_entries'),
    ]);
    if (
      Number(loadedOrganisms[0].count) !== expectedOrganisms ||
      Number(loadedEntries[0].count) !== expectedEntries
    ) {
      throw new Error('Live atlas row count does not match the validated staging data');
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
  console.log(`  atlas tables replaced (${expectedOrganisms.toLocaleString()} organisms, ${expectedEntries.toLocaleString()} entries)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('PETadex organism migration');
console.log('  Organisms :', organismsFile);
console.log('  Entries   :', entriesFile);
console.log('  Target    :', process.env.DATABASE_URL?.replace(/:\/\/[^@]+@/, '://***@'));

// A dedicated client is essential: PostgreSQL temporary staging tables are
// session-scoped, and a pool can otherwise switch connections between batches.
const client = await pool.connect();
try {
  await loadOrganismsToStage(client, organismsFile);
  await loadEntriesToStage(client, entriesFile);
  await validateStages(client);
  await replaceLiveTables(client);

  const [orgCount, entCount] = await Promise.all([
    client.query('SELECT COUNT(*) FROM organisms'),
    client.query('SELECT COUNT(*) FROM organism_entries'),
  ]);
  console.log('\nFinal counts:');
  console.log('  organisms        :', Number(orgCount.rows[0].count).toLocaleString());
  console.log('  organism_entries :', Number(entCount.rows[0].count).toLocaleString());
} finally {
  client.release();
  await pool.end();
}
console.log('\nDone');
