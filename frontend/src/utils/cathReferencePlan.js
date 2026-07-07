import { CATH_NARRATIVE_SECTIONS } from "./cathDomainSectionConfig.js"
import { findReferenceIndexInCatalog } from "./cathReferenceIndex.js"
import {
  getFiguresByRenderSection,
} from "./cathDomainFigureAnchors.js"

const URL_RE = /https?:\/\/[^\s)\]]+/gi
const PMC_RE = /\b(PMC\d+)\b/gi

function normalizeUrl(u) {
  return String(u || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase()
}

/**
 * Collapse duplicate resources (same PDB, DOI, PMC) so in-text numbers stay stable.
 * @param {string|null|undefined} url
 */
export function canonicalRefKey(url) {
  const u = normalizeUrl(url)
  if (!u) return null

  const doi = u.match(/doi\.org\/(10\.\d+\/[^\s/?#]+)/i)?.[1]
  if (doi) return `doi:${decodeURIComponent(doi).toLowerCase()}`

  const pdbRcsb = u.match(/rcsb\.org\/structure\/([0-9][a-z0-9]{3})/)?.[1]
  if (pdbRcsb) return `pdb:${pdbRcsb.toUpperCase()}`

  const pdbDoi = u.match(/pdb([0-9][a-z0-9]{3})\/pdb/)?.[1]
  if (pdbDoi) return `pdb:${pdbDoi.toUpperCase()}`

  const wwpdb = u.match(/pdb_0*([0-9][a-z0-9]{3,4})/)?.[1]
  if (wwpdb && wwpdb.length >= 4) return `pdb:${wwpdb.slice(-4).toUpperCase()}`

  const pmc = u.match(/pmc(\d+)/)?.[1]
  if (pmc) return `pmc:PMC${pmc}`

  const pfam = u.match(/interpro\/entry\/pfam\/(pf\d+)/)?.[1]
  if (pfam) return `pfam:${pfam.toUpperCase()}`

  const uniprot = u.match(/uniprotkb\/([a-z0-9]+)\/entry/)?.[1]
  if (uniprot) return `uniprot:${uniprot.toUpperCase()}`

  return u
}

/**
 * @param {string} text
 * @returns {{ kind: "url"|"pmc", value: string, index: number }[]}
 */
function findCitationTokensInText(text) {
  const s = String(text || "")
  if (!s) return []

  /** @type {{ kind: "url"|"pmc", value: string, index: number }[]} */
  const hits = []

  let m
  URL_RE.lastIndex = 0
  while ((m = URL_RE.exec(s))) {
    hits.push({ kind: "url", value: m[0], index: m.index })
  }

  PMC_RE.lastIndex = 0
  while ((m = PMC_RE.exec(s))) {
    hits.push({ kind: "pmc", value: m[1], index: m.index })
  }

  return hits.sort((a, b) => a.index - b.index || (a.kind === "pmc" ? 1 : -1))
}

function figureCaption(domain, n) {
  const figures = domain.figures || []
  const fig = figures[n - 1]
  if (!fig) return null
  return typeof fig === "string" ? fig : fig?.caption
}

function figureCount(domain) {
  return Array.isArray(domain.figures) ? domain.figures.length : 0
}

/**
 * Text blocks in the order a reader encounters them on `/cath-domains`:
 * overview → narrative sections (with inline figure captions after each section) → lab notes.
 *
 * Exported for audits and tests.
 *
 * @param {Record<string, unknown>} domain
 * @returns {string[]}
 */
export function collectCathReadingOrderBlocks(domain) {
  /** @type {string[]} */
  const blocks = []

  if (domain.summary) blocks.push(String(domain.summary))
  if (domain.moreInformation) blocks.push(String(domain.moreInformation))
  if (domain.moreInformationFigure?.caption) {
    blocks.push(String(domain.moreInformationFigure.caption))
  }

  const figuresBySection = getFiguresByRenderSection(domain)

  for (const { key } of CATH_NARRATIVE_SECTIONS) {
    const v = domain[key]
    if (v != null && String(v).trim()) blocks.push(String(v))

    for (const n of figuresBySection.get(key) || []) {
      const caption = figureCaption(domain, n)
      if (caption) blocks.push(String(caption))
    }
  }

  const total = figureCount(domain)
  const rendered = new Set([...figuresBySection.values()].flat())
  for (let n = 1; n <= total; n++) {
    if (rendered.has(n)) continue
    const caption = figureCaption(domain, n)
    if (caption) blocks.push(String(caption))
  }

  if (domain.labNotes) blocks.push(String(domain.labNotes))

  return blocks
}

/** @deprecated Use collectCathReadingOrderBlocks */
function collectDomainTextBlocks(domain) {
  return collectCathReadingOrderBlocks(domain)
}

/**
 * Walk reading-order blocks; record the first in-text appearance of each cited reference.
 *
 * @param {Record<string, unknown>} domain
 * @returns {{ displayNumber: number, catalogIndex: number, token: string, blockIndex: number }[]}
 */
export function traceCathCitationOrder(domain) {
  const references = Array.isArray(domain.references) ? domain.references : []
  const { displayNumberByCatalogIndex } = buildCathReferencePlan(domain)
  /** @type {{ displayNumber: number, catalogIndex: number, token: string, blockIndex: number }[]} */
  const trace = []
  const seenCatalog = new Set()

  collectCathReadingOrderBlocks(domain).forEach((block, blockIndex) => {
    for (const token of findCitationTokensInText(block)) {
      const catalogIndex = findReferenceIndexInCatalog(token.value, references, token.kind)
      if (catalogIndex < 0 || seenCatalog.has(catalogIndex)) continue
      const displayNumber = displayNumberByCatalogIndex.get(catalogIndex)
      if (displayNumber == null) continue
      seenCatalog.add(catalogIndex)
      trace.push({ displayNumber, catalogIndex, token: token.value, blockIndex })
    }
  })

  return trace
}

/**
 * @param {Record<string, unknown>} domain
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function auditCathReferenceOrder(domain) {
  const trace = traceCathCitationOrder(domain)
  /** @type {string[]} */
  const violations = []
  let prev = 0

  for (const { displayNumber, token, blockIndex } of trace) {
    if (displayNumber < prev) {
      violations.push(
        `[${displayNumber}] appears after [${prev}] in reading order (block ${blockIndex}, token ${token})`,
      )
    }
    prev = displayNumber
  }

  return { ok: violations.length === 0, violations }
}

/**
 * Build cited vs uncited reference lists with in-text numbers starting at 1 in reading order.
 *
 * @param {Record<string, unknown>} domain
 * @returns {{
 *   cited: { ref: { label?: string, url?: string|null }, catalogIndex: number, displayNumber: number }[],
 *   uncited: { ref: { label?: string, url?: string|null }, catalogIndex: number }[],
 *   displayNumberByCatalogIndex: Map<number, number>,
 * }}
 */
export function buildCathReferencePlan(domain) {
  const references = Array.isArray(domain.references) ? domain.references : []
  if (!references.length) {
    return { cited: [], uncited: [], displayNumberByCatalogIndex: new Map() }
  }

  /** @type {number[]} primary catalog indices in order of first in-text appearance */
  const citedOrder = []
  /** catalog index → canonical resource key */
  const catalogCanonical = new Map()
  /** canonical → first catalog index */
  const canonicalPrimary = new Map()

  const blocks = collectDomainTextBlocks(domain)

  for (const block of blocks) {
    for (const token of findCitationTokensInText(block)) {
      const catalogIndex = findReferenceIndexInCatalog(token.value, references, token.kind)
      if (catalogIndex < 0) continue

      const refUrl = references[catalogIndex]?.url
      const canonical = refUrl ? canonicalRefKey(refUrl) : null
      catalogCanonical.set(catalogIndex, canonical)

      if (canonical && canonicalPrimary.has(canonical)) continue
      if (!canonical && citedOrder.includes(catalogIndex)) continue

      if (canonical) canonicalPrimary.set(canonical, catalogIndex)
      citedOrder.push(catalogIndex)
    }
  }

  const displayNumberByCatalogIndex = new Map()
  const cited = citedOrder.map((catalogIndex, i) => {
    const displayNumber = i + 1
    displayNumberByCatalogIndex.set(catalogIndex, displayNumber)
    return { ref: references[catalogIndex], catalogIndex, displayNumber }
  })

  references.forEach((ref, catalogIndex) => {
    if (displayNumberByCatalogIndex.has(catalogIndex)) return
    const canonical =
      catalogCanonical.get(catalogIndex) ?? (ref?.url ? canonicalRefKey(ref.url) : null)
    if (canonical && canonicalPrimary.has(canonical)) {
      displayNumberByCatalogIndex.set(
        catalogIndex,
        displayNumberByCatalogIndex.get(canonicalPrimary.get(canonical)),
      )
    }
  })

  const citedSet = new Set(citedOrder)
  const uncited = references
    .map((ref, catalogIndex) => ({ ref, catalogIndex }))
    .filter(({ catalogIndex }) => !citedSet.has(catalogIndex) && !displayNumberByCatalogIndex.has(catalogIndex))

  return { cited, uncited, displayNumberByCatalogIndex }
}
