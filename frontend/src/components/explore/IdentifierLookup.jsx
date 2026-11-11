// frontend/src/components/explore/IdentifierLookup.jsx
//
// "Where does this protein sit?" on /explore. While the visitor types, detectIdentifier() says what the text looks like
// (a Logan protein ID, a GenBank accession, a bare number that could be PL/NR/LG, an SRA run, a sequence...). On
// submit it is resolved against the API and, for a protein, its path through the hierarchy is shown:
// protein -> enzyme -> family -> superfamily -> domain. The page lifts the found record so the ladder and the
// accession section can show the same protein.
//
// API: GET /api/sequence/:id, GET /api/lookup?q=, GET /api/runs/:id/lgs, GET /api/biosamples/:id/lgs.
import React, { useEffect, useMemo, useState } from "react"
import { Link } from "gatsby"
import config from "../../config"
import { detectIdentifier, SOURCES } from "../../utils/identifierDetect"
import { fmtInt, sequenceHref, clusterHref, ncbiSra } from "../v260701/common"
import { RUNGS, Glyph } from "./HierarchyLadder"

const EXAMPLES = ["PL1", "WP_054022242.1", "LG852233853", "223", "ERR14790956"]
const LEVEL_NAME = { 90: "Enzyme", 60: "Family", 30: "Superfamily" }

async function getJson(path) {
  const r = await fetch(`${config.apiUrl}${path}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`Request failed (${r.status})`)
  return r.json()
}

const fetchProtein = id => getJson(`/sequence/${encodeURIComponent(id)}`)

/** Resolve a detection to one of: protein | choices | sample | sequence | none. */
async function resolve(det) {
  switch (det.kind) {
    case "petadex":
    case "cluster": {
      // A cluster is named after its centroid, which is a protein, so the centroid's record gives the whole path.
      const rec = await fetchProtein(det.id)
      if (!rec) return { type: "none", message: `${det.id} is not in PETadex v260701.` }
      if (det.kind === "cluster" && rec.clusters?.[`c${det.level}`] !== det.id) {
        return { type: "none", message: `${det.id} is a protein, but not the centroid of a ${det.level} % cluster.`, protein: rec }
      }
      return { type: "protein", rec, level: det.kind === "cluster" ? det.level : null }
    }
    case "digits": {
      const found = (await Promise.all(det.candidates.map(id => getJson(`/lookup?q=${id}`))))
        .flatMap(r => (r?.kind === "sequence" ? r.matches.map(m => m.petadex_id) : []))
      if (found.length === 1) return { ...(await resolve({ kind: "petadex", id: found[0] })), note: `Only ${found[0]} exists with that number.` }
      if (!found.length) return { type: "none", message: `No protein is numbered ${det.candidates[0].slice(2)} in any source.` }
      return { type: "choices", items: found.map(id => ({ id, label: `${SOURCES[id.slice(0, 2)].name} protein ${id}` })), note: det.note }
    }
    case "run":
    case "contig":
    case "biosample": {
      const isBs = det.kind === "biosample"
      const out = await getJson(`/${isBs ? "biosamples" : "runs"}/${encodeURIComponent(det.accession)}/lgs?limit=5`)
      if (!out || !out.n_lg) return { type: "none", message: `No PETadex protein was assembled from ${det.accession}.` }
      return { type: "sample", kind: isBs ? "biosample" : "run", accession: det.accession, contig: det.contig, out }
    }
    case "external":
    case "unknown": {
      const r = await getJson(`/lookup?q=${encodeURIComponent(det.accession)}`)
      const ids = (r?.matches || []).map(m => m.petadex_id)
      if (!ids.length) return { type: "none", message: `${det.accession} doesn't match any PETadex protein.` }
      if (ids.length === 1) return resolve({ kind: "petadex", id: ids[0] })
      return { type: "choices", items: ids.map(id => ({ id, label: `${id} (${SOURCES[id.slice(0, 2)].name})` })), note: `${det.accession} is linked to ${ids.length} PETadex proteins.` }
    }
    case "aa":
      return { type: "sequence", sequence: det.sequence }
    default:
      return { type: "none", message: det.note || "Type an ID or accession." }
  }
}

/** The protein's path, one entry per rung, for the strip here and the marks on the ladder. */
export function pathOf(rec, domains) {
  if (!rec) return null
  const rows = rec.cluster_rows || {}
  const dom = domains.find(d => d.fold === rec.core?.cath_fold)
  return {
    protein: { id: rec.id, href: sequenceHref(rec.id), note: `${fmtInt(rec.length)} residues` },
    90: cell(90, rec.clusters?.c90, rows["90"], rec.id),
    60: cell(60, rec.clusters?.c60, rows["60"], rec.id),
    30: cell(30, rec.clusters?.c30, rows["30"], rec.id),
    domain: { id: dom?.name || rec.core?.cath_fold || "–", note: dom?.cath_code ? `CATH ${dom.cath_code}` : null },
  }
}

function cell(level, id, row, proteinId) {
  if (!id) return { id: "–" }
  const size = row?.member_count != null ? `${fmtInt(row.member_count)} protein${row.member_count === 1 ? "" : "s"}` : null
  return { id, href: clusterHref(level, id), note: [size, id === proteinId ? "this protein is the centroid" : null].filter(Boolean).join(" · ") }
}

function DetectLine({ det }) {
  if (det.kind === "empty") {
    return <p className="text-sm text-muted-foreground m-0">A PETadex ID (PL, NR or LG), a GenBank, RefSeq, UniProt or PDB accession, an SRA run or BioSample, or a pasted FASTA header.</p>
  }
  const src = det.id ? det.id.slice(0, 2) : null
  const rung = det.kind === "cluster" ? RUNGS.find(r => r.key === String(det.level)) : det.kind === "petadex" ? RUNGS[0] : null
  return (
    <p className="text-base m-0 flex flex-wrap items-center gap-x-2 gap-y-1" aria-live="polite">
      {rung && <Glyph rung={rung} size={24} />}
      <span className="font-semibold text-foreground">{det.label}</span>
      {det.id && <span className="text-secondary-foreground">{det.id}{src && det.kind === "petadex" ? ` · ${SOURCES[src].name}` : ""}</span>}
      {det.note && <span className="text-muted-foreground">· {det.note}</span>}
    </p>
  )
}

function PathStrip({ path, level }) {
  const steps = [RUNGS[0], RUNGS[1], RUNGS[2], RUNGS[3], RUNGS[4]]
  return (
    <ol className="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-5 gap-2">
      {steps.map((r, i) => {
        const c = path[r.key]
        const hit = level != null ? String(level) === r.key : r.key === "protein"
        return (
          <li key={r.key} className={`card p-3 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1 ${hit ? "ring-2 ring-info" : ""}`}>
            <span className="flex items-center gap-2">
              <Glyph rung={r} size={28} />
              <span className="text-sm text-muted-foreground">{r.name}{i < 4 && <span aria-hidden="true" className="hidden sm:inline"> →</span>}</span>
            </span>
            <span className="min-w-0">
              {c.href
                ? <Link to={c.href} className="block text-xl font-semibold text-info hover:underline truncate">{c.id}</Link>
                : <span className="block text-xl font-semibold text-foreground truncate" title={c.id}>{c.id}</span>}
              {c.note && <span className="block text-sm text-muted-foreground">{c.note}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Result({ res, domains }) {
  if (res.type === "none") return <p className="text-base text-secondary-foreground m-0">{res.message}</p>
  if (res.type === "sequence") {
    return (
      <p className="text-base text-secondary-foreground m-0">
        Proteins are found from a sequence by similarity, not by lookup.{" "}
        <Link to={`/search?seq=${encodeURIComponent(res.sequence)}`} className="text-info hover:underline">Search for similar sequences →</Link>
      </p>
    )
  }
  if (res.type === "choices") {
    return (
      <div>
        {res.note && <p className="text-base text-secondary-foreground mt-0 mb-2">{res.note} Pick one:</p>}
        <ul className="list-none m-0 p-0 flex flex-wrap gap-2">
          {res.items.map(it => (
            <li key={it.id}><button type="button" onClick={() => res.onPick(it.id)} className="rounded-md border border-border px-3 py-1.5 text-base text-info hover:bg-secondary">{it.label}</button></li>
          ))}
        </ul>
      </div>
    )
  }
  if (res.type === "sample") {
    const { out, accession, kind, contig } = res
    return (
      <div className="text-base">
        <p className="text-secondary-foreground mt-0 mb-2">
          {contig && <>Contig {contig.contig} of run {contig.run}. </>}
          <span className="font-semibold text-foreground">{fmtInt(out.n_lg)}</span> Logan protein{out.n_lg === 1 ? " was" : "s were"} assembled from{" "}
          {kind === "biosample"
            ? <Link to={`/biosample/${encodeURIComponent(accession)}`} className="text-info hover:underline">BioSample {accession}</Link>
            : <a href={ncbiSra(accession)} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">run {accession} ↗</a>}
          . The {Math.min(5, out.sequences.length)} with the highest k-mer abundance:
        </p>
        <ul className="list-none m-0 p-0 flex flex-wrap gap-2">
          {out.sequences.map(s => (
            <li key={s.id}><button type="button" onClick={() => res.onPick(s.id)} className="rounded-md border border-border px-3 py-1.5 text-base text-info hover:bg-secondary">{s.id}</button></li>
          ))}
        </ul>
      </div>
    )
  }
  // protein
  const { rec, level } = res
  const path = pathOf(rec, domains)
  const src = SOURCES[rec.src]
  return (
    <div>
      <p className="text-base text-secondary-foreground mt-0 mb-3">
        <span className="text-xl font-semibold text-foreground">{rec.id}</span>
        {" · "}{src?.name}{rec.organism?.name && <> · <i>{rec.organism.name}</i></>}
        {rec.accession && <> · {rec.accession}</>}
        {res.note && <span className="text-muted-foreground"> · {res.note}</span>}
        {" "}<Link to={sequenceHref(rec.id)} className="text-info hover:underline">Open protein page →</Link>
      </p>
      <PathStrip path={path} level={level} />
      {level != null && (
        <p className="text-sm text-muted-foreground mt-2 mb-0">
          {LEVEL_NAME[level]} cluster {rec.clusters[`c${level}`]} is named after its centroid protein, {rec.id}; the path shown is that protein's.
        </p>
      )}
    </div>
  )
}

export default function IdentifierLookup({ domains, onFound }) {
  const [q, setQ] = useState("")
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const det = useMemo(() => detectIdentifier(q), [q])

  const run = async text => {
    const d = detectIdentifier(text)
    if (d.kind === "empty") return
    setBusy(true)
    try {
      const out = d.kind === "prefix" || d.kind === "bioproject" ? { type: "none", message: d.note } : await resolve(d)
      setRes(out)
      onFound?.(out.type === "protein" ? out.rec : null)
      if (typeof window !== "undefined") {
        const u = new URL(window.location.href)
        u.searchParams.set("q", text.trim())
        window.history.replaceState(null, "", u)
      }
    } catch (e) {
      setRes({ type: "none", message: "Could not reach the server; try again." })
    } finally {
      setBusy(false)
    }
  }

  // Deep link: /explore/?q=PL1 runs the lookup on load.
  useEffect(() => {
    if (typeof window === "undefined") return
    const initial = new URLSearchParams(window.location.search).get("q")
    if (initial) { setQ(initial); run(initial) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = id => { setQ(id); run(id) }
  const shown = res && (res.type === "choices" || res.type === "sample") ? { ...res, onPick: pick } : res

  return (
    <div>
      <form
        role="search"
        onSubmit={e => { e.preventDefault(); run(q) }}
        className="flex flex-col sm:flex-row gap-2 max-w-3xl"
      >
        <label htmlFor="explore-lookup" className="sr-only">ID, accession or FASTA header</label>
        <textarea
          id="explore-lookup"
          rows={1}
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(q) } }}
          placeholder="e.g. PL1, WP_054022242.1, LG852233853"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 min-w-0 resize-y rounded-md border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-info"
        />
        <button type="submit" disabled={busy || det.kind === "empty"} className="rounded-md border border-border px-4 py-2 text-base text-info hover:bg-secondary disabled:opacity-50">
          {busy ? "Looking up…" : det.kind === "aa" ? "Search instead →" : "Look up"}
        </button>
      </form>
      <div className="mt-2 min-h-[1.75rem]"><DetectLine det={det} /></div>
      <p className="text-sm text-muted-foreground mt-1 mb-0 flex flex-wrap gap-x-3 gap-y-1">
        <span>Try:</span>
        {EXAMPLES.map(x => <button key={x} type="button" onClick={() => pick(x)} className="text-info hover:underline">{x}</button>)}
      </p>
      {shown && <div className="mt-5">{busy ? <p className="text-base text-muted-foreground m-0">Looking up…</p> : <Result res={shown} domains={domains} />}</div>}
    </div>
  )
}
