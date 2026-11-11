// frontend/src/components/explore/AccessionAnatomy.jsx
//
// "Reading an accession" on /explore: a PETadex catalytic-core ID taken apart, one numbered part at a time, for the
// protein the visitor looked up (or PL1 as the example). The core ID is the first token of every PETadex FASTA
// header: {petadex_id}|{hmm}|{hmm_evalue}|{hmm_start}|{hmm_end}|{component}. Below it: how clusters are named, and
// the protein's other names (external accessions for PL/NR, the source contig for LG).
// Sources: wiki Clustering, Clustering-Protein, Clustering-Domain; vault "Sequence Release v260701 / 01 Header Schema".
import React, { useState } from "react"
import { SOURCES } from "../../utils/identifierDetect"
import { SOURCE_COLORS } from "../v260701/SourceSplit"
import { fmtInt, ncbiProtein, ncbiSra, clusterHref } from "../v260701/common"
import { Link } from "gatsby"

/** 3.4e-6 -> "3.4e-06": scientific notation with a two-digit exponent, as HMMER and the PETadex files write it. */
function evText(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0 || (n >= 1e-3 && n < 1e4)) return String(v)
  const [m, e] = n.toExponential().split("e")
  const x = Math.abs(Number(e))
  return `${m}e${Number(e) < 0 ? "-" : "+"}${String(x).padStart(2, "0")}`
}

/** 9.3e-40 -> "9.3 × 10⁻⁴⁰" */
function sci(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0) return String(v)
  const [m, e] = n.toExponential(1).split("e")
  const sup = String(Number(e)).replace(/[-0-9]/g, c => "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(c)])
  return `${m} × 10${sup}`
}

function parts(rec) {
  const src = rec.src
  const num = rec.id.slice(2)
  const c = rec.core || {}
  const s = SOURCES[src]
  return [
    {
      key: "src", text: src, name: "Source",
      body: <>
        Where the protein comes from: <b>PL</b> {SOURCES.PL.name} ({SOURCES.PL.long}), <b>NR</b> {SOURCES.NR.name} ({SOURCES.NR.long})
        or <b>LG</b> {SOURCES.LG.name} ({SOURCES.LG.long}). This one is from {s.name}.
      </>,
    },
    {
      key: "num", text: num, name: "Protein number",
      body: <>
        Each source numbers its proteins from 1, so the same number can turn up in more than one source: PL223 and
        NR223 are different proteins. The number is never used without its prefix; together they make the PETadex ID,
        {" "}<b>{rec.id}</b>, used everywhere on the site.
      </>,
    },
    {
      key: "hmm", text: c.hmm, name: "Core model",
      body: <>
        The PETadex hidden Markov model (HMM) that found this protein's catalytic core. Each model is built from one
        component of known enzymes; a sub-model can be the best match, written with a suffix (like C001-3).
      </>,
    },
    {
      key: "ev", text: evText(c.evalue), name: "Match e-value",
      body: <>
        How many matches this good the model would find by chance: {sci(c.evalue)}. Smaller is stronger. Only proteins
        whose best match is a complete core, with every catalytic residue, are in PETadex.
      </>,
    },
    {
      key: "pos", text: [String(c.start), String(c.end)], name: "Core position",
      body: <>
        The core runs from residue {fmtInt(c.start)} to {fmtInt(c.end)} of this {fmtInt(rec.length)}-residue protein.
        Identity at every cluster level is measured over the core only, not the full sequence.
      </>,
    },
    {
      key: "comp", text: c.component, name: "Component",
      body: <>
        The group of known enzymes (C001–C046) the core belongs to; each component sits in one of the 15 domains, so it
        fixes the protein's fold. A protein with cores in two components has an ID for each, so the PETadex ID plus the
        component is the unique key.
      </>,
    },
  ]
}

function Marker({ n, on }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold shrink-0 ${on ? "bg-info text-background" : "bg-secondary text-secondary-foreground"}`}>
      {n}
    </span>
  )
}

export default function AccessionAnatomy({ rec, isExample }) {
  const [hot, setHot] = useState(null)
  if (!rec?.core) return <p className="text-base text-muted-foreground m-0">Loading…</p>
  const ps = parts(rec)
  const hover = key => ({ onMouseEnter: () => setHot(key), onMouseLeave: () => setHot(null), onFocus: () => setHot(key), onBlur: () => setHot(null) })

  // The ID as written: PL 1 | C001 | 9.3e-40 | 48 | 261 | C001 (no "|" between prefix and number).
  const segs = []
  ps.forEach((p, i) => {
    const texts = Array.isArray(p.text) ? p.text : [p.text]
    texts.forEach((t, j) => {
      if (i > 1 || j > 0) segs.push({ sep: true, key: `sep-${i}-${j}` })
      segs.push({ part: p, n: i + 1, t, key: `${p.key}-${j}` })
    })
  })

  const coreId = `${rec.id}|${rec.core.hmm}|${evText(rec.core.evalue)}|${rec.core.start}|${rec.core.end}|${rec.core.component}`
  const levels = [[90, "enzyme"], [60, "family"], [30, "superfamily"]]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px] gap-6 items-start">
      <div>
        <p className="text-sm text-muted-foreground mt-0 mb-2">
          {isExample ? "Example: " : ""}{rec.id}'s catalytic-core ID, the sequence ID the PETadex clustering files use for it
        </p>
        <p className="m-0 text-2xl sm:text-3xl font-semibold text-foreground break-all leading-relaxed" aria-label={coreId}>
          {segs.map(s => s.sep
            ? <span key={s.key} aria-hidden="true" className="text-muted-foreground font-normal px-0.5">|</span>
            : (
              <span key={s.key} aria-hidden="true" {...hover(s.part.key)}
                className={`relative inline-block rounded px-0.5 cursor-default transition-colors ${hot === s.part.key ? "bg-info/20" : ""}`}
                style={s.part.key === "src" ? { color: SOURCE_COLORS[rec.src] } : undefined}>
                <sup className="text-sm font-normal text-muted-foreground mr-0.5">{s.n}</sup>{s.t}
              </span>
            ))}
        </p>

        <ol className="list-none m-0 mt-5 p-0 space-y-3">
          {ps.map((p, i) => (
            <li key={p.key} tabIndex={0} {...hover(p.key)}
              className={`flex gap-3 rounded-lg p-2 -mx-2 outline-none focus-visible:ring-2 focus-visible:ring-info transition-colors ${hot === p.key ? "bg-secondary/60" : ""}`}>
              <Marker n={i + 1} on={hot === p.key} />
              <div>
                <h3 className="m-0 text-xl font-semibold text-foreground">
                  {p.name} <span className="font-normal text-muted-foreground">{Array.isArray(p.text) ? p.text.join(" – ") : p.text}</span>
                </h3>
                <p className="text-base text-secondary-foreground mt-1 mb-0">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-4 w-full max-w-[480px] mx-auto lg:max-w-none">
        <div className="card p-7">
          <h3 className="m-0 text-2xl font-semibold text-foreground">Cluster names</h3>
          <p className="text-base text-secondary-foreground mt-2 mb-3">
            A cluster has no ID of its own: it takes the PETadex ID of its centroid protein, and the level is written
            with it. {rec.id}'s clusters:
          </p>
          <ul className="list-none m-0 p-0 space-y-1.5 text-base">
            {levels.map(([l, word]) => {
              const id = rec.clusters?.[`c${l}`]
              return id ? (
                <li key={l} className="flex flex-wrap gap-x-2">
                  <span className="w-40 text-muted-foreground">{l} % {word}</span>
                  <Link to={clusterHref(l, id)} className="text-info hover:underline">/cluster/{l}/{id}</Link>
                  {id === rec.id && <span className="text-muted-foreground">(it is the centroid)</span>}
                </li>
              ) : null
            })}
          </ul>
          <p className="text-sm text-muted-foreground mt-3 mb-0">The same centroid can lead a cluster at several levels, so the level is always part of the name.</p>
        </div>

        <div className="card p-7">
          <h3 className="m-0 text-2xl font-semibold text-foreground">Other names for {rec.id}</h3>
          {rec.src === "LG" ? (
            rec.logan ? (
              <>
                <p className="text-base text-secondary-foreground mt-2 mb-3">
                  Logan proteins have no accession in other databases. They are traced to the contig they were assembled from:
                </p>
                <p className="text-xl font-semibold text-foreground m-0 break-all">{rec.logan.run}_{rec.logan.contig}</p>
                <ul className="list-none m-0 mt-2 p-0 space-y-1 text-base text-secondary-foreground">
                  <li><b className="text-foreground">{rec.logan.run}</b>: the SRA sequencing run (<a href={ncbiSra(rec.logan.run)} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">NCBI ↗</a>)</li>
                  <li><b className="text-foreground">{rec.logan.contig}</b>: the contig number within Logan's assembly of that run</li>
                  {rec.logan.ka != null && <li>k-mer abundance <b className="text-foreground">{rec.logan.ka}</b>: how deeply the contig was covered by reads</li>}
                </ul>
              </>
            ) : <p className="text-base text-secondary-foreground mt-2 mb-0">Logan proteins have no accession in other databases.</p>
          ) : (
            <>
              <p className="text-base text-secondary-foreground mt-2 mb-3">
                {SOURCES[rec.src].name} proteins keep their accessions in other databases (GenBank, RefSeq, UniProt or PDB chains).
                {rec.n_accessions > 1 ? ` ${rec.id} has ${fmtInt(rec.n_accessions)}; all of them find it in the lookup above.` : " The lookup above finds a protein by any of them."}
              </p>
              <ul className="list-none m-0 p-0 flex flex-wrap gap-x-3 gap-y-1 text-base">
                {(rec.accessions || (rec.accession ? [rec.accession] : [])).slice(0, 12).map(a => (
                  <li key={a}><a href={ncbiProtein(a)} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">{a} ↗</a></li>
                ))}
                {(rec.accessions?.length || 0) > 12 && <li className="text-muted-foreground">+{fmtInt(rec.accessions.length - 12)} more</li>}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
