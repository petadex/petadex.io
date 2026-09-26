import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Link, navigate } from "gatsby"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"
import CathDomainHero from "../components/cath/CathDomainHero"
import CathDomainProfileSelector from "../components/cath/CathDomainProfileSelector"
import CathDomainVisualizationPanel from "../components/cath/CathDomainVisualizationPanel"
import CathDomainSectionNav from "../components/cath/CathDomainSectionNav"
import CathDomainNarrativeSections from "../components/cath/CathDomainNarrativeSections"
import CathDomainFiguresAndRefs from "../components/cath/CathDomainFiguresAndRefs"
import { CATH_DOMAIN_CATALOG } from "../data/cathDomainCatalog"
import { mergeCatalogWithAtlasComponents } from "../utils/mergeCatalogWithAtlas"
import { stripRedundantPfamFromDisplayName } from "../utils/cathDomainSectionConfig"

function parseCathQuery(search) {
  const params = new URLSearchParams(search || "")
  const component = params.get("component")
  const cath = params.get("cath")
  const pfam = params.get("pfam")
  const id = params.get("id")
  return {
    componentNum: component != null && component !== "" ? parseInt(component, 10) : null,
    cathRaw: cath != null && cath !== "" ? decodeURIComponent(cath.trim()) : null,
    pfamRaw: pfam != null && pfam !== "" ? pfam.trim().toUpperCase() : null,
    idRaw: id != null && id !== "" ? id.trim() : null,
    hasComponentParam: component != null && component !== "",
  }
}

function pickIdFromQuery(domainModels, { componentNum, cathRaw, pfamRaw, idRaw }) {
  if (!domainModels.length) return null
  if (idRaw) {
    const byId = domainModels.find(d => d.id === idRaw)
    if (byId) return byId.id
  }
  if (pfamRaw) {
    const acc = pfamRaw.startsWith("PF") ? pfamRaw : `PF${pfamRaw}`
    const byPf = domainModels.find(
      d => d.pfamAccession === acc || d.id === `pf-${acc}` || d.id === acc.toLowerCase(),
    )
    if (byPf) return byPf.id
  }
  if (Number.isFinite(componentNum)) {
    const matches = domainModels.filter(d => d.component === componentNum)
    if (matches.length >= 1) return matches[0].id
  }
  if (cathRaw) {
    const byCath = domainModels.find(d => d.cathId === cathRaw)
    if (byCath) return byCath.id
  }
  return null
}

function domainsForComponent(domainModels, componentNum) {
  if (!Number.isFinite(componentNum)) return []
  return domainModels.filter(d => d.component === componentNum)
}

const CathDomainsPage = ({ location }) => {
  const [domainModels, setDomainModels] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

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
            "Atlas component counts unavailable; Pfam profiles still listed—family counts will appear when the API is reachable and Pfam↔atlas mapping is set.",
          )
          return
        }
        setDomainModels(mergeCatalogWithAtlasComponents(CATH_DOMAIN_CATALOG, rows))
      })
      .catch(() => {
        if (cancelled) return
        setDomainModels(mergeCatalogWithAtlasComponents(CATH_DOMAIN_CATALOG, []))
        setLoadError(
          "Could not load atlas components; showing Pfam catalog without live family counts.",
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!domainModels.length) return
    const q = parseCathQuery(search)
    const fromQuery = pickIdFromQuery(domainModels, q)
    setSelectedId(prev => {
      if (fromQuery) return fromQuery
      if (prev && domainModels.some(d => d.id === prev)) return prev
      return domainModels[0].id
    })
  }, [domainModels, search])

  const selected = useMemo(
    () => domainModels.find(d => d.id === selectedId) ?? domainModels[0] ?? null,
    [domainModels, selectedId],
  )

  const queryInfo = useMemo(() => parseCathQuery(search), [search])

  const componentAmbiguous = useMemo(() => {
    if (!queryInfo.hasComponentParam || !Number.isFinite(queryInfo.componentNum)) return null
    const matches = domainsForComponent(domainModels, queryInfo.componentNum)
    if (matches.length <= 1) return null
    return { component: queryInfo.componentNum, matches }
  }, [domainModels, queryInfo.componentNum, queryInfo.hasComponentParam])

  const handleSelectId = useCallback(id => {
    setSelectedId(id)
    if (typeof window !== "undefined") {
      navigate(`/cath-domains?id=${encodeURIComponent(id)}`, { replace: true })
    }
  }, [])

  if (loading && !domainModels.length) {
    return (
      <section className="py-16 md:py-20">
        <Container>
          <p className="text-muted-foreground">Loading CATH / Pfam domain reference…</p>
        </Container>
      </section>
    )
  }

  if (!selected) {
    return (
      <section className="py-16 md:py-20">
        <Container>
          <p className="text-muted-foreground">No domain entries available.</p>
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

        {componentAmbiguous && (
          <div
            className="mb-6 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground max-w-3xl"
            role="status"
          >
            <p className="m-0 mb-2 text-foreground font-medium">
              Component {componentAmbiguous.component} maps to more than one Pfam profile
            </p>
            <p className="m-0 mb-2 leading-relaxed">
              Use a profile-specific link so the page opens to the right entry:
            </p>
            <ul className="m-0 pl-5 space-y-1 list-disc">
              {componentAmbiguous.matches.map(d => (
                <li key={d.id}>
                  <Link
                    to={`/cath-domains?id=${encodeURIComponent(d.id)}`}
                    className="text-accent hover:text-accent-hover underline underline-offset-2"
                  >
                    {stripRedundantPfamFromDisplayName(d.displayName, d.pfamAccession)}
                  </Link>
                  <span className="text-muted-foreground"> ({d.pfamAccession})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <CathDomainProfileSelector
          domains={domainModels}
          selectedId={selected.id}
          onSelectId={handleSelectId}
        />

        <CathDomainVisualizationPanel domain={selected} />

        <div className="lg:flex lg:items-start lg:gap-8 xl:gap-12 mt-6 md:mt-8">
          <CathDomainSectionNav domain={selected} className="lg:w-44 xl:w-52 shrink-0" />
          <div className="min-w-0 flex-1 lg:max-w-3xl">
            <CathDomainNarrativeSections domain={selected} />
            <CathDomainFiguresAndRefs domain={selected} />
          </div>
        </div>
      </Container>
    </section>
  )
}

export default CathDomainsPage

export const Head = () => (
  <Seo
    title="CATH domains"
    description="PETadex: Pfam / CATH domain reference pages with literature-backed notes, linked to the family atlas when mapped."
  />
)
