/**
 * Pure helpers for residue-level alignment views (search_version 1.6.0+).
 * No DOM, no fetch.
 *
 * btop is DIAMOND's BLAST trace-back over the aligned region
 * (query_start..query_end against target_start..target_end): a number is a run
 * of identical residues; a letter pair is the query residue then the target
 * residue at a mismatch; "-" in either letter is a gap. A target letter can
 * read "X" where DIAMOND masked low complexity, so target residues are always
 * read from target_sequence by position, never from btop.
 */

/** btop → ops: { type: "match", n } | { type: "pair", q, t }. null if unparsable. */
export function parseBtop(btop) {
  if (typeof btop !== "string" || !btop) return null
  const ops = []
  let i = 0
  while (i < btop.length) {
    if (/\d/.test(btop[i])) {
      let j = i
      while (j < btop.length && /\d/.test(btop[j])) j++
      ops.push({ type: "match", n: Number(btop.slice(i, j)) })
      i = j
    } else {
      if (i + 1 >= btop.length) return null
      ops.push({ type: "pair", q: btop[i], t: btop[i + 1] })
      i += 2
    }
  }
  return ops
}

/**
 * Columns of the pairwise alignment, each { qpos, tpos, q, t, same }.
 * qpos / tpos are 1-based, null on a gap in that sequence.
 */
export function alignedColumns(hit, querySequence) {
  const ops = parseBtop(hit.btop)
  if (!ops || hit.query_start == null || hit.target_start == null) return null
  const target = hit.target_sequence || ""
  let qpos = hit.query_start
  let tpos = hit.target_start
  const cols = []
  for (const op of ops) {
    if (op.type === "match") {
      for (let k = 0; k < op.n; k++) {
        const q = querySequence[qpos - 1]
        cols.push({ qpos, tpos, q, t: target[tpos - 1] ?? q, same: true })
        qpos++
        tpos++
      }
    } else if (op.q === "-") {
      cols.push({
        qpos: null,
        tpos,
        q: "-",
        t: target[tpos - 1] ?? op.t,
        same: false,
      })
      tpos++
    } else if (op.t === "-") {
      cols.push({
        qpos,
        tpos: null,
        q: querySequence[qpos - 1] ?? op.q,
        t: "-",
        same: false,
      })
      qpos++
    } else {
      const q = querySequence[qpos - 1] ?? op.q
      const t = target[tpos - 1] ?? op.t
      cols.push({ qpos, tpos, q, t, same: q === t })
      qpos++
      tpos++
    }
  }
  return cols
}

/**
 * Per query position (1..qlen): how many hits cover it with a residue, and how
 * many of those carry the query's residue. Hits without btop are skipped.
 * Returns { covered: Int32Array, identical: Int32Array, nHits }.
 */
export function conservationByQuery(hits, querySequence) {
  const qlen = querySequence.length
  const covered = new Int32Array(qlen + 1)
  const identical = new Int32Array(qlen + 1)
  let nHits = 0
  for (const h of hits) {
    const cols = alignedColumns(h, querySequence)
    if (!cols) continue
    nHits++
    for (const c of cols) {
      if (c.qpos == null || c.t === "-") continue
      covered[c.qpos]++
      if (c.same) identical[c.qpos]++
    }
  }
  return { covered, identical, nHits }
}

/* ── Multiple sequence alignment ────────────────────────────────────────── */

/** Aligned FASTA text → [{ id, seq }] in file order. */
export function parseAfa(text) {
  const rows = []
  let cur = null
  for (const line of String(text || "").split(/\r?\n/)) {
    if (line.startsWith(">")) {
      cur = { id: line.slice(1).trim().split(/\s+/)[0], seq: "" }
      rows.push(cur)
    } else if (cur) {
      cur.seq += line.trim()
    }
  }
  return rows
}

/** Alignment columns where the query has a residue (drops insertions in hits). */
export function queryColumns(rows) {
  const query = rows.find(r => r.id === "query")
  if (!query) return null
  const keep = []
  for (let i = 0; i < query.seq.length; i++)
    if (query.seq[i] !== "-") keep.push(i)
  return keep
}

/** Residue → chemistry class, for coloring. */
const CLASS = {}
for (const c of "AVLIM") CLASS[c] = "hydrophobic"
for (const c of "FWY") CLASS[c] = "aromatic"
for (const c of "STNQ") CLASS[c] = "polar"
for (const c of "KRH") CLASS[c] = "positive"
for (const c of "DE") CLASS[c] = "negative"
for (const c of "GPC") CLASS[c] = "special"
export const residueClass = c => CLASS[c] || null

/* ── Tree layout ────────────────────────────────────────────────────────── */

/**
 * Circular layout for a parsed Newick tree. Leaves are spread evenly around
 * the circle in tree order; radius is the summed branch length from the root.
 * Each node is drawn as a radial line from its parent's radius at its own
 * angle, and each internal node as an arc spanning its children.
 * Returns { leaves: [{ name, angle, r }], radials, arcs, depth }, angles in
 * radians from 12 o'clock, clockwise.
 *
 * `branchLengths: false` draws a cladogram instead: every tip on the outer
 * circle, each internal node one step inside its deepest child, so short
 * branches no longer crowd a clade into the center.
 */
export function layoutRadial(root, { branchLengths = true } = {}) {
  // Steps from a node to its farthest tip, for the cladogram radius.
  const height = node =>
    node.children?.length ? 1 + Math.max(...node.children.map(height)) : 0
  const rootHeight = Math.max(1, height(root))
  const countLeaves = node =>
    node.children?.length
      ? node.children.reduce((n, c) => n + countLeaves(c), 0)
      : 1
  const total = Math.max(1, countLeaves(root))

  const leaves = []
  const radials = []
  const arcs = []
  let depth = 0
  let next = 0
  const walk = (node, parentR) => {
    const r = branchLengths
      ? parentR + (node === root ? 0 : node.branchLength || 0)
      : 1 - height(node) / rootHeight
    depth = Math.max(depth, r)
    let angle
    if (!node.children || !node.children.length) {
      angle = (2 * Math.PI * next++) / total
      leaves.push({ name: node.name, angle, r })
    } else {
      const angles = node.children.map(c => walk(c, r))
      const lo = Math.min(...angles)
      const hi = Math.max(...angles)
      angle = (lo + hi) / 2
      arcs.push({ r, a0: lo, a1: hi })
    }
    if (node !== root) radials.push({ angle, r0: parentR, r1: r })
    return angle
  }
  walk(root, 0)
  return { leaves, radials, arcs, depth }
}

/**
 * Hits covering each query position, from every hit's query range. Index i is
 * query position i + 1.
 */
export function coverageDepth(hits, qlen) {
  const d = new Array(qlen + 2).fill(0)
  for (const h of hits) {
    if (h.query_start == null || h.query_end == null) continue
    d[h.query_start] += 1
    d[h.query_end + 1] -= 1
  }
  let run = 0
  return d.slice(1, qlen + 1).map(v => (run += v))
}
