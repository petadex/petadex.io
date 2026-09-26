/**
 * Phylogenetic Tree Viewer — /tree/:familyId
 *
 * Horizontal dendrogram with in-tree search and search-result highlights.
 */

import React, { useMemo } from "react"
import { Link } from "gatsby"
import PhyloTreePanel from "../../components/phyloTree/PhyloTreePanel"

function parseHighlightParam(search) {
  if (!search) return new Set()
  const params = new URLSearchParams(search)
  const raw = params.get("highlight")
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
  )
}

function parseSessionParam(search) {
  if (!search) return null
  return new URLSearchParams(search).get("session")
}

const TreePage = ({ params, location }) => {
  const familyId = params?.familyId
  const highlightIds = useMemo(
    () => parseHighlightParam(location?.search),
    [location?.search],
  )
  const sessionId = useMemo(
    () => parseSessionParam(location?.search),
    [location?.search],
  )

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <h1 className="m-0 text-2xl font-semibold">
          Family {familyId} — Phylogenetic Tree
        </h1>
        <Link
          to={sessionId ? `/results?job=${sessionId}` : "/search"}
          className="text-sm text-muted-foreground hover:text-foreground no-underline"
        >
          ← {sessionId ? "Back to results" : "Back to search"}
        </Link>
      </div>

      {familyId ? (
        <PhyloTreePanel
          familyId={familyId}
          layout="horizontal"
          highlightIds={highlightIds}
          sessionId={sessionId}
          treeSource="search"
          showSearch
          showSearchBanner
        />
      ) : (
        <div className="text-muted-foreground">Invalid family ID</div>
      )}
    </div>
  )
}

export default TreePage

export const Head = ({ params }) => (
  <title>Family {params?.familyId} Tree — PETadex</title>
)
