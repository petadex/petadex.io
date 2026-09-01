/**
 * Search depth & result-view constants.
 *
 * See "12 Variable Result Count" in the PETadex Diamond Sequence Search notes.
 *
 * `max_results` used to be a *search* parameter: raising it changed the cache
 * key, which re-ran the entire 32-shard DIAMOND fan-out (~46 s, 32 Lambdas) to
 * surface rows the pipeline had already computed, ranked, and thrown away at
 * the aggregator's `results[:max_results]` line. The fan-out's cost is fixed
 * (shard download + seeding) and essentially independent of `-k`, so depth is
 * close to free relative to the thing that was being re-paid for.
 *
 * The fix: search once to a fixed depth, keep all of it, and subset at view
 * time. Per-shard top-K followed by a global merge yields the true global
 * top-K, so the first N rows of a depth-K result are identical to what a fresh
 * `max_results=N` search would have produced — same targets, same order. This
 * is not a speed-for-accuracy trade.
 *
 * Consequently: SEARCH_RESULT_DEPTH is sent on every search and is never
 * user-controlled, while RESULT_VIEW_OPTIONS drives a pure *view* selector on
 * the results page that only slices an already-fetched array.
 */

// Fixed depth every search requests.
//
// Held at 250 — the deepest option the old search-input selector offered — so
// this ships no search-time worst case production has not already run. The
// Lambda-side RESULT_DEPTH is 500 (the API's `max_results` Joi cap), but it is
// implemented and *not yet deployed*, and its own §9 benchmark gate is still
// open: 500 is a 10× increase in per-shard `-k` whose cost on the critical path
// is unmeasured. Sending 250 from here does not front-run that gate.
//
// Once Part A deploys, the orchestrator ignores the caller's value entirely and
// always searches to its own RESULT_DEPTH, so this constant stops governing
// depth and only feeds the cache key (until Part B drops it from the key too).
// The view selector is bounded by what actually arrived, not by this number, so
// it follows the deployed depth automatically.
export const SEARCH_RESULT_DEPTH = 250

// Rows shown on arrival. Matches the old `max_results` default so a search that
// used to render 50 rows still opens on 50.
export const DEFAULT_RESULT_VIEW = 50

const VIEW_STEPS = [10, 25, 50, 100, 250, 500]

/**
 * View-count options for a result set of `total` hits.
 *
 * `depth` is what the search actually stored — `metadata.result_depth` once the
 * Lambda stamps it, otherwise the depth we requested. Options never exceed it,
 * and the list always ends in the full fetched count so every row is reachable.
 */
export function resultViewOptions(total, depth = SEARCH_RESULT_DEPTH) {
  const cap = Math.min(total || 0, depth || total || 0)
  if (cap <= 0) return []
  return [...VIEW_STEPS.filter(n => n < cap), cap]
}
