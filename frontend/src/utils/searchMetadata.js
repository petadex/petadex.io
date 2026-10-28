/**
 * Pure helpers behind the search-results metadata views (search_version 1.5.0).
 * No DOM, no fetch.
 *
 * Every helper here presents data, never a judgement: nothing computes a score
 * or a recommendation. The default order is always the search's own rank (bit
 * score); every other order is one the viewer picks.
 *
 * Hits passed in are the results page's transformed rows: `db` is the raw
 * origin key ("plasticome" | "ncbi_nr" | "logan") and `card` is the per-hit
 * metadata record from the store (null when the store has none).
 */

/* ── Enrichment status ──────────────────────────────────────────────────── */

/** A result that predates 1.5.0 carries no status: nothing to show. */
export const enrichmentStatus = metadata =>
  metadata?.enrichment_status ?? "unavailable"

/** Metadata views exist only when some record could be present. */
export const hasEnrichment = status => status === "ok" || status === "partial"

/* ── Identifiers ────────────────────────────────────────────────────────── */

/** "PL228|C001|3.4e-40|48|261|C001" → "PL228". */
export function clusterLabel(domainId) {
  if (!domainId) return null
  return String(domainId).split("|", 1)[0] || null
}

export const ORIGIN_LABEL = {
  plasticome: "Plasticome",
  ncbi_nr: "NCBI nr",
  logan: "Logan",
}

export const ncbiUrl = (kind, acc) =>
  `https://www.ncbi.nlm.nih.gov/${kind}/${encodeURIComponent(acc)}`

export const doiUrl = doi => `https://doi.org/${encodeURI(doi)}`

/* ── Evidence ───────────────────────────────────────────────────────────── */

export const EVIDENCE_LABEL = {
  stated: "stated",
  measured: "measured",
  organism_physiology: "organism physiology",
  inferred: "inferred",
  profile: "profile",
}

/** Evidence class per field, per origin: the 1.5.0 contract, verbatim. */
export const FIELD_EVIDENCE = {
  plasticome: {
    enzyme_names: "stated",
    substrates: "stated",
    ec: "stated",
    organism: "stated",
    accession: "stated",
    cath: "stated",
    has_structure: "stated",
    pdb: "stated",
    doi: "stated",
    activity_mode: "stated",
    taxid: "stated",
    t_opt_c: "organism_physiology",
    ph_opt: "organism_physiology",
  },
  ncbi_nr: {
    organism: "stated",
    lca_rank: "stated",
    taxid: "stated",
    superkingdom: "stated",
    phylum: "stated",
    genus: "stated",
    n_accessions: "stated",
    taxon_conflict: "stated",
    core_complete: "stated",
    nearest_pl: "stated",
    pident_to_pl: "stated",
    n_assemblies: "measured",
    n_biosamples: "measured",
    frac_mag: "measured",
    any_isolate: "measured",
    isolation_source: "measured",
    host: "measured",
    country: "measured",
    prof_dominant: "profile",
    t_opt_c: "organism_physiology",
    ph_opt: "organism_physiology",
    oxygen: "organism_physiology",
  },
  logan: {
    n_biosamples: "measured",
    n_bioprojects: "measured",
    n_runs: "measured",
    support_tier: "measured",
    meas_temp_n: "measured",
    meas_temp_median: "measured",
    meas_ph_median: "measured",
    prof_dominant: "profile",
    prof_dominant_share: "profile",
    prof_hist: "profile",
    tenv: "inferred",
    tenv_q25: "inferred",
    tenv_q75: "inferred",
    phenv: "inferred",
  },
}

export const fieldEvidence = (db, field) =>
  (db && FIELD_EVIDENCE[db]?.[field]) || null

/* ── Hits table ─────────────────────────────────────────────────────────── */

/** Uncharacterized origins. Plasticome hits are the characterized enzymes. */
export const RELATIVE_ORIGINS = ["ncbi_nr", "logan"]

/**
 * Origin filter values: "" is every origin; "relatives" is the uncharacterized
 * relatives (nr and Logan); otherwise one origin key.
 */
const originMatches = (db, origin) =>
  !origin ||
  (origin === "relatives" ? RELATIVE_ORIGINS.includes(db) : db === origin)

/**
 * Identity is a [min, max] window, as in the draft's 50–70 / 70–90 / 90–100
 * bands; coverage is a floor in percent.
 */
export function filterHits(hits, { identity, minCoverage, origin }) {
  const [lo, hi] = identity
  return hits.filter(
    h =>
      originMatches(h.db, origin) &&
      (h.identity ?? 0) >= lo &&
      (h.identity ?? 0) <= hi &&
      (h.query_coverage ?? 0) >= minCoverage
  )
}

/**
 * What a hit was observed in. Logan: BioSamples, in BioProjects. nr: genome
 * assemblies when any are linked, else protein records. Studies are
 * BioProjects; nr records carry no BioProject count.
 */
export function support(hit) {
  const c = hit.card
  if (!c) return { samples: null, studies: null, text: null }
  if (hit.db === "logan") {
    const n = c.n_biosamples ?? null
    const s = c.n_bioprojects ?? null
    return {
      samples: n,
      studies: s,
      text:
        n == null
          ? null
          : `${n.toLocaleString("en-US")} BioSample${n === 1 ? "" : "s"}` +
            (s == null ? "" : ` in ${s} stud${s === 1 ? "y" : "ies"}`),
    }
  }
  if (hit.db === "ncbi_nr") {
    if (c.n_assemblies)
      return {
        samples: c.n_assemblies,
        studies: null,
        text: `${c.n_assemblies} genome assembl${
          c.n_assemblies === 1 ? "y" : "ies"
        }`,
      }
    const n = c.n_accessions
    return {
      samples: null,
      studies: null,
      text:
        n == null
          ? null
          : `${n.toLocaleString("en-US")} protein record${
              n === 1 ? "" : "s"
            }, no genome`,
    }
  }
  return { samples: null, studies: null, text: null }
}

/**
 * Sorts by one row field. Missing values always sink to the bottom whatever
 * the direction, strings compare case-insensitively, and ties keep search rank.
 */
export function sortHits(rows, key, dir = "asc") {
  const sign = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    let va = a[key]
    let vb = b[key]
    if (va == null && vb == null) return a.rank - b.rank
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === "string") {
      va = va.toLowerCase()
      vb = String(vb).toLowerCase()
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return cmp * sign || a.rank - b.rank
  })
}

/**
 * Keeps the best-ranked hit of each cluster at `level`. Hits with no cluster
 * are kept: there is nothing to collapse them into.
 */
export function onePerCluster(hits, level = "c90") {
  const best = new Map()
  for (const h of hits) {
    const key = h.card?.[level]
    if (!key) continue
    const cur = best.get(key)
    if (!cur || h.rank < cur.rank) best.set(key, h)
  }
  return hits.filter(h => {
    const key = h.card?.[level]
    return !key || best.get(key) === h
  })
}

/**
 * FASTA for hits with a full subject sequence; others are skipped. Bare
 * headers (">ID") and one line per sequence, so any tool reads it as is.
 */
export function toFasta(hits) {
  return hits
    .filter(h => h.target_sequence)
    .map(h => `>${h.target_id}\n${h.target_sequence}`)
    .join("\n")
}

/* ── Characterized relatives ────────────────────────────────────────────── */

/**
 * The Plasticome members of a hit's 90 % and 60 % clusters, closest level
 * first, each listed once. Reads the store's `clusters.cNN[id].pl_members`;
 * results without that list fall back to the PL hits of this search that share
 * the cluster, which is a subset of its members.
 *
 * `hit` on each row is the PL hit from this search, when the relative was
 * itself a hit (its identity to the query is then known).
 */
export function characterizedRelatives(hit, hits, clusters) {
  const plHits = new Map(
    hits.filter(h => h.db === "plasticome").map(h => [h.target_id, h])
  )
  const seen = new Set()
  const out = []
  for (const [level, label] of [
    ["c90", "90 %"],
    ["c60", "60 %"],
  ]) {
    const id = hit.card?.[level]
    if (!id) continue
    const members = clusters?.[level]?.[id]?.pl_members
    const rows = members
      ? members
      : [...plHits.values()]
          .filter(h => h.card?.[level] === id)
          .map(h => ({ id: h.target_id, ...h.card }))
    for (const m of rows) {
      if (seen.has(m.id)) continue
      seen.add(m.id)
      out.push({ ...m, level: label, hit: plHits.get(m.id) ?? null })
    }
  }
  return out
}

/** The c60 card's Plasticome members: "Characterized enzymes in its family". */
export const familyEnzymes = (hit, clusters) =>
  clusters?.c60?.[hit.card?.c60]?.pl_members ?? []

/* ── Environments ───────────────────────────────────────────────────────── */

/**
 * Chart rows: profiles by this search's Logan sequences, largest first.
 * `x_expected` is shown only from five sequences up; below that the ratio is
 * noise, and the row says so with a dot instead.
 */
export const MIN_SEQUENCES_FOR_RATIO = 5

export function environmentRows(profiles) {
  return [...(profiles || [])].sort(
    (a, b) =>
      b.sequences - a.sequences ||
      b.share - a.share ||
      a.profile.localeCompare(b.profile)
  )
}

/**
 * Logan hits whose samples include `profile`, in search rank order. Each
 * sequence counts once; its weight is the share of its samples in the profile.
 */
export function hitsInProfile(hits, profile) {
  const out = []
  for (const h of hits) {
    if (h.db !== "logan") continue
    const hist = h.card?.prof_hist
    if (!hist || !hist[profile]) continue
    const total = Object.values(hist).reduce((s, n) => s + n, 0)
    if (total > 0) out.push({ hit: h, share: hist[profile] / total })
  }
  return out.sort((a, b) => a.hit.rank - b.hit.rank)
}

/* ── Batch Found in Samples ─────────────────────────────────────────────── */

/**
 * Sample keywords: literal pattern matches in a BioSample's recorded text and
 * its study title (saline, hot, waste, plastic). A statement about the sample
 * record, never about the enzyme.
 */
export const SAMPLE_KEYWORDS = ["saline", "hot", "waste", "plastic"]

/**
 * A hit's sample rows from the batch response, most runs first: each the
 * BioSample's record with its study title. [] when the batch has none.
 */
export function hitSamples(batch, id) {
  const r = batch?.results?.[id]
  if (!r || r.status !== "ok") return []
  return (r.samples || []).map(([biosample, n_runs, ka_max]) => {
    const b = batch.biosamples?.[biosample] || {}
    return {
      biosample,
      n_runs,
      ka_max,
      ...b,
      bioproject_title: b.bioproject
        ? batch.bioprojects?.[b.bioproject] ?? null
        : null,
    }
  })
}

/** Union of a hit's samples' keywords, in SAMPLE_KEYWORDS order. */
export function hitKeywords(batch, id) {
  const found = new Set(hitSamples(batch, id).flatMap(s => s.keywords || []))
  return SAMPLE_KEYWORDS.filter(k => found.has(k))
}

/** Recorded isolation source (else medium) of the hit's sample with most runs. */
export function hitIsolation(batch, id) {
  for (const s of hitSamples(batch, id)) {
    const text = s.isolation_source || s.env_medium
    if (text) return text
  }
  return null
}

/**
 * BioSamples in an environment profile across this search's Logan hits, each
 * with the hits it holds, most hits first. Counts distinct studies too.
 */
export function profileSamples(batch, hits, profile) {
  const byBiosample = new Map()
  for (const h of hits) {
    if (h.db !== "logan") continue
    for (const s of hitSamples(batch, h.target_id)) {
      if (s.profile !== profile) continue
      if (!byBiosample.has(s.biosample))
        byBiosample.set(s.biosample, { ...s, hits: [] })
      byBiosample.get(s.biosample).hits.push(h)
    }
  }
  const samples = [...byBiosample.values()].sort(
    (a, b) =>
      b.hits.length - a.hits.length ||
      (b.n_runs ?? 0) - (a.n_runs ?? 0) ||
      a.biosample.localeCompare(b.biosample)
  )
  const studies = new Set(samples.map(s => s.bioproject).filter(Boolean))
  return { samples, studies: studies.size }
}

/** Distinct BioSamples and studies across every Logan hit in the batch. */
export function batchTotals(batch, hits) {
  const biosamples = new Set()
  const studies = new Set()
  for (const h of hits) {
    if (h.db !== "logan") continue
    for (const s of hitSamples(batch, h.target_id)) {
      biosamples.add(s.biosample)
      if (s.bioproject) studies.add(s.bioproject)
    }
  }
  return { samples: biosamples.size, studies: studies.size }
}

/* ── Formatting ─────────────────────────────────────────────────────────── */

export const profileName = slug =>
  slug == null ? null : String(slug).replace(/_/g, " ")

export const formatPercent = (fraction, digits = 1) =>
  fraction == null ? "—" : `${(fraction * 100).toFixed(digits)} %`

export const formatX = x =>
  x == null || !Number.isFinite(x)
    ? "—"
    : x >= 10
    ? x.toFixed(0)
    : x >= 0.1
    ? x.toFixed(1)
    : x.toFixed(2)

export const formatNumber = (n, digits = 0) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })

/** Store list fields are "; "-joined strings, often with repeats. */
export function listValue(value) {
  if (value == null) return []
  const parts = Array.isArray(value) ? value : String(value).split(/\s*;\s*/)
  return [...new Set(parts.map(s => String(s).trim()).filter(Boolean))]
}

/** Store booleans arrive as real booleans or as "yes" / "no" strings. */
export function yesNo(value) {
  if (value == null || value === "") return null
  if (typeof value === "string") return value
  return value ? "yes" : "no"
}
