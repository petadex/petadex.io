import React, { useMemo, useState, useEffect } from "react"
import { collectLeafEnzymeIds, leafMatchesQuery } from "./leafUtils"

export default function PhyloTreeSearch({
  root,
  memberIndex,
  onMatchesChange,
  onFocusChange,
}) {
  const [query, setQuery] = useState("")
  const [matchIndex, setMatchIndex] = useState(0)

  const allLeafIds = useMemo(
    () => (root ? collectLeafEnzymeIds(root) : []),
    [root],
  )

  const matchIds = useMemo(() => {
    if (!query.trim()) return []
    return allLeafIds.filter(id =>
      leafMatchesQuery(id, query, memberIndex),
    )
  }, [allLeafIds, query, memberIndex])

  useEffect(() => {
    setMatchIndex(0)
  }, [query, matchIds.length])

  useEffect(() => {
    onMatchesChange?.({
      matchIds: new Set(matchIds),
      searchActive: Boolean(query.trim()),
    })
  }, [matchIds, query, onMatchesChange])

  useEffect(() => {
    // Only drive focus while a query is active so click/neighbor focus can persist after clear.
    if (!query.trim()) return
    const focused = matchIds.length ? matchIds[matchIndex] : null
    onFocusChange?.(focused)
  }, [matchIds, matchIndex, onFocusChange, query])

  const goPrev = () => {
    if (!matchIds.length) return
    setMatchIndex(i => (i - 1 + matchIds.length) % matchIds.length)
  }

  const goNext = () => {
    if (!matchIds.length) return
    setMatchIndex(i => (i + 1) % matchIds.length)
  }

  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search enzyme ID or accession…"
          className="input flex-1 min-w-[200px] text-sm"
          aria-label="Search phylogenetic tree"
        />
        {query.trim() && (
          <>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {matchIds.length} match{matchIds.length === 1 ? "" : "es"}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={goPrev}
              disabled={!matchIds.length}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={goNext}
              disabled={!matchIds.length}
            >
              Next
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          </>
        )}
      </div>
      {query.trim() && !matchIds.length && (
        <p className="text-sm text-muted-foreground">No matching leaves in this tree.</p>
      )}
    </div>
  )
}
