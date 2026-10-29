/**
 * Client for "Export all significant hits" (vault note 13).
 *
 * A search stores the top 500 hits. An export re-runs it with no hit cap and
 * produces downloadable files: POST /search/export starts it (or finds a
 * cached one), GET /search/export/:exportSessionId polls it and refreshes the
 * short-lived download links. Polling only reads S3; it never runs a search.
 */
import config from "../config"

const searchApiUrl = () => process.env.GATSBY_SEARCH_API_URL || config.apiUrl

async function readJson(resp) {
  try {
    return await resp.json()
  } catch {
    return {}
  }
}

/**
 * Start (or attach to) the export for a query. `databaseVersion` is the build
 * the displayed search ran against, so the API can refuse an export that would
 * run against a newer database than the table on screen.
 *
 * Resolves to { ok, status, data }: 200 ready, 202 running, 409 refused
 * (database moved on / search already exhaustive), 429/503 busy (with
 * data.retry_after).
 */
export async function startExport({ sequence, databaseVersion }) {
  const resp = await fetch(`${searchApiUrl()}/search/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sequence,
      ...(databaseVersion ? { database_version: databaseVersion } : {}),
    }),
  })
  return { ok: resp.ok, status: resp.status, data: await readJson(resp) }
}

/** Poll an export: data.status is none | running | ready | failed. */
export async function pollExport(exportSessionId, jobId) {
  const qs = jobId ? `?job_id=${encodeURIComponent(jobId)}` : ""
  const resp = await fetch(
    `${searchApiUrl()}/search/export/${exportSessionId}${qs}`
  )
  return { ok: resp.ok, status: resp.status, data: await readJson(resp) }
}

// Remembers the running job per search in this tab, so a reload mid-export
// resumes polling instead of losing track of it. Wrapped because storage can
// be unavailable (private mode, blocked site data).
const STORAGE_PREFIX = "petadex_export:"

export function rememberExportJob(sessionId, job) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + sessionId, JSON.stringify(job))
  } catch {}
}

export function recallExportJob(sessionId) {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + sessionId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function forgetExportJob(sessionId) {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + sessionId)
  } catch {}
}

/** 1375701 → "1.4 MB". */
export function formatBytes(bytes) {
  if (bytes == null) return null
  const units = ["B", "KB", "MB", "GB"]
  let n = bytes
  let i = 0
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000
    i++
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`
}
