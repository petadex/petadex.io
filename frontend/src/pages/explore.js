// src/pages/explore.js
//
// /explore: ways into PETadex v260701 without a query.
//   1. The clustering hierarchy (figure 2c as a ladder): hover a level to see where it comes from by source.
//   2. Browse by fold -> superfamilies (filters and sorts the viewer picks) -> cluster pages -> sequence pages.
//   3. Start from a known enzyme: the Plasticome entries and where each sits in the clustering.
//   4. Other ways in: environments, the superfamily map, and random picks.
// Presents data only: no ranking, no featured enzymes. Data: GET /api/explore/* (static summaries + RDS).
import React, { useEffect, useRef, useState } from "react"
import { Link, navigate } from "gatsby"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"
import { fmtInt } from "../components/v260701/common"
import HierarchyLadder from "../components/explore/HierarchyLadder"
import FoldBrowser from "../components/explore/FoldBrowser"
import PlasticomeBrowser from "../components/explore/PlasticomeBrowser"

function useJson(url) {
  const [s, setS] = useState({ status: "loading", data: null, error: null })
  useEffect(() => {
    let off = false
    fetch(url)
      .then(async r => {
        const b = await r.json().catch(() => ({}))
        if (!off) setS(r.ok ? { status: "ready", data: b, error: null } : { status: "error", data: null, error: b.error || `Request failed (${r.status})` })
      })
      .catch(() => !off && setS({ status: "error", data: null, error: "Could not reach the server." }))
    return () => { off = true }
  }, [url])
  return s
}

const RANDOM = [
  ["protein", "Protein"],
  ["90", "Enzyme (90 %)"],
  ["60", "Family (60 %)"],
  ["30", "Superfamily (30 %)"],
]

function RandomPicks() {
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  const go = kind => {
    setBusy(kind); setErr(null)
    fetch(`${config.apiUrl}/explore/random?kind=${kind}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => navigate(d.path))
      .catch(() => { setErr("Could not pick one; try again."); setBusy(null) })
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {RANDOM.map(([k, label]) => (
          <button key={k} type="button" disabled={!!busy} onClick={() => go(k)}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50">
            {busy === k ? "Picking…" : `Random ${label.toLowerCase()}`}
          </button>
        ))}
      </div>
      {err && <p className="text-xs text-destructive mt-2 mb-0">{err}</p>}
      <p className="text-xs text-muted-foreground mt-2 mb-0">Each pick is uniform over its level: every protein, or every cluster, is equally likely.</p>
    </div>
  )
}

function Section({ id, title, note, children, innerRef }) {
  return (
    <section id={id} ref={innerRef} className="scroll-mt-24 mt-14">
      <h2 className="text-2xl font-semibold text-foreground m-0">{title}</h2>
      {note && <p className="text-sm text-secondary-foreground mt-1 mb-5 max-w-3xl">{note}</p>}
      {children}
    </section>
  )
}

export default function ExplorePage() {
  const summary = useJson(`${config.apiUrl}/explore/summary`)
  const plasticome = useJson(`${config.apiUrl}/explore/plasticome`)
  const [fold, setFold] = useState(null)
  const foldsRef = useRef(null)

  const onAction = (kind, what) => {
    if (kind === "random") {
      fetch(`${config.apiUrl}/explore/random?kind=${what}`, { cache: "no-store" })
        .then(r => r.json()).then(d => d.path && navigate(d.path)).catch(() => {})
    } else if (kind === "browse") {
      if (what === "superfamilies") setFold(null)
      foldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const s = summary.data
  const lv = k => s?.levels.find(l => String(l.level) === k)

  return (
    <Container size="wide" className="py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-muted-foreground m-0">PETadex {s?.release || "v260701"}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-1 mb-3">Explore the dataset</h1>
        <p className="text-secondary-foreground m-0">
          {s ? (
            <>
              {fmtInt(lv("protein").n)} proteins with a complete catalytic domain, grouped into {fmtInt(lv("90").n)} enzymes,{" "}
              {fmtInt(lv("60").n)} families and {fmtInt(lv("30").n)} superfamilies across {s.domains.length} folds.
            </>
          ) : "Proteins with a complete catalytic domain, grouped by sequence identity."}{" "}
          Walk the hierarchy, start from a characterized enzyme, or jump in anywhere. To look up a specific
          sequence, use <Link to="/search" className="text-info hover:underline">Search</Link>.
        </p>
        <nav className="flex flex-wrap gap-2 mt-4 text-sm" aria-label="On this page">
          {[["#hierarchy", "The hierarchy"], ["#folds", "Browse by fold"], ["#plasticome", "Start from a known enzyme"], ["#other", "Other ways in"]].map(([h, l]) => (
            <a key={h} href={h} className="rounded-full border border-border px-3 py-1 text-secondary-foreground hover:bg-secondary">{l}</a>
          ))}
        </nav>
      </header>

      {summary.status === "error" && <p className="text-sm text-destructive mt-8">{summary.error}</p>}
      {summary.status === "loading" && <p className="text-sm text-muted-foreground mt-8">Loading…</p>}

      {s && (
        <>
          <Section id="hierarchy" title="The hierarchy"
            note="Every protein belongs to exactly one enzyme, family and superfamily, each a cluster at a lower sequence identity, and every superfamily to one fold. Hover or tab through a level to see where it comes from.">
            <HierarchyLadder summary={s} onAction={onAction} />
          </Section>

          <Section id="folds" innerRef={foldsRef} title="Browse by fold"
            note="Pick a fold to list its superfamilies, or list them all. Hover a source bar for its counts.">
            <FoldBrowser summary={s} fold={fold} onFold={setFold} />
          </Section>

          <Section id="plasticome" title="Start from a known enzyme"
            note={`The ${fmtInt(lv("protein").members.PL)} characterized Plasticome entries in the clustering. Open “where it sits” to see the enzyme, family and superfamily each belongs to, and what they contain.`}>
            {plasticome.status === "ready"
              ? <PlasticomeBrowser entries={plasticome.data.entries} folds={[...s.domains].sort((a, b) => (a.name || a.fold).localeCompare(b.name || b.fold))} />
              : <p className="text-sm text-muted-foreground">{plasticome.error || "Loading…"}</p>}
          </Section>

          <Section id="other" title="Other ways in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <h3 className="m-0 text-base font-semibold text-foreground">By environment</h3>
                <p className="text-sm text-secondary-foreground mt-1">Sequencing samples grouped by where they were collected; each BioSample page lists the proteins found in it.</p>
                <Link to="/profiles" className="text-sm text-info hover:underline">Environment profiles →</Link>
              </div>
              <div className="card p-5">
                <h3 className="m-0 text-base font-semibold text-foreground">On the map</h3>
                <p className="text-sm text-secondary-foreground mt-1">Superfamilies laid out by sequence similarity.</p>
                <Link to="/atlas" className="text-sm text-info hover:underline">Superfamily atlas →</Link>
              </div>
              <div className="card p-5">
                <h3 className="m-0 text-base font-semibold text-foreground">At random</h3>
                <div className="mt-2"><RandomPicks /></div>
              </div>
            </div>
          </Section>
        </>
      )}
    </Container>
  )
}

export const Head = () => (
  <Seo
    title="Explore the dataset"
    description="Browse PETadex without a query: the clustering hierarchy by source, folds and superfamilies, the characterized Plasticome enzymes, environments and random picks."
  />
)
