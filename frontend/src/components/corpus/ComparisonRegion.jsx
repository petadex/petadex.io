// frontend/src/components/corpus/ComparisonRegion.jsx
//
// User-initiated COMPARISON action (search this sequence against the corpus),
// kept distinct from factual panels per "03 - Frontend Wiring". Does not run
// the search — pre-fills /search with a FASTA block for this ORF.
import React, { useState } from "react"
import { navigate } from "gatsby"
import { cleanSequence } from "../../utils/lib"

/**
 * @param {{
 *   sequence: string | null,
 *   orfId?: number | string | null,
 *   accession?: string | null,
 *   variant?: "block" | "inline",
 * }} props
 */
export default function ComparisonRegion({
  sequence,
  orfId,
  accession,
  variant = "block",
}) {
  const [error, setError] = useState(null)

  const clean = cleanSequence(sequence || "")
  const canSearch = Boolean(clean && clean.length >= 10)

  const queryHeader =
    [accession, orfId != null ? `ORF ${orfId}` : null]
      .filter(Boolean)
      .join(" ") || "query"

  const goToSearch = () => {
    if (!canSearch) {
      setError("This sequence is too short to search.")
      return
    }
    const fasta = `>${queryHeader}\n${clean}`
    navigate(`/search?prefill=${encodeURIComponent(fasta)}`)
  }

  if (variant === "inline") {
    return (
      <div className="mt-3 max-w-2xl">
        <p className="text-xs text-muted-foreground m-0 mb-2 leading-relaxed">
          Compare against the corpus: open search pre-filled with this sequence
          for a DIAMOND similarity search (~307M Logan sequences).
        </p>
        <button
          type="button"
          onClick={goToSearch}
          disabled={!canSearch}
          className={[
            "text-xs font-medium px-3 py-1.5 rounded border border-border",
            "bg-surface-raised text-foreground hover:border-info hover:text-info",
            "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          ].join(" ")}
        >
          Search this sequence
        </button>
        {!canSearch && (
          <p className="text-xs text-muted-foreground mt-1.5 mb-0">
            Needs at least 10 amino acids to search.
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive mt-1.5 mb-0">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-dashed border-border bg-surface-sunken p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-semibold text-foreground m-0">
          Compare against the corpus
        </h2>
        <span className="inline-flex items-center rounded-full bg-info/15 px-2.5 py-0.5 text-xs font-medium text-info">
          Comparison
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-2xl">
        Pre-fill the sequence search with this ORF (sequence + identity header)
        to run a DIAMOND similarity search against the ~307M-sequence Logan
        corpus. Results are alignment statistics for{" "}
        <em>searching this sequence</em> — distinct from the factual annotations
        above.
      </p>

      <button
        type="button"
        onClick={goToSearch}
        disabled={!canSearch}
        className={[
          "btn btn-primary min-w-[200px] justify-center",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        Search this sequence
      </button>

      {!canSearch && (
        <p className="text-xs text-muted-foreground mt-2 mb-0">
          A sequence of at least 10 amino acids is required to search.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          {error}
        </div>
      )}
    </section>
  )
}
