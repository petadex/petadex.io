/**
 * Prototype significance for the Environments chart. Pure functions, no DOM.
 *
 * For each environment profile: is the share of this search's Logan hits in
 * that profile surprising, given the share for a random PETadex Logan
 * sequence? Tested two ways, because hits are not independent:
 *
 *   sequence  each Logan hit counts once (the aggregator's own unit)
 *   cluster   each 90 % cluster counts once, its members' profiles averaged,
 *             so 40 near-identical hits from one study weigh like one
 *
 * Per profile: exact two-sided binomial test against the background share,
 * Benjamini–Hochberg q-values across all profiles, and a 95 % Wilson interval
 * on the share, divided by the background share to give an interval on the
 * × expected ratio. Fractional counts (a hit split across its samples'
 * profiles) are rounded to whole numbers for the test.
 *
 * Prototype: the background share is per sequence, and is reused for the
 * cluster unit as an approximation. The final version belongs in the
 * aggregator, which has a per-cluster background.
 */

/* ── Binomial ───────────────────────────────────────────────────────────── */

function logFactorialTable(n) {
  const t = new Float64Array(n + 1)
  for (let i = 2; i <= n; i++) t[i] = t[i - 1] + Math.log(i)
  return t
}

/** Exact two-sided binomial p: total probability of outcomes no likelier than k. */
export function binomialTwoSided(k, n, p) {
  if (n <= 0) return 1
  if (p <= 0) return k === 0 ? 1 : 0
  if (p >= 1) return k === n ? 1 : 0
  const lf = logFactorialTable(n)
  const logPmf = i =>
    lf[n] - lf[i] - lf[n - i] + i * Math.log(p) + (n - i) * Math.log1p(-p)
  const observed = logPmf(k)
  // Relative tolerance, as R's binom.test uses, so ties count as extreme.
  const cutoff = observed + Math.log1p(1e-7)
  let total = 0
  for (let i = 0; i <= n; i++) {
    const l = logPmf(i)
    if (l <= cutoff) total += Math.exp(l)
  }
  return Math.min(1, total)
}

/** Benjamini–Hochberg q-values, in the order the p-values were given. */
export function benjaminiHochberg(ps) {
  const m = ps.length
  const order = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0])
  const q = new Array(m)
  let running = 1
  for (let r = m - 1; r >= 0; r--) {
    const [p, i] = order[r]
    running = Math.min(running, (p * m) / (r + 1))
    q[i] = running
  }
  return q
}

/** 95 % Wilson score interval for a proportion k / n. */
export function wilson(k, n, z = 1.96) {
  if (n <= 0) return [0, 1]
  const phat = k / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const centre = (phat + z2 / (2 * n)) / denom
  const half =
    (z * Math.sqrt((phat * (1 - phat)) / n + z2 / (4 * n * n))) / denom
  return [Math.max(0, centre - half), Math.min(1, centre + half)]
}

/* ── Units ──────────────────────────────────────────────────────────────── */

/** Each Logan hit's profile weights: its samples per profile / its total. */
function hitWeights(hit) {
  const hist = hit.card?.prof_hist
  if (!hist) return null
  const total = Object.values(hist).reduce((s, n) => s + n, 0)
  if (!total) return null
  return Object.fromEntries(
    Object.entries(hist).map(([profile, n]) => [profile, n / total])
  )
}

/**
 * Profile weights per unit. Sequence: one unit per profiled Logan hit.
 * Cluster: one unit per 90 % cluster, the mean of its members' weights.
 */
export function unitWeights(hits, unit) {
  const perHit = hits
    .filter(h => h.db === "logan")
    .map(h => ({ hit: h, w: hitWeights(h) }))
    .filter(x => x.w)
  if (unit === "sequence") return perHit.map(x => x.w)

  const groups = new Map()
  for (const x of perHit) {
    const key = x.hit.card?.c90 || x.hit.target_id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(x.w)
  }
  return [...groups.values()].map(ws => {
    const mean = {}
    for (const w of ws)
      for (const [profile, v] of Object.entries(w))
        mean[profile] = (mean[profile] || 0) + v / ws.length
    return mean
  })
}

/**
 * Per-profile statistics for one unit.
 * Returns { n, byProfile: { [profile]: { k, ratio, ciLow, ciHigh, p, q } } }.
 */
export function profileStats(hits, profiles, unit) {
  const units = unitWeights(hits, unit)
  const n = units.length
  const rows = profiles
    .filter(pr => pr.background_share > 0)
    .map(pr => {
      const sum = units.reduce((s, w) => s + (w[pr.profile] || 0), 0)
      const k = Math.round(sum)
      const bg = pr.background_share
      const [lo, hi] = wilson(k, n)
      return {
        profile: pr.profile,
        k,
        ratio: n ? k / n / bg : null,
        ciLow: lo / bg,
        ciHigh: hi / bg,
        p: binomialTwoSided(k, n, bg),
      }
    })
  const q = benjaminiHochberg(rows.map(r => r.p))
  rows.forEach((r, i) => (r.q = q[i]))
  return { n, byProfile: Object.fromEntries(rows.map(r => [r.profile, r])) }
}

/* ── Formatting ─────────────────────────────────────────────────────────── */

export function formatP(p) {
  if (p == null) return "—"
  if (p < 1e-4) return p.toExponential(1)
  if (p < 0.01) return p.toFixed(4)
  return p.toFixed(2)
}
