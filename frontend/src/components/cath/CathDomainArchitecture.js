import React, { useEffect, useMemo, useState } from "react"
import RepresentativeProteinViewer from "./RepresentativeProteinViewer"

// 2D domain-architecture viewer (InterPro-style). For a Pfam family we fetch the InterPro Domain
// Architecture (IDA) endpoint, which returns representative proteins and the Pfam domains laid out
// along each sequence, ordered by how many proteins share that architecture. We draw each as a
// horizontal track (sequence bar + colored domain blocks) so users can see how this domain
// co-occurs with others — the same visual language as the sequence/ORF domain tracks.

const MAX_ARCH = 6
// Golden-angle hues, offset +40° so the first colors avoid the red/coral accent used to highlight
// the current family (otherwise a co-occurring domain could share the highlight color).
const domainHue = i => ((i * 137.508) + 40) % 360

function idaUrl(pfamAccession) {
  const acc = String(pfamAccession || "").trim().toUpperCase()
  return `https://www.ebi.ac.uk/interpro/api/entry/pfam/${acc}/?ida&page_size=${MAX_ARCH}`
}
function architectureEntryUrl(pfamAccession) {
  const acc = String(pfamAccession || "").trim().toUpperCase()
  return `https://www.ebi.ac.uk/interpro/entry/pfam/${acc}/domain_architecture/`
}

/**
 * @param {{ pfamAccession: string }} props
 */
const CathDomainArchitecture = ({ pfamAccession }) => {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState("loading") // loading | ready | empty | error
  const [payload, setPayload] = useState(null)
  const [hovered, setHovered] = useState(null) // { archId, name, acc, start, end, centerPct }
  const [expandedId, setExpandedId] = useState(null)
  const pfam = String(pfamAccession || "").trim().toUpperCase()

  useEffect(() => {
    if (!open || !pfam) return undefined
    let cancelled = false
    const controller = new AbortController()
    setStatus("loading")
    setPayload(null)

    fetch(idaUrl(pfam), { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(json => {
        if (cancelled) return
        const results = Array.isArray(json?.results) ? json.results : []
        if (!results.length) {
          setStatus("empty")
          return
        }
        setPayload({ count: Number(json.count) || results.length, results })
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
  }, [open, pfam])

  // Normalize each architecture to { id, uniprot, length, uniqueProteins, domains:[{acc,name,start,end}] }
  const architectures = useMemo(() => {
    if (!payload) return []
    return payload.results
      .map(r => {
        const rep = r?.representative || {}
        const length = Number(rep.length) || 0
        const domains = []
        for (const d of Array.isArray(rep.domains) ? rep.domains : []) {
          const acc = String(d.accession || "")
          if (!acc.toUpperCase().startsWith("PF")) continue // Pfam only (skip IPR duplicates)
          for (const c of Array.isArray(d.coordinates) ? d.coordinates : []) {
            for (const f of Array.isArray(c.fragments) ? c.fragments : []) {
              const start = Number(f.start)
              const end = Number(f.end)
              if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
                domains.push({ acc: acc.toUpperCase(), name: d.name || acc, start, end })
              }
            }
          }
        }
        return {
          id: r.ida_id,
          uniprot: rep.accession || "",
          length,
          uniqueProteins: Number(r.unique_proteins) || 0,
          domains,
        }
      })
      .filter(a => a.length > 0 && a.domains.length > 0)
  }, [payload])

  // Stable color per distinct domain accession across all shown architectures.
  const colorByAcc = useMemo(() => {
    const map = new Map()
    let i = 0
    for (const a of architectures) {
      for (const d of a.domains) {
        if (!map.has(d.acc)) {
          map.set(d.acc, d.acc === pfam ? null : `hsl(${domainHue(i)} 62% 50%)`)
          if (d.acc !== pfam) i += 1
        }
      }
    }
    return map
  }, [architectures, pfam])

  // Current family uses the site accent so it always stands out.
  const colorFor = acc => (acc === pfam ? "var(--accent)" : colorByAcc.get(acc) || "#64748b")

  const legend = useMemo(() => {
    const seen = new Map()
    for (const a of architectures) {
      for (const d of a.domains) {
        if (!seen.has(d.acc)) seen.set(d.acc, d.name)
      }
    }
    return Array.from(seen.entries()).map(([acc, name]) => ({ acc, name }))
  }, [architectures])

  if (!pfam) return null

  const body = () => {
    if (status === "loading") {
      return (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
          Loading domain architectures…
        </div>
      )
    }

    if (status === "empty") {
      return (
        <p className="mt-3 text-xs text-muted-foreground m-0">
          No representative domain architectures are recorded for {pfam}.
        </p>
      )
    }

    if (status === "error" || !architectures.length) {
      return (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          Domain architectures could not be loaded.{" "}
          <a
            href={architectureEntryUrl(pfam)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover underline underline-offset-2"
          >
            View domain architectures on InterPro
          </a>
          .
        </div>
      )
    }

    return renderArchitectures()
  }

  const renderArchitectures = () => (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <p className="text-xs text-muted-foreground m-0">
          Representative proteins containing this domain, ordered by how many share the arrangement.
        </p>
        {payload?.count > architectures.length && (
          <a
            href={architectureEntryUrl(pfam)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:text-accent-hover underline underline-offset-2 shrink-0"
          >
            View all {payload.count} on InterPro
          </a>
        )}
      </div>

      {/* Legend */}
      {legend.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          {legend.map(({ acc, name }) => (
            <span key={acc} className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: colorFor(acc) }}
              />
              <span className={acc === pfam ? "text-foreground font-medium" : ""}>
                {name} ({acc})
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Architecture tracks */}
      <div className="space-y-3">
        {architectures.map(a => (
          <div key={a.id} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <span className="text-xs text-muted-foreground">
                {a.uniprot ? (
                  <a
                    href={`https://www.uniprot.org/uniprotkb/${a.uniprot}/entry`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-accent hover:text-accent-hover underline underline-offset-2"
                  >
                    {a.uniprot}
                  </a>
                ) : (
                  <span className="font-mono">representative</span>
                )}
                <span className="ml-2 text-muted-foreground/80">{a.length} aa</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xs text-muted-foreground">
                  {a.uniqueProteins.toLocaleString()} protein{a.uniqueProteins === 1 ? "" : "s"}
                </span>
                {a.uniprot && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(prev => (prev === a.id ? null : a.id))}
                    aria-expanded={expandedId === a.id}
                    className="rounded-md border border-input bg-background px-2 py-0.5 text-2xs font-medium text-accent hover:bg-muted/50 hover:text-accent-hover transition-colors"
                  >
                    {expandedId === a.id ? "Hide sequence view" : "Sequence view"}
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              {hovered && hovered.archId === a.id && (
                <div
                  className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-2xs text-popover-foreground shadow-md"
                  style={{ left: `${hovered.centerPct}%` }}
                >
                  <span className="font-medium text-foreground">{hovered.name}</span>{" "}
                  <span className="text-muted-foreground">({hovered.acc})</span>
                  <span className="text-muted-foreground"> · residues {hovered.start}–{hovered.end}</span>
                </div>
              )}

              <div
                className="relative h-6 w-full rounded bg-surface-sunken border border-border overflow-hidden"
                role="img"
                aria-label={`Domain architecture of ${a.uniprot || "representative protein"}`}
              >
                {a.domains.map((d, i) => {
                  const left = (Math.max(0, d.start - 1) / a.length) * 100
                  const width = Math.max(((d.end - d.start + 1) / a.length) * 100, 0.5)
                  const centerPct = Math.min(98, Math.max(2, left + width / 2))
                  const isCurrent = d.acc === pfam
                  return (
                    <div
                      key={`${d.acc}-${i}`}
                      className="absolute top-0 h-full flex items-center justify-center overflow-hidden cursor-default"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        backgroundColor: colorFor(d.acc),
                        boxShadow: isCurrent ? "inset 0 0 0 2px rgba(255,255,255,0.85)" : undefined,
                      }}
                      title={`${d.name} (${d.acc}) · residues ${d.start}–${d.end}`}
                      onMouseEnter={() =>
                        setHovered({ archId: a.id, name: d.name, acc: d.acc, start: d.start, end: d.end, centerPct })
                      }
                      onMouseLeave={() =>
                        setHovered(prev => (prev && prev.archId === a.id && prev.start === d.start && prev.acc === d.acc ? null : prev))
                      }
                    >
                      <span className="text-2xs font-medium text-white px-1 truncate">{d.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {expandedId === a.id && (
              <RepresentativeProteinViewer accession={a.uniprot} domains={a.domains} colorFor={colorFor} />
            )}
          </div>
        ))}
      </div>

      <p className="mt-2 text-2xs text-muted-foreground leading-relaxed">
        Source: EBI/InterPro domain architectures. Blocks are Pfam domains at their sequence
        coordinates; the highlighted block is this family.
      </p>
    </div>
  )

  return (
    <div className="mt-4 max-w-4xl rounded-lg border border-border bg-background/50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground m-0">
            Domain architecture
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-0 leading-relaxed">
            How this domain is arranged with others across representative proteins.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="inline-flex items-center rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-accent hover:bg-muted/50 hover:text-accent-hover transition-colors shrink-0"
        >
          {open ? "Hide domain architecture" : "Show domain architecture"}
        </button>
      </div>

      {open && body()}
    </div>
  )
}

export default CathDomainArchitecture
