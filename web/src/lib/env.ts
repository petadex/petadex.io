/**
 * Environment access, validated once at module load.
 *
 * Two rules drive this file:
 *
 * 1. Every `process.env.NEXT_PUBLIC_*` read is written out literally. Next
 *    inlines these at build time by textual substitution, so a computed lookup
 *    like `process.env[name]` silently yields `undefined` in the browser.
 * 2. A missing required value throws here rather than degrading later. The old
 *    Gatsby build swallowed a failed API host and published an empty site; the
 *    rebuild plan makes loud failure non-negotiable.
 */

class EnvError extends Error {
  constructor(message: string) {
    super(
      `${message}\n\nCopy web/.env.example to web/.env.local and fill it in, ` +
        `or set the variable in the Vercel project settings.`
    )
    this.name = "EnvError"
  }
}

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new EnvError(`Missing required environment variable ${name}.`)
  }
  return value.trim()
}

/** Strips trailing slashes so callers can always join with a leading-slash path. */
function normalizeUrl(name: string, value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new EnvError(`${name} must be an absolute URL. Received: ${value}`)
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new EnvError(`${name} must be http or https. Received: ${value}`)
  }
  return value.replace(/\/+$/, "")
}

function optionalInt(
  name: string,
  value: string | undefined,
  fallback: number
): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new EnvError(`${name} must be a positive number. Received: ${value}`)
  }
  return parsed
}

const apiUrl = normalizeUrl(
  "NEXT_PUBLIC_API_URL",
  required("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL)
)

const siteUrl = normalizeUrl(
  "NEXT_PUBLIC_SITE_URL",
  required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL)
)

const searchApiUrl = process.env.NEXT_PUBLIC_SEARCH_API_URL
  ? normalizeUrl(
      "NEXT_PUBLIC_SEARCH_API_URL",
      process.env.NEXT_PUBLIC_SEARCH_API_URL
    )
  : apiUrl

const atlasDataUrl = process.env.NEXT_PUBLIC_ATLAS_DATA_URL
  ? normalizeUrl(
      "NEXT_PUBLIC_ATLAS_DATA_URL",
      process.env.NEXT_PUBLIC_ATLAS_DATA_URL
    )
  : "https://petadex.s3.amazonaws.com/atlas/umap.json.gz"

/**
 * The API origin without the `/api` suffix. `/health` and `/docs` are mounted at
 * the Express root, not under `/api`, so they need this rather than `apiUrl`.
 */
const apiOrigin = apiUrl.replace(/\/api$/, "")

export const env = {
  apiUrl,
  apiOrigin,
  searchApiUrl,
  atlasDataUrl,
  siteUrl,
  apiTimeoutMs: optionalInt(
    "NEXT_PUBLIC_API_TIMEOUT_MS",
    process.env.NEXT_PUBLIC_API_TIMEOUT_MS,
    30_000
  ),
  isProduction: process.env.NODE_ENV === "production",
} as const

export type Env = typeof env
