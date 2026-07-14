import { enzymeIdFromTip } from "./leafUtils"

/**
 * Annotate Newick nodes with stable `__uid`s and build topology indexes for
 * path-to-root, patristic distance, and neighborhood queries.
 *
 * @param {{ name?: string, branchLength?: number, children?: object[] }} root
 */
export function buildTreeIndex(root) {
  let nextUid = 0
  /** @type {Map<number, object>} */
  const byUid = new Map()
  /** @type {Map<number, number|null>} */
  const parentByUid = new Map()
  /** @type {Map<number, number>} */
  const branchToParent = new Map()
  /** @type {Map<string, number>} */
  const leafUidByEnzymeId = new Map()
  /** @type {string[]} */
  const leafEnzymeIds = []

  function walk(node, parentUid) {
    const uid = nextUid++
    node.__uid = uid
    byUid.set(uid, node)
    parentByUid.set(uid, parentUid)
    branchToParent.set(uid, Number(node.branchLength) || 0)

    if (!node.children || node.children.length === 0) {
      const enz = enzymeIdFromTip(node.name)
      if (enz) {
        leafUidByEnzymeId.set(String(enz), uid)
        leafEnzymeIds.push(String(enz))
      }
      return uid
    }

    for (const child of node.children) walk(child, uid)
    return uid
  }

  const rootUid = walk(root, null)

  return {
    rootUid,
    byUid,
    parentByUid,
    branchToParent,
    leafUidByEnzymeId,
    leafEnzymeIds,
  }
}

/**
 * Ordered path tip → root as node UIDs (inclusive).
 * @param {number} uid
 * @param {Map<number, number|null>} parentByUid
 * @returns {number[]}
 */
export function pathUidsToRoot(uid, parentByUid) {
  const path = []
  let cur = uid
  const guard = new Set()
  while (cur != null && !guard.has(cur)) {
    path.push(cur)
    guard.add(cur)
    cur = parentByUid.get(cur)
    if (cur === undefined) break
  }
  return path
}

/**
 * @param {string} enzymeId
 * @param {ReturnType<typeof buildTreeIndex>} index
 * @returns {number[]}
 */
export function pathUidsForLeaf(enzymeId, index) {
  const uid = index.leafUidByEnzymeId.get(String(enzymeId))
  if (uid == null) return []
  return pathUidsToRoot(uid, index.parentByUid)
}

/**
 * @param {number} uidA
 * @param {number} uidB
 * @param {Map<number, number|null>} parentByUid
 */
export function lowestCommonAncestor(uidA, uidB, parentByUid) {
  const ancestors = new Set(pathUidsToRoot(uidA, parentByUid))
  for (const uid of pathUidsToRoot(uidB, parentByUid)) {
    if (ancestors.has(uid)) return uid
  }
  return null
}

/**
 * Sum of branch lengths on the path from `uid` up to (but not including) `stopUid`.
 * @param {number} uid
 * @param {number|null} stopUid
 * @param {Map<number, number|null>} parentByUid
 * @param {Map<number, number>} branchToParent
 */
function lengthUpTo(uid, stopUid, parentByUid, branchToParent) {
  let sum = 0
  let cur = uid
  const guard = new Set()
  while (cur != null && cur !== stopUid && !guard.has(cur)) {
    guard.add(cur)
    sum += branchToParent.get(cur) || 0
    cur = parentByUid.get(cur)
  }
  return sum
}

/**
 * Patristic distance between two tips (sum of branch lengths via LCA).
 * Falls back to topological hops when all lengths are zero.
 */
export function patristicDistance(enzymeIdA, enzymeIdB, index) {
  const uidA = index.leafUidByEnzymeId.get(String(enzymeIdA))
  const uidB = index.leafUidByEnzymeId.get(String(enzymeIdB))
  if (uidA == null || uidB == null) return Infinity
  if (uidA === uidB) return 0

  const lca = lowestCommonAncestor(uidA, uidB, index.parentByUid)
  if (lca == null) return Infinity

  return (
    lengthUpTo(uidA, lca, index.parentByUid, index.branchToParent) +
    lengthUpTo(uidB, lca, index.parentByUid, index.branchToParent)
  )
}

/** Number of edges on the unique path between two tips. */
export function topologicalHops(enzymeIdA, enzymeIdB, index) {
  const uidA = index.leafUidByEnzymeId.get(String(enzymeIdA))
  const uidB = index.leafUidByEnzymeId.get(String(enzymeIdB))
  if (uidA == null || uidB == null) return Infinity
  if (uidA === uidB) return 0

  const lca = lowestCommonAncestor(uidA, uidB, index.parentByUid)
  if (lca == null) return Infinity

  const hopsUp = (uid, stop) => {
    let n = 0
    let cur = uid
    while (cur != null && cur !== stop) {
      n += 1
      cur = index.parentByUid.get(cur)
    }
    return n
  }

  return hopsUp(uidA, lca) + hopsUp(uidB, lca)
}

/**
 * Rank other leaves by patristic distance (then hops).
 * @returns {{ enzymeId: string, patristic: number, hops: number }[]}
 */
export function nearestNeighbors(enzymeId, index, { limit = 20 } = {}) {
  const focus = String(enzymeId)
  if (!index.leafUidByEnzymeId.has(focus)) return []

  const ranked = []
  for (const id of index.leafEnzymeIds) {
    if (id === focus) continue
    const patristic = patristicDistance(focus, id, index)
    const hops = topologicalHops(focus, id, index)
    ranked.push({ enzymeId: id, patristic, hops })
  }

  ranked.sort((a, b) => {
    if (a.patristic !== b.patristic) return a.patristic - b.patristic
    return a.hops - b.hops
  })

  return ranked.slice(0, Math.max(0, limit))
}

/**
 * Focus tip + all leaves within patristic radius `r`.
 * @returns {Set<string>}
 */
export function leavesWithinRadius(enzymeId, index, radius) {
  const focus = String(enzymeId)
  const visible = new Set([focus])
  if (!index.leafUidByEnzymeId.has(focus) || !(radius >= 0)) return visible

  for (const id of index.leafEnzymeIds) {
    if (id === focus) continue
    if (patristicDistance(focus, id, index) <= radius) visible.add(id)
  }
  return visible
}

/**
 * Focus tip + k nearest neighbors (by patristic distance).
 * @returns {Set<string>}
 */
export function leavesWithinKNearest(enzymeId, index, k) {
  const focus = String(enzymeId)
  const visible = new Set([focus])
  const neighbors = nearestNeighbors(focus, index, { limit: Math.max(0, k) })
  for (const n of neighbors) visible.add(n.enzymeId)
  return visible
}

/**
 * Suggest a default patristic radius from the distribution of nearest distances.
 * @param {string} enzymeId
 * @param {ReturnType<typeof buildTreeIndex>} index
 */
export function suggestNeighborhoodRadius(enzymeId, index) {
  const neighbors = nearestNeighbors(enzymeId, index, { limit: 10 })
  if (!neighbors.length) return 0
  const finite = neighbors.map(n => n.patristic).filter(d => Number.isFinite(d))
  if (!finite.length) return 0
  // Median of 10 nearest — a soft local clade without swallowing the whole tree.
  const sorted = [...finite].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] || sorted[0] || 0
}

/**
 * Max finite patristic distance from focus to any other tip (for slider max).
 */
export function maxPatristicFromFocus(enzymeId, index) {
  const focus = String(enzymeId)
  let max = 0
  for (const id of index.leafEnzymeIds) {
    if (id === focus) continue
    const d = patristicDistance(focus, id, index)
    if (Number.isFinite(d) && d > max) max = d
  }
  return max
}
