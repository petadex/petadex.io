import React, { useEffect, useState } from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import MetadataMap from "../components/MetadataMap"
import SequencesView from "../components/halo-assay/SequencesView"
import ActivityView from "../components/halo-assay/ActivityView"

const TABS = [
  {
    key: "origins",
    label: "Origins",
    blurb: "Where samples were collected",
    long: "Geographic provenance of the environmental samples that contained PETase-encoding sequences.",
  },
  {
    key: "sequences",
    label: "Sequences",
    blurb: "What enzymes were cataloged",
    long: "Amino acid sequences in the catalog. Those flagged as “synthesized” have been cloned into expression hosts and tested in the halo assay.",
  },
  {
    key: "activity",
    label: "Activity",
    blurb: "How they performed in the assay",
    long: "Halo assay readouts: median pixel intensity over time on BHET agar at 12.5 and 25 mM substrate concentrations.",
  },
]

const isValidTab = key => TABS.some(t => t.key === key)

const HaloAssayPage = ({ location }) => {
  const [activeTab, setActiveTab] = useState("origins")
  const [headerHidden, setHeaderHidden] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location?.search || "")
    const tab = params.get("tab")
    if (tab && isValidTab(tab)) setActiveTab(tab)
  }, [location?.search])

  // Mirror SiteHeader's hide-on-scroll-down behavior so the sticky tab bar
  // can collapse upward instead of leaving a gap.
  useEffect(() => {
    let last = 0
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        setHeaderHidden(y > 80 && y > last)
        last = y
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleTabChange = key => {
    setActiveTab(key)
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.set("tab", key)
    window.history.replaceState({}, "", url.toString())
  }

  const current = TABS.find(t => t.key === activeTab) || TABS[0]

  return (
    <>
      {/* Hero */}
      <section className="py-12 md:py-16 border-b border">
        <Container>
          <p className="label text-accent mb-3">In-house halo assay</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            From sample to substrate activity
          </h1>
          <p className="text-lg text-secondary-foreground max-w-3xl">
            Every enzyme in this dataset was discovered in an environmental
            sample, sequenced, synthesized in-house, and screened under uniform
            conditions on BHET agar. Move through the stages of the pipeline
            using the tabs below.
          </p>
        </Container>
      </section>

      {/* Sticky tabs — collapses to top:0 when SiteHeader auto-hides */}
      <div
        className={`sticky z-30 bg-background/95 backdrop-blur-md border-b border transition-[top] duration-300 ease-out ${
          headerHidden ? "top-0" : "top-16"
        }`}
      >
        <Container>
          <nav
            className="flex gap-1 overflow-x-auto -mx-2 px-2"
            aria-label="Halo assay sections"
          >
            {TABS.map((tab, i) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative shrink-0 px-4 md:px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-2xs font-mono font-bold transition-colors ${
                        isActive
                          ? "bg-accent text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span>{tab.label}</span>
                    <span className="hidden md:inline text-xs font-normal text-muted-foreground">
                      — {tab.blurb}
                    </span>
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
                  )}
                </button>
              )
            })}
          </nav>
        </Container>
      </div>

      {/* Section blurb */}
      <section className="pt-8 pb-2">
        <Container>
          <p className="text-sm text-muted-foreground max-w-3xl italic">
            {current.long}
          </p>
        </Container>
      </section>

      {/* Active tab body */}
      <section className="py-8 md:py-10">
        <Container>
          {activeTab === "origins" && <MetadataMap />}
          {activeTab === "sequences" && <SequencesView />}
          {activeTab === "activity" && <ActivityView />}
        </Container>
      </section>
    </>
  )
}

export default HaloAssayPage

export const Head = () => (
  <Seo
    title="Halo Assay Explorer"
    description="Origins, sequences, and BHET halo-assay activity data for plastic-degrading enzymes."
  />
)
