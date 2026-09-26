import config from "../../config"

// Short-lived cache per media set. The leaderboard and the Sequences-tab CSV
// download ask for the same all-substrate payload, and the Activity tab
// re-requests a set every time a substrate chip is toggled back on. Entries
// expire so a long-lived SPA session (or a return visit via client-side
// navigation) picks up refreshed plate data. A failed request is evicted
// immediately so the next caller retries.
const TTL_MS = 5 * 60 * 1000
const cache = new Map()

/**
 * GET /plate-data/comparison for a set of substrates.
 * The resolved object is shared between callers — treat it as read-only.
 * @param {string[]} media
 * @returns {Promise<{ timeseries: object[], activity: object[] }>}
 */
export function fetchComparison(media) {
  const key = [...media].sort().join(",")
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.request

  const request = fetch(`${config.apiUrl}/plate-data/comparison?media=${key}`)
    .then(res => {
      if (!res.ok) throw new Error(`Status ${res.status}`)
      return res.json()
    })
    .catch(err => {
      if (cache.get(key)?.request === request) cache.delete(key)
      throw err
    })
  cache.set(key, { request, at: Date.now() })
  return request
}
