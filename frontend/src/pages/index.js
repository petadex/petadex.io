import React, { useState, useEffect, useRef, useMemo } from "react"
import config from "../config"
import AtlasMap from "../components/AtlasMap"
import Container from "../components/common/Container"

/* ── Legend chip ─────────────────────────────────────────────── */
const LegendChip = ({ color, children, className = "" }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 border border-border text-2xs text-muted-foreground font-mono ${className}`}>
    {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
    {children}
  </span>
)

/* ── Hero ────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative bg-[#0e0e0e]">

      {/* ── Title block ──────────────────────────────────────────
           Mobile  : normal-flow block sitting above the atlas
           Desktop : absolute overlay centered over the atlas   */}
      <div className="
        relative z-10 py-10 bg-background border-b border-border
        md:absolute md:inset-0 md:flex md:items-center md:pointer-events-none
        md:py-0 md:bg-transparent md:border-0
      ">
        <Container size="wide">
          <div className="max-w-140 md:pointer-events-auto">
            <p className="label mb-4">Open · Free · Community-driven</p>
            <h1
              className="text-foreground font-semibold tracking-tight leading-[1.05]"
              style={{ fontSize: "clamp(2rem, 4.4vw, 3.6rem)" }}
            >
              Every plastic-degrading enzyme,
              <br />
              <span className="text-accent">in one atlas.</span>
            </h1>
            <p className="mt-5 text-base text-muted-foreground max-w-120 leading-relaxed">
              1.3 billion unique sequences. 64,730 enzyme families. 350+ characterized PETases. One interface to
              <span className="text-foreground"> search</span>,{" "}
              <span className="text-foreground">align</span>,{" "}
              <span className="text-foreground">compare substrates</span>, and{" "}
              <span className="text-foreground">trace evolution</span>.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="/atlas" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Start exploring
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h10.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#cite" className="btn btn-ghost font-mono text-xs border border-border-strong">
                How to cite
              </a>
              <span className="text-2xs font-mono text-muted-foreground hidden sm:inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                v0.4 · April 2026
              </span>
            </div>
          </div>
        </Container>
      </div>

      {/* ── Atlas canvas ─────────────────────────────────────────
           Mobile  : 340px standalone block below the title
           Desktop : 640px — title floats absolutely above this */}
      <div className="relative h-85 md:h-160 w-full overflow-hidden border-b border-border">
        <AtlasMap interactive />

        {/* Vignette — only needed on desktop where title overlaps */}
        <div
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 50%, oklch(0 0 0 / 0.55) 0%, transparent 70%), linear-gradient(to right, oklch(0 0 0 / 0.65) 0%, transparent 50%)",
          }}
        />

        {/* Top-right chips */}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-1.5 md:gap-2 pointer-events-none">
          <LegendChip color="#4F8FE8">
            Family Atlas <span className="text-foreground ml-1">live</span>
          </LegendChip>
          <LegendChip className="hidden sm:inline-flex">scroll · drag · click</LegendChip>
          <LegendChip className="sm:hidden">pinch · drag · tap</LegendChip>
        </div>

        {/* Bottom legend strip — desktop only */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 hidden md:flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 rounded-lg bg-black/55 border border-border backdrop-blur-md pointer-events-auto">
          {[
            { c: "#4F8FE8", l: "α/β hydrolase" },
            { c: "#2ECC71", l: "DD-peptidase" },
            { c: "#E74C4C", l: "Amidase" },
            { c: "#9B5BE0", l: "Trypsin-like" },
            { c: "#F2C94C", l: "Arylesterase" },
            { c: "#F2994A", l: "Cupredoxin" },
            { c: "#6FB7E8", l: "L-aa peptidase" },
          ].map(x => (
            <LegendChip key={x.l} color={x.c}>{x.l}</LegendChip>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Mini thumbnails for tool cards ──────────────────────────── */
function AtlasThumb() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth, h = canvas.clientHeight
    canvas.width = w * dpr; canvas.height = h * dpr
    const ctx = canvas.getContext("2d")
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = "#0e0e0e"; ctx.fillRect(0, 0, w, h)
    let s = 7
    const rnd = () => { s = (s * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296 }
    const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
    ctx.globalCompositeOperation = "lighter"
    for (const c of [
      { cx: 0.30, cy: 0.05, sx: 0.18, sy: 0.16, n: 130, color: "#4F8FE8" },
      { cx: -0.30, cy: 0.50, sx: 0.08, sy: 0.07, n: 44, color: "#2ECC71" },
      { cx: 0.34, cy: 0.55, sx: 0.07, sy: 0.07, n: 40, color: "#E74C4C" },
      { cx: -0.42, cy: -0.05, sx: 0.05, sy: 0.06, n: 17, color: "#9B5BE0" },
      { cx: 0.04, cy: 0.42, sx: 0.05, sy: 0.04, n: 13, color: "#F2C94C" },
    ]) {
      for (let i = 0; i < c.n; i++) {
        const x = c.cx + gauss() * c.sx, y = c.cy + gauss() * c.sy
        const px = w / 2 + x * Math.min(w, h), py = h / 2 + (y - 0.18) * Math.min(w, h)
        ctx.fillStyle = c.color; ctx.globalAlpha = 0.55
        ctx.beginPath(); ctx.arc(px, py, 1.4, 0, Math.PI * 2); ctx.fill()
      }
    }
  }, [])
  return <canvas ref={ref} className="block w-full h-full" />
}

function SequenceThumb() {
  const seq = "MNFPRASRLMQAAVLGGLMAVSAAATAQTNPYARGPNPTAASLEASAGPFTVRSFTVSRPSGYGAGTVYYPTNAGGTVGAIAIVPGYTARQSSIKWWGPRLASHGFVVITIDTNS"
  const [typed, setTyped] = useState("")
  useEffect(() => {
    let i = 0
    const id = setInterval(() => { i = (i + 1) % (seq.length + 8); setTyped(seq.slice(0, i)) }, 40)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="absolute inset-0 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-2xs font-mono text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-accent" /> FASTA · Protein
      </div>
      <div className="flex-1 rounded-md border border-border bg-surface-sunken p-2 font-mono text-2xs leading-relaxed text-foreground overflow-hidden">
        <div className="text-muted-foreground">&gt;query|IsPETase</div>
        <div className="break-all">
          {typed}
          <span className="inline-block w-1.5 h-2.5 -mb-px ml-px bg-accent animate-pulse" />
        </div>
      </div>
      <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground">
        <span>{typed.length} / 10,000 aa</span>
        <span className="px-1.5 py-0.5 rounded bg-accent-subtle text-accent border border-accent/30">DIAMOND</span>
      </div>
    </div>
  )
}

function SubstrateThumb() {
  const dots = useMemo(() => {
    const arr = []; let s = 1234
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
    for (let i = 0; i < 70; i++) {
      const x = rnd(), y = Math.max(0, Math.min(1, x + (rnd() - 0.5) * 0.5))
      arr.push({ x, y, r: 1.5 + rnd() * 2.5 })
    }
    return arr
  }, [])
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <rect width="160" height="100" fill="#0e0e0e" />
      <line x1="14" y1="86" x2="150" y2="86" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="14" y1="86" x2="14" y2="10" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="14" y1="86" x2="150" y2="10" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" strokeDasharray="2 2" />
      {dots.map((d, i) => (
        <circle key={i} cx={14 + d.x * 136} cy={86 - d.y * 76} r={d.r}
          fill={d.y > d.x ? "#A23B72" : "#2E86AB"} fillOpacity="0.75" />
      ))}
      <text x="78" y="97" fill="rgba(255,255,255,0.5)" fontSize="6" fontFamily="ui-monospace, monospace" textAnchor="middle">BHET25 →</text>
    </svg>
  )
}

function FamilyThumb() {
  const lines = useMemo(() => {
    const out = [], cx = 80, cy = 50, n = 14
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      const r1 = 14 + (i % 3) * 4, r2 = 38 + (i % 4) * 3
      out.push({ x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1, x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2 })
      for (let j = -1; j <= 1; j += 2) {
        const a2 = a + j * 0.10, r3 = r2 + 6 + (i % 3) * 2
        out.push({ x1: cx + Math.cos(a) * r2, y1: cy + Math.sin(a) * r2, x2: cx + Math.cos(a2) * r3, y2: cy + Math.sin(a2) * r3, tip: true })
      }
    }
    return out
  }, [])
  return (
    <svg viewBox="0 0 160 100" className="absolute inset-0 w-full h-full">
      <rect width="160" height="100" fill="#0e0e0e" />
      <circle cx="80" cy="50" r="3" fill="var(--accent)" />
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={l.tip ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.30)"} strokeWidth={l.tip ? 0.6 : 0.8} />
      ))}
      {lines.filter(l => l.tip).map((l, i) => (
        <circle key={i} cx={l.x2} cy={l.y2} r="1.2" fill={i % 4 === 0 ? "var(--accent)" : "#4F8FE8"} fillOpacity="0.9" />
      ))}
    </svg>
  )
}

const TOOL_CARDS = [
  { id: "atlas", eyebrow: "01 · Atlas", title: "Browse the family atlas", sub: "Explore 64,730 families in 2D UMAP space. Color by domain, phylum, or CATH component.", kbd: "A", cta: "Open Atlas →", href: "/atlas", Thumb: AtlasThumb },
  { id: "search", eyebrow: "02 · Search", title: "Find homologs by sequence", sub: "Paste a FASTA sequence; DIAMOND scans ~307M sequences in the Logan corpus and returns nearest neighbors with alignments and activity context.", kbd: "S", cta: "Run a search →", href: "/search", Thumb: SequenceThumb },
  { id: "substrate", eyebrow: "03 · Substrate", title: "Compare BHET activity", sub: "Side-by-side scatter of measured activity at 12.5 / 25 / 50 mM BHET. Click any gene to drill in.", kbd: "B", cta: "Compare substrates →", href: "/substrate", Thumb: SubstrateThumb },
  { id: "family", eyebrow: "04 · Family", title: "Trace a family tree", sub: "Newick-rendered phylogenies for every family, with member tables and centroid sequences.", kbd: "F", cta: "Open a family →", href: "/enzymes", Thumb: FamilyThumb },
  { id: "biosamples", eyebrow: "05 · Biosamples", title: "Explore SRA & BioSamples", sub: "Run, BioSample, and organism hubs from Denis metadata — linked from ORF provenance and the sample map.", kbd: "P", cta: "Open biosamples →", href: "/biosamples", Thumb: SequenceThumb },
  { id: "cath", eyebrow: "06 · CATH", title: "Explore CATH domains", sub: "Literature-backed Pfam / CATH domain profiles with structures, references, and downloadable profile HMMs — linked to the family atlas.", kbd: "C", cta: "Open CATH domains →", href: "/cath-domains", Thumb: AtlasThumb },
]

function ToolCards() {
  return (
    <section id="start" className="py-20 border-b border-border">
      <Container size="wide">
        <div className="flex items-end justify-between flex-wrap gap-y-4 mb-10">
          <div>
            <p className="label mb-2">Start here</p>
            <h2 className="text-3xl font-semibold tracking-tight">Five ways into the data</h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-md">
            PETadex is a launchpad, not a paper. Pick the tool that matches your question.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOL_CARDS.map(({ id, eyebrow, title, sub, kbd, cta, href, Thumb }) => (
            <a key={id} href={href} target="_blank" rel="noopener noreferrer" className="card flex flex-col group no-underline">
              <div className="relative h-40 bg-surface-sunken rounded-t-xl border-b border-border overflow-hidden">
                <Thumb />
                <div className="absolute top-2 left-2">
                  <LegendChip>{eyebrow}</LegendChip>
                </div>
                <div className="hidden sm:block absolute top-2 right-2 px-1.5 py-0.5 rounded text-2xs font-mono text-muted-foreground border border-border bg-black/50">
                  ⌘ {kbd}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-foreground text-base font-semibold leading-snug">{title}</h3>
                <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed flex-1">{sub}</p>
                <div className="mt-3 text-xs font-medium text-accent group-hover:translate-x-0.5 transition-transform">
                  {cta}
                </div>
              </div>
            </a>
          ))}
        </div>
      </Container>
    </section>
  )
}

/* ── Stats strip ─────────────────────────────────────────────── */
const STATS = [
  { v: "1.3B", k: "Unique sequences", sub: "across all enzyme families" },
  { v: "64,730", k: "Enzyme families", sub: "UMAP-embedded centroids" },
  { v: "350+", k: "Characterized PETases", sub: "with experimental activity" },
  { v: "12,884", k: "Sequences in fastaa", sub: "amino-acid + provenance" },
  { v: "189", k: "Sample countries", sub: "geo metadata + dates" },
]

function StatsStrip() {
  return (
    <section className="bg-surface-raised border-b border-border">
      <Container size="wide" className="py-10 grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-4 md:gap-y-0 md:gap-x-0 md:divide-x md:divide-border">
        {STATS.map((s, i) => (
          <div key={i} className={`md:px-5 ${i === 0 ? "md:pl-0" : ""} ${i === STATS.length - 1 ? "md:pr-0" : ""}`}>
            <div className="text-foreground text-[28px] font-semibold tracking-tight tabular-nums">{s.v}</div>
            <div className="text-foreground text-xs mt-1">{s.k}</div>
            <div className="text-muted-foreground text-2xs font-mono mt-0.5">{s.sub}</div>
          </div>
        ))}
      </Container>
    </section>
  )
}

/* ── What's in PETadex ───────────────────────────────────────── */
const DATA_ROWS = [
  { t: "Sequences", d: "Curated amino-acid sequences from NCBI BLAST-NR + literature", k: "fastaa · enzyme_fastaa · enzyme_taxonomy" },
  { t: "Structures", d: "Predicted & experimental structures via Molstar + 3DMol viewers", k: "PDB · Molstar · 3DMol.js" },
  { t: "Activity", d: "Plate-reader BHET hydrolysis at three substrate concentrations", k: "plate_data · plate_metadata · plate_activity_view" },
  { t: "Provenance", d: "Geographic origin, BioSample / SRA links, sampling dates — browse the biosample hub", k: "with_sra_and_biosample_loc_metadata", href: "/biosamples" },
  { t: "Embeddings", d: "UMAP coordinates + CATH-domain colorings for every family", k: "family_atlas (materialized view)" },
  { t: "Phylogenies", d: "Pre-computed Newick trees per family from S3-backed alignments", k: "family/:id/tree" },
]

function WhatsInside() {
  return (
    <section className="py-20 border-b border-border">
      <Container size="wide">
        <div className="flex items-end justify-between flex-wrap gap-y-4 mb-10">
          <div>
            <p className="label mb-2">What's in PETadex</p>
            <h2 className="text-3xl font-semibold tracking-tight">Six layers of data, one schema</h2>
          </div>
          <a href="/fastaa" target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:opacity-80 font-mono">
            View the full schema →
          </a>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground text-2xs uppercase tracking-widest font-semibold">
                <th className="px-4 py-3 sm:px-5 w-1/3 sm:w-[15%]">Layer</th>
                <th className="px-4 py-3 sm:px-5 sm:w-[55%]">What's there</th>
                <th className="hidden sm:table-cell px-5 py-3 w-[30%]">Tables / endpoints</th>
              </tr>
            </thead>
            <tbody>
              {DATA_ROWS.map((r, i) => (
                <tr key={i} className="hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3 sm:px-5 sm:py-4 text-foreground font-medium">
                    {r.href ? (
                      <a href={r.href} className="text-accent hover:underline">
                        {r.t}
                      </a>
                    ) : (
                      r.t
                    )}
                  </td>
                  <td className="px-4 py-3 sm:px-5 sm:py-4 text-muted-foreground">{r.d}</td>
                  <td className="hidden sm:table-cell px-5 py-4 text-xs font-mono text-accent/85">{r.k}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  )
}

/* ── Citation block ───────────────────────────────────────────── */
const BIBTEX = `@misc{petadex2026,
  title  = {PETadex: an open atlas of plastic-degrading enzymes},
  author = {The PETadex contributors},
  year   = {2026},
  url    = {https://petadex.net},
  note   = {v0.4 (Apr 2026)}
}`

function Citation() {
  const [copied, setCopied] = useState(false)
  const onCopy = () => {
    navigator.clipboard?.writeText(BIBTEX)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return (
    <section id="cite" className="py-20 bg-surface-sunken border-b border-border">
      <Container size="wide" className="grid lg:grid-cols-[1fr_1.4fr] gap-10 items-start">
        <div>
          <p className="label mb-2">Cite</p>
          <h2 className="text-3xl font-semibold tracking-tight">Use it, share it, cite it.</h2>
          <p className="text-muted-foreground text-sm mt-4 leading-relaxed max-w-md">
            PETadex is open-source under the MIT license. If a paper or pre-print uses our data,
            tools, or atlases, please cite the entry below.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a href="https://github.com/ababaian/petadex.io/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="btn btn-ghost border border-border-strong text-sm">
              License (MIT)
            </a>
            <a href="https://github.com/ababaian/petadex.io" target="_blank" rel="noopener noreferrer" className="btn btn-ghost border border-border-strong text-sm">
              Source on GitHub
            </a>
          </div>
        </div>
        <div className="card relative">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-2xs font-mono text-muted-foreground">
            <span>citation.bib</span>
            <button onClick={onCopy} className="hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer">
              {copied ? (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  copied
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="11" height="11" rx="1.5" /><path d="M14 6V4.5A1.5 1.5 0 0 0 12.5 3h-7A1.5 1.5 0 0 0 4 4.5v8A1.5 1.5 0 0 0 5.5 14H7" /></svg>
                  copy
                </>
              )}
            </button>
          </div>
          <pre className="font-mono text-xs leading-relaxed text-foreground px-4 py-4 m-0 whitespace-pre-wrap break-all bg-transparent border-0 shadow-none rounded-none">
{`@misc{petadex2026,
  `}<span className="text-foreground font-semibold">title</span>{`  = {PETadex: an open atlas of plastic-degrading enzymes},
  `}<span className="text-foreground font-semibold">author</span>{` = {The PETadex contributors},
  `}<span className="text-foreground font-semibold">year</span>{`   = {2026},
  `}<span className="text-foreground font-semibold">url</span>{`    = {https://petadex.net},
  `}<span className="text-foreground font-semibold">note</span>{`   = {v0.4 (Apr 2026)}
}`}
          </pre>
        </div>
      </Container>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <ToolCards />
      <StatsStrip />
      <WhatsInside />
      <Citation />
    </>
  )
}
