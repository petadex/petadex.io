// src/pages/enzymes.js
import React, { useState, useEffect } from "react"
import { Link } from "gatsby"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import ScrollableArea from "../components/common/ScrollableArea"
import IdentifierResolver from "../components/search/IdentifierResolver"
import config from "../config"
import { useScrollHeader } from "../hooks/useScrollHeader"

// Deterministic per-family color from family_id using golden-ratio hue spread
function familyColor(familyId) {
  const hue = (familyId * 137.508) % 360
  return `hsl(${hue}, 60%, 45%)`
}

// ── EnzymeRow ──────────────────────────────────────────────────────────────

const EnzymeRow = ({ enzyme, isCentroid }) => (
  <div
    className={[
      "flex items-center gap-4 flex-wrap px-4 py-3 mb-2 rounded",
      isCentroid
        ? "border-l-4 border-warning bg-warning/5"
        : "border-l-4 border-border bg-surface shadow-sm",
    ].join(" ")}
  >
    <Link
      to={`/enzyme/${enzyme.enzyme_id}`}
      className={[
        "font-mono text-sm no-underline border-b-2 border-transparent transition-colors",
        "hover:border-info",
        isCentroid ? "font-semibold text-primary" : "font-normal text-primary",
      ].join(" ")}
    >
      {enzyme.genbank_accession_id || `Enzyme ${enzyme.enzyme_id}`}
    </Link>

    {isCentroid ? (
      <span className="px-2 py-0.5 bg-warning text-white rounded text-2xs font-bold tracking-wide uppercase">
        Centroid
      </span>
    ) : (
      enzyme.family_pid !== null && (
        <span className="text-sm text-secondary-foreground">
          {enzyme.family_pid}% identity
        </span>
      )
    )}

    {enzyme.component !== null && (
      <span className="px-2 py-0.5 bg-info/10 text-info rounded text-xs font-semibold">
        Component {enzyme.component}
      </span>
    )}
  </div>
)

// ── FamilyCard ─────────────────────────────────────────────────────────────

const FamilyCard = ({ family, isExpanded, onToggle }) => {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(false)
  const color = familyColor(family.family_id)

  const loadVariants = async () => {
    if (variants.length) return
    setLoading(true)
    try {
      const res = await fetch(
        `${config.apiUrl}/enzymes/family/${family.family_id}?limit=50`
      )
      if (res.ok) {
        const data = await res.json()
        setVariants(Array.isArray(data) ? data : data.data || [])
      }
    } catch (err) {
      console.error("Error loading variants:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    onToggle()
    if (!isExpanded && variants.length === 0) loadVariants()
  }

  return (
    <div className="card mb-4" style={{ borderLeft: `4px solid ${color}` }}>
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleToggle()
          }
        }}
        className={[
          "px-6 py-5 cursor-pointer transition-colors",
          isExpanded ? "border-b-2" : "bg-surfaced",
        ].join(" ")}
      >
        <div className="flex justify-between items-center">
          <div className="flex flex-col items-start">
            <h3 className="text-lg font-semibold text-primary mb-1.5">
              <a
                href={`/family/${family.family_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary no-underline border-b-2 border-transparent transition-colors hover:border-info"
                onClick={e => e.stopPropagation()}
              >
                Family {family.family_id}
              </a>
            </h3>
            <div className="flex gap-6 flex-wrap items-center">
              <span className="font-mono text-sm text-secondary-foreground">
                {family.centroid_accession}
              </span>
              <span className="text-sm text-secondary-foreground">
                <strong className="text-primary">
                  {parseInt(family.variant_count).toLocaleString()}
                </strong>{" "}
                variants
              </span>
              {family.component_count > 0 && (
                <span className="text-sm text-secondary-foreground">
                  <strong className="text-primary">
                    {family.component_count}
                  </strong>{" "}
                  component{family.component_count !== 1 ? "s" : ""}
                </span>
              )}
              {family.avg_identity && (
                <span className="text-sm text-muted-foreground">
                  avg {family.avg_identity}% identity
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-secondary text-sm whitespace-nowrap ml-4">
            {isExpanded ? "▲ Collapse" : "▼ Expand Variants"}
          </button>
        </div>
      </div>

      {/* Variants */}
      {isExpanded && (
        <div className="px-6 py-4  border-t border">
          {loading ? (
            <p className="text-center text-muted-foreground italic py-4">
              Loading variants…
            </p>
          ) : variants.length > 0 ? (
            <ScrollableArea>
              {variants.map(enzyme => (
                <EnzymeRow
                  key={enzyme.enzyme_id}
                  enzyme={enzyme}
                  isCentroid={enzyme.family_pid === null}
                />
              ))}
              {variants.length >= 50 && (
                <p className="text-center text-muted-foreground text-sm italic py-3">
                  Showing first 50 variants
                </p>
              )}
            </ScrollableArea>
          ) : (
            <p className="text-center text-muted-foreground italic py-4">
              No variants found
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── EnzymesPage ────────────────────────────────────────────────────────────

const EnzymesPage = ({ location }) => {
  useScrollHeader()

  const [families, setFamilies] = useState([])
  const [expandedFamilies, setExpandedFamilies] = useState(new Set())
  const [loadingFamilies, setLoadingFamilies] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState("variant_count")
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [componentFilterId, setComponentFilterId] = useState(null)
  const [componentEnzymes, setComponentEnzymes] = useState([])
  const [loadingComponentEnzymes, setLoadingComponentEnzymes] = useState(false)
  const FAMILIES_PER_PAGE = 10
  const FAMILIES_INITIAL = 20

  useEffect(() => {
    const search = location?.search ?? (typeof window !== "undefined" ? window.location.search : "")
    const raw = new URLSearchParams(search).get("component")
    const id = raw != null && raw !== "" ? parseInt(raw, 10) : NaN
    if (!Number.isFinite(id) || id <= 0) {
      setComponentFilterId(null)
      setComponentEnzymes([])
      return
    }
    setComponentFilterId(id)
    setLoadingComponentEnzymes(true)
    fetch(`${config.apiUrl}/enzymes?component=${id}&limit=100`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.data) setComponentEnzymes(data.data)
        else setComponentEnzymes([])
      })
      .catch(() => setComponentEnzymes([]))
      .finally(() => setLoadingComponentEnzymes(false))
  }, [location?.search])

  useEffect(() => {
    setLoadingFamilies(true)
    setFamilies([])
    setOffset(0)
    setHasMore(false)

    fetch(
      `${config.apiUrl}/enzymes/families/summary?limit=${FAMILIES_INITIAL}&offset=0&sort=${sortBy}`
    )
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setFamilies(data.data || [])
          setHasMore(data.pagination?.hasMore || false)
          setOffset(data.data?.length || 0)
        }
      })
      .catch(err => {
        console.error("Error loading families:", err)
        setError(err.toString())
      })
      .finally(() => setLoadingFamilies(false))
  }, [sortBy])

  const loadMoreFamilies = async () => {
    setLoadingMore(true)
    try {
      const res = await fetch(
        `${config.apiUrl}/enzymes/families/summary?limit=${FAMILIES_PER_PAGE}&offset=${offset}&sort=${sortBy}`
      )
      if (res.ok) {
        const data = await res.json()
        setFamilies(prev => [...prev, ...(data.data || [])])
        setHasMore(data.pagination?.hasMore || false)
        setOffset(prev => prev + (data.data?.length || 0))
      }
    } catch (err) {
      console.error("Error loading more families:", err)
    } finally {
      setLoadingMore(false)
    }
  }

  const toggleFamily = familyId => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(familyId)) newSet.delete(familyId)
      else newSet.add(familyId)
      return newSet
    })
  }

  return (
    <section className="py-20 md:py-24 text-center">
      <Container>
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
          BLAST-NR Enzyme Database
        </h1>
        <p className="mt-4 text-lg text-secondary-foreground">
          Browse plastic-degrading enzyme families
        </p>

        {componentFilterId != null && (
          <div className="mt-6 max-w-4xl mx-auto text-left rounded-xl border border-border bg-card p-4 md:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="text-base font-semibold text-primary m-0">
                Enzymes in atlas component {componentFilterId}
              </h2>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  to={`/atlas?component=${componentFilterId}`}
                  className="text-accent hover:text-accent-hover underline underline-offset-2"
                >
                  Family atlas
                </Link>
                <Link to="/enzymes" className="text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Clear filter
                </Link>
              </div>
            </div>
            {loadingComponentEnzymes ? (
              <p className="text-sm text-muted-foreground m-0">Loading enzymes…</p>
            ) : componentEnzymes.length === 0 ? (
              <p className="text-sm text-muted-foreground m-0">No enzymes found for this component.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Showing up to {componentEnzymes.length} sequences (API limit 100). Use search or family
                  pages for broader exploration.
                </p>
                <ScrollableArea>
                  {componentEnzymes.map(enzyme => (
                    <EnzymeRow key={enzyme.enzyme_id} enzyme={enzyme} isCentroid={enzyme.family_pid === null} />
                  ))}
                </ScrollableArea>
              </>
            )}
          </div>
        )}

        {/* Identifier resolver (MVP Search Index) — renders the live corpus
            statistics strip (catalytic ORFs, 90/60/30% clusters, PAZy/NR/SRA). */}
        <div className="mb-8 mt-2">
          <h2 className="text-base font-semibold text-secondary-foreground mb-1">
            Resolve an identifier
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Jump straight to an ORF by internal ORF ID, GenBank accession, or
            SRA library.
          </p>
          <IdentifierResolver />
        </div>

        {/* Browse families */}
        <h2 className="text-base font-semibold text-secondary-foreground mb-1">
          Browse families
        </h2>

        {/* Sort */}
        <div className="flex items-center gap-2 mb-2">
          <label
            htmlFor="enzymes-sort-by"
            className="text-sm text-secondary-foreground"
          >
            Sort by:
          </label>
          <select
            id="enzymes-sort-by"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="input w-auto text-sm py-1.5"
          >
            <option value="variant_count">Variant Count</option>
            <option value="component_count">Component Count</option>
            <option value="avg_identity">Average Identity</option>
            <option value="family">Family ID</option>
          </select>
        </div>
      </Container>

      {/* Content */}
      {loadingFamilies ? (
        <p className="text-center text-muted-foreground italic py-8">
          Loading families…
        </p>
      ) : error ? (
        <div className="mx-auto max-w-2xl mt-4 p-4 bg-error/5 border border-error/20 rounded-xl text-destructive text-center">
          Error loading data: {error}
        </div>
      ) : (
        <Container>
          <p className="text-sm text-muted-foreground mb-4">
            Showing {families.length} families
          </p>
          {families.map(family => (
            <FamilyCard
              key={family.family_id}
              family={family}
              isExpanded={expandedFamilies.has(family.family_id)}
              onToggle={() => toggleFamily(family.family_id)}
            />
          ))}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMoreFamilies}
                disabled={loadingMore}
                className={`btn ${
                  loadingMore
                    ? "btn-ghost text-muted-foreground cursor-default"
                    : "btn-secondary"
                }`}
              >
                {loadingMore ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </Container>
      )}
    </section>
  )
}

export default EnzymesPage

export const Head = () => (
  <Seo
    title="BLAST-NR Enzyme Database"
    description="Browse plastic-degrading enzyme families from BLAST-NR clustering"
  />
)
