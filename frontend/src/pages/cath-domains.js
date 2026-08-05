import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Link, navigate } from "gatsby"
import Seo from "../components/seo"
import { useScrollHeader } from "../hooks/useScrollHeader"
import Container from "../components/common/Container"
import config from "../config"
import CathDomainHero from "../components/cath/CathDomainHero"
import CatDomainDashboard from "../components/cath/CatDomainDashboard"
import CathClassificationPopup from "../components/cath/CathClassificationPopup"
import CatDomainOverviewPanel from "../components/cath/CatDomainOverviewPanel"
import CatDomainSectionNav from "../components/cath/CatDomainSectionNav"
import CatDomainMechanismPanel from "../components/cath/CatDomainMechanismPanel"
import CatDomainProseSections, {
  CatDomainStructuralArchitecture,
  CatDomainStructureEmbed,
} from "../components/cath/CatDomainProseSections"
import CatDomainStructuresTable from "../components/cath/CatDomainStructuresTable"
import CatDomainMemberHmms from "../components/cath/CatDomainMemberHmms"
import CatDomainLogoGallery from "../components/cath/CatDomainLogoGallery"
import CatDomainReferences from "../components/cath/CatDomainReferences"
import { CATH_DOMAIN_CATALOG } from "../data/cathDomainCatalog"
import { mergeCatalogWithAtlasComponents } from "../utils/mergeCatalogWithAtlas"
import { buildCatDomainModels } from "../utils/buildCatDomainModels"

/**
 * Only `?cath=` selects a domain. `?id=pf-*`, `?pfam=`, `?component=` and `?view=` are legacy
 * params from the removed per-Pfam profile pages — detected here only so those URLs can be
 * rewritten to the CATH dashboard instead of silently rendering it under a stale query string.
 */
function parseCathQuery(search) {
  const params = new URLSearchParams(search || "")
  const cath = params.get("cath")
  const legacy = ["id", "pfam", "component", "view"].some(k => {
    const v = params.get(k)
    return v != null && v !== ""
  })
  return {
    cathRaw: cath != null && cath !== "" ? decodeURIComponent(cath.trim()) : null,
    hasLegacyParams: legacy,
  }
}

const CathDomainsPage = ({ location }) => {
  useScrollHeader()

  const [domainModels, setDomainModels] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCathId, setSelectedCathId] = useState(null)

  const search = location?.search ?? (typeof window !== "undefined" ? window.location.search : "")

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
          setDomainModels(mergeCatalogWithAtlasComponents(CATH_DOMAIN_CATALOG, []))
          setLoadError(
            "Atlas component counts unavailable; CATH domains still listed—family counts will appear when the API is reachable and Pfam↔atlas mapping is set.",
          )
          return
        }
        setDomainModels(mergeCatalogWithAtlasComponents(CATH_DOMAIN_CATALOG, rows))
      })
      .catch(() => {
        if (cancelled) return
        setDomainModels(mergeCatalogWithAtlasComponents(CATH_DOMAIN_CATALOG, []))
        setLoadError("Could not load atlas components; showing CATH domains without live family counts.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const catDomainModels = useMemo(() => buildCatDomainModels(domainModels), [domainModels])

  useEffect(() => {
    if (!catDomainModels.length) return
    const q = parseCathQuery(search)
    if (q.cathRaw && catDomainModels.some(d => d.cathId === q.cathRaw)) {
      setSelectedCathId(q.cathRaw)
      return
    }
    // no usable ?cath= — show the landing dashboard, don't auto-pick a domain
    setSelectedCathId(null)
    if (q.hasLegacyParams && typeof window !== "undefined") {
      navigate("/cath-domains", { replace: true })
    }
  }, [catDomainModels, search])

  const selectedCatDomain = useMemo(
    () => (selectedCathId ? catDomainModels.find(d => d.cathId === selectedCathId) ?? null : null),
    [catDomainModels, selectedCathId],
  )

  const handleSelectCathId = useCallback(cathId => {
    setSelectedCathId(cathId)
    if (typeof window !== "undefined") {
      navigate(`/cath-domains?cath=${encodeURIComponent(cathId)}`, { replace: true })
    }
  }, [])

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
        <CathDomainHero />

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
            <CatDomainDashboard catDomains={catDomainModels} onSelect={handleSelectCathId} />
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
            <CatDomainOverviewPanel catDomain={selectedCatDomain} />
            <CatDomainStructureEmbed structureEmbedPdbId={selectedCatDomain.structureEmbedPdbId} />
            <div className="lg:flex lg:items-start lg:gap-8 xl:gap-12 mt-6 md:mt-8">
              <CatDomainSectionNav catDomain={selectedCatDomain} className="lg:w-44 xl:w-52 shrink-0" />
              <div className="min-w-0 flex-1 lg:max-w-3xl space-y-8">
                <CatDomainStructuralArchitecture
                  structuralArchitecture={selectedCatDomain.structuralArchitecture}
                />
                <CatDomainMechanismPanel mechanism={selectedCatDomain.mechanism} />
                <CatDomainProseSections
                  functionalDiversity={selectedCatDomain.functionalDiversity}
                  interactingDomains={selectedCatDomain.interactingDomains}
                />
                <CatDomainStructuresTable
                  representativeStructures={selectedCatDomain.representativeStructures}
                  representativeStructuresNote={selectedCatDomain.representativeStructuresNote}
                />
                <CatDomainMemberHmms
                  memberHmms={selectedCatDomain.memberHmms}
                  hmmMethod={selectedCatDomain.hmmMethod}
                />
                <CatDomainLogoGallery
                  hmmLogos={selectedCatDomain.hmmLogos}
                  sequenceLogos={selectedCatDomain.sequenceLogos}
                />
                <CatDomainReferences references={selectedCatDomain.references} />
              </div>
            </div>
          </>
        )}
      </Container>
    </section>
  )
}

export default CathDomainsPage

export const Head = () => (
  <Seo
    title="CATH domains"
    description="PETadex: CATH domain reference pages with literature-backed notes, linked to the family atlas when mapped."
  />
)
