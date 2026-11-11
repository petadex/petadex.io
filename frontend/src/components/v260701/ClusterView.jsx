// frontend/src/components/v260701/ClusterView.jsx
//
// v260701 cluster page: /cluster/{90|60|30}/{centroid petadex_id}.
//   GET /api/cluster/:level/:id            summary row + parent cluster rows
//   GET /api/cluster/:level/:id/children   the clusters one level down (60 % and 30 % only), largest first
//   GET /api/cluster/:level/:id/members    the sequences, centroid first, paged
// Facts only: sizes, source mix, CATH domain, organisms and sample categories as recorded. Nothing is ranked
// beyond plain size order.
import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import config from "../../config"
import Container from "../common/Container"
import {
  Card, Fields, ClusterLink, SequenceLink, HistogramBars, SourceBadge, fmtInt, fmtNum, fmtPct, SOURCE_LABELS,
} from "./common"
import SourceSplit, { clusterCounts } from "./SourceSplit"

const PAGE = 100

function useJson(url) {
  const [state, setState] = useState({ status: "loading", data: null, error: null })
  useEffect(() => {
    if (!url) return undefined
    let cancelled = false
    setState({ status: "loading", data: null, error: null })
    fetch(url)
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (cancelled) return
        if (r.status === 404) setState({ status: "notfound", data: null, error: body.error })
        else if (!r.ok) setState({ status: "error", data: null, error: body.error || `Request failed (${r.status})` })
        else setState({ status: "ready", data: body, error: null })
      })
      .catch(() => !cancelled && setState({ status: "error", data: null, error: "Could not reach the server." }))
    return () => {
      cancelled = true
    }
  }, [url])
  return state
}

function Lineage({ level, id, row }) {
  const chain = [
    { level: 30, id: level === 30 ? id : row.parent_30 },
    { level: 60, id: level === 60 ? id : row.parent_60 },
    { level: 90, id: level === 90 ? id : null },
  ].filter(c => c.id && c.level >= level)
  return (
    <nav className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
      {chain.map((c, i) => (
        <React.Fragment key={c.level}>
          {i > 0 && <span aria-hidden="true">›</span>}
          {c.level === level ? (
            <span className="font-mono text-foreground">{c.id} ({c.level} %)</span>
          ) : (
            <ClusterLink level={c.level} id={c.id}>{`${c.id} (${c.level} %)`}</ClusterLink>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

function Summary({ level, row }) {
  return (
    <Card title="Summary">
      <Fields cols={3} rows={[
        ["Centroid", <span><SequenceLink id={row.cluster_id} /> <span className="text-muted-foreground text-xs">({SOURCE_LABELS[row.centroid_source]}, {fmtInt(row.centroid_length)} aa)</span></span>],
        ["Sequences", fmtInt(row.member_count)],
        ["Plasticome / NCBI nr / Logan", <span className="inline-flex items-center gap-2 flex-wrap">{`${fmtInt(row.n_pl)} / ${fmtInt(row.n_nr)} / ${fmtInt(row.n_lg)}`}<SourceSplit counts={clusterCounts(row)} title="Sequences by source" unit="sequences" /></span>],
        [level === 90 ? null : `Clusters at ${level === 30 ? 60 : 90} %`, row.child_count != null ? fmtInt(row.child_count) : null],
        ["CATH domain", row.domain_name ? `${row.domain_name}${row.cath_code ? ` (${row.cath_code})` : ""}` : row.cath_fold],
        ["Components (HMMs) among members", fmtInt(row.n_components)],
        ["Centroid component", row.centroid_component],
        ["Most common organism", row.dominant_organism ? `${row.dominant_organism} (${fmtInt(row.n_organisms)} distinct among ${fmtInt(row.n_with_organism)} members with an organism)` : null],
        [row.parent_60 ? "In 60 % cluster" : null, row.parent_60 ? <ClusterLink level={60} id={row.parent_60}>{`${row.parent_60} (60 %)`}</ClusterLink> : null],
        [row.parent_30 ? "In 30 % cluster" : null, row.parent_30 ? <ClusterLink level={30} id={row.parent_30}>{`${row.parent_30} (30 %)`}</ClusterLink> : null],
      ].filter(r => r[0])} />
      <p className="text-xs text-muted-foreground mt-4 mb-0">
        Organism: NCBI taxonomy for Plasticome and nr members; for Logan members, the organism stated on their
        representative BioSample (often a metagenome label).
      </p>
    </Card>
  )
}

// "a; b; a; c" -> "a, b, c" (unique, in order), capped at `max` with a count of the rest.
function listText(v, max) {
  if (!v) return null
  const items = [...new Set(String(v).split(";").map(x => x.trim()).filter(Boolean))]
  const head = items.slice(0, max).join(", ")
  return items.length > max ? `${head} … and ${items.length - max} more` : head
}

function Samples({ row }) {
  if (row.t3_n_biosamples == null && row.t2_n_species == null && !row.t1_enzymes) return null
  let hist = row.t3_prof_hist
  if (typeof hist === "string") { try { hist = JSON.parse(hist) } catch { hist = null } }
  return (
    <Card
      title="Samples and organisms"
      note="From the PETadex v260701 metadata build. Logan members: the distinct BioSamples they were assembled from. NCBI nr members: their organisms."
    >
      <Fields cols={3} rows={[
        ["BioSamples (Logan members)", fmtInt(row.t3_n_biosamples)],
        ["BioProjects", fmtInt(row.t3_n_bioprojects)],
        ["BioSamples with a category", fmtInt(row.t3_n_profiled)],
        ["Most common category", row.t3_prof_dominant ? `${row.t3_prof_dominant.replace(/_/g, " ")} (${fmtPct(row.t3_prof_dominant_share)})` : null],
        ["Support", row.t3_support_tier],
        ["Measured temperature (median)", row.t3_meas_temp_median != null ? `${fmtNum(row.t3_meas_temp_median)} °C` : null],
        ["Measured pH (median)", fmtNum(row.t3_meas_ph_median)],
        ["Species (nr members)", fmtInt(row.t2_n_species)],
        ["Genera (nr members)", fmtInt(row.t2_n_genera)],
        ["Most common phylum (nr members)", row.t2_phylum_mode],
        ["Plasticome enzymes", listText(row.t1_enzymes, 25)],
        ["Plasticome substrates", listText(row.t1_substrates, 25)],
      ]} />
      {hist && Object.keys(hist).length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground mt-0 mb-2">Environment categories</h3>
          <HistogramBars hist={hist} unit="distinct BioSamples of the cluster's Logan members, by environment category" />
        </div>
      )}
    </Card>
  )
}

function Children({ level, id }) {
  const childLevel = level === 30 ? 60 : 90
  const [items, setItems] = useState([])
  const [next, setNext] = useState(null)
  const [status, setStatus] = useState("loading")
  const load = (cursor) => {
    const qs = new URLSearchParams({ limit: "50" })
    if (cursor) { qs.set("after_count", cursor.after_count); qs.set("after_id", cursor.after_id) }
    setStatus("loading")
    fetch(`${config.apiUrl}/cluster/${level}/${encodeURIComponent(id)}/children?${qs}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => { setItems(prev => (cursor ? prev : []).concat(d.children || [])); setNext(d.next); setStatus("ready") })
      .catch(() => setStatus("error"))
  }
  useEffect(() => { load(null) }, [level, id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card title={`Clusters at ${childLevel} %`} note="Largest first.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-4 font-medium">Cluster</th>
              <th className="py-2 pr-4 font-medium text-right">Sequences</th>
              <th className="py-2 pr-4 font-medium text-right">Plasticome / nr / Logan</th>
              <th className="py-2 pr-4 font-medium">Most common organism</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.cluster_id} className="border-b border-border last:border-0">
                <td className="py-1.5 pr-4"><ClusterLink level={childLevel} id={c.cluster_id} /></td>
                <td className="py-1.5 pr-4 text-right font-mono">{fmtInt(c.member_count)}</td>
                <td className="py-1.5 pr-4 text-right font-mono text-xs whitespace-nowrap">
                  <span className="mr-2">{fmtInt(c.n_pl)} / {fmtInt(c.n_nr)} / {fmtInt(c.n_lg)}</span>
                  <SourceSplit counts={clusterCounts(c)} title={`${c.cluster_id} (${childLevel} %): sequences by source`} unit="sequences" width="w-20" />
                </td>
                <td className="py-1.5 pr-4 text-xs">{c.dominant_organism}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {status === "loading" && <p className="text-sm italic text-muted-foreground mt-3">Loading…</p>}
      {status === "error" && <p className="text-sm text-muted-foreground mt-3">Could not load the sub-clusters.</p>}
      {status === "ready" && next && (
        <button type="button" className="btn btn-secondary text-sm mt-3" onClick={() => load(next)}>Load more</button>
      )}
    </Card>
  )
}

function Members({ level, id, total }) {
  const [offset, setOffset] = useState(0)
  const state = useJson(`${config.apiUrl}/cluster/${level}/${encodeURIComponent(id)}/members?offset=${offset}&limit=${PAGE}`)
  const pages = Math.ceil((total || 0) / PAGE)
  const page = Math.floor(offset / PAGE) + 1
  return (
    <Card title="Sequences" note={`${fmtInt(total)} sequences, centroid first${level !== 90 ? ", grouped by their 90 % cluster" : ""}.`}>
      {state.status === "loading" && <p className="text-sm italic text-muted-foreground">Loading…</p>}
      {state.status === "error" && <p className="text-sm text-muted-foreground">{state.error}</p>}
      {state.status === "ready" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">Sequence</th>
                <th className="py-2 pr-4 font-medium">Source</th>
                <th className="py-2 pr-4 font-medium text-right">Length (aa)</th>
                {level !== 90 && <th className="py-2 pr-4 font-medium">90 % cluster</th>}
              </tr>
            </thead>
            <tbody>
              {state.data.members.map((m, i) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 pr-4 text-xs text-muted-foreground">{fmtInt(offset + i + 1)}</td>
                  <td className="py-1.5 pr-4"><SequenceLink id={m.id} /></td>
                  <td className="py-1.5 pr-4 text-xs">{SOURCE_LABELS[m.source]}</td>
                  <td className="py-1.5 pr-4 text-right font-mono">{fmtInt(m.length)}</td>
                  {level !== 90 && <td className="py-1.5 pr-4"><ClusterLink level={90} id={m.c90} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center gap-3 mt-4 text-sm">
          <button type="button" className="btn btn-secondary text-sm" disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
          <span className="text-muted-foreground">Page {fmtInt(page)} of {fmtInt(pages)}</span>
          <button type="button" className="btn btn-secondary text-sm" disabled={page >= pages}
            onClick={() => setOffset(offset + PAGE)}>Next</button>
        </div>
      )}
    </Card>
  )
}

export default function ClusterView({ level, clusterId }) {
  const lvl = Number(level)
  const id = String(clusterId || "").trim().toUpperCase()
  const state = useJson([90, 60, 30].includes(lvl) ? `${config.apiUrl}/cluster/${lvl}/${encodeURIComponent(id)}` : null)
  if (![90, 60, 30].includes(lvl))
    return <Container className="py-20"><p className="text-destructive">Unsupported level “{level}” (expected 90, 60 or 30).</p></Container>
  if (state.status === "loading")
    return <Container className="py-20"><p className="italic text-muted-foreground">Loading cluster {id}…</p></Container>
  if (state.status !== "ready")
    return (
      <Container className="py-20">
        <h1 className="text-2xl font-bold text-primary">{state.status === "notfound" ? "Cluster not found" : "Error"}</h1>
        <p className="text-muted-foreground mt-2">{state.error}</p>
      </Container>
    )
  const row = state.data
  return (
    <Container className="py-12 md:py-16 space-y-8">
      <header className="space-y-2">
        <Lineage level={lvl} id={id} row={row} />
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-semibold text-foreground m-0">
            <span className="font-mono">{id}</span> <span className="text-2xl text-muted-foreground">{lvl} % identity cluster</span>
          </h1>
          <SourceBadge src={row.centroid_source} />
        </div>
        <p className="text-muted-foreground m-0">
          Named after its centroid, <Link to={`/sequence/${id}`} className="font-mono text-info hover:underline">{id}</Link>.
          PETadex v260701 catalytic-core clustering (2026-11-04).
        </p>
      </header>
      <Summary level={lvl} row={row} />
      <Samples row={row} />
      {lvl !== 90 && <Children level={lvl} id={id} />}
      <Members level={lvl} id={id} total={row.member_count} />
    </Container>
  )
}
