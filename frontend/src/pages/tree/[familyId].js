/**
 * Phylogenetic Tree Viewer — /tree/:familyId
 *
 * Horizontal dendrogram with in-tree search, search-result highlights,
 * and Dry Lab navigation tools (path-to-root, neighbors, local clade, metadata color).
 */

import React, { useMemo } from "react"
import { Link } from "gatsby"
import Layout from "../../components/layout"
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
    <Layout>
      <div className="max-w-[1280px] mx-auto px-4 py-6">
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

        <div className="mb-4 px-3 py-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded-md text-foreground">
          <strong>Navigation tools</strong> — same tree search as before, plus a sidebar to
          trace lineage to the root, list closest sequences, dim distant tips, and color
          tips by metadata.
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
            showNavTools
            containerHeight="65vh"
          />
        ) : (
          <div className="text-muted-foreground">Invalid family ID</div>
        )}
      </div>
    </Layout>
  )
}

export default TreePage

export const Head = ({ params }) => (
  <title>Family {params?.familyId} Tree — PETadex</title>
)
