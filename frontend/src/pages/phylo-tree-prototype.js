/**
 * Thin entry for the phylo navigation prototype — uses the same PhyloTreePanel
 * as /tree/:familyId (existing search UI + nav tools).
 * URL: /phylo-tree-prototype/?family=<id>
 */
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Link, navigate } from "gatsby"
import Layout from "../components/layout"
import PhyloTreePanel from "../components/phyloTree/PhyloTreePanel"

function parseFamilyParam(search) {
  if (!search) return ""
  const raw = new URLSearchParams(search).get("family")
  if (!raw) return ""
  const n = parseInt(raw, 10)
  return Number.isInteger(n) && n > 0 ? String(n) : ""
}

const PhyloTreePrototypePage = ({ location }) => {
  const urlFamily = useMemo(
    () => parseFamilyParam(location?.search),
    [location?.search],
  )
  const [familyInput, setFamilyInput] = useState(urlFamily)
  const [familyId, setFamilyId] = useState(urlFamily)
  const [layout, setLayout] = useState("horizontal")

  useEffect(() => {
    if (urlFamily) {
      setFamilyInput(urlFamily)
      setFamilyId(urlFamily)
    }
  }, [urlFamily])

  const applyFamily = useCallback(() => {
    const n = parseInt(familyInput, 10)
    if (!Number.isInteger(n) || n <= 0) return
    setFamilyId(String(n))
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("family", String(n))
      window.history.replaceState({}, "", url.toString())
    }
  }, [familyInput])

  return (
    <Layout>
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="mb-4 px-3 py-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded-md text-foreground">
          <strong>Temporary prototype entry</strong> — this page loads the{" "}
          <em>same</em> phylogenetic tree search UI as{" "}
          <Link to="/search" className="text-accent hover:underline">
            /tree/:familyId
          </Link>{" "}
          (search + navigation tools). Prefer opening a tree from search results when
          possible.
        </div>

        <div className="mb-4">
          <h1 className="m-0 text-2xl font-semibold">Phylogenetic tree navigation</h1>
          <p className="mt-1 mb-0 text-sm text-muted-foreground max-w-2xl">
            Uses the existing in-tree search. The sidebar adds path-to-root, nearby tips,
            local clade filtering, and metadata coloring.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <div>
            <label
              htmlFor="phylo-family-id"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Family ID
            </label>
            <input
              id="phylo-family-id"
              type="number"
              min={1}
              className="input w-36 font-mono text-sm"
              value={familyInput}
              onChange={e => setFamilyInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") applyFamily()
              }}
              placeholder="e.g. 42"
            />
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={applyFamily}>
            Load tree
          </button>
          {familyId && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/tree/${familyId}`)}
            >
              Open /tree/{familyId}
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">Layout</span>
            <button
              type="button"
              className={`btn btn-sm ${layout === "horizontal" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setLayout("horizontal")}
            >
              Horizontal
            </button>
            <button
              type="button"
              className={`btn btn-sm ${layout === "radial" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setLayout("radial")}
            >
              Radial
            </button>
          </div>
        </div>

        {familyId ? (
          <PhyloTreePanel
            familyId={familyId}
            layout={layout}
            treeSource="search"
            showSearch
            showSearchBanner={false}
            showNavTools
            containerHeight="65vh"
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-muted-foreground text-sm">
            Enter a family ID with a precomputed Newick tree, or open a tree from search
            results (View phylogeny →{" "}
            <code className="text-xs">/tree/&lt;familyId&gt;</code>).
          </div>
        )}
      </div>
    </Layout>
  )
}

export default PhyloTreePrototypePage

export const Head = () => <title>Phylo tree navigation prototype — PETadex</title>
