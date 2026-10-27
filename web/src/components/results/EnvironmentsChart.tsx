"use client"

import { useState } from "react"
import type { SearchHit, SearchSummary } from "@/lib/api/types"
import {
  environmentRows,
  formatPercent,
  formatXExpected,
  hitsInProfile,
} from "@/lib/searchMetadata"
import { SectionTitle } from "./SectionTitle"

const TOP_N = 5

/**
 * Environment profile share of this search's Logan hits against a random
 * PETadex Logan sequence. A dumbbell per profile: one hue, two shades
 * (validated as an ordinal pair in both themes). Each sequence counts once,
 * its weight split across its samples' profiles; the store precomputes that.
 */
export function EnvironmentsChart({
  environments,
  hits,
  onSelect,
}: {
  environments: NonNullable<SearchSummary["environments"]>
  hits: SearchHit[]
  onSelect: (hit: SearchHit) => void
}) {
  const rows = environmentRows(environments.profiles)
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(
    0.0001,
    ...rows.flatMap(r => [r.share, r.background_share])
  )
  const pos = (v: number) => `${(v / max) * 100}%`

  return (
    <section aria-labelledby="env-title" className="space-y-4">
      <div id="env-title">
        <SectionTitle
          title="Environments of Logan hits"
          count={environments.n_sequences}
        />
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-env-hits size-2.5 rounded-full" aria-hidden />
          Hits from this search
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="bg-env-background size-2.5 rounded-full"
            aria-hidden
          />
          Random PETadex sequence
        </span>
      </div>

      <div className="relative">
        {rows.map(row => {
          const lo = Math.min(row.share, row.background_share)
          const hi = Math.max(row.share, row.background_share)
          const isActive = active === row.profile
          return (
            <div
              key={row.profile}
              tabIndex={0}
              role="img"
              aria-label={`${row.profile}: hits from this search ${formatPercent(row.share)}, random PETadex sequence ${formatPercent(row.background_share)}, ${formatXExpected(row.x_expected)}`}
              onMouseEnter={() => setActive(row.profile)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(row.profile)}
              onBlur={() => setActive(null)}
              className={`grid min-h-8 grid-cols-[minmax(7rem,12rem)_1fr_6.5rem] items-center gap-3 rounded-sm px-1 outline-none ${isActive ? "bg-surface-raised" : ""}`}
            >
              <span aria-hidden className="text-foreground truncate text-xs">
                {row.profile}
              </span>
              <span aria-hidden className="relative h-6">
                <span className="bg-border absolute top-1/2 right-0 left-0 h-px" />
                <span
                  className="bg-muted-foreground/50 absolute top-1/2 h-0.5 -translate-y-1/2"
                  style={{
                    left: pos(lo),
                    width: `calc(${pos(hi)} - ${pos(lo)})`,
                  }}
                />
                <span
                  className="bg-env-background ring-background absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
                  style={{ left: pos(row.background_share) }}
                />
                <span
                  className="bg-env-hits ring-background absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
                  style={{ left: pos(row.share) }}
                />
                {isActive && (
                  <span
                    role="tooltip"
                    className="bg-popover text-popover-foreground border-border absolute bottom-full z-(--z-tooltip) mb-1 rounded-md border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
                    style={{ left: `min(${pos(hi)}, calc(100% - 12rem))` }}
                  >
                    <span className="block font-medium">{row.profile}</span>
                    <span className="block">
                      Hits from this search: {formatPercent(row.share)}
                    </span>
                    <span className="block">
                      Random PETadex sequence:{" "}
                      {formatPercent(row.background_share)}
                    </span>
                    <span className="block font-semibold">
                      {formatXExpected(row.x_expected)}
                    </span>
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className="text-muted-foreground tabular text-right font-mono text-xs"
              >
                {formatXExpected(row.x_expected)}
              </span>
            </div>
          )
        })}
        <div
          aria-hidden
          className="text-muted-foreground tabular text-2xs grid grid-cols-[minmax(7rem,12rem)_1fr_6.5rem] gap-3 px-1 pt-1 font-mono"
        >
          <span />
          <span className="border-border flex justify-between border-t pt-1">
            <span>0 %</span>
            <span>{formatPercent(max / 2, 0)}</span>
            <span>{formatPercent(max, 0)}</span>
          </span>
          <span className="text-right">share of sequences</span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.slice(0, TOP_N).map(row => {
          const members = hitsInProfile(hits, row.profile)
          return (
            <details
              key={row.profile}
              className="border-border rounded-lg border"
            >
              <summary className="text-foreground flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                {row.profile}
                <span className="bg-muted text-muted-foreground tabular text-2xs rounded-full px-2 py-0.5 font-mono">
                  {members.length}
                </span>
              </summary>
              <ul className="border-border tabular divide-border divide-y border-t font-mono text-xs">
                {members.map(({ hit, share }) => (
                  <li
                    key={hit.target_id}
                    className="flex items-center gap-3 px-3 py-1.5"
                  >
                    <span className="text-muted-foreground w-8">
                      {hit.rank}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelect(hit)}
                      className="text-foreground cursor-pointer underline decoration-dotted underline-offset-2"
                    >
                      {hit.target_id}
                    </button>
                    <span className="text-muted-foreground">
                      {hit.percent_identity.toFixed(1)} %
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {formatPercent(share, 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )
        })}
      </div>
    </section>
  )
}
