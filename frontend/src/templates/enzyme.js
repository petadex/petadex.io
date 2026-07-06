import React, { useState, useEffect } from "react"
import { Link } from "gatsby"
import SequenceViewer from "../components/sequence/SequenceViewer"
import LazyPetadexCatalyticDomainsPanel from "../components/petadexDomains/LazyPetadexCatalyticDomainsPanel.jsx"
import Seo from "../components/seo"
import config from "../config"
import Container from "../components/common/Container"
import { useScrollHeader } from "../hooks/useScrollHeader"
import { cathDomainPathForComponent } from "../utils/cathDomainCatalogLookup"

const getNCBILink = accession => {
  if (!accession) return null
  if (/^[A-Z]{3}\d{5}\.\d+$/.test(accession))
    return `https://www.ncbi.nlm.nih.gov/protein/${accession}`
  if (accession.startsWith("WP_"))
    return `https://www.ncbi.nlm.nih.gov/protein/${accession}`
  if (/^[SDE]RR\d+_\d+/.test(accession))
    return `https://www.ncbi.nlm.nih.gov/sra/${accession.split("_")[0]}`
  if (accession.startsWith("MGYP"))
    return `https://www.ncbi.nlm.nih.gov/protein?term=${accession}`
  return `https://www.ncbi.nlm.nih.gov/protein?term=${accession.split("_")[0]}`
}

// ── Shared full-page states ────────────────────────────────────────────────

const PageState = ({ children, variant = "default" }) => (
  <div
    className={`flex items-center justify-center py-20 text-sm ${
      variant === "error" ? "text-destructive" : "text-muted-foreground italic"
    }`}
  >
    {children}
  </div>
)

// ── Metadata pill ──────────────────────────────────────────────────────────

const MetaPill = ({ label, children }) => (
  <span className="text-sm text-muted-foreground">
    <strong className="text-foreground font-medium">{label}:</strong> {children}
  </span>
)

// ── Main template ──────────────────────────────────────────────────────────

export default function EnzymeTemplate({ pageContext }) {
  useScrollHeader()
  const [enzyme, setEnzyme] = useState(pageContext.enzyme || null)
  const [loading, setLoading] = useState(!pageContext.enzyme)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (pageContext.enzyme) return

    const enzymeId =
      pageContext.enzymeId ||
      (typeof window !== "undefined" &&
        window.location.pathname.match(/\/enzyme\/([^/]+)/)?.[1])

    if (!enzymeId) {
      setError("Invalid enzyme URL")
      setLoading(false)
      return
    }

    async function fetchEnzyme() {
      try {
        const res = await fetch(`${config.apiUrl}/enzymes/${enzymeId}`)
        if (!res.ok) throw new Error(`Enzyme not found: ${enzymeId}`)
        setEnzyme(await res.json())
      } catch (err) {
        setError(err.toString())
      } finally {
        setLoading(false)
      }
    }

    fetchEnzyme()
  }, [pageContext.enzyme, pageContext.enzymeId])

  if (loading) return <PageState>Loading enzyme…</PageState>
  if (error) return <PageState variant="error">Error: {error}</PageState>
  if (!enzyme) return <PageState>Enzyme not found</PageState>

  const ncbiLink = getNCBILink(enzyme.genbank_accession_id)

  return (
    <>
      <section className="py-10 md:py-14">
        <Container>
          {/* Back link */}
          <Link
            to="/enzymes"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Enzymes
          </Link>

          {/* Header */}
          <div className="mb-6">
            <h1 className="font-mono text-3xl md:text-4xl font-bold text-foreground mb-3">
              {enzyme.genbank_accession_id ? (
                ncbiLink ? (
                  <a
                    href={ncbiLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground border-b-2 border-info hover:border-accent transition-colors"
                  >
                    {enzyme.genbank_accession_id}
                  </a>
                ) : (
                  enzyme.genbank_accession_id
                )
              ) : (
                `Enzyme ${enzyme.enzyme_id}`
              )}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
              <MetaPill label="ID">{enzyme.enzyme_id}</MetaPill>

              {enzyme.family !== null && (
                <MetaPill label="Family">
                  <Link
                    to={`/family/${enzyme.family}`}
                    className="text-accent hover:text-accent-hover"
                  >
                    {enzyme.family}
                  </Link>
                  {enzyme.family_pid === null ? (
                    <span className="ml-2 px-1.5 py-0.5 bg-info text-info-foreground rounded text-2xs font-bold uppercase tracking-wide">
                      Centroid
                    </span>
                  ) : (
                    <span className="ml-1.5 text-muted-foreground">
                      ({enzyme.family_pid}% identity)
                    </span>
                  )}
                </MetaPill>
              )}

              {enzyme.component !== null && (
                <MetaPill label="Component">
                  <Link
                    to={cathDomainPathForComponent(enzyme.component)}
                    className="text-accent hover:text-accent-hover"
                  >
                    {enzyme.component}
                  </Link>
                </MetaPill>
              )}

              {enzyme.variant !== null && (
                <MetaPill label="Variant">{enzyme.variant}</MetaPill>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Plastic-degrading enzyme from BLAST-NR database
            </p>
          </div>

          {enzyme.translated_sequence && (
            <div className="card p-4 mb-6">
              <LazyPetadexCatalyticDomainsPanel
                enzymeId={enzyme.enzyme_id}
                accession={enzyme.genbank_accession_id}
                sequence={enzyme.translated_sequence}
              />
            </div>
          )}

          {/* Sequence card */}
          {enzyme.translated_sequence && (
            <div className="card p-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Amino Acid Sequence
              </h2>
              <SequenceViewer
                aminoAcidSequence={enzyme.translated_sequence}
                nucleotideSequence={null}
              />
            </div>
          )}
        </Container>
      </section>
    </>
  )
}

export const Head = ({ pageContext }) => {
  const enzyme = pageContext?.enzyme
  const name =
    enzyme?.genbank_accession_id || `Enzyme ${enzyme?.enzyme_id || ""}`
  return (
    <Seo
      title={name}
      description={`View details for plastic-degrading enzyme ${name} including sequence data and classification.`}
    />
  )
}
