import React, { useState, useMemo, useCallback, useEffect } from "react"
import { Link } from "gatsby"
import PhyloTreeViewer from "./PhyloTreeViewer"
import PhyloTreeSearch from "./PhyloTreeSearch"
import PhyloNavSidebar from "./PhyloNavSidebar"
import { useFamilyTree } from "./useFamilyTree"
import { useFamilyMemberIndex } from "./useFamilyMemberIndex"
import {
  buildTreeIndex,
  leavesWithinKNearest,
  leavesWithinRadius,
  maxPatristicFromFocus,
  nearestNeighbors,
  pathUidsForLeaf,
  suggestNeighborhoodRadius,
} from "./treeTopology"
import { createLeafColorGetter, buildColorLegend } from "./metadataColors"

/**
 * Family phylogenetic tree panel — search, highlights, and optional navigation tools
 * (path-to-root, nearby tips, local clade, metadata coloring).
 */
export default function PhyloTreePanel({
  familyId,
  layout = "horizontal",
  highlightIds = new Set(),
  sessionId = null,
  treeSource = "search",
  showSearch = true,
  showSearchBanner = true,
  /** When true, show Dry Lab nav tools beside the existing search + viewer. */
  showNavTools = false,
  containerHeight,
}) {
  const { treeRoot, loading, error, parseError, treeUrl, nwk } =
    useFamilyTree(familyId, treeSource)
  const { memberIndex, loading: membersLoading } =
    useFamilyMemberIndex(familyId)

  const [searchState, setSearchState] = useState({
    matchIds: new Set(),
    searchActive: false,
  })
  const [focusedLeafId, setFocusedLeafId] = useState(null)
  const [neighborhoodActive, setNeighborhoodActive] = useState(false)
  const [neighborhoodMode, setNeighborhoodMode] = useState("radius")
  const [radius, setRadius] = useState(0)
  const [kNearest, setKNearest] = useState(10)
  const [colorMode, setColorMode] = useState("none")
  const [fitNonce, setFitNonce] = useState(0)
  const [zoomNonce, setZoomNonce] = useState(0)

  const handleMatchesChange = useCallback(state => {
    setSearchState(state)
  }, [])

  const handleFocusChange = useCallback(id => {
    if (id) setFocusedLeafId(String(id))
  }, [])

  const handleLeafSelect = useCallback(id => {
    setFocusedLeafId(String(id))
    // Always bump so Re-zoom works when focus is already on this tip.
    setZoomNonce(n => n + 1)
  }, [])

  const highlightSet = useMemo(() => {
    if (highlightIds instanceof Set) return highlightIds
    return new Set(highlightIds)
  }, [highlightIds])

  const treeIndex = useMemo(() => {
    if (!showNavTools || !treeRoot) return null
    return buildTreeIndex(treeRoot)
  }, [showNavTools, treeRoot])

  useEffect(() => {
    if (!showNavTools || !focusedLeafId || !treeIndex) return
    setRadius(suggestNeighborhoodRadius(focusedLeafId, treeIndex))
  }, [showNavTools, focusedLeafId, treeIndex])

  const pathUids = useMemo(() => {
    if (!showNavTools || !focusedLeafId || !treeIndex) return null
    const path = pathUidsForLeaf(focusedLeafId, treeIndex)
    return path.length ? new Set(path) : null
  }, [showNavTools, focusedLeafId, treeIndex])

  const neighbors = useMemo(() => {
    if (!showNavTools || !focusedLeafId || !treeIndex) return []
    return nearestNeighbors(focusedLeafId, treeIndex, { limit: 20 })
  }, [showNavTools, focusedLeafId, treeIndex])

  const maxRadius = useMemo(() => {
    if (!showNavTools || !focusedLeafId || !treeIndex) return 1
    return Math.max(maxPatristicFromFocus(focusedLeafId, treeIndex), 0.001)
  }, [showNavTools, focusedLeafId, treeIndex])

  const visibleLeafIds = useMemo(() => {
    if (!showNavTools || !neighborhoodActive || !focusedLeafId || !treeIndex) {
      return null
    }
    if (neighborhoodMode === "knn") {
      return leavesWithinKNearest(focusedLeafId, treeIndex, kNearest)
    }
    return leavesWithinRadius(focusedLeafId, treeIndex, radius)
  }, [
    showNavTools,
    neighborhoodActive,
    focusedLeafId,
    treeIndex,
    neighborhoodMode,
    kNearest,
    radius,
  ])

  const getLeafColor = useMemo(() => {
    if (!showNavTools) return null
    return createLeafColorGetter(colorMode, memberIndex)
  }, [showNavTools, colorMode, memberIndex])

  const colorLegend = useMemo(() => {
    if (!showNavTools) return []
    return buildColorLegend(colorMode, memberIndex)
  }, [showNavTools, colorMode, memberIndex])

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

  const viewer = (
    <>
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
        pathUids={pathUids}
        neighborhoodActive={Boolean(showNavTools && neighborhoodActive)}
        visibleLeafIds={visibleLeafIds}
        getLeafColor={getLeafColor}
        onLeafSelect={showNavTools ? handleLeafSelect : null}
        fitLeafIds={visibleLeafIds}
        fitNonce={fitNonce}
        zoomNonce={zoomNonce}
        containerHeight={containerHeight}
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
    </>
  )

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

      {showNavTools ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start lg:items-stretch">
          <div className="min-w-0">{viewer}</div>
          <PhyloNavSidebar
            focusedLeafId={focusedLeafId}
            memberIndex={memberIndex}
            pathLength={pathUids?.size || 0}
            neighbors={neighbors}
            neighborhoodActive={neighborhoodActive}
            neighborhoodMode={neighborhoodMode}
            radius={radius}
            maxRadius={maxRadius}
            kNearest={kNearest}
            onRadiusChange={setRadius}
            onKNearestChange={setKNearest}
            onNeighborhoodModeChange={setNeighborhoodMode}
            onToggleNeighborhood={setNeighborhoodActive}
            onFitNeighborhood={() => setFitNonce(n => n + 1)}
            onClearNeighborhood={() => setNeighborhoodActive(false)}
            onSelectNeighbor={handleLeafSelect}
            colorMode={colorMode}
            onColorModeChange={setColorMode}
            colorLegend={colorLegend}
          />
        </div>
      ) : (
        viewer
      )}
    </div>
  )
}
