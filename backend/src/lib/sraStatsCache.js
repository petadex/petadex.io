// backend/src/lib/sraStatsCache.js
//
// File-backed organism + summary cache for SRA hubs.
// Used when the app role cannot CREATE INDEX / TABLE on Postgres (common on
// shared RDS). First build scans sra_metadata once; later reads are instant.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'sra-organism-stats.json');

/** @type {{
 *   built_at: string,
 *   summary: { n_runs: number, n_biosamples: number, n_organisms: number },
 *   organisms: Array<{ organism: string, n_runs: number, n_biosamples: number, organism_lower: string }>
 * } | null} */
let memory = null;
let buildPromise = null;

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function loadCacheFromDisk() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (!raw?.organisms?.length || !raw?.summary) return null;
    memory = raw;
    return memory;
  } catch {
    return null;
  }
}

export function getMemoryCache() {
  if (memory) return memory;
  return loadCacheFromDisk();
}

export function isCacheReady() {
  return Boolean(getMemoryCache());
}

export function isCacheBuilding() {
  return Boolean(buildPromise);
}

/**
 * Build (or rebuild) the organism aggregate cache from sra_metadata.
 * Safe to call concurrently — coalesces into one in-flight build.
 */
export function ensureSraStatsCache({ force = false } = {}) {
  if (!force && getMemoryCache()) return Promise.resolve(getMemoryCache());
  if (buildPromise) return buildPromise;

  buildPromise = (async () => {
    console.log('[sraStatsCache] building organism aggregates from sra_metadata…');
    const t0 = Date.now();
    const client = await pool.connect();
    try {
      // Allow a long scan; this is a one-shot warm.
      await client.query('SET statement_timeout = 0');
      const { rows } = await client.query(
        `SELECT organism,
                COUNT(*)::int AS n_runs,
                COUNT(DISTINCT biosample) FILTER (WHERE biosample IS NOT NULL)::int AS n_biosamples
         FROM sra_metadata
         WHERE organism IS NOT NULL AND organism <> ''
         GROUP BY organism`,
      );
      const organisms = rows.map(r => ({
        organism: r.organism,
        n_runs: r.n_runs,
        n_biosamples: r.n_biosamples,
        organism_lower: String(r.organism).toLowerCase(),
      }));
      organisms.sort((a, b) => b.n_runs - a.n_runs);

      const { rows: runRows } = await client.query(
        `SELECT COUNT(*)::bigint AS n FROM sra_metadata`,
      );
      const { rows: bioRows } = await client.query(
        `SELECT COUNT(DISTINCT biosample)::bigint AS n
         FROM sra_metadata WHERE biosample IS NOT NULL`,
      );

      const payload = {
        built_at: new Date().toISOString(),
        summary: {
          n_runs: Number(runRows[0]?.n || 0),
          n_biosamples: Number(bioRows[0]?.n || 0),
          n_organisms: organisms.length,
        },
        organisms,
      };

      ensureDir();
      fs.writeFileSync(CACHE_FILE, JSON.stringify(payload));
      memory = payload;
      console.log(
        `[sraStatsCache] ready: ${organisms.length} organisms in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${CACHE_FILE}`,
      );
      return payload;
    } finally {
      client.release();
      buildPromise = null;
    }
  })();

  return buildPromise;
}

export function searchOrganisms(q, limit = 50) {
  const cache = getMemoryCache();
  if (!cache) return null;
  const needle = String(q).toLowerCase();
  const out = [];
  for (const row of cache.organisms) {
    if (row.organism_lower.startsWith(needle)) {
      out.push({
        organism: row.organism,
        n_runs: row.n_runs,
        n_biosamples: row.n_biosamples,
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function getOrganismStats(name) {
  const cache = getMemoryCache();
  if (!cache) return null;
  const lower = String(name).toLowerCase();
  return cache.organisms.find(o => o.organism_lower === lower) || null;
}

export function getSummaryFromCache() {
  const cache = getMemoryCache();
  return cache?.summary || null;
}

// Warm from disk at import time (cheap). Full rebuild is on-demand.
loadCacheFromDisk();
