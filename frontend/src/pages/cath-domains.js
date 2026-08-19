import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Link, navigate } from "gatsby"
import Seo from "../components/seo"
import { useScrollHeader } from "../hooks/useScrollHeader"
import Container from "../components/common/Container"
import config from "../config"
import CathDomainHero from "../components/cath/CathDomainHero"
import CathDomainDashboard from "../components/cath/CathDomainDashboard"
import CathClassificationPopup from "../components/cath/CathClassificationPopup"
import CathDomainOverviewPanel from "../components/cath/CathDomainOverviewPanel"
import CathDomainSectionNav from "../components/cath/CathDomainSectionNav"
import CathDomainMechanismPanel from "../components/cath/CathDomainMechanismPanel"
import CathDomainProseSections, {
  CathDomainIntroduction,
  CathDomainStructuralArchitecture,
  CathDomainStructureEmbed,
  CathDomainAnnotatedStructure,
  CathDomainCatalyticResidues,
  CathDomainSecondaryResidues,
  CathDomainMechanismComment,
} from "../components/cath/CathDomainProseSections"
import CathDomainStructuresTable from "../components/cath/CathDomainStructuresTable"
import CathDomainPlateActivity from "../components/cath/CathDomainPlateActivity"
import CathDomainMemberHmms from "../components/cath/CathDomainMemberHmms"
import CathDomainLogoGallery from "../components/cath/CathDomainLogoGallery"
import CathDomainReferences from "../components/cath/CathDomainReferences"
import { PFAM_PROFILE_CATALOG } from "../data/pfamProfileCatalog"
import { mergeCatalogWithAtlasComponents } from "../utils/mergeCatalogWithAtlas"
import { CathDomain } from "../models/CathDomain"

function parseCathQuery(search) {
  const params = new URLSearchParams(search || "")
  const cath = params.get("cath")
  return {
    cathRaw: cath != null && cath !== "" ? decodeURIComponent(cath.trim()) : null,
  }
}

/**
 * Long-form catalog prose (overview / functionalDiversity / interactingDomains) from S3, per
 * field, with the catalog's own inline text as fallback when a field is `null`.
 */
function useDomainText(cathId) {
  const [text, setText] = useState(null)

  useEffect(() => {
    let cancelled = false
    setText(null)
    if (!cathId) return undefined

    fetch(`${config.apiUrl}/atlas/domain-text/${encodeURIComponent(cathId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled) setText(data)
      })
      .catch(() => {
        if (!cancelled) setText(null)
      })

    return () => {
      cancelled = true
    }
  }, [cathId])

  return text
}

const CathDomainsPage = ({ location }) => {
  useScrollHeader()

  const [domainModels, setDomainModels] = useState([])
  const [atlasComponents, setAtlasComponents] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCathId, setSelectedCathId] = useState(null)
  const [overviewExpanded, setOverviewExpanded] = useState(false)
  const [selectedPdbId, setSelectedPdbId] = useState(null)

  const search =
    location?.search ?? (typeof window !== "undefined" ? window.location.search : "")

  const ATLAS_UNAVAILABLE_MESSAGE =
  "Family counts fainted before loading. Everything else is still in the fight."

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)

    fetch(`${config.apiUrl}/atlas/components`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        const rows = Array.isArray(data?.components) ? data.components : []
        if (!rows.length) {
          setDomainModels(mergeCatalogWithAtlasComponents(PFAM_PROFILE_CATALOG, []))
          setAtlasComponents([])
          setLoadError(ATLAS_UNAVAILABLE_MESSAGE)
          return
        }
        setDomainModels(mergeCatalogWithAtlasComponents(PFAM_PROFILE_CATALOG, rows))
        setAtlasComponents(rows)
      })
      .catch(() => {
        if (cancelled) return
        setDomainModels(mergeCatalogWithAtlasComponents(PFAM_PROFILE_CATALOG, []))
        setAtlasComponents([])
        setLoadError(ATLAS_UNAVAILABLE_MESSAGE)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const catDomainModels = useMemo(
    () => CathDomain.buildAll(domainModels, atlasComponents),
    [domainModels, atlasComponents],
  )

  useEffect(() => {
    if (!catDomainModels.length) return
    const q = parseCathQuery(search)
    if (q.cathRaw && catDomainModels.some(d => d.cathId === q.cathRaw)) {
      setSelectedCathId(q.cathRaw)
    } else if (!q.cathRaw) {
      // If the page URL doesn't say which domain to show, display the full list in a dashboard.
      setSelectedCathId(null)
    }
  }, [catDomainModels, search])

  const selectedCatDomain = useMemo(
    () => (selectedCathId ? catDomainModels.find(d => d.cathId === selectedCathId) ?? null : null),
    [catDomainModels, selectedCathId],
  )

  const domainTextFromS3 = useDomainText(selectedCatDomain?.cathId)
  const domainText = {
    overview: domainTextFromS3?.overview || selectedCatDomain?.overview,
    functionalDiversity: domainTextFromS3?.functionalDiversity || selectedCatDomain?.functionalDiversity,
    interactingDomains: domainTextFromS3?.interactingDomains || selectedCatDomain?.interactingDomains,
  }

  // Seed the "Structure" 3D embed with the domain's curated default PDB id whenever the selected
  // domain changes; a reader can still override it by clicking a row in `representativeStructures`,
  // where that table is present.
  useEffect(() => {
    setSelectedPdbId(selectedCatDomain?.pageStructurePdbId ?? null)
  }, [selectedCatDomain?.cathId])

  const handleSelectCathId = useCallback(cathId => {
    setSelectedCathId(cathId)
    if (typeof window !== "undefined") {
      navigate(`/cath-domains?cath=${encodeURIComponent(cathId)}`, { replace: true })
    }
  }, [])

  useEffect(() => {
    // Collapse by default on every domain switch; auto-expand when the URL deep-links into a
    // section below the card (e.g. `#cat-section-mechanism`).
    if (typeof window === "undefined") return
    const hash = window.location.hash.replace(/^#/, "")
    setOverviewExpanded(Boolean(hash) && hash !== "cat-overview")
  }, [selectedCatDomain?.cathId])

  if (loading && !domainModels.length) {
    return (
      <section className="py-16 md:py-20">
        <Container>
          <p className="text-muted-foreground">Loading CATH domain reference…</p>
        </Container>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-20">
      <Container>
        {!selectedCathId && <CathDomainHero />}

        {loadError && (
          <p
            className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300/90 max-w-3xl"
            role="status"
          >
            {loadError}
          </p>
        )}

        {!catDomainModels.length ? (
          <p className="text-muted-foreground">No CATH domains available.</p>
        ) : !selectedCathId ? (
          <div className="relative">
            <CathClassificationPopup />
            <CathDomainDashboard catDomains={catDomainModels} onSelect={handleSelectCathId} />
          </div>
        ) : !selectedCatDomain ? (
          <p className="text-muted-foreground">That CATH domain wasn&rsquo;t found.</p>
        ) : (
          <>
            <Link
              to="/cath-domains"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              ← Back to CATH domains overview
            </Link>
            <CathDomainOverviewPanel
              catDomain={selectedCatDomain}
              expanded={overviewExpanded}
              onToggleExpanded={() => setOverviewExpanded(v => !v)}
            />
            {overviewExpanded && (
              <div className="cath-full-entry-in">
                <button
                  type="button"
                  onClick={() => setOverviewExpanded(false)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                  <span aria-hidden="true">▲</span> Show less
                </button>
                <div className="lg:flex lg:items-start lg:gap-8 xl:gap-12">
                  <CathDomainSectionNav catDomain={selectedCatDomain} className="lg:w-44 xl:w-52 shrink-0" />
                <div className="min-w-0 flex-1 lg:max-w-3xl space-y-8">
                  <CathDomainIntroduction
                    overview={domainText.overview}
                    references={selectedCatDomain.references}
                  />
                  {selectedCatDomain.structureAnnotations ? (
                    <CathDomainAnnotatedStructure
                      pdbId={selectedPdbId}
                      structureAnnotations={selectedCatDomain.structureAnnotations}
                    />
                  ) : (
                    <CathDomainStructureEmbed structureEmbedPdbId={selectedPdbId} />
                  )}
                  <div>
                    {selectedCatDomain.catalyticResidues ? (
                      <>
                        <CathDomainCatalyticResidues catalyticResidues={selectedCatDomain.catalyticResidues} />
                        <CathDomainSecondaryResidues catalyticResidues={selectedCatDomain.catalyticResidues} />
                      </>
                    ) : (
                      <>
                        <CathDomainStructuralArchitecture
                          structuralArchitecture={selectedCatDomain.structuralArchitecture}
                          references={selectedCatDomain.references}
                        />
                        <CathDomainStructuresTable
                          representativeStructures={selectedCatDomain.representativeStructures}
                          representativeStructuresNote={selectedCatDomain.representativeStructuresNote}
                          activePdbId={selectedPdbId}
                          onSelectPdbId={setSelectedPdbId}
                          className="mt-6"
                        />
                      </>
                    )}
                  </div>
                  {selectedCatDomain.mechanismComment ? (
                    <CathDomainMechanismComment mechanismComment={selectedCatDomain.mechanismComment} />
                  ) : (
                    <CathDomainMechanismPanel
                      mechanism={selectedCatDomain.mechanism}
                      references={selectedCatDomain.references}
                    />
                  )}
                  <CathDomainPlateActivity cathId={selectedCatDomain.cathId} />
                  <CathDomainMemberHmms memberHmms={selectedCatDomain.memberHmms} />
                  <CathDomainProseSections
                    functionalDiversity={domainText.functionalDiversity}
                    interactingDomains={domainText.interactingDomains}
                    references={selectedCatDomain.references}
                  />
                  <CathDomainLogoGallery
                    hmmLogos={selectedCatDomain.hmmLogos}
                    sequenceLogos={selectedCatDomain.sequenceLogos}
                  />
                  <CathDomainReferences references={selectedCatDomain.references} />
                </div>
                </div>
              </div>
            )}
          </>
        )}
      </Container>

      <style>{`
        .cath-full-entry-in {
          animation: cathFullEntryIn 0.4s ease-out both;
        }
        @keyframes cathFullEntryIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cath-full-entry-in { animation: none; }
        }
      `}</style>
    </section>
  )
}

export default CathDomainsPage

export const Head = () => (
  <Seo
    title="CATH domains"
    description="PETadex: browse structural folds and check relevant atlas details and domain-specific deep dive."
  />
)
