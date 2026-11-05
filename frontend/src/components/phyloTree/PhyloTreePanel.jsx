import React, { useState, useMemo, useCallback } from "react"
import { Link } from "gatsby"
import PhyloTreeViewer from "./PhyloTreeViewer"
import PhyloTreeSearch from "./PhyloTreeSearch"
import { useFamilyTree } from "./useFamilyTree"
import { useFamilyMemberIndex } from "./useFamilyMemberIndex"

export default function PhyloTreePanel({
  familyId,
  layout = "horizontal",
  highlightIds = new Set(),
  sessionId = null,
  showSearch = true,
  showSearchBanner = true,
}) {
  const { treeRoot, loading, error, parseError, treeUrl, nwk } =
    useFamilyTree(familyId)
  const { memberIndex, loading: membersLoading } =
    useFamilyMemberIndex(familyId)

  const [searchState, setSearchState] = useState({
    matchIds: new Set(),
    searchActive: false,
  })
  const [focusedLeafId, setFocusedLeafId] = useState(null)

  const handleMatchesChange = useCallback(state => {
    setSearchState(state)
  }, [])

  const handleFocusChange = useCallback(id => {
    setFocusedLeafId(id)
  }, [])

  const highlightSet = useMemo(() => {
    if (highlightIds instanceof Set) return highlightIds
    return new Set(highlightIds)
  }, [highlightIds])

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading tree…</div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-3 bg-destructive/10 text-destructive border border-destructive/30 rounded">
        {error}
      </div>
    )
  }

  if (parseError) {
    return (
      <div className="px-4 py-3 bg-destructive/10 text-destructive border border-destructive/30 rounded">
        {parseError}
      </div>
    )
  }

  if (!treeRoot) return null

  return (
    <div>
      {showSearchBanner && highlightSet.size > 0 && (
        <div className="mb-3 px-3 py-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded-md text-foreground">
          Showing {highlightSet.size} sequence
          {highlightSet.size === 1 ? "" : "s"} from your search in this family.
          {sessionId && (
            <>
              {" "}
              <Link
                to={`/results?job=${sessionId}`}
                className="text-accent hover:underline"
              >
                Back to results
              </Link>
            </>
          )}
        </div>
      )}

      {showSearch && (
        <PhyloTreeSearch
          root={treeRoot}
          memberIndex={memberIndex}
          onMatchesChange={handleMatchesChange}
          onFocusChange={handleFocusChange}
        />
      )}

      {membersLoading && (
        <p className="text-xs text-muted-foreground mb-2">Loading member labels…</p>
      )}

      <PhyloTreeViewer
        root={treeRoot}
        layout={layout}
        highlightIds={highlightSet}
        matchIds={searchState.matchIds}
        searchActive={searchState.searchActive}
        focusedLeafId={focusedLeafId}
        memberIndex={memberIndex}
      />

      {nwk && (
        <div className="mt-3">
          <a
            href={treeUrl}
            download={`family_${familyId}.nwk`}
            className="text-sm text-accent hover:text-accent-hover"
          >
            Download .nwk file
          </a>
        </div>
      )}
    </div>
  )
}
