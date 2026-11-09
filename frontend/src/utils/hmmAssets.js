/**
 * Profile HMM asset URLs for CATH domain profiles, sourced live from EBI/InterPro.
 *
 * Pfam profile HMMs and logos live at InterPro (Pfam moved to InterPro after xfam shutdown).
 * The documented `?annotation=hmm` endpoint returns a gzipped `.hmm` when it exists. Logos are
 * served as Skylign JSON (not a plain image), so we render an inline image only when a resolved
 * logo URL or a locally committed override is available.
 */

/** @param {string} pfamAccession e.g. "PF01674" */
function normalizeAccession(pfamAccession) {
  const raw = String(pfamAccession || "").trim().toUpperCase()
  if (!raw) return ""
  return raw.startsWith("PF") ? raw : `PF${raw}`
}

/**
 * Direct download URL for the gzipped Pfam HMM file from InterPro.
 * @param {string} pfamAccession
 * @returns {string|null}
 */
export function hmmDownloadUrl(pfamAccession) {
  const acc = normalizeAccession(pfamAccession)
  if (!acc) return null
  return `https://www.ebi.ac.uk/interpro/api/entry/pfam/${acc}?annotation=hmm`
}

/**
 * Suggested filename for the downloaded HMM.
 * @param {string} pfamAccession
 * @param {string} [profileHmm] short HMM name, e.g. "Lipase_2"
 * @returns {string}
 */
export function hmmDownloadFilename(pfamAccession, profileHmm) {
  const acc = normalizeAccession(pfamAccession)
  const name = String(profileHmm || "").trim().replace(/[^\w.-]+/g, "_")
  const base = [acc, name].filter(Boolean).join("_") || "profile"
  return `${base}.hmm.gz`
}

/**
 * Human-facing InterPro Pfam entry overview page (replaces retired /curation/ URLs).
 * @param {string} pfamAccession
 * @returns {string}
 */
export function hmmEntryUrl(pfamAccession) {
  const acc = normalizeAccession(pfamAccession)
  if (!acc) return "https://www.ebi.ac.uk/interpro/entry/pfam/"
  return `https://www.ebi.ac.uk/interpro/entry/pfam/${acc}/`
}

/**
 * InterPro logo annotation endpoint (Skylign JSON).
 * @param {string} pfamAccession
 * @returns {string|null}
 */
export function hmmLogoDataUrl(pfamAccession) {
  const acc = normalizeAccession(pfamAccession)
  if (!acc) return null
  return `https://www.ebi.ac.uk/interpro/api/entry/pfam/${acc}?annotation=logo`
}

/**
 * Resolve the inline logo image source for a domain, if any.
 * Prefers a locally committed override (`hmmLogoImage`); returns null when only an external
 * link is available so callers can fall back gracefully.
 * @param {{ hmmLogoImage?: string|null, pfamAccession?: string }} domain
 * @returns {string|null}
 */
export function resolveHmmLogoImage(domain) {
  const local = domain?.hmmLogoImage
  if (local && String(local).trim()) return String(local).trim()
  return null
}
