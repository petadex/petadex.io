// frontend/src/utils/annotation.js
//
// BioSample annotation layer helpers ("02 Annotation Layer - Frontend").
// Pure functions + the batch fetcher. The two rules that matter everywhere:
//
//   1. Key the UI on `profile_evidence`, never on `profile_tier`. The tier is a
//      rule-precedence number (1 = stated is the STRONGEST, 3 = form template the
//      weakest, 0 = none), so sorting or thresholding on it gives the wrong order.
//   2. None of the "missing" states are errors — each is a large, permanent share
//      of the corpus. They are checked in a fixed order (§6), see provenanceState.
import config from "../config"

// The 22 profile slugs from profile_rules.py. Descriptions don't exist yet
// (open content task, §2.5) — these are display names only.
export const PROFILE_LABELS = {
  human_gut: "Human gut",
  human_oral: "Human oral",
  human_skin: "Human skin",
  human_respiratory: "Human respiratory",
  human_urogenital: "Human urogenital",
  human_other: "Human (other)",
  animal_gut: "Animal gut",
  animal_other: "Animal (other)",
  gut_unspecified: "Gut (unspecified)",
  plant_associated: "Plant-associated",
  soil: "Soil",
  sediment: "Sediment",
  marine: "Marine",
  freshwater: "Freshwater",
  wastewater_sludge: "Wastewater / sludge",
  engineered_built: "Engineered / built",
  food: "Food",
  air: "Air",
  extreme: "Extreme",
  lab_culture: "Lab culture",
  other_environmental: "Other environmental",
  unprofilable: "No environment description",
}

// One-line definitions, keyed by slug. Empty until the content task in §2.5 is
// done; the profile pages render whatever is here (or a profile_summary
// `description` column, if one is added) and omit the line otherwise.
export const PROFILE_DESCRIPTIONS = {}

export function profileLabel(slug) {
  if (!slug) return null
  return (
    PROFILE_LABELS[slug] ??
    slug.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())
  )
}

// How each evidence level is shown. `stated` is the profile, plain; the others
// carry a visible marker so stated and inferred never look the same.
export const EVIDENCE_META = {
  stated: {
    marker: null,
    title: "Stated in the BioSample record",
  },
  inferred: {
    marker: "inferred",
    title: "Inferred from other fields of the BioSample record",
  },
  form_template: {
    marker: "from submission form",
    title:
      "Derived from the submission form template the sample was filed under, not from a description of the sample",
  },
  none: {
    marker: null,
    title: "The sample has no environment description",
  },
}

// §6 — the UI states, checked in this order on a provenance row.
export const PROVENANCE_STATES = {
  no_run: {
    copy: "Not from a metagenome run",
    detail: "Curated or GenBank origin, so there is no sample to show.",
  },
  no_biosample: {
    copy: "No linked SRA sample",
    detail: "The run is missing from SRA's own metadata.",
  },
  outside_snapshot: {
    copy: "BioSample outside the annotation snapshot",
    detail: "Provenance is shown; no environment profile is available.",
  },
  unprofilable: {
    copy: "Sample has no environment description",
    detail: null,
  },
  form_template_only: {
    copy: "Profiled from the submission form template alone; not a statement about the sample",
    detail: null,
  },
  profiled: { copy: null, detail: null },
}

/** @returns {keyof PROVENANCE_STATES} */
export function provenanceState(row) {
  if (row.run == null) return "no_run"
  if (row.biosample == null) return "no_biosample"
  if (row.profile == null) return "outside_snapshot"
  if (row.profile === "unprofilable") return "unprofilable"
  if (row.in_universe === false) return "form_template_only"
  return "profiled"
}

/**
 * The profile to display for a hit (§4.1): its own profile when it is in
 * universe and not `unprofilable`, otherwise the cluster's dominant profile,
 * labelled as the cluster's. This is what lifts coverage from 52.4 % to 82.0 %.
 *
 * @returns {{
 *   profile: string | null,
 *   source: "own" | "cluster" | null,
 *   evidence: string | null,
 *   clusterFrac: number | null,
 *   clusterNProfiled: number | null,
 *   state: string,
 * }}
 */
export function resolveProfile(row) {
  const state = provenanceState(row)
  if (state === "profiled") {
    return {
      profile: row.profile,
      source: "own",
      evidence: row.profile_evidence ?? null,
      clusterFrac: null,
      clusterNProfiled: null,
      state,
    }
  }
  if (row.cluster_dominant_profile) {
    return {
      profile: row.cluster_dominant_profile,
      source: "cluster",
      evidence: null,
      clusterFrac: row.cluster_dominant_frac ?? null,
      clusterNProfiled: row.cluster_n_orfs_profiled ?? null,
      state,
    }
  }
  return {
    profile: null,
    source: null,
    evidence: null,
    clusterFrac: null,
    clusterNProfiled: null,
    state,
  }
}

// Facet value for hits with no own-or-cluster profile.
export const NO_PROFILE_FACET = "none"

export function profileFacetValue(row) {
  return resolveProfile(row).profile ?? NO_PROFILE_FACET
}

// Mirrors the backend cap on POST /api/annotations/batch.
export const ANNOTATION_BATCH_CAP = 1000

/**
 * Enrich a page of hits. Sends the orf_ids in as few calls as the cap allows and
 * returns a Map orf_id(string) → provenance row. The backend returns rows in
 * request order, one per id, so they zip back by index.
 *
 * @param {(string|number)[]} orfIds
 * @param {AbortSignal} [signal]
 */
export async function fetchAnnotations(orfIds, signal) {
  const ids = [...new Set(orfIds.filter(id => id != null).map(Number))].filter(
    n => Number.isSafeInteger(n) && n > 0
  )
  const out = new Map()
  for (let i = 0; i < ids.length; i += ANNOTATION_BATCH_CAP) {
    const chunk = ids.slice(i, i + ANNOTATION_BATCH_CAP)
    const res = await fetch(`${config.apiUrl}/annotations/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orf_ids: chunk }),
      signal,
    })
    if (!res.ok) throw new Error(`Annotation batch failed (${res.status})`)
    const { results } = await res.json()
    chunk.forEach((id, j) => out.set(String(id), results[j]))
  }
  return out
}

export const ncbiSraUrl = run =>
  `https://www.ncbi.nlm.nih.gov/sra/${encodeURIComponent(run)}`
export const ncbiBioprojectUrl = bioproject =>
  `https://www.ncbi.nlm.nih.gov/bioproject/${encodeURIComponent(bioproject)}`
export const ncbiBiosampleUrl = biosample =>
  `https://www.ncbi.nlm.nih.gov/biosample/${encodeURIComponent(biosample)}`
export const biosamplePath = biosample =>
  `/biosample/${encodeURIComponent(biosample)}`
export const clusterPath = pid90 => `/cluster/90/${encodeURIComponent(pid90)}`
export const profilePath = slug => `/profiles/${encodeURIComponent(slug)}/`

// External map views for a stated lat_lon. Both take plain decimal degrees.
export const osmUrl = (lat, lon) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=9/${lat}/${lon}`
export const googleMapsUrl = (lat, lon) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
