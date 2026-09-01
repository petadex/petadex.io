import React, { useEffect, useMemo, useState } from "react"
import ProteinViewer from "../protein/ProteinViewer"

/** @param {string} pdbId */
function rcsbDownloadUrl(pdbId) {
  return `https://files.rcsb.org/download/${pdbId}.pdb`
}

/**
 * @param {{
 *   representativeStructures?: import("../../data/catDomainCatalog.js").CatDomainStructureRow[],
 *   representativeStructuresNote?: string,
 * }} props
 */
const CatDomainStructuresTable = ({
  representativeStructures,
  representativeStructuresNote,
}) => {
  const rows = representativeStructures || []
  const pdbIds = useMemo(
    () =>
      rows
        .map(r => String(r.pdbId || "").toUpperCase())
        .filter(id => /^[0-9][A-Z0-9]{3}$/.test(id)),
    [rows],
  )
  const [selectedPdb, setSelectedPdb] = useState(() => pdbIds[0] || "")

  useEffect(() => {
    setSelectedPdb(pdbIds[0] || "")
  }, [pdbIds])

  const activePdb =
    selectedPdb && pdbIds.includes(selectedPdb) ? selectedPdb : pdbIds[0] || ""

  return (
    <section id="cat-section-representativeStructures" className="scroll-mt-28">
      <h3 className="text-lg font-semibold text-foreground mb-3">
        Selected structures for comparison
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Curation pending.</p>
      ) : (
        <>
          {representativeStructuresNote &&
          representativeStructuresNote !== "[PENDING INFORMATION]" ? (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {representativeStructuresNote}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              [PENDING INFORMATION]
            </p>
          )}

          {activePdb && (
            <div className="rounded-xl border border-border bg-muted/10 overflow-hidden mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-border bg-muted/20">
                <p className="text-sm font-medium text-foreground m-0">Structure</p>
                <div className="flex flex-wrap items-center gap-2">
                  {pdbIds.length > 1 ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground m-0">
                      <span className="sr-only">Select PDB</span>
                      <select
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm font-mono text-foreground"
                        value={activePdb}
                        onChange={e => setSelectedPdb(e.target.value)}
                        aria-label="Select structure PDB ID"
                      >
                        {pdbIds.map(pdb => (
                          <option key={pdb} value={pdb}>
                            {pdb}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span className="text-sm font-mono text-muted-foreground">{activePdb}</span>
                  )}
                  <a
                    href={rcsbDownloadUrl(activePdb)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-accent hover:bg-muted/50 hover:text-accent-hover transition-colors"
                  >
                    Download PDB
                  </a>
                </div>
              </div>
              <div className="bg-neutral-950" style={{ height: 420 }}>
                <ProteinViewer
                  key={activePdb}
                  structureUrl={rcsbDownloadUrl(activePdb)}
                  accession={activePdb}
                  initialStyle="cartoon"
                  showControls={false}
                  height="100%"
                />
              </div>
              <p className="text-xs text-muted-foreground px-4 py-2 m-0 border-t border-border bg-muted/10">
                Rotate: left-click. Zoom: scroll. Pan: right-click.
              </p>
            </div>
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
                {rows.map(row => (
                  <tr
                    key={row.pdbId}
                    className={`border-t border-border align-top ${
                      String(row.pdbId).toUpperCase() === activePdb ? "bg-accent/5" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-accent whitespace-nowrap">
                      <button
                        type="button"
                        className="font-mono text-xs text-accent hover:underline"
                        onClick={() => setSelectedPdb(String(row.pdbId).toUpperCase())}
                      >
                        {row.pdbId}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-foreground whitespace-nowrap">
                      {row.structuralFocus}
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default CatDomainStructuresTable
