// frontend/src/templates/petadexSequence.js
//
// v260701 sequence page: /sequence/PL1, /sequence/NR223, /sequence/LG113721682.
// One request (GET /api/sequence/:id) returns everything the page shows: the stored record (sequence, catalytic
// core, clusters, origin), computed stats, the three cluster rows, the representative BioSample annotation (Logan)
// and curated structures (Plasticome / nr). Facts only; nothing here ranks or recommends.
import React, { useEffect, useMemo, useState } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"
import SequenceViewer from "../components/sequence/SequenceViewer"
import ComputedStatsPanel from "../components/corpus/ComputedStatsPanel.jsx"
import CatalyticDomainsPanel from "../components/corpus/CatalyticDomainsPanel.jsx"
import ComparisonRegion from "../components/corpus/ComparisonRegion.jsx"
import StructurePanel from "../components/StructurePanel"
import SequenceClustersPanel from "../components/v260701/SequenceClustersPanel.jsx"
import SequenceOriginPanel from "../components/v260701/SequenceOriginPanel.jsx"
import { SourceBadge, parseSiteIdentities, fmtInt } from "../components/v260701/common"

function coreDomains(rec) {
  const c = rec?.core
  if (!c) return []
  const { residues, states } = parseSiteIdentities(c.catalytic)
  const important = parseSiteIdentities(c.important)
  const domainName = rec?._domainName
  return [{
    pazy_hmm_id: c.hmm,
    hmm_source: "PETadex v260701 component HMM",
    domain: domainName ? `${domainName} (${c.component})` : `Catalytic core (${c.component})`,
    domain_start: c.start,
    domain_end: c.end,
    catalytic_residues: residues,
    catalytic_match_states: states,
    evidence_type: `HMM ${c.hmm} hit, e-value ${c.evalue != null ? Number(c.evalue).toExponential(1) : "—"}` +
      (important.residues.length ? `; other conserved sites ${important.residues.join(", ")}` : ""),
  }]
}

export default function PetadexSequenceTemplate({ pageContext }) {
  const id = String(pageContext?.sequenceId || "").trim().toUpperCase()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState("loading")
  const [errorMsg, setErrorMsg] = useState(null)
  const [selection, setSelection] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    fetch(`${config.apiUrl}/sequence/${encodeURIComponent(id)}`)
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) return setStatus("notfound")
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setErrorMsg(body.error || `Request failed (${res.status})`)
          return setStatus("error")
        }
        const d = await res.json()
        if (cancelled) return
        setData(d)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg("Could not reach the server.")
          setStatus("error")
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const domains = useMemo(() => {
    if (!data) return []
    const name = data.cluster_rows?.[90]?.domain_name || data.cluster_rows?.[30]?.domain_name || null
    return coreDomains({ ...data, _domainName: name })
  }, [data])

  if (status === "loading")
    return <Container className="py-20"><p className="text-muted-foreground italic">Loading {id}…</p></Container>
  if (status === "notfound")
    return (
      <Container className="py-20">
        <h1 className="text-2xl font-bold text-primary">Sequence not found</h1>
        <p className="text-muted-foreground mt-2">
          <span className="font-mono">{id}</span> is not a sequence in PETadex v260701.
        </p>
      </Container>
    )
  if (status === "error")
    return (
      <Container className="py-20">
        <h1 className="text-2xl font-bold text-destructive">Error</h1>
        <p className="text-muted-foreground mt-2">{errorMsg}</p>
      </Container>
    )

  const cath = data.cluster_rows?.[90]
  const structureAcc = data.pdb?.[0]?.accession || null
  return (
    <Container className="py-12 md:py-16 space-y-8">
      <header>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-semibold text-foreground m-0 font-mono">{data.id}</h1>
          <SourceBadge src={data.src} />
          <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            PETadex v260701
          </span>
        </div>
        <p className="text-muted-foreground text-base mt-2 mb-0">
          {data.length != null ? `${fmtInt(data.length)} aa` : ""}
          {data.accession ? ` · ${data.accession}` : ""}
          {cath?.domain_name ? ` · ${cath.domain_name}${cath.cath_code ? ` (CATH ${cath.cath_code})` : ""}` : ""}
          {data.core ? ` · catalytic core ${data.core.start}–${data.core.end}` : ""}
        </p>
      </header>

      <SequenceClustersPanel id={data.id} clusters={data.clusters} rows={data.cluster_rows} />

      <SequenceOriginPanel rec={data} annotation={data.biosample_annotation} />

      <ComputedStatsPanel computed={data.computed} length={data.length} />

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-foreground m-0 mb-4">Sequence</h2>
        <SequenceViewer
          aminoAcidSequence={data.seq}
          header={data.id}
          nucleotideSequence={null}
          highlightRange={selection}
        />
      </section>

      <CatalyticDomainsPanel
        orfId={data.id}
        seqLength={data.length}
        onSelectDomain={setSelection}
        domains={domains}
        title="Catalytic core"
        note="The HMM hit that defines this sequence's catalytic core (the clustered region). Sites are listed as HMM match state and the residue at that position in this sequence."
      />

      {structureAcc && (
        <section className="card p-6">
          <StructurePanel accession={structureAcc} />
        </section>
      )}

      <ComparisonRegion sequence={data.seq} orfId={null} accession={[data.id, data.accession].filter(Boolean).join(" ")} />
    </Container>
  )
}

export const Head = ({ params, pageContext }) => {
  const id = String(params?.sequenceId || pageContext?.sequenceId || "Sequence").toUpperCase()
  return (
    <Seo
      title={`${id} - PETadex sequence`}
      description={`PETadex v260701 sequence ${id}: catalytic core, 90/60/30 % identity clusters, origin and sample metadata.`}
    />
  )
}
