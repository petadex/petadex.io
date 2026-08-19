// In-memory per-`cath_domain` cache for `SEQUENCE_DIVERSITY_FOR_CATH_DOMAIN` (307M-row query,
// ~40s per fold). Pre-warmed sequentially at server startup.

import { pool } from '../db.js';
import { ALL_CATH_DOMAINS, SEQUENCE_DIVERSITY_FOR_CATH_DOMAIN } from '../atlasQueries.js';

/** @type {Map<string, { clusters30: number, clusters60: number, clusters90: number, totalOrfs: number }>} */
const cache = new Map();
/** @type {Map<string, Promise<any>>} in-flight computations, shared by concurrent requests for
 *  the same uncached cathId. */
const inFlight = new Map();

async function compute(cathId) {
  const { rows } = await pool.query(SEQUENCE_DIVERSITY_FOR_CATH_DOMAIN, [cathId]);
  const row = rows[0] || {};
  const result = {
    clusters30: row.clusters_30 ?? 0,
    clusters60: row.clusters_60 ?? 0,
    clusters90: row.clusters_90 ?? 0,
    totalOrfs: row.total_orfs ?? 0,
  };
  cache.set(cathId, result);
  return result;
}

/** Returns cached stats if present; otherwise computes (slow) and caches. */
export async function getSequenceDiversity(cathId) {
  if (cache.has(cathId)) return cache.get(cathId);
  if (inFlight.has(cathId)) return inFlight.get(cathId);

  const promise = compute(cathId).finally(() => inFlight.delete(cathId));
  inFlight.set(cathId, promise);
  return promise;
}

/** Fire-and-forget: compute + cache every known `cath_domain` sequentially. Call once at server
 *  startup; never await from the request path. */
export async function warmSequenceDiversityCache() {
  try {
    const { rows } = await pool.query(ALL_CATH_DOMAINS);
    const cathIds = rows.map(r => r.cath_domain).filter(Boolean);
    console.log(`[sequenceDiversityCache] warming ${cathIds.length} domain(s)...`);
    for (const cathId of cathIds) {
      const start = Date.now();
      try {
        await getSequenceDiversity(cathId);
        console.log(`[sequenceDiversityCache] warmed ${cathId} in ${Date.now() - start}ms`);
      } catch (err) {
        console.error(`[sequenceDiversityCache] failed to warm ${cathId}:`, err.message);
      }
    }
    console.log('[sequenceDiversityCache] warm-up complete');
  } catch (err) {
    console.error('[sequenceDiversityCache] failed to list cath_domains:', err.message);
  }
}
