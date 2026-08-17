import { env } from "@/lib/env"

/**
 * The single door to the backend.
 *
 * Nothing else in this app calls `fetch` against the API directly. That keeps
 * the base URL, error shape, timeout policy and caching policy in one file.
 *
 * Next never talks to Postgres. All data comes through the Express API on
 * Lambda, which is VPC-bound to RDS.
 */

export class ApiError extends Error {
  readonly status: number
  readonly url: string
  readonly body: string

  constructor(status: number, url: string, body: string) {
    super(`API ${status} for ${url}${body ? ` — ${truncate(body, 300)}` : ""}`)
    this.name = "ApiError"
    this.status = status
    this.url = url
    this.body = body
  }

  get isNotFound(): boolean {
    return this.status === 404
  }
}

/** Network-level failure: DNS, connection refused, TLS, timeout. No HTTP status. */
export class ApiUnreachableError extends Error {
  readonly url: string

  constructor(url: string, cause: unknown) {
    super(
      `Could not reach the API at ${url}. ` +
        `Is the backend running (cd backend && npm run dev)? ` +
        `Cause: ${cause instanceof Error ? cause.message : String(cause)}`
    )
    this.name = "ApiUnreachableError"
    this.url = url
    this.cause = cause
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export type QueryValue = string | number | boolean | null | undefined

export interface ApiRequestOptions {
  /** Appended as a query string. `null` and `undefined` entries are dropped. */
  searchParams?: Record<string, QueryValue>
  /**
   * Next's persistent cache lifetime in seconds, or `false` to cache
   * indefinitely. Fetches are uncached by default in Next 16 — this is opt-in.
   */
  revalidate?: number | false
  /** Cache tags for on-demand invalidation via `revalidateTag`. */
  tags?: string[]
  /** Escape hatch matching the native `cache` option. */
  cache?: RequestCache
  /**
   * Abort the request after this many milliseconds.
   *
   * Off by default and deliberately so: Next opts a request OUT of per-render
   * memoization as soon as it carries an `AbortSignal`, so a blanket timeout
   * would turn one upstream call into several when a layout, a page and
   * `generateMetadata` all request the same resource. API Gateway already
   * terminates at 29s, so a hang is externally bounded either way. Pass this
   * only where a single call needs a tighter bound than the gateway's.
   */
  timeoutMs?: number
  /** Extra request headers. */
  headers?: Record<string, string>
  /** Overrides the base URL. Used by the search API, which may be split off. */
  baseUrl?: string
  method?: "GET" | "POST"
  /** JSON request body. Implies POST when `method` is unset. */
  body?: unknown
}

function buildUrl(
  path: string,
  searchParams: Record<string, QueryValue> | undefined,
  baseUrl: string
): string {
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`)
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === null || value === undefined) continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/**
 * Fetches JSON from the API and throws on anything other than a 2xx.
 *
 * Throwing is the point. Gatsby's `createPages` swallowed fetch errors and
 * logged them, so a green CI run published a site with zero sequence, enzyme and
 * family pages. A build-time fetch that fails here fails the build.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    searchParams,
    revalidate,
    tags,
    cache,
    timeoutMs,
    headers,
    baseUrl = env.apiUrl,
    method,
    body,
  } = options

  const url = buildUrl(path, searchParams, baseUrl)
  const resolvedMethod = method ?? (body !== undefined ? "POST" : "GET")

  const init: RequestInit & {
    next?: { revalidate?: number | false; tags?: string[] }
  } = {
    method: resolvedMethod,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  }

  if (body !== undefined) init.body = JSON.stringify(body)
  if (cache) init.cache = cache
  if (revalidate !== undefined || tags) {
    init.next = {
      ...(revalidate !== undefined ? { revalidate } : {}),
      ...(tags ? { tags } : {}),
    }
  }
  if (timeoutMs !== undefined) init.signal = AbortSignal.timeout(timeoutMs)

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (cause) {
    throw new ApiUnreachableError(url, cause)
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      url,
      await response.text().catch(() => "")
    )
  }

  return (await response.json()) as T
}

/**
 * Like `apiFetch`, but resolves to `null` on 404 instead of throwing.
 *
 * Use this for "does this record exist" lookups feeding `notFound()`. Every
 * other status still throws, so a 500 never renders as a missing page.
 */
export async function apiFetchOrNull<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options)
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null
    throw error
  }
}
