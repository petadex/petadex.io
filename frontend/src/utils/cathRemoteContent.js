import config from "../config"

/**
 * Fetch long-form CATH-domain narrative from S3 (or any configured base URL).
 * Returns null when missing / unreachable so the page can show a short stub.
 *
 * @param {string} cathId
 * @returns {Promise<object|null>}
 */
export async function fetchCathDomainNarrative(cathId) {
  const base = String(config.cathDomainContentBaseUrl || "").replace(/\/$/, "")
  if (!base || !cathId) return null
  const url = `${base}/${encodeURIComponent(cathId)}.json`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Fetch methodology article JSON from S3.
 * Shape: { title, byline?, sections: [{ heading, paragraphs: string[] }], warning? }
 *
 * @returns {Promise<object|null>}
 */
export async function fetchMethodologyContent() {
  const url = config.methodologyContentUrl
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
