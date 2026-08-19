// In-memory per-`cath_domain` cache for `KNOWN_FUNCTIONS_FOR_CATH_DOMAIN` (~25s for the largest
// domain). Pre-warmed sequentially at server startup.

import { pool } from '../db.js';
import { ALL_CATH_DOMAINS, KNOWN_FUNCTIONS_FOR_CATH_DOMAIN } from '../atlasQueries.js';

/** @type {Map<string, { func: string, count: number }[]>} */
const cache = new Map();
/** @type {Map<string, Promise<any>>} in-flight computations, shared by concurrent requests for
 *  the same uncached cathId. */
const inFlight = new Map();

async function compute(cathId) {
  const { rows } = await pool.query(KNOWN_FUNCTIONS_FOR_CATH_DOMAIN, [cathId]);
  const result = rows.map(r => ({ func: r.func, count: r.n }));
  cache.set(cathId, result);
  return result;
}

/** Returns cached functions if present; otherwise computes (slow) and caches. */
export async function getKnownFunctions(cathId) {
  if (cache.has(cathId)) return cache.get(cathId);
  if (inFlight.has(cathId)) return inFlight.get(cathId);

  const promise = compute(cathId).finally(() => inFlight.delete(cathId));
  inFlight.set(cathId, promise);
  return promise;
}

/** Fire-and-forget: compute + cache every known `cath_domain` sequentially. Call once at server
 *  startup; never await from the request path. */
export async function warmKnownFunctionsCache() {
  try {
    const { rows } = await pool.query(ALL_CATH_DOMAINS);
    const cathIds = rows.map(r => r.cath_domain).filter(Boolean);
    console.log(`[knownFunctionsCache] warming ${cathIds.length} domain(s)...`);
    for (const cathId of cathIds) {
      const start = Date.now();
      try {
        await getKnownFunctions(cathId);
        console.log(`[knownFunctionsCache] warmed ${cathId} in ${Date.now() - start}ms`);
      } catch (err) {
        console.error(`[knownFunctionsCache] failed to warm ${cathId}:`, err.message);
      }
    }
    console.log('[knownFunctionsCache] warm-up complete');
  } catch (err) {
    console.error('[knownFunctionsCache] failed to list cath_domains:', err.message);
  }
}
