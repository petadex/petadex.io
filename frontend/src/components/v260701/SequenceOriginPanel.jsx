// frontend/src/components/v260701/SequenceOriginPanel.jsx
//
// Where a v260701 sequence comes from. Facts only, each labelled with its source.
//   Plasticome / NCBI nr: protein accessions, organism (Tier 2 taxonomy over the accessions), and the BLAST-nr
//     record fields where PETadex holds one.
//   Logan: a deduplicated protein that can be assembled from many runs. Shows the representative contig, how many
//     runs / BioSamples / BioProjects carry it, the representative BioSample's stated annotation, and the
//     environment-category histogram over its BioSamples. The full sample list loads on request.
import React, { useState } from "react"
import config from "../../config"
import {
  Card, Fields, ExtLink, HistogramBars, fmtInt, fmtNum, fmtPct, ncbiProtein, ncbiSra, ncbiBiosample, ncbiBioproject,
} from "./common"

function AccessionList({ accessions, n }) {
  if (!accessions?.length) return null
  return (
    <span className="font-mono text-xs leading-6">
      {accessions.map((a, i) => (
        <React.Fragment key={a}>
          {i > 0 && ", "}
          <ExtLink href={ncbiProtein(a)}>{a}</ExtLink>
        </React.Fragment>
      ))}
      {n > accessions.length && <span className="text-muted-foreground"> … and {fmtInt(n - accessions.length)} more</span>}
    </span>
  )
}

function ProteinOrigin({ rec }) {
  const o = rec.organism || {}
  const nr = rec.nr_record || {}
  const lineage = [o.superkingdom, o.phylum, o.class, o.order, o.family, o.genus].filter(Boolean).join(" › ")
  return (
    <>
      <Fields rows={[
        ["Accessions (identical protein)", <AccessionList accessions={rec.accessions} n={rec.n_accessions} />],
        ["Organism", o.name || o.lca ? `${o.name || o.lca}${o.n_taxids > 1 ? ` (most common of ${o.n_taxids} taxa; LCA ${o.lca} at ${o.lca_rank})` : ""}` : null],
        ["Lineage", lineage || null],
        ["NCBI taxonomy id", o.taxid ? <ExtLink href={`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${o.taxid}`}>{o.taxid}</ExtLink> : null],
        ["Definition", nr.definition],
        ["Reference", nr.journal],
        ["Country", nr.country],
      ]} />
      <p className="text-xs text-muted-foreground mt-4 mb-0">
        Organism from NCBI taxonomy over the protein&apos;s accessions. Definition, reference and country come from the
        BLAST-nr record for {nr.accession ? <span className="font-mono">{nr.accession}</span> : "an accession"} when PETadex holds one.
      </p>
    </>
  )
}

function SampleList({ id }) {
  const [state, setState] = useState({ status: "idle", data: null })
  const load = () => {
    setState({ status: "loading", data: null })
    fetch(`${config.apiUrl}/sequence/${encodeURIComponent(id)}/samples`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => setState({ status: "ready", data }))
      .catch(() => setState({ status: "error", data: null }))
  }
  if (state.status === "idle")
    return (
      <button type="button" onClick={load} className="btn btn-secondary text-sm">
        Show the BioSamples this sequence was found in
      </button>
    )
  if (state.status === "loading") return <p className="text-sm italic text-muted-foreground">Loading samples…</p>
  if (state.status === "error") return <p className="text-sm text-muted-foreground">The sample list could not be loaded.</p>
  const s = state.data?.samples || []
  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-muted-foreground mb-2">
        {fmtInt(state.data?.n_biosamples)} BioSamples{s.length < (state.data?.n_biosamples || 0) ? `, first ${s.length} by number of runs` : ""}.
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="py-1 pr-3 font-medium">BioSample</th><th className="py-1 pr-3 font-medium">BioProject</th>
            <th className="py-1 pr-3 font-medium text-right">Runs</th><th className="py-1 pr-3 font-medium">Category</th>
            <th className="py-1 pr-3 font-medium">Isolation source</th><th className="py-1 pr-3 font-medium">Country</th>
          </tr>
        </thead>
        <tbody>
          {s.map(r => (
            <tr key={r.biosample} className="border-b border-border last:border-0">
              <td className="py-1 pr-3 font-mono"><ExtLink href={ncbiBiosample(r.biosample)}>{r.biosample}</ExtLink></td>
              <td className="py-1 pr-3 font-mono">{r.bioproject}</td>
              <td className="py-1 pr-3 text-right">{fmtInt(r.n_runs)}</td>
              <td className="py-1 pr-3">{r.profile}</td>
              <td className="py-1 pr-3">{r.isolation_source}</td>
              <td className="py-1 pr-3">{r.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LoganOrigin({ rec, annotation }) {
  const l = rec.logan || {}
  const a = annotation || {}
  const coords = a.latitude != null && a.longitude != null ? `${fmtNum(a.latitude, 3)}, ${fmtNum(a.longitude, 3)}` : null
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mt-0 mb-2">Assembly</h3>
        <Fields cols={3} rows={[
          ["Representative run", l.run ? <ExtLink href={ncbiSra(l.run)}>{l.run}</ExtLink> : null],
          ["Contig", l.contig],
          ["k-mer abundance of contig", fmtNum(l.ka, 1)],
          ["Runs carrying this sequence", fmtInt(l.n_runs)],
          ["BioSamples", fmtInt(l.n_biosamples)],
          ["BioProjects", fmtInt(l.n_bioprojects)],
        ]} />
        <p className="text-xs text-muted-foreground mt-3 mb-0">
          Logan sequences are deduplicated: the same protein can be assembled from contigs in many runs. The
          representative contig is the one named in the PETadex FASTA header.
        </p>
      </div>
      {(l.biosample || annotation) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mt-0 mb-2">Representative BioSample</h3>
          <Fields rows={[
            ["BioSample", l.biosample ? <ExtLink href={ncbiBiosample(l.biosample)}>{l.biosample}</ExtLink> : null],
            ["BioProject", l.bioproject ? <ExtLink href={ncbiBioproject(l.bioproject)}>{l.bioproject}</ExtLink> : null],
            ["Organism (as submitted)", l.biosample_organism],
            ["Environment category", a.profile ? `${a.profile.replace(/_/g, " ")}${a.profile_evidence ? ` (${a.profile_evidence})` : ""}` : null],
            ["Isolation source", a.isolation_source],
            ["Broad-scale environment", a.env_broad_scale],
            ["Environmental medium", a.env_medium],
            ["Host", a.host],
            ["Country", a.country],
            ["Stated coordinates", coords],
            ["Collection year", a.collection_year],
            ["Stated temperature", a.temperature_c != null ? `${fmtNum(a.temperature_c, 1)} °C` : null],
            ["Stated pH", fmtNum(a.ph, 1)],
          ]} />
          <p className="text-xs text-muted-foreground mt-3 mb-0">
            The BioSample with the highest contig k-mer abundance for this sequence. Fields are as stated in the
            BioSample record; coordinates are the stated latitude/longitude only.
          </p>
        </div>
      )}
      {l.profile_hist && Object.keys(l.profile_hist).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mt-0 mb-2">Environment categories across its BioSamples</h3>
          <HistogramBars hist={l.profile_hist} unit="distinct BioSamples with an environment category" />
          <div className="mt-4" />
          <Fields cols={3} rows={[
            ["Measured temperature (median)", l.meas_temp_c != null ? `${fmtNum(l.meas_temp_c, 1)} °C` : null],
            ["Measured pH (median)", fmtNum(l.meas_ph, 1)],
            ["Most common category", l.profile_dominant ? `${l.profile_dominant.replace(/_/g, " ")} (${fmtPct(l.profile_dominant_share)})` : null],
          ]} />
        </div>
      )}
      <SampleList id={rec.id} />
    </div>
  )
}

export default function SequenceOriginPanel({ rec, annotation }) {
  if (!rec) return null
  return (
    <Card
      title="Origin"
      note={rec.src === "LG"
        ? "Assembled from public sequencing runs (Logan). Sample metadata as submitted to NCBI BioSample."
        : rec.src === "PL" ? "Curated plastic-degrading enzyme (Plasticome)." : "Protein from NCBI nr."}
    >
      {rec.src === "LG" ? <LoganOrigin rec={rec} annotation={annotation} /> : <ProteinOrigin rec={rec} />}
    </Card>
  )
}
