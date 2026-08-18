import type { ReactNode } from "react"
import Link from "next/link"
import { AtlasHeroMap } from "@/components/home/AtlasHeroMap"
import { CitationCard } from "@/components/home/CitationCard"
import { fetchCorpusSummary, formatCount, parseCount } from "@/lib/api"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Home",
  description:
    "An open atlas of plastic-degrading enzymes: 64,730 enzyme families over a 307-million-ORF catalytic corpus, searchable by sequence and linked to measured activity.",
  path: "/",
})

/**
 * Counts come from a matview that is refreshed with the corpus, so the page is
 * regenerated hourly rather than on every request.
 */
export const revalidate = 3600

const REPO_URL = "https://github.com/petadex/petadex.io"

/**
 * Small pill used over the hero atlas canvas — live status, gesture hints,
 * component legend.
 *
 * `display` is caller-supplied rather than baked into the base classes: a
 * hardcoded `inline-flex` here would sit at the same (unprefixed)
 * specificity as a plain `hidden` passed via `className`, and Tailwind's
 * cascade — not JSX class order — decides the winner, so the responsive
 * "scroll · drag · click" / "pinch · drag · tap" chips would render
 * simultaneously instead of toggling. Keeping `display` as its own prop
 * means each usage's own `hidden`/`sm:*` pair is the only display rule in
 * play.
 */
function LegendChip({
  color,
  children,
  display = "inline-flex",
  className = "",
}: {
  color?: string
  children: ReactNode
  display?: string
  className?: string
}) {
  return (
    <span
      className={`text-2xs text-muted-foreground border-border ${display} items-center gap-1.5 rounded-full border bg-black/50 px-2 py-0.5 font-mono ${className}`}
    >
      {color && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
      )}
      {children}
    </span>
  )
}

/** Structural-component color key shown along the bottom of the hero atlas. */
const HERO_LEGEND: readonly { c: string; l: string }[] = [
  { c: "#4F8FE8", l: "α/β hydrolase" },
  { c: "#2ECC71", l: "DD-peptidase" },
  { c: "#E74C4C", l: "Amidase" },
  { c: "#9B5BE0", l: "Trypsin-like" },
  { c: "#F2C94C", l: "Arylesterase" },
  { c: "#F2994A", l: "Cupredoxin" },
  { c: "#6FB7E8", l: "L-aa peptidase" },
]

interface EntryPoint {
  href: string
  step: string
  title: string
  description: string
}

const ENTRY_POINTS: readonly EntryPoint[] = [
  {
    href: "/atlas",
    step: "01",
    title: "Browse the atlas",
    description:
      "Every enzyme family in one UMAP embedding, colored by CATH structural class. Zoom into a neighborhood and open any family.",
  },
  {
    href: "/search",
    step: "02",
    title: "Search by sequence",
    description:
      "Paste a FASTA sequence. DIAMOND aligns it against the catalytic corpus and returns nearest neighbors with alignment and activity context.",
  },
  {
    href: "/substrate",
    step: "03",
    title: "Compare BHET activity",
    description:
      "Plate-reader hydrolysis for synthesized genes at 12.5, 25 and 50 mM BHET, as a timeseries and as a substrate-versus-substrate scatter.",
  },
  {
    href: "/enzymes",
    step: "04",
    title: "Resolve an identifier",
    description:
      "Paste an ORF id, a GenBank accession or an SRA library id and land on its cluster block, or browse families by structural component.",
  },
]

export default async function HomePage() {
  const summary = await fetchCorpusSummary()

  const catalyticOrfs = parseCount(summary.catalytic_core_total)
  const clusters90 = parseCount(summary.clusters_90pid)
  const families = parseCount(summary.total_families)
  const characterized = parseCount(summary.pazy_total)

  /**
   * The corpus as a funnel: raw ORFs collapse into clusters, clusters into
   * families, and only a fraction of families have ever been characterized in a
   * lab. Reading the four numbers in that order is the argument for the site.
   */
  const funnel = [
    {
      value: catalyticOrfs,
      label: "Catalytic ORFs",
      caption: "NCBI NR + the Logan SRA assembly",
    },
    {
      value: clusters90,
      label: "Clusters at 90% identity",
      caption: "One representative per near-identical block",
    },
    {
      value: families,
      label: "Enzyme families",
      caption: "Embedded in the atlas above",
    },
    {
      value: characterized,
      label: "Characterized in PAZy",
      caption: "With published experimental activity",
    },
  ]

  return (
    <>
      {/* Hero + corpus funnel together fill the viewport below the sticky
          h-14 header on first load (md+); the atlas canvas absorbs whatever
          space the funnel bar doesn't need. */}
      <div className="md:flex md:h-[calc(100dvh-3.5rem)] md:flex-col">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="border-border relative border-b bg-[#0e0e0e] md:flex md:min-h-0 md:flex-1 md:flex-col">
          {/* Title block
             Mobile  : normal-flow, sits above the atlas canvas
             Desktop : absolute overlay, centered over the canvas          */}
          <div className="border-border bg-background relative z-10 border-b py-10 md:pointer-events-none md:absolute md:inset-0 md:flex md:items-center md:border-0 md:bg-transparent md:py-0">
            <div className="mx-auto w-full max-w-6xl px-6">
              <div className="max-w-xl md:pointer-events-auto">
                <p className="text-2xs text-muted-foreground font-semibold tracking-[0.18em] uppercase">
                  Open · Free · Community-driven
                </p>

                <h1 className="text-foreground mt-4 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  A pan-planetary atlas of{" "}
                  <span className="text-accent">
                    plastic-degrading enzymes.
                  </span>
                </h1>

                <p className="text-muted-foreground mt-5 max-w-lg leading-relaxed">
                  More than 300 million enzymes mined from 27 million public
                  sequencing runs. Search by sequence, align against known
                  degraders, and compare substrate activity.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/atlas"
                    className="bg-accent text-accent-contrast hover:bg-accent-hover inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                  >
                    Start exploring
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="size-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 10a1 1 0 011-1h10.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Link>
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border-strong text-muted-foreground hover:text-foreground hover:border-muted-foreground inline-flex items-center rounded-lg border px-4 py-2.5 font-mono text-xs transition-colors"
                  >
                    Contribute an enzyme
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Atlas canvas
             Mobile  : 340px standalone block below the title
             Desktop : fills whatever height the hero section has left
                       after the funnel bar below claims its own          */}
          <div className="border-border relative h-85 w-full overflow-hidden border-b md:h-auto md:min-h-0 md:flex-1">
            <AtlasHeroMap interactive />

            {/* Vignette — only needed on desktop where the title overlaps */}
            <div
              className="pointer-events-none absolute inset-0 hidden md:block"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 30% 50%, oklch(0 0 0 / 0.55) 0%, transparent 70%), linear-gradient(to right, oklch(0 0 0 / 0.65) 0%, transparent 50%)",
              }}
            />

            {/* Top-right chips */}
            <div className="pointer-events-none absolute top-2 right-2 flex flex-col items-end gap-1.5 md:top-4 md:right-4 md:gap-2">
              <LegendChip color="#4F8FE8">
                Family Atlas <span className="text-foreground ml-1">live</span>
              </LegendChip>
              <LegendChip display="hidden sm:inline-flex">
                scroll · drag · click
              </LegendChip>
              <LegendChip display="inline-flex sm:hidden">
                pinch · drag · tap
              </LegendChip>
            </div>

            {/* Bottom legend strip — desktop only */}
            <div className="border-border pointer-events-auto absolute bottom-3 left-1/2 hidden -translate-x-1/2 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-black/55 px-3 py-2 backdrop-blur-md md:flex">
              {HERO_LEGEND.map(x => (
                <LegendChip key={x.l} color={x.c}>
                  {x.l}
                </LegendChip>
              ))}
            </div>
          </div>
        </section>

        {/* ── Corpus funnel ─────────────────────────────────────────────── */}
        <section className="border-border bg-surface border-b md:shrink-0">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <h2 className="text-2xs text-muted-foreground font-semibold tracking-[0.18em] uppercase">
              The corpus, narrowed
            </h2>

            <dl className="lg:divide-border mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 lg:gap-x-0 lg:divide-x">
              {funnel.map((item, index) => (
                <div
                  key={item.label}
                  className={
                    index === 0
                      ? "lg:pr-6"
                      : index === funnel.length - 1
                        ? "lg:pl-6"
                        : "lg:px-6"
                  }
                >
                  <dd className="text-foreground tabular text-[1.75rem] leading-none font-semibold tracking-tight">
                    {formatCount(item.value, "compact")}
                  </dd>
                  <dt className="text-foreground mt-2 text-sm font-medium">
                    {item.label}
                  </dt>
                  <p className="text-muted-foreground text-2xs mt-1 font-mono">
                    {item.caption}
                  </p>
                  {/* The exact figure only earns a line when the headline
                    abbreviates it. "211" over "211" is noise. */}
                  {formatCount(item.value, "compact") !==
                    formatCount(item.value) && (
                    <p className="text-muted-foreground/70 text-2xs tabular mt-0.5 font-mono">
                      {formatCount(item.value)}
                    </p>
                  )}
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>

      {/* ── Entry points ──────────────────────────────────────────────── */}
      <section id="start" className="border-border border-b">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-y-4">
            <div>
              <p className="text-2xs text-muted-foreground font-semibold tracking-[0.18em] uppercase">
                Start here
              </p>
              <h2 className="text-foreground mt-2 text-3xl font-semibold tracking-tight">
                Four ways into the data
              </h2>
            </div>
            <p className="text-muted-foreground max-w-md text-sm">
              PETadex is a launchpad, not a paper. Pick the tool that matches
              the question.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ENTRY_POINTS.map(entry => (
              <Link
                key={entry.href}
                href={entry.href}
                className="group border-border bg-surface hover:border-accent/50 flex flex-col rounded-xl border p-5 transition-colors"
              >
                <span className="text-2xs text-muted-foreground font-mono tracking-widest">
                  {entry.step}
                </span>
                <h3 className="text-foreground mt-3 text-base leading-snug font-semibold">
                  {entry.title}
                </h3>
                <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                  {entry.description}
                </p>
                <span className="text-accent mt-4 inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5">
                  Open
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 10a1 1 0 011-1h10.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Citation ──────────────────────────────────────────────────── */}
      <section id="cite" className="bg-surface-sunken">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-6 py-16 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="text-2xs text-muted-foreground font-semibold tracking-[0.18em] uppercase">
              Cite
            </p>
            <h2 className="text-foreground mt-2 text-3xl font-semibold tracking-tight">
              Use it, share it, cite it.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed">
              PETadex is open source under the GNU Affero General Public License
              v3. If a paper or preprint uses the data, the tools or the atlas,
              please cite the entry alongside.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={`${REPO_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noreferrer noopener"
                className="border-border-strong text-muted-foreground hover:text-foreground hover:border-muted-foreground inline-flex items-center rounded-lg border px-4 py-2.5 text-sm transition-colors"
              >
                License (AGPL-3.0)
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="border-border-strong text-muted-foreground hover:text-foreground hover:border-muted-foreground inline-flex items-center rounded-lg border px-4 py-2.5 text-sm transition-colors"
              >
                Source on GitHub
              </a>
            </div>
          </div>

          <CitationCard />
        </div>
      </section>
    </>
  )
}
