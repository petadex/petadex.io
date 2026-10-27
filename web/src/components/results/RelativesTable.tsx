"use client"

import { useMemo, useState } from "react"
import type { HitOrigin, LoganMetadata, SearchHit } from "@/lib/api/types"
import {
  clusterLabel,
  fieldEvidence,
  filterRelatives,
  onePerCluster,
  ORIGIN_LABEL,
  RELATIVE_ORIGINS,
  sortRelatives,
  toFasta,
  type RelativesSortKey,
} from "@/lib/searchMetadata"
import { EvidenceBadge } from "./EvidenceBadge"
import { SectionTitle } from "./SectionTitle"

const SORTS: { key: RelativesSortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "identity", label: "Identity" },
  { key: "samples", label: "Samples" },
  { key: "studies", label: "Studies" },
  { key: "coverage", label: "Coverage" },
]

const control =
  "border-input bg-surface text-foreground rounded-md border px-2 py-1 text-xs"

/** Organism for nr (stated), dominant environment profile for Logan (profile). */
function sourceCell(hit: SearchHit) {
  const m = hit.metadata as (LoganMetadata & { organism?: string }) | null
  if (!m) return null
  const field = hit.origin === "logan" ? "prof_dominant" : "organism"
  const value = hit.origin === "logan" ? m.prof_dominant : m.organism
  if (!value) return null
  return (
    <span className="flex items-center gap-1.5">
      <span className="truncate">{value}</span>
      <EvidenceBadge evidence={fieldEvidence(hit.origin, field)} />
    </span>
  )
}

function count(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("en-US")
}

export function RelativesTable({
  hits,
  showMetadata,
  selectedId,
  onSelect,
}: {
  /** Uncharacterized hits only (nr + Logan), in search rank order. */
  hits: SearchHit[]
  showMetadata: boolean
  selectedId: string | null
  onSelect: (hit: SearchHit) => void
}) {
  const [minIdentity, setMinIdentity] = useState(0)
  const [minCoverage, setMinCoverage] = useState(0)
  const [origins, setOrigins] = useState<HitOrigin[]>(RELATIVE_ORIGINS)
  const [sort, setSort] = useState<RelativesSortKey>("rank")
  const [perCluster, setPerCluster] = useState(false)
  const [copied, setCopied] = useState(false)

  const rows = useMemo(() => {
    let out = filterRelatives(hits, { minIdentity, minCoverage, origins })
    if (perCluster) out = onePerCluster(out, "c90")
    return sortRelatives(out, sort)
  }, [hits, minIdentity, minCoverage, origins, perCluster, sort])

  function toggleOrigin(origin: HitOrigin) {
    setOrigins(current =>
      current.includes(origin)
        ? current.filter(o => o !== origin)
        : [...current, origin]
    )
  }

  async function copyFasta() {
    try {
      await navigator.clipboard.writeText(toFasta(rows))
    } catch {
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const sorts = showMetadata
    ? SORTS
    : SORTS.filter(s => s.key !== "samples" && s.key !== "studies")

  return (
    <section aria-labelledby="relatives-title" className="space-y-3">
      <div id="relatives-title">
        <SectionTitle title="Uncharacterized relatives" count={rows.length} />
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-1.5">
          Identity ≥
          <input
            type="number"
            min={0}
            max={100}
            value={minIdentity}
            onChange={e => setMinIdentity(Number(e.target.value) || 0)}
            className={`${control} w-16`}
          />
          %
        </label>
        <label className="flex items-center gap-1.5">
          Coverage ≥
          <input
            type="number"
            min={0}
            max={100}
            value={minCoverage}
            onChange={e => setMinCoverage(Number(e.target.value) || 0)}
            className={`${control} w-16`}
          />
          %
        </label>
        <fieldset className="flex items-center gap-3">
          <legend className="sr-only">Origin</legend>
          {RELATIVE_ORIGINS.map(origin => (
            <label key={origin} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={origins.includes(origin)}
                onChange={() => toggleOrigin(origin)}
              />
              {ORIGIN_LABEL[origin]}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-1.5">
          Sort
          <select
            value={sort}
            onChange={e => setSort(e.target.value as RelativesSortKey)}
            className={control}
          >
            {sorts.map(s => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {showMetadata && (
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={perCluster}
              onChange={e => setPerCluster(e.target.checked)}
            />
            One per 90 % cluster
          </label>
        )}
        <button
          type="button"
          onClick={copyFasta}
          className={`${control} hover:bg-surface-raised ml-auto cursor-pointer`}
        >
          {copied ? "Copied" : "Copy as FASTA"}
        </button>
      </div>

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-raised text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Origin</th>
              <th className="px-3 py-2 text-right font-medium">Identity</th>
              <th className="px-3 py-2 text-right font-medium">Coverage</th>
              <th className="px-3 py-2 text-right font-medium">E-value</th>
              {showMetadata && (
                <>
                  <th className="px-3 py-2 font-medium">
                    Organism / environment
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      Samples <EvidenceBadge evidence="measured" />
                    </span>
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Studies</th>
                  <th className="px-3 py-2 font-medium">90 % cluster</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="tabular font-mono">
            {rows.map(hit => {
              const m = hit.metadata as LoganMetadata | null
              const selected = hit.target_id === selectedId
              return (
                <tr
                  key={`${hit.rank}-${hit.target_id}`}
                  aria-selected={selected}
                  className={`border-border border-t ${selected ? "bg-accent-subtle" : "hover:bg-surface-raised"}`}
                >
                  <td className="text-muted-foreground px-3 py-1.5">
                    {hit.rank}
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => onSelect(hit)}
                      className="text-foreground cursor-pointer underline decoration-dotted underline-offset-2"
                    >
                      {hit.target_id}
                    </button>
                  </td>
                  <td className="px-3 py-1.5 font-sans">
                    {hit.origin ? ORIGIN_LABEL[hit.origin] : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {hit.percent_identity.toFixed(1)}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {hit.query_coverage ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {hit.evalue.toExponential(1)}
                  </td>
                  {showMetadata && (
                    <>
                      <td className="max-w-64 px-3 py-1.5 font-sans">
                        {sourceCell(hit) ?? "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {count(m?.n_biosamples)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {count(m?.n_bioprojects)}
                      </td>
                      <td className="px-3 py-1.5">
                        {clusterLabel(m?.c90) ?? "—"}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
