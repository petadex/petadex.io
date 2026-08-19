import React from "react"

/**
 * @param {{
 *   representativeStructures?: import("../../data/cathDomainCatalog.js").CathDomainStructureRow[],
 *   representativeStructuresNote?: string,
 *   activePdbId?: string|null,
 *   onSelectPdbId?: (pdbId: string) => void,
 *   className?: string,
 * }} props
 */
const CathDomainStructuresTable = ({
  representativeStructures,
  representativeStructuresNote,
  activePdbId,
  onSelectPdbId,
  className = "",
}) => {
  const rows = representativeStructures || []

  return (
    <section id="cat-section-representativeStructures" className={`scroll-mt-28 ${className}`}>
      <h3 className="text-lg font-semibold text-foreground mb-3">Selected structures for comparison</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Curation pending.</p>
      ) : (
        <>
          {representativeStructuresNote && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{representativeStructuresNote}</p>
          )}
          {onSelectPdbId && (
            <p className="text-xs text-muted-foreground mb-3">
              Click a PDB id to load it into the 3D viewer above.
            </p>
          )}
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground text-2xs uppercase tracking-widest font-semibold bg-muted/30">
                  <th className="px-4 py-2.5">PDB</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Structural Focus</th>
                  <th className="px-4 py-2.5">Resolution</th>
                  <th className="px-4 py-2.5">What it shows</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const isActive = onSelectPdbId && row.pdbId === activePdbId
                  return (
                    <tr
                      key={row.pdbId}
                      className={`border-t border-border align-top ${isActive ? "bg-accent/10" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                        {onSelectPdbId ? (
                          <button
                            type="button"
                            onClick={() => onSelectPdbId(row.pdbId)}
                            aria-pressed={isActive}
                            className={`inline-flex items-center gap-1 hover:underline ${
                              isActive ? "text-accent font-semibold" : "text-accent/80"
                            }`}
                          >
                            {isActive && <span aria-hidden="true">▶</span>}
                            {row.pdbId}
                          </button>
                        ) : (
                          <span className="text-accent">{row.pdbId}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-foreground whitespace-nowrap">{row.structuralFocus}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {row.resolution || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.whatItshows}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {row.url && (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-accent hover:text-accent-hover underline underline-offset-2"
                          >
                            Open in RCSB ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default CathDomainStructuresTable
