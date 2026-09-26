import React from "react"
import { Link } from "gatsby"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import { ACTIVITY_LINKS } from "../data/activityLinks"

// Card icons for the Activity hub; the destinations themselves live in
// data/activityLinks.js (shared with the SiteHeader dropdown).
const ICONS = {
  kinetics: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 15l3-3 3 3 5-6" />
    </svg>
  ),
  substrates: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v9m0 0l8-4.5M12 12L4 7.5" />
    </svg>
  ),
  "halo-assay": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" strokeWidth={2} />
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
    </svg>
  ),
}

const ActivityPage = () => {
  return (
    <>
      {/* Hero */}
      <section className="py-12 md:py-16 border-b border-border">
        <Container>
          <p className="label text-accent mb-3">Activity</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            Enzyme Activity
          </h1>
          <p className="text-lg text-secondary-foreground max-w-3xl">
            This section covers plastic-degrading enzyme activity from three angles: measured
            reaction kinetics, the polymer substrates that enzymes break down, and results from
            plate-based halo assays.
          </p>
        </Container>
      </section>

      {/* Overview cards */}
      <section className="py-10 md:py-14">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIVITY_LINKS.map(item => (
              <Link
                key={item.key}
                to={item.path}
                className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent/10 text-accent mb-4">
                  {ICONS[item.key]}
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{item.label}</h2>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
                  {item.tag}
                </p>
                <p className="text-sm text-secondary-foreground flex-1">{item.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Open
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}

export default ActivityPage

export const Head = () => (
  <Seo
    title="Activity"
    description="Plastic-degrading enzyme activity: reaction kinetics, polymer substrates, and halo assay results."
  />
)
