"use client"

import { useEffect } from "react"

/**
 * Route-level error boundary.
 *
 * The API client throws on any non-2xx response, which is intentional — this is
 * where those throws surface at request time. In development the message is
 * shown verbatim, because "API 500 for .../api/enzymes" is the whole diagnosis.
 * In production it is withheld, since upstream error bodies can echo query
 * internals.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const showDetail = process.env.NODE_ENV !== "production"

  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="text-foreground text-3xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted mt-3 max-w-prose text-base leading-relaxed">
        This page could not be rendered. The data it needs was unavailable.
      </p>

      {showDetail && (
        <pre className="border-border bg-surface text-muted mt-6 max-w-full overflow-x-auto rounded-lg border p-4 font-mono text-xs">
          {error.message}
        </pre>
      )}

      {error.digest && (
        <p className="text-muted tabular mt-3 font-mono text-xs">
          digest: {error.digest}
        </p>
      )}

      <button
        type="button"
        onClick={reset}
        className="border-border text-foreground hover:bg-surface mt-6 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
