/**
 * Build graph nodes/edges and chronological layout (y = year, older at top).
 */
export function yearFromDate(datePublished) {
  if (!datePublished) return null
  const y = Number(String(datePublished).slice(0, 4))
  return Number.isFinite(y) ? y : null
}

/**
 * @param {object[]} papers
 * @returns {{ nodes: object[], edges: { source: string, target: string }[] }}
 */
export function buildLiteratureGraph(papers) {
  const byDoi = new Map()
  for (const p of papers || []) {
    if (!p?.doi) continue
    byDoi.set(String(p.doi).toLowerCase(), p)
  }

  const nodes = [...byDoi.values()].map(p => ({
    ...p,
    id: p.doi,
    year: yearFromDate(p.date_published),
  }))

  const edges = []
  const edgeKeys = new Set()
  for (const p of papers || []) {
    const src = String(p.doi)
    const srcKey = src.toLowerCase()
    if (!byDoi.has(srcKey)) continue
    for (const cited of p.citations_in_dataset || []) {
      const tgtKey = String(cited).toLowerCase()
      if (!byDoi.has(tgtKey)) continue
      const tgt = byDoi.get(tgtKey).doi
      const key = `${srcKey}->${tgtKey}`
      if (edgeKeys.has(key)) continue
      edgeKeys.add(key)
      edges.push({ source: src, target: tgt })
    }
  }

  return { nodes, edges }
}

/**
 * Assign x/y in pixel space. y from year (older at top). x via seeded jitter +
 * simple collision push within year bands.
 */
export function layoutChronological(nodes, { width, height, padding = 48 } = {}) {
  const usable = nodes.filter(n => n.year != null)
  if (!usable.length) return nodes.map(n => ({ ...n, x: width / 2, y: height / 2 }))

  const years = usable.map(n => n.year)
  const yMin = Math.min(...years)
  const yMax = Math.max(...years)
  const ySpan = Math.max(yMax - yMin, 1)

  const innerW = Math.max(width - padding * 2, 100)
  const innerH = Math.max(height - padding * 2, 100)

  // Seeded jitter so layout is stable across renders.
  function hash(str) {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return (h >>> 0) / 4294967295
  }

  const placed = usable.map(n => {
    const t = (n.year - yMin) / ySpan
    const y = padding + t * innerH
    const j = hash(n.id || n.doi)
    const x = padding + (0.15 + j * 0.7) * innerW
    return { ...n, x, y }
  })

  // Lightweight horizontal collision within ~same year
  const byYear = new Map()
  for (const n of placed) {
    if (!byYear.has(n.year)) byYear.set(n.year, [])
    byYear.get(n.year).push(n)
  }
  for (const group of byYear.values()) {
    group.sort((a, b) => a.x - b.x)
    const minGap = Math.min(36, innerW / Math.max(group.length, 1))
    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1]
      const cur = group[i]
      if (cur.x - prev.x < minGap) {
        cur.x = Math.min(padding + innerW, prev.x + minGap)
      }
    }
  }

  const missingYear = nodes
    .filter(n => n.year == null)
    .map(n => ({ ...n, x: padding, y: padding + innerH }))

  return [...placed, ...missingYear]
}

export function radiusForProteinCount(count, { minR = 8, maxR = 36, refMax = 12 } = {}) {
  const n = Number(count)
  if (!Number.isFinite(n) || n <= 0) return minR
  const denom = Math.sqrt(Math.max(refMax, 1))
  const t = Math.min(1, Math.sqrt(n) / denom)
  // Emphasize larger counts (slightly steeper than linear in t).
  const eased = t * t * (3 - 2 * t)
  return minR + eased * (maxR - minR)
}


/** Edges incident to a DOI (in or out). */
export function edgesForDoi(edges, doi) {
  const key = String(doi).toLowerCase()
  return (edges || []).filter(
    e =>
      String(e.source).toLowerCase() === key ||
      String(e.target).toLowerCase() === key,
  )
}
