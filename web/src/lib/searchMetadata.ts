import type {
  ClusterCard,
  ClusterLevel,
  EnrichmentStatus,
  EnvironmentProfileShare,
  HitOrigin,
  LoganMetadata,
  PlMember,
  SearchHit,
  SearchResultMetadata,
} from "@/lib/api/types"

/**
 * Pure functions behind the search-results metadata views. No DOM, no fetch.
 *
 * Design rule carried through every function here: present data, never a
 * judgement. Nothing computes a score or a recommendation; the default order
 * is always the search's own rank (bitscore), and every other order is one the
 * viewer picks.
 */

/* ── Enrichment status ───────────────────────────────────────────────────── */

/** `null` means the result predates search_version 1.5.0: nothing to show. */
export function enrichmentStatus(
  metadata: Pick<SearchResultMetadata, "enrichment_status">
): EnrichmentStatus {
  return metadata.enrichment_status ?? "unavailable"
}

/** Metadata columns and views exist only when some record could be present. */
export function hasEnrichment(status: EnrichmentStatus): boolean {
  return status === "ok" || status === "partial"
}

/* ── Identifiers ─────────────────────────────────────────────────────────── */

/**
 * Display label for a cluster domain_id: the part before the first "|".
 * "PL228|C001|3.4e-40|48|261|C001" → "PL228".
 */
export function clusterLabel(
  domainId: string | null | undefined
): string | null {
  if (!domainId) return null
  return domainId.split("|", 1)[0] || null
}

export const ORIGIN_LABEL: Record<HitOrigin, string> = {
  plasticome: "Plasticome",
  ncbi_nr: "NCBI nr",
  logan: "Logan",
}

/* ── Evidence ────────────────────────────────────────────────────────────── */

export type Evidence =
  "stated" | "measured" | "organism_physiology" | "inferred" | "profile"

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  stated: "stated",
  measured: "measured",
  organism_physiology: "organism physiology",
  inferred: "inferred",
  profile: "profile",
}

/** Evidence class per field, per origin — the 1.5.0 contract, verbatim. */
export const FIELD_EVIDENCE: Record<HitOrigin, Record<string, Evidence>> = {
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

export function fieldEvidence(
  origin: HitOrigin | null,
  field: string
): Evidence | null {
  return origin ? (FIELD_EVIDENCE[origin][field] ?? null) : null
}

/* ── Relatives table ─────────────────────────────────────────────────────── */

/** Uncharacterized origins. Plasticome hits are the characterized relatives. */
export const RELATIVE_ORIGINS: HitOrigin[] = ["ncbi_nr", "logan"]

export function relativeHits(hits: SearchHit[]): SearchHit[] {
  return hits.filter(h => h.origin !== null && h.origin !== "plasticome")
}

export interface RelativesFilter {
  minIdentity: number
  minCoverage: number
  origins: HitOrigin[]
}

export function filterRelatives(
  hits: SearchHit[],
  { minIdentity, minCoverage, origins }: RelativesFilter
): SearchHit[] {
  return hits.filter(
    h =>
      h.origin !== null &&
      origins.includes(h.origin) &&
      h.percent_identity >= minIdentity &&
      (h.query_coverage ?? 0) >= minCoverage
  )
}

export type RelativesSortKey =
  "rank" | "identity" | "samples" | "studies" | "coverage"

/** Samples and studies: BioSamples and BioProjects. nr has no BioProject count. */
function sortValue(hit: SearchHit, key: RelativesSortKey): number | null {
  const m = hit.metadata as LoganMetadata | null
  switch (key) {
    case "rank":
      return hit.rank
    case "identity":
      return hit.percent_identity
    case "coverage":
      return hit.query_coverage
    case "samples":
      return m?.n_biosamples ?? null
    case "studies":
      return m?.n_bioprojects ?? null
  }
}

/**
 * Rank sorts ascending (1 first); every other key sorts descending. Missing
 * values always sink to the bottom, and ties keep search rank.
 */
export function sortRelatives(
  hits: SearchHit[],
  key: RelativesSortKey
): SearchHit[] {
  const dir = key === "rank" ? 1 : -1
  return [...hits].sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va === null && vb === null) return a.rank - b.rank
    if (va === null) return 1
    if (vb === null) return -1
    return (va - vb) * dir || a.rank - b.rank
  })
}

/**
 * Keeps the best-ranked hit of each 90 % cluster. Hits with no cluster are
 * kept, since there is nothing to collapse them into.
 */
export function onePerCluster(
  hits: SearchHit[],
  level: ClusterLevel = "c90"
): SearchHit[] {
  const best = new Map<string, SearchHit>()
  for (const hit of hits) {
    const key = hit.metadata?.[level]
    if (!key) continue
    const current = best.get(key)
    if (!current || hit.rank < current.rank) best.set(key, hit)
  }
  return hits.filter(hit => {
    const key = hit.metadata?.[level]
    return !key || best.get(key) === hit
  })
}

/** FASTA for hits with a full subject sequence; others are skipped. */
export function toFasta(hits: SearchHit[]): string {
  return hits
    .filter(h => h.target_sequence)
    .map(h => {
      const seq = h.target_sequence!.match(/.{1,60}/g)!.join("\n")
      return `>${h.target_id} rank=${h.rank} pident=${h.percent_identity}\n${seq}`
    })
    .join("\n")
}

/* ── Environments ────────────────────────────────────────────────────────── */

/** Chart rows: profiles by share of this search's Logan sequences, largest first. */
export function environmentRows(
  profiles: EnvironmentProfileShare[] | null | undefined
): EnvironmentProfileShare[] {
  return [...(profiles ?? [])].sort(
    (a, b) => b.share - a.share || a.profile.localeCompare(b.profile)
  )
}

export interface ProfileMember {
  hit: SearchHit
  /** This sequence's weight in the profile: its BioSamples there / its total. */
  share: number
}

/**
 * Logan hits whose samples include `profile`, in search rank order. Each
 * sequence counts once; its weight is split across its samples' profiles.
 */
export function hitsInProfile(
  hits: SearchHit[],
  profile: string
): ProfileMember[] {
  const members: ProfileMember[] = []
  for (const hit of hits) {
    if (hit.origin !== "logan") continue
    const hist = (hit.metadata as LoganMetadata | null)?.prof_hist
    if (!hist || !hist[profile]) continue
    const total = Object.values(hist).reduce((sum, n) => sum + n, 0)
    if (total > 0) members.push({ hit, share: hist[profile] / total })
  }
  return members.sort((a, b) => a.hit.rank - b.hit.rank)
}

/* ── Sequence record ─────────────────────────────────────────────────────── */

export interface CharacterizedRelative {
  id: string
  member: PlMember
  /** The PL hit from this search, when the relative was itself a hit. */
  hit: SearchHit | null
}

/**
 * The Plasticome members of a hit's 60 % cluster.
 *
 * Prefers the store's `clusters.c60[id].pl_members`. Results without that
 * list fall back to the PL hits of this search that share the c60, which is a
 * subset of the cluster's members.
 */
export function characterizedRelatives(
  hit: SearchHit,
  hits: SearchHit[],
  clusters: SearchResultMetadata["clusters"]
): CharacterizedRelative[] {
  const c60 = hit.metadata?.c60
  if (!c60) return []
  const plHits = new Map(
    hits.filter(h => h.origin === "plasticome").map(h => [h.target_id, h])
  )
  const card: ClusterCard | undefined = clusters?.c60?.[c60]
  if (card?.pl_members) {
    return card.pl_members.map(member => ({
      id: member.id,
      member,
      hit: plHits.get(member.id) ?? null,
    }))
  }
  return [...plHits.values()]
    .filter(h => h.metadata?.c60 === c60)
    .map(h => ({ id: h.target_id, member: h.metadata as PlMember, hit: h }))
}

/* ── Formatting ──────────────────────────────────────────────────────────── */

/** Store profile slugs ("other_environmental") as display labels. */
export function profileLabel(profile: string): string {
  return profile.replace(/_/g, " ")
}

/** Store booleans may arrive as real booleans or as "yes" / "no" strings. */
export function yesNo(
  value: boolean | string | null | undefined
): string | null {
  if (value == null || value === "") return null
  if (typeof value === "string") return value
  return value ? "yes" : "no"
}

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)} %`
}

export function formatXExpected(x: number): string {
  return `${x >= 10 ? x.toFixed(0) : x.toFixed(1)}× expected`
}

/** Store list fields are "; "-joined strings; arrays are accepted too. */
export function listValue(
  value: string[] | string | null | undefined
): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return value
    .split(/\s*[;|]\s*/)
    .map(s => s.trim())
    .filter(Boolean)
}
