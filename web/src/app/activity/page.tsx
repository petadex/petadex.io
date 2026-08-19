import type { ReactNode } from "react"
import Link from "next/link"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Activity",
  description:
    "Plastic-degrading enzyme activity: reaction kinetics, polymer substrates, and halo assay results.",
  path: "/activity",
})

/**
 * Ported from frontend/src/pages/activity.js: a hub linking out to the three
 * activity sub-pages. Those routes aren't built in web/ yet — Phase 3 builds
 * them one at a time — so these links 404 until each lands.
 */
const ACTIVITY_ITEMS: readonly {
  title: string
  path: string
  blurb: string
  tag: string
  icon: ReactNode
}[] = [
  {
    title: "Kinetics",
    path: "/kinetics",
    blurb:
      "Kinetic parameters for plastic-degrading enzymes, both measured in the lab and predicted by machine learning. Covers turnover number (kcat), Michaelis constant (Km), and catalytic efficiency (kcat/Km).",
    tag: "kcat · Km · kcat/Km",
    icon: (
      <svg
        className="size-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3v18h18M7 15l3-3 3 3 5-6"
        />
      </svg>
    ),
  },
  {
    title: "Substrates",
    path: "/substrates",
    blurb:
      "Browse target polymers such as PET, PLA, PEF, polycarbonate, and nylons. Each one has an abstract, links to primary literature, and interactive 3D structures of its oligomers.",
    tag: "Polymer structure viewer",
    icon: (
      <svg
        className="size-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v9m0 0l8-4.5M12 12L4 7.5"
        />
      </svg>
    ),
  },
  {
    title: "Halo Assay",
    path: "/halo-assay",
    blurb:
      "Measurements from plate-based clearing (halo) assays. Shows median pixel intensity of enzyme activity across BHET substrate concentrations and timepoints.",
    tag: "Median pixel intensity",
    icon: (
      <svg
        className="size-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8" strokeWidth={2} />
        <circle cx="12" cy="12" r="3" strokeWidth={2} />
      </svg>
    ),
  },
]

export default function ActivityPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="border-border border-b py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-2xs text-muted-foreground font-semibold tracking-[0.18em] uppercase">
            Activity
          </p>
          <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Enzyme activity
          </h1>
          <p className="text-muted-foreground mt-3 max-w-3xl text-lg leading-relaxed">
            This section covers plastic-degrading enzyme activity from three
            angles: measured reaction kinetics, the polymer substrates that
            enzymes break down, and results from plate-based halo assays.
          </p>
        </div>
      </section>

      {/* ── Overview cards ────────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIVITY_ITEMS.map(item => (
              <Link
                key={item.path}
                href={item.path}
                className="card group hover:border-accent flex flex-col p-6 transition-colors"
              >
                <div className="bg-accent/10 text-accent mb-4 flex size-12 items-center justify-center rounded-lg">
                  {item.icon}
                </div>
                <h2 className="text-foreground mb-1 text-xl font-semibold">
                  {item.title}
                </h2>
                <p className="text-muted-foreground mb-3 font-mono text-xs tracking-wider uppercase">
                  {item.tag}
                </p>
                <p className="text-secondary-foreground flex-1 text-sm">
                  {item.blurb}
                </p>
                <span className="text-accent mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  Open
                  <svg
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
