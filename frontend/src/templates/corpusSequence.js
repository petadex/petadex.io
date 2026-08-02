// frontend/src/templates/corpusSequence.js
//
// Corpus sequence page (/sequence/orf/:orfId) — the 307M-ORF path. Deliberately
// SEPARATE from templates/sequence.js (the ~1,600-row curated path): the two are
// different entities with near-disjoint data, and the factual-framing discipline
// from "01 - Per-Sequence Annotation Plan" lives entirely on this side. See
// "03 - Frontend Wiring" for why a separate template (not a `kind` branch).
//
// Data flow:
//   PRIMARY (blocking first paint): GET /api/orf/:orfId → normalize to the common
//     minimal interface { id, sequence, length, source, orfOrigin, orf_type,
//     ancestors, computed, provenance }. 404 → "ORF not found".
//   SECONDARY (each its own guarded, absence-tolerant fetch — same degradation
//     pattern the curated panels use): cluster context (off ancestors.c90_id),
//     catalytic domains (off orf_id), predicted features (off orf_id).
//   NOT fetched (curated-only): gene-metadata, plate-data, gene-details/header,
//     synthesized-gene, aa-seq-features.
import React, { useState, useEffect } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"
import { useScrollHeader } from "../hooks/useScrollHeader"
import SequenceViewer from "../components/sequence/SequenceViewer"
import ProvenancePanel from "../components/corpus/ProvenancePanel.jsx"
import ClusterContextPanel from "../components/corpus/ClusterContextPanel.jsx"
import CatalyticDomainsPanel from "../components/corpus/CatalyticDomainsPanel.jsx"
import ComputedStatsPanel from "../components/corpus/ComputedStatsPanel.jsx"
import SignalPeptidePanel from "../components/corpus/SignalPeptidePanel.jsx"
import ComparisonRegion from "../components/corpus/ComparisonRegion.jsx"
import StructurePanel from "../components/StructurePanel"

const ORIGIN_LABEL = { 0: "PAZy", 1: "NR", 2: "Logan" }

/**
 * Thin normalization of GET /api/orf/:orfId into the common interface.
 * Tolerates a couple of key spellings so the page is robust to minor backend
 * drift, but keeps the mapping deliberately shallow (see "03 - Frontend Wiring":
 * "keep frontend normalization thin").
 */
function normalizeOrf(raw, fallbackId) {
  if (!raw || typeof raw !== "object") return null
  const orfOrigin = raw.orf_origin != null ? Number(raw.orf_origin) : null
  const provenance = raw.provenance || null
  // A usable external accession only exists for PAZy/NR origins.
  const accession =
    raw.genbank_accession_id ||
    provenance?.genbank_accession_id ||
    provenance?.accession ||
    null

  return {
    id: raw.orf_id ?? raw.id ?? fallbackId ?? null,
    sequence: raw.sequence || raw.aa_sequence || "",
    length: raw.length ?? (raw.sequence ? raw.sequence.length : null),
    source: orfOrigin != null ? ORIGIN_LABEL[orfOrigin] ?? null : null,
    orfOrigin,
    orf_type: raw.orf_type ?? null,
    ancestors: raw.ancestors || null,
    computed: raw.computed || null,
    provenance,
    accession,
  }
}

export default function CorpusSequenceTemplate({ pageContext }) {
  useScrollHeader()

  const orfId = pageContext?.orfId ?? null
  const [orf, setOrf] = useState(null)
  const [status, setStatus] = useState("loading") // loading | ready | notfound | error
  const [errorMsg, setErrorMsg] = useState(null)
  // Domain selected in the catalytic-domain track → highlighted in SequenceViewer.
  const [domainSelection, setDomainSelection] = useState(null)
  // Angela SignalP cleavage span (1..cleavage_pos); domains win if both set.
  const [signalHighlight, setSignalHighlight] = useState(null)
  // Most corpus ORFs have no curated experimental structure; only mount the
  // heavy Mol* viewer once we've confirmed one exists (a 200 from /api/pdb).
  // This avoids the viewer churning on a never-resolving structure lookup.
  const [pdbAvailable, setPdbAvailable] = useState(false)

  useEffect(() => {
    if (orfId == null || orfId === "") {
      setStatus("error")
      setErrorMsg("No ORF id in URL.")
      return
    }

    let cancelled = false
    setStatus("loading")

    fetch(`${config.apiUrl}/orf/${encodeURIComponent(String(orfId))}`)
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) {
          setStatus("notfound")
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setStatus("error")
          setErrorMsg(body.error || `Request failed (${res.status})`)
          return
        }
        const data = await res.json()
        if (cancelled) return
        const normalized = normalizeOrf(data, orfId)
        if (!normalized || !normalized.sequence) {
          setStatus("notfound")
          return
        }
        setOrf(normalized)
        setStatus("ready")
      })
      .catch(err => {
        if (cancelled) return
        console.error("ORF fetch error:", err)
        setStatus("error")
        setErrorMsg("Could not reach the server.")
      })

    return () => {
      cancelled = true
    }
  }, [orfId])

  // Structure-availability probe: a curated PDB exists only for the rare ORF
  // already in `pdb_accessions` (keyed by external accession; Logan ORFs have
  // none). Probe once per accession and gate the viewer on a real 200.
  const probeAccession = orf?.accession ?? null
  useEffect(() => {
    if (!probeAccession) {
      setPdbAvailable(false)
      return
    }
    let cancelled = false
    setPdbAvailable(false)
    fetch(
      `${config.apiUrl}/pdb/accession/${encodeURIComponent(probeAccession)}`
    )
      .then(res => {
        if (!cancelled) setPdbAvailable(res.ok)
      })
      .catch(() => {
        if (!cancelled) setPdbAvailable(false)
      })
    return () => {
      cancelled = true
    }
  }, [probeAccession])

  if (status === "loading") {
    return (
      <Container className="py-20">
        <p className="text-muted-foreground italic">
          Loading ORF {String(orfId)}…
        </p>
      </Container>
    )
  }

  if (status === "notfound") {
    return (
      <Container className="py-20">
        <h1 className="text-2xl font-bold text-primary">ORF not found</h1>
        <p className="text-muted-foreground mt-2">
          No corpus sequence is available for ORF id{" "}
          <span className="font-mono">{String(orfId)}</span>.
        </p>
      </Container>
    )
  }

  if (status === "error") {
    return (
      <Container className="py-20">
        <h1 className="text-2xl font-bold text-destructive">Error</h1>
        <p className="text-muted-foreground mt-2">{errorMsg}</p>
      </Container>
    )
  }

  const c90Id = orf?.ancestors?.c90_id ?? null
  // Only show the structure viewer once a curated PDB is confirmed to exist
  // (PAZy/NR ORFs that happen to be in pdb_accessions); Logan ORFs never are.
  const showStructure = Boolean(orf?.accession) && pdbAvailable

  return (
    <Container className="py-12 md:py-16 space-y-8">
      {/* ── Header (factual identity) ── */}
      <header>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-semibold text-foreground m-0">
            ORF <span className="font-mono">{String(orf.id)}</span>
          </h1>
          {orf.source && (
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
              {orf.source}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-base mt-2">
          Corpus protein sequence
          {orf.orf_type ? ` · ${orf.orf_type}` : ""}
          {orf.length != null ? ` · ${orf.length} aa` : ""}
        </p>
        <ComparisonRegion
          variant="inline"
          sequence={orf.sequence}
          orfId={orf.id}
          accession={orf.accession}
        />
      </header>

      {/* Provenance stays full-width (variable-length sample metadata) */}
      <ProvenancePanel orfOrigin={orf.orfOrigin} provenance={orf.provenance} />

      {/* Cluster placement + physico-chem side by side */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <div className="min-w-0 flex flex-col [&>section]:flex-1 [&>section]:h-full">
          <ClusterContextPanel c90Id={c90Id} ancestors={orf.ancestors} />
        </div>
        <div className="min-w-0 flex flex-col [&>section]:flex-1 [&>section]:h-full">
          <ComputedStatsPanel computed={orf.computed} length={orf.length} />
        </div>
      </div>

      {/* Angela SignalP sits above the sequence it highlights */}
      <SignalPeptidePanel
        orfId={orf.id}
        seqLength={orf.length}
        onHighlightRange={setSignalHighlight}
      />

      {/* Sequence needs full width for the residue grid */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-foreground m-0 mb-1">
          Sequence
        </h2>
        {!domainSelection && signalHighlight ? (
          <p className="text-xs text-muted-foreground m-0 mb-4 inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-700/55" />
            Highlighted: predicted signal peptide (residues{" "}
            {signalHighlight.start}–{signalHighlight.end})
          </p>
        ) : domainSelection ? (
          <p className="text-xs text-muted-foreground m-0 mb-4">
            Highlighted: selected catalytic domain
            {domainSelection.label ? ` (${domainSelection.label})` : ""}
          </p>
        ) : (
          <div className="mb-3" />
        )}
        <SequenceViewer
          aminoAcidSequence={orf.sequence}
          nucleotideSequence={null}
          highlightRange={domainSelection || signalHighlight}
          autoScrollOnHighlight={Boolean(domainSelection)}
        />
      </section>

      {/* Domains + optional structure: evidence / structure pair when PDB exists */}
      {showStructure ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start">
          <div className="min-w-0">
            <CatalyticDomainsPanel
              orfId={orf.id}
              seqLength={orf.length}
              onSelectDomain={setDomainSelection}
            />
          </div>
          <div className="min-w-0">
            <section className="card p-6 h-full">
              <StructurePanel accession={orf.accession} />
            </section>
          </div>
        </div>
      ) : (
        <CatalyticDomainsPanel
          orfId={orf.id}
          seqLength={orf.length}
          onSelectDomain={setDomainSelection}
        />
      )}
    </Container>
  )
}

export const Head = ({ pageContext }) => {
  const id = pageContext?.orfId ?? "Sequence"
  return (
    <Seo
      title={`ORF ${id} - Corpus Sequence`}
      description={`Corpus protein sequence ORF ${id}: provenance, computed properties, cluster context, and domain annotations from the PETadex 307M-sequence corpus.`}
    />
  )
}
