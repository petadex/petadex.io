import React, { useEffect, useMemo, useState } from "react"
import LazyFeatureViewerPanel from "../proteinViewerPrototype/LazyFeatureViewerPanel.jsx"
import { featureViewerDefsFromLogicalTracks } from "../proteinViewerPrototype/mockProteinData.js"
import { fetchUniprotSequence, uniprotEntryUrl } from "../../utils/uniprotSequence"

/**
 * Interactive feature viewer for one representative protein from an InterPro domain architecture.
 * Fetches the protein's sequence from UniProt (lazily, only when mounted/expanded) and renders the
 * shared FeatureViewerPanel with the Pfam domains as zoomable, selectable tracks.
 *
 * @param {{
 *   accession: string,
 *   domains: Array<{ acc: string, name: string, start: number, end: number }>,
 *   colorFor: (acc: string) => string,
 * }} props
 */
const RepresentativeProteinViewer = ({ accession, domains, colorFor }) => {
  const [status, setStatus] = useState("loading") // loading | ready | error
  const [sequence, setSequence] = useState("")
  const acc = String(accession || "").trim()

  useEffect(() => {
    if (!acc) {
      setStatus("error")
      return undefined
    }
    let cancelled = false
    const controller = new AbortController()
    setStatus("loading")
    setSequence("")

    fetchUniprotSequence(acc, { signal: controller.signal })
      .then(seq => {
        if (cancelled) return
        setSequence(seq)
        setStatus("ready")
      })
      .catch(err => {
        if (cancelled || err?.name === "AbortError") return
        setStatus("error")
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [acc])

  // Group domains by Pfam accession so each distinct domain is its own single-color track.
  const rectTrackDefs = useMemo(() => {
    const byAcc = new Map()
    for (const d of Array.isArray(domains) ? domains : []) {
      if (!byAcc.has(d.acc)) {
        byAcc.set(d.acc, {
          id: d.acc,
          title: `${d.name} (${d.acc})`,
          features: [],
        })
      }
      byAcc.get(d.acc).features.push({
        label: d.name,
        start: d.start,
        end: d.end,
        color: colorFor(d.acc),
      })
    }
    return featureViewerDefsFromLogicalTracks(Array.from(byAcc.values()))
  }, [domains, colorFor])

  if (status === "loading") {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
        Loading sequence for {acc}…
      </div>
    )
  }

  if (status === "error" || !sequence) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        Sequence for {acc} could not be loaded.{" "}
        <a
          href={uniprotEntryUrl(acc)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover underline underline-offset-2"
        >
          View {acc} on UniProt
        </a>
        .
      </div>
    )
  }

  return (
    <div className="mt-3">
      <LazyFeatureViewerPanel sequence={sequence} rectTrackDefs={rectTrackDefs} enrichmentLoading={false} />
      <p className="mt-1.5 text-2xs text-muted-foreground leading-relaxed">
        Sequence from UniProt ({acc}); domain ranges from InterPro. Zoom, pan the ruler window, and
        click/drag residues to select.
      </p>
    </div>
  )
}

export default RepresentativeProteinViewer
