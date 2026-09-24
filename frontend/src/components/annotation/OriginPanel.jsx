// frontend/src/components/annotation/OriginPanel.jsx
//
// "Sequence origin" on the corpus sequence page: the Source sample (BioSample
// annotation layer) and Provenance (orf_origin dispatch) views as two tabs of
// one full-width panel, with the sample's map beside whichever tab is open.
//
// The map lives outside the tab panels so switching tabs never tears down the
// WebGL context (see MetadataMap.js for why contexts are precious). It appears
// only when the BioSample states coordinates (§5 — ~32 % of hits).
//
// Default tab: Source sample when the ORF came from an SRA run, otherwise
// Provenance (a PAZy/NR record has no sample, so its provenance is the story).
// The choice is kept in the URL (?origin=provenance) so a link opens the same tab.
import React, { useRef, useState } from "react"
import SamplePinMap from "./SamplePinMap"
import CoordinateLinks from "./CoordinateLinks"
import { SourceSampleDetails, useSourceSample } from "./SourceSample"
import { ProvenanceDetails, ORIGIN_META } from "../corpus/ProvenancePanel"

const TABS = [
  { id: "sample", label: "Source sample" },
  { id: "provenance", label: "Provenance" },
]

function readTabParam() {
  if (typeof window === "undefined") return null
  const v = new URLSearchParams(window.location.search).get("origin")
  return TABS.some(t => t.id === v) ? v : null
}

function writeTabParam(value) {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  if (value === "provenance") url.searchParams.set("origin", value)
  else url.searchParams.delete("origin")
  window.history.replaceState(window.history.state, "", url)
}

/**
 * @param {{
 *   orfId: string | number,
 *   orfOrigin: number | null,
 *   provenance: Record<string, any> | null,
 * }} props
 */
export default function OriginPanel({ orfId, orfOrigin, provenance }) {
  const { row, status } = useSourceSample(orfId)
  // null = not chosen yet → follow the default once the sample row is known.
  const [chosen, setChosen] = useState(readTabParam)
  const tabRefs = useRef({})

  const defaultTab =
    status === "ready" && row && row.run == null ? "provenance" : "sample"
  const tab = chosen ?? defaultTab

  const select = id => {
    setChosen(id)
    writeTabParam(id)
  }

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKeyDown = e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const i = TABS.findIndex(t => t.id === tab)
    const next =
      TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length]
    select(next.id)
    tabRefs.current[next.id]?.focus()
  }

  // Stated BioSample coordinates; the provenance block carries the same values.
  const sraSub = provenance?.sra ?? null
  const lat = row?.latitude ?? sraSub?.lat ?? null
  const lon = row?.longitude ?? sraSub?.lon ?? null
  const hasPin = lat != null && lon != null

  const tier = ORIGIN_META[orfOrigin]

  return (
    <section className="card p-0 overflow-hidden" data-testid="origin-panel">
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-5 border-b border-border">
        <div>
          <h2 className="text-xl font-semibold text-foreground m-0 mb-3">
            Sequence origin
          </h2>
          <div
            role="tablist"
            aria-label="Sequence origin"
            className="flex gap-1"
            onKeyDown={onKeyDown}
          >
            {TABS.map(t => {
              const active = t.id === tab
              return (
                <button
                  key={t.id}
                  ref={el => (tabRefs.current[t.id] = el)}
                  role="tab"
                  id={`origin-tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`origin-panel-${t.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => select(t.id)}
                  className={`px-4 py-2.5 text-base font-medium border-b-2 -mb-px transition-colors ${
                    active
                      ? "border-info text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
        {tier && (
          <span className="mb-3 inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            Source tier: {tier.label}
          </span>
        )}
      </div>

      <div
        className={`grid gap-8 p-6 ${
          hasPin ? "lg:grid-cols-[minmax(0,1fr)_minmax(360px,42%)]" : ""
        }`}
      >
        <div
          role="tabpanel"
          id={`origin-panel-${tab}`}
          aria-labelledby={`origin-tab-${tab}`}
          className="min-w-0"
        >
          {tab === "sample" ? (
            <SourceSampleDetails
              row={row}
              status={status}
              hideCoordinates={hasPin}
            />
          ) : (
            <ProvenanceDetails
              orfOrigin={orfOrigin}
              provenance={provenance}
              hideCoordinates={hasPin}
            />
          )}
        </div>

        {hasPin && (
          <div className="flex flex-col gap-2 lg:sticky lg:top-24 self-start w-full">
            <SamplePinMap
              latitude={lat}
              longitude={lon}
              heightClass="h-80 lg:h-[26rem]"
            />
            <CoordinateLinks latitude={lat} longitude={lon} />
            <span className="text-xs text-muted-foreground">
              Stated BioSample location (lat_lon), not geocoded.
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
