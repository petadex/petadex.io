import React, { useEffect, useState } from "react"
import config from "../../config"

const REFERENCE_CONTROLS = new Set(["IsPETase", "IsPETase_2", "FAST-PETase", "Proteinase K"])

/**
 * In-house BHET halo-assay activity for this CATH domain's genes, normalized against each
 * plate's own EV (empty vector) negative control. Shows a "no data yet" placeholder for domains
 * the wet lab hasn't tested.
 * @param {{ cathId: string }} props
 */
const CathDomainPlateActivity = ({ cathId }) => {
  const [genes, setGenes] = useState(null) // null = loading, [] = loaded-but-empty

  useEffect(() => {
    let cancelled = false
    setGenes(null)
    if (!cathId) return undefined

    fetch(`${config.apiUrl}/atlas/plate-activity/${encodeURIComponent(cathId)}`)
      .then(r => (r.ok ? r.json() : { genes: [] }))
      .then(data => {
        if (!cancelled) setGenes(Array.isArray(data?.genes) ? data.genes : [])
      })
      .catch(() => {
        if (!cancelled) setGenes([])
      })

    return () => {
      cancelled = true
    }
  }, [cathId])

  return (
    <section id="cat-section-plateActivity" className="scroll-mt-28">
      <h3 className="text-lg font-semibold text-foreground mb-3">BHET halo assay activity</h3>

      {genes === null ? null : genes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No in-house BHET halo assay data for this domain yet.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            <strong className="font-semibold text-foreground">How to read this:</strong> Each gene
            was tested on BHET-based media in a yeast-colony halo assay, alongside an
            empty-vector (EV) negative control on the same plate. Because raw signal varies from
            plate to plate, we can&rsquo;t compare raw numbers directly; what&rsquo;s shown here
            is each gene&rsquo;s signal relative to its own plate&rsquo;s EV baseline, averaged
            across every plate that gene was tested on. A positive number means the gene showed
            more activity than background.
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground text-2xs uppercase tracking-widest font-semibold bg-muted/30">
                  <th className="px-4 py-2.5">Gene</th>
                  <th className="px-4 py-2.5 text-right">Δ vs EV control</th>
                  <th className="px-4 py-2.5 text-right">Plates</th>
                  <th className="px-4 py-2.5 text-right">Wells</th>
                </tr>
              </thead>
              <tbody>
                {genes.map(g => (
                  <tr key={g.gene} className="border-t border-border">
                    <td className="px-4 py-2.5 text-foreground">
                      {g.gene}
                      {REFERENCE_CONTROLS.has(g.gene) && (
                        <span className="ml-2 rounded-full border border-border/60 bg-muted/30 px-1.5 py-0.5 text-2xs text-muted-foreground align-middle">
                          reference control
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                        g.meanDeltaVsEv > 0 ? "text-accent font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {g.meanDeltaVsEv != null ? g.meanDeltaVsEv.toFixed(4) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{g.nPlates}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{g.nWells}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default CathDomainPlateActivity
