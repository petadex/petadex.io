// frontend/src/components/corpus/ComparisonRegion.jsx
//
// User-initiated COMPARISON action (search this sequence against the corpus),
// kept in a visually separate region from the factual panels per the framing
// discipline in "03 - Frontend Wiring": comparisons are "results of searching
// this sequence", NOT first-paint facts. This does NOT run the search — it
// pre-fills the /search form (FASTA block, with this ORF's identity as header)
// and lets the user submit it themselves.
import React, { useState } from "react"
import { navigate } from "gatsby"
import { cleanSequence } from "../../utils/lib"

/**
 * @param {{
 *   sequence: string | null,
 *   orfId?: number | string | null,
 *   accession?: string | null,
 * }} props
 */
export default function ComparisonRegion({ sequence, orfId, accession }) {
  const [error, setError] = useState(null)

  const clean = cleanSequence(sequence || "")
  const canSearch = Boolean(clean && clean.length >= 10)

  // The search form expects a FASTA block (`>header\nSEQ`). Build a header that
  // identifies this ORF so it lands pre-filled and labelled: prefer the GenBank
  // accession, always carry the ORF id (the corpus native key).
  const queryHeader =
    [accession, orfId != null ? `ORF ${orfId}` : null]
      .filter(Boolean)
      .join(" ") || "query"

  // Don't run the search here — just pre-fill the /search form so the user
  // submits it themselves (and can tweak it first).
  const goToSearch = () => {
    if (!canSearch) {
      setError("This sequence is too short to search.")
      return
    }
    const fasta = `>${queryHeader}\n${clean}`
    navigate(`/search?prefill=${encodeURIComponent(fasta)}`)
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
        Pre-fill the sequence search with this sequence (sequence + identity
        header) to run a DIAMOND similarity search against the PETadex v260701
        corpus (298.7M sequences from the Plasticome, NCBI nr and Logan).
        Results are alignment statistics for{" "}
        <em>searching this sequence</em> — distinct from the factual annotations
        above.
      </p>

      <button
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
