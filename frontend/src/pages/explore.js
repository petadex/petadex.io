// src/pages/explore.js
//
// /explore: ways into PETadex v260701 without a query.
//   1. Find a protein: type or paste any identifier; its kind is detected as you type, and a protein's path through
//      the hierarchy is shown (and marked on the ladder).
//   2. The clustering hierarchy (figure 2c as a ladder): hover a level to see where it comes from by source; each
//      level links to its page on the wiki (Clustering-<Level>).
//   3. Reading an accession: the parts of a PETadex ID, for the protein found in 1 (PL1 until then).
// Presents data only: no ranking, no featured enzymes. Data: GET /api/explore/* (static summaries + RDS).
import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import config from "../config"
import { fmtInt } from "../components/v260701/common"
import HierarchyLadder, { CLUSTERING_WIKI } from "../components/explore/HierarchyLadder"
import IdentifierLookup, { pathOf } from "../components/explore/IdentifierLookup"
import AccessionAnatomy from "../components/explore/AccessionAnatomy"

// Shown in "Reading an accession" until the visitor looks something up.
const EXAMPLE_ID = "PL1"

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

function Section({ id, title, note, children }) {
  // `note` may be a string or JSX.
  return (
    <section id={id} className="scroll-mt-24 mt-14">
      <h2 className="text-2xl font-semibold text-foreground m-0">{title}</h2>
      {note && <p className="text-base text-secondary-foreground mt-1 mb-5 max-w-3xl">{note}</p>}
      {children}
    </section>
  )
}

export default function ExplorePage() {
  const summary = useJson(`${config.apiUrl}/explore/summary`)
  const example = useJson(`${config.apiUrl}/sequence/${EXAMPLE_ID}`)
  const [found, setFound] = useState(null)

  const s = summary.data
  const lv = k => s?.levels.find(l => String(l.level) === k)

  return (
    // One sans font for the whole page (shared links and tables default to mono); tabular figures keep numbers aligned.
    <Container size="wide" className="py-10 tabular-nums [&_*]:font-sans!">
      <header className="max-w-3xl">
        <p className="text-sm uppercase tracking-wider text-muted-foreground m-0">PETadex {s?.release || "v260701"}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-1 mb-3">Explore the dataset</h1>
        <p className="text-base text-secondary-foreground m-0">
          {s ? (
            <>
              {fmtInt(lv("protein").n)} proteins with a complete catalytic domain, grouped into {fmtInt(lv("90").n)} enzymes,{" "}
              {fmtInt(lv("60").n)} families and {fmtInt(lv("30").n)} superfamilies across {s.domains.length} folds.
            </>
          ) : "Proteins with a complete catalytic domain, grouped by sequence identity."}{" "}
          To look up a specific sequence, use <Link to="/search" className="text-info hover:underline">Search</Link>.
        </p>
      </header>

      {summary.status === "error" && <p className="text-base text-destructive mt-8">{summary.error}</p>}
      {summary.status === "loading" && <p className="text-base text-muted-foreground mt-8">Loading…</p>}

      {s && (
        <Section id="lookup" title="Find a protein"
          note="Type or paste any identifier. What it is gets worked out as you type; a protein's place in the hierarchy is then shown here and on the ladder below.">
          <IdentifierLookup domains={s.domains} onFound={setFound} />
        </Section>
      )}

      {s && (
        <Section id="hierarchy" title="The Hierarchy"
          note={<>
            Each protein is clustered into exactly one enzyme (90% pid cluster), family (60%), Superfamily (30% pid) and
            fold. Hover over a level to read more about each level.{" "}
            <a href={CLUSTERING_WIKI} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">
              How the clustering works ↗<span className="sr-only"> (opens the PETadex wiki in a new tab)</span>
            </a>
          </>}>
          <HierarchyLadder summary={s} path={found ? pathOf(found, s.domains) : null} />
        </Section>
      )}

      {s && (
        <Section id="accession" title="Reading an accession"
          note="A PETadex ID tells you where a protein comes from, and the full catalytic-core ID says which part of it was clustered. Hover or tab through a part to see what it means.">
          <AccessionAnatomy rec={found || example.data} isExample={!found} />
        </Section>
      )}
    </Container>
  )
}

export const Head = () => (
  <Seo
    title="Explore the dataset"
    description="Browse PETadex without a query: the clustering hierarchy, protein to enzyme to family to superfamily to fold, and where each level comes from by source."
  />
)
