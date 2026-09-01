/**
 * SequenceSearch Component – src/components/SequenceSearch.jsx
 *
 * Input form only. On submit navigates to /results?job={sessionId}
 * All polling and result rendering lives in pages/results.js.
 *
 * Note there is deliberately no "max results" control here. Result count is a
 * *view* concern, not a search parameter — every search runs to the fixed
 * SEARCH_RESULT_DEPTH and ResultsView subsets it. See components/search/
 * constants.js for why (a depth change used to force a full ~46 s re-search).
 */
import React, { useState, useEffect } from "react"
import { navigate } from "gatsby"
import config from "../../config"
import ExampleCards from "./ExampleCards"
import SearchHistory from "./SearchHistory"
import { cleanSequence } from "../../utils/lib"
import { SEARCH_RESULT_DEPTH } from "./constants"

const EXAMPLE_SEQUENCES = {
  isPETase: `>IsPETase (WP_054022242.1)
MNFPRASRLMQAAVLGGLMAVSAAATAQTNPYARGPNPTAASLEASAGPFTVRSFTVSRPSGYGAGTVYYPTNAGGTVGAIAIVPGYTARQSSIKWWGPRLASHGFVVITIDTNSTLDQPSSRSSQQMAALRQVASLNGTSSSPIYGKVDTARMGVMGWSMGGGGSLISAANNPSLKAAAPQAPWDSSTNFSSVTVPTLIFACENDSIAPVNSSALPIYDSMSRNAKQFLEINGGSHSCANSGNSNQALIGKKGVAWMKRFMDNDTRYSTFACENPNSTRVSDFRTANCS`,
}

const SequenceSearch = () => {
  const [sequence, setSequence] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Allow deep-links to pre-fill the form (e.g. the corpus sequence page's
  // "Search this sequence" action passes ?prefill=<FASTA>). We populate the
  // textarea but do NOT auto-submit — the user reviews and clicks Search.
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const prefill = params.get("prefill") || params.get("seq")
    if (prefill) {
      setSequence(prefill.startsWith(">") ? prefill : `>query\n${prefill}`)
    }
  }, [])

  const searchApiUrl = process.env.GATSBY_SEARCH_API_URL || config.apiUrl

  const submitSearch = async () => {
    const clean = cleanSequence(sequence)
    if (!clean || clean.length < 10) {
      setError(
        "Please enter a valid protein sequence (at least 10 amino acids)."
      )
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch(`${searchApiUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Constant depth, never a user choice: the caller's count no longer
        // selects how deep DIAMOND searches, only how deep the stored result is.
        body: JSON.stringify({ sequence, max_results: SEARCH_RESULT_DEPTH }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error ${response.status}`)
      }

      navigate(`/results?job=${data.session_id}`)
    } catch (err) {
      setError(err.message || "Failed to submit search. Please try again.")
      setSubmitting(false)
    }
  }

  const loadExample = name => {
    setSequence(EXAMPLE_SEQUENCES[name])
    setError(null)
  }

  const isSearchDisabled =
    submitting || sequence.replace(/^>.*\n?/gm, "").trim().length < 10

  return (
    <div className="w-full space-y-4">
      <ExampleCards
        onSelectExample={sid => window.open(`/results?job=${sid}`, "_blank")}
        disabled={submitting}
      />

      {/* Textarea */}
      <div className="space-y-1.5">
        <textarea
          className={[
            "w-full min-h-[150px] resize-y",
            "font-mono text-sm text-foreground",
            "bg-background border border-input rounded-lg px-3 py-2.5",
            "placeholder:text-muted-foreground",
            "transition-colors duration-fast",
            "focus:outline-none focus:border-ring",
            submitting ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
          style={{
            boxShadow: "none",
          }}
          onFocus={e => {
            e.currentTarget.style.boxShadow = `0 0 0 3px oklch(from var(--ring) l c h / 0.2)`
            e.currentTarget.style.borderColor = "var(--ring)"
          }}
          onBlur={e => {
            e.currentTarget.style.boxShadow = "none"
            e.currentTarget.style.borderColor = "var(--input)"
          }}
          placeholder={">Header (optional)\nPASTE_SEQUENCE_HERE..."}
          value={sequence}
          onChange={e => {
            const val = e.target.value
            // Ensure the textarea always has a header so Joi validation passes.
            // Use ">query\n" (not bare ">") so the header line is non-empty and
            // the sequence body stays on its own line.
            setSequence(val.startsWith(">") ? val : `>query\n${val}`)
            setError(null)
          }}
          disabled={submitting}
        />

        {/* Load example */}
        <p className="text-sm text-muted-foreground">
          Load example:{" "}
          <button
            onClick={() => loadExample("isPETase")}
            className="text-accent hover:text-accent-hover hover:underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer text-sm font-medium transition-colors"
          >
            IsPETase
          </button>
        </p>
      </div>

      {/* Submit */}
      <button
        onClick={submitSearch}
        disabled={isSearchDisabled}
        className={[
          "btn btn-primary min-w-[120px] justify-center",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        {submitting && (
          <span className="w-4 h-4 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" />
        )}
        {submitting ? "Submitting…" : "Search"}
      </button>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          {error}
        </div>
      )}

      <SearchHistory
        onSelectSearch={sid => window.open(`/results?job=${sid}`, "_blank")}
        currentJobId={null}
        newSearchCount={0}
      />
    </div>
  )
}

export default SequenceSearch
