import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react"
import { Link, navigate } from "gatsby"
import Seo from "../components/seo"
import SequenceViewer from "../components/sequence/SequenceViewer"
import LazyPetadexCatalyticDomainsPanel from "../components/petadexDomains/LazyPetadexCatalyticDomainsPanel.jsx"
import AtlasMap from "../components/charts/AtlasMap"
import PhyloTreePanel from "../components/phyloTree/PhyloTreePanel"
import StructurePanel from "../components/StructurePanel"
import config from "../config"
import { useScrollHeader } from "../hooks/useScrollHeader"
import {
  COMPONENT_TO_CATH,
  COMPONENT_SHADE_CSS,
  CATH_BASE_CSS,
} from "../utils/cathColors"
import { cathDomainPathForComponent } from "../utils/cathDomainCatalogLookup"

// ── CATH badge helper ──────────────────────────────────────────────────────

function CathBadge({ components }) {
  if (!components || components.length === 0) return null

  const cathMap = {}
  for (const comp of components) {
    const cath = COMPONENT_TO_CATH[comp] || "Unknown"
    if (!cathMap[cath]) cathMap[cath] = []
    cathMap[cath].push(comp)
  }

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(cathMap).map(([cath, comps]) => (
        <div key={cath}>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: CATH_BASE_CSS[cath] || "#475569" }}
            />
            <span className="text-sm font-semibold text-foreground font-mono">
              {cath}
            </span>
          </div>
          <div className="pl-5 mt-1">
            {comps
              .sort((a, b) => a - b)
              .map(comp => (
                <div key={comp} className="flex items-center gap-2 mb-0.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: COMPONENT_SHADE_CSS[comp] || "#94a3b8",
                    }}
                  />
                  <Link
                    to={cathDomainPathForComponent(comp)}
                    className="text-xs text-accent hover:text-accent-hover underline underline-offset-2"
                  >
                    Component {comp}
                  </Link>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Members Table ──────────────────────────────────────────────────────────

function MembersTable({ familyId, centroid }) {
  const [viewMode, setViewMode] = useState("centroid")
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [expandedSeq, setExpandedSeq] = useState(null)

  const loadMembers = useCallback(
    async p => {
      setLoading(true)
      try {
        const res = await fetch(
          `${config.apiUrl}/family/${familyId}/members?page=${p}&limit=50`,
        )
        if (res.ok) {
          const data = await res.json()
          setMembers(data.data || [])
          setPagination(data.pagination)
        }
      } catch (err) {
        console.error("Error loading members:", err)
      } finally {
        setLoading(false)
      }
    },
    [familyId],
  )

  useEffect(() => {
    if (viewMode === "members") loadMembers(page)
  }, [viewMode, page, loadMembers])

  const handleToggle = mode => {
    setViewMode(mode)
    if (mode === "members") setPage(1)
    setExpandedSeq(null)
  }

  const rows =
    viewMode === "centroid" && centroid
      ? [
          {
            enzyme_id: centroid.centroid_enzyme_id,
            genbank_accession_id: centroid.centroid_accession,
            translated_sequence: centroid.centroid_sequence,
            family_pid: null,
            component: centroid.centroid_component,
          },
        ]
      : members

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-2 mb-4">
        {["centroid", "members"].map(mode => (
          <button
            key={mode}
            onClick={() => handleToggle(mode)}
            className={`btn text-sm px-4 py-1.5 rounded ${
              viewMode === mode
                ? "bg-accent text-accent-foreground border-accent"
                : "btn-secondary"
            }`}
          >
            {mode === "centroid" ? "Centroid" : "All Members"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          Loading members…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No members found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border-strong">
                  {["ID", "Accession", "Identity", "Component", "Sequence"].map(h => (
                    <th key={h} className="text-left px-3 py-2 label">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const isCentroid =
                    row.family_pid === null || row.family_pid === 100
                  const isExpanded = expandedSeq === row.enzyme_id
                  return (
                    <React.Fragment key={row.enzyme_id}>
                      <tr
                        className={`border-b border-border ${
                          isCentroid ? "bg-warning/10" : "bg-card"
                        }`}
                      >
                        <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                          {row.enzyme_id}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to={`/enzyme/${row.enzyme_id}`}
                            className="font-mono text-foreground hover:text-accent"
                          >
                            {row.genbank_accession_id ||
                              `Enzyme ${row.enzyme_id}`}
                          </Link>
                          {isCentroid && (
                            <span className="ml-2 badge bg-warning text-warning-foreground border-warning/30 text-2xs font-bold uppercase">
                              Centroid
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {isCentroid
                            ? "—"
                            : row.family_pid != null
                              ? `${row.family_pid}%`
                              : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {row.component != null ? (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold text-white"
                              style={{
                                backgroundColor:
                                  COMPONENT_SHADE_CSS[row.component] ||
                                  "#e0e7ff",
                              }}
                            >
                              {row.component}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.translated_sequence ? (
                            <button
                              onClick={() =>
                                setExpandedSeq(
                                  isExpanded ? null : row.enzyme_id,
                                )
                              }
                              className="text-accent text-xs hover:text-accent-hover bg-transparent border-none cursor-pointer p-0"
                            >
                              {isExpanded
                                ? "Hide"
                                : `${row.translated_sequence.length} aa`}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && row.translated_sequence && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-3 bg-surface-sunken space-y-4"
                          >
                            <LazyPetadexCatalyticDomainsPanel
                              enzymeId={row.enzyme_id}
                              accession={row.genbank_accession_id}
                              sequence={row.translated_sequence}
                              compact
                            />
                            <SequenceViewer
                              aminoAcidSequence={row.translated_sequence}
                              nucleotideSequence={null}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {viewMode === "members" &&
            pagination &&
            pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`btn text-sm px-3 py-1.5 rounded ${
                    page <= 1
                      ? "btn-secondary opacity-50 cursor-default"
                      : "btn-secondary"
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {pagination.totalPages} ({pagination.total}{" "}
                  total)
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!pagination.hasMore}
                  className={`btn text-sm px-3 py-1.5 rounded ${
                    !pagination.hasMore
                      ? "btn-secondary opacity-50 cursor-default"
                      : "btn-secondary"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
        </>
      )}
    </div>
  )
}

// ── Family Metadata ────────────────────────────────────────────────────────

function FamilyMetadata({ familyId }) {
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    if (!familyId) return
    fetch(`${config.apiUrl}/family/${familyId}/metadata`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setMeta(d))
      .catch(() => {})
  }, [familyId])

  if (!meta)
    return (
      <div className="text-muted-foreground text-sm">
        No atlas metadata available
      </div>
    )

  const row = (label, value) =>
    value ? (
      <div
        key={label}
        className="grid gap-4 px-4 py-3 bg-surface-raised rounded-md border-l-4 border-border-strong"
        style={{ gridTemplateColumns: "200px 1fr" }}
      >
        <div className="font-semibold text-foreground">{label}</div>
        <div className="text-muted-foreground break-words">{value}</div>
      </div>
    ) : null

  return (
    <div className="grid gap-3">
      {row("Accession", meta.genbank_accession_id)}
      {row("Definition", meta.definition)}
      {row("Organism", meta.organism)}
      {row("Taxonomy", meta.taxonomy)}
      {row("Country", meta.country)}
      {row("Collection Date", meta.collection_date)}
      {row("Journal", meta.journal)}
      {row("Family Size", meta.family_size?.toLocaleString())}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-xl font-semibold text-foreground mb-4 mt-0">
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function FamilyTemplate({ pageContext }) {
  useScrollHeader()
  const familyId =
    pageContext?.familyId ||
    (typeof window !== "undefined"
      ? window.location.pathname.match(/\/family\/(\d+)/)?.[1]
      : null)

  const [family, setFamily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasTree, setHasTree] = useState(false)
  const [treeCheckDone, setTreeCheckDone] = useState(false)

  useEffect(() => {
    if (!familyId) return
    setLoading(true)
    fetch(`${config.apiUrl}/family/${familyId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Family ${familyId} not found`)
        return r.json()
      })
      .then(data => {
        setFamily(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [familyId])

  useEffect(() => {
    if (!familyId) return
    setTreeCheckDone(false)
    fetch(`${config.apiUrl}/family/${familyId}/tree`)
      .then(r => setHasTree(r.ok))
      .catch(() => setHasTree(false))
      .finally(() => setTreeCheckDone(true))
  }, [familyId])

  if (!familyId) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Invalid family URL
      </div>
    )
  }

  return (
    <>
      <section className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-4">
          <Link
            to="/enzymes"
            className="text-accent text-sm hover:text-accent-hover"
          >
            &larr; Back to Enzymes
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading family…
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">{error}</div>
        ) : (
          family && (
            <>
              {/* ── Header ── */}
              <div className="mb-8">
                <h1 className="text-5xl font-semibold text-foreground mb-2">
                  Family {family.family_id}
                </h1>

                <div className="flex gap-8 flex-wrap items-start mt-4">
                  {/* Stats */}
                  <div className="flex gap-6 flex-wrap flex-1 min-w-[300px]">
                    {/* Centroid */}
                    <div className="flex flex-col gap-1">
                      <div className="label">Centroid</div>
                      <div className="font-mono text-base text-foreground">
                        <Link
                          to={`/enzyme/${family.centroid_enzyme_id}`}
                          className="text-foreground border-b-2 border-accent hover:text-accent"
                        >
                          {family.centroid_accession}
                        </Link>
                      </div>
                    </div>

                    {[
                      {
                        label: "Variants",
                        value: parseInt(family.variant_count).toLocaleString(),
                      },
                      { label: "Components", value: family.component_count },
                      ...(family.avg_identity
                        ? [
                            {
                              label: "Avg Identity",
                              value: `${family.avg_identity}%`,
                            },
                          ]
                        : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1">
                        <div className="label">{label}</div>
                        <div className="text-2xl font-semibold text-foreground">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CATH badges */}
                  {family.components && family.components.length > 0 && (
                    <div className="px-4 py-3 bg-surface-raised rounded-lg border border-border min-w-[180px]">
                      <div className="label mb-2">CATH Domain</div>
                      <CathBadge components={family.components} />
                    </div>
                  )}
                </div>
              </div>

              <Section title="Sequences">
                <MembersTable familyId={familyId} centroid={family} />
              </Section>

              <Section title="Centroid Structure">
                <StructurePanel
                  accession={family.centroid_accession}
                  title="Centroid 3D structure"
                  emptyMessage="No predicted or experimental fold indexed for this family centroid yet."
                />
                <p className="mt-3 text-sm text-muted-foreground m-0">
                  Prefer ESMFold2 centroid folds when available; curated experimental
                  PDBs take precedence. Open the{" "}
                  <Link
                    to={`/enzyme/${family.centroid_enzyme_id}`}
                    className="text-info border-b border-transparent hover:border-info"
                  >
                    centroid enzyme
                  </Link>{" "}
                  for sequence context, or the family{" "}
                  <a href="#esm-atlas" className="text-info border-b border-transparent hover:border-info">
                    ESM Atlas
                  </a>{" "}
                  map for embedding neighborhood.
                </p>
              </Section>

              <Section title="Centroid Metadata">
                <FamilyMetadata familyId={familyId} />
              </Section>

              <Section title="ESM Atlas">
                <div id="esm-atlas">
                  <AtlasMap familyId={familyId} />
                </div>
              </Section>

              <Section title="Phylogenetic Tree">
                {!treeCheckDone && (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading tree…
                  </div>
                )}
                {treeCheckDone && !hasTree && (
                  <div className="py-6 text-center text-muted-foreground bg-surface-raised rounded-md">
                    No phylogenetic tree available for this family
                  </div>
                )}
                {treeCheckDone && hasTree && (
                  <PhyloTreePanel
                    familyId={familyId}
                    layout="radial"
                    treeSource="family"
                    showSearch
                    showSearchBanner={false}
                    showNavTools
                    containerHeight="65vh"
                  />
                )}
              </Section>
            </>
          )
        )}
      </section>
    </>
  )
}

export const Head = ({ pageContext, params }) => {
  const familyId = pageContext?.familyId || params?.familyId || ""
  return (
    <Seo
      title={`Family ${familyId}`}
      description={`View details for plastic-degrading enzyme family ${familyId} including sequences, UMAP embedding, and phylogenetic tree.`}
    />
  )
}
