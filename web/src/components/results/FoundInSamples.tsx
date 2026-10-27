"use client"

import { useState } from "react"
import { getSequenceSamples } from "@/lib/api/search"
import type { SequenceSamples } from "@/lib/api/types"
import { formatPercent, profileLabel } from "@/lib/searchMetadata"
import { CountBadge } from "./SectionTitle"

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; data: SequenceSamples }
  | { kind: "none" }
  | { kind: "unavailable" }

function cell(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : value
}

/**
 * The BioSamples a Logan sequence was found in. Closed by default and fetched
 * on first open, so a record view never pays for a list nobody asked for.
 *
 * The one place in the results view that catches a fetch error: the section
 * is optional, and a 503 from the samples lookup must not take the whole
 * result page down to the error boundary.
 */
export function FoundInSamples({
  id,
  count,
}: {
  id: string
  /** n_biosamples from the hit record, shown before the list loads. */
  count: number | null
}) {
  const [state, setState] = useState<State>({ kind: "idle" })

  async function load() {
    if (state.kind !== "idle") return
    setState({ kind: "loading" })
    try {
      const data = await getSequenceSamples(id)
      setState(data ? { kind: "loaded", data } : { kind: "none" })
    } catch {
      setState({ kind: "unavailable" })
    }
  }

  const total = state.kind === "loaded" ? state.data.n_biosamples : count

  return (
    <details
      className="border-border rounded-lg border"
      onToggle={e => {
        if ((e.currentTarget as HTMLDetailsElement).open) void load()
      }}
    >
      <summary className="text-foreground flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
        Found in Samples
        {total != null && <CountBadge count={total} />}
      </summary>

      {state.kind === "loading" && (
        <p
          role="status"
          className="border-border text-muted-foreground border-t px-4 py-3 text-xs"
        >
          Loading…
        </p>
      )}
      {state.kind === "none" && (
        <p className="border-border text-muted-foreground border-t px-4 py-3 text-xs">
          No sample record.
        </p>
      )}
      {state.kind === "unavailable" && (
        <p
          role="status"
          className="border-border text-warning border-t px-4 py-3 text-xs"
        >
          Sample lookup unavailable.
        </p>
      )}
      {state.kind === "loaded" && <SamplesTable data={state.data} />}
    </details>
  )
}

function SamplesTable({ data }: { data: SequenceSamples }) {
  const shown = data.samples.length
  return (
    <div className="border-border border-t">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">BioSample</th>
              <th className="px-4 py-2 font-medium">Study</th>
              <th className="px-4 py-2 text-right font-medium">Runs</th>
              <th className="px-4 py-2 font-medium">Profile</th>
              <th className="px-4 py-2 font-medium">Isolation source</th>
              <th className="px-4 py-2 font-medium">Host</th>
              <th className="px-4 py-2 font-medium">Country</th>
              <th className="px-4 py-2 text-right font-medium">°C</th>
              <th className="px-4 py-2 text-right font-medium">pH</th>
              <th className="px-4 py-2 font-medium">Top species</th>
            </tr>
          </thead>
          <tbody>
            {data.samples.map(s => {
              const top = s.top_species?.[0]
              return (
                <tr key={s.biosample} className="border-border border-t">
                  <td className="px-4 py-1.5 font-mono">{s.biosample}</td>
                  <td
                    className="max-w-64 truncate px-4 py-1.5"
                    title={s.bioproject_title ?? undefined}
                  >
                    <span className="font-mono">{cell(s.bioproject)}</span>
                    {s.bioproject_title && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {s.bioproject_title}
                      </span>
                    )}
                  </td>
                  <td className="tabular px-4 py-1.5 text-right font-mono">
                    {cell(s.n_runs)}
                  </td>
                  <td className="px-4 py-1.5">
                    {s.profile ? (
                      <span className="inline-flex items-center gap-1.5">
                        {profileLabel(s.profile)}
                        {s.profile_evidence &&
                          s.profile_evidence !== "none" && (
                            <span className="border-chart-4/60 text-chart-4 text-2xs rounded-sm border px-1 font-mono leading-4">
                              {s.profile_evidence}
                            </span>
                          )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-1.5">{cell(s.isolation_source)}</td>
                  <td className="px-4 py-1.5">{cell(s.host)}</td>
                  <td className="px-4 py-1.5">{cell(s.country)}</td>
                  <td className="tabular px-4 py-1.5 text-right font-mono">
                    {s.temperature_c == null ? "—" : s.temperature_c.toFixed(0)}
                  </td>
                  <td className="tabular px-4 py-1.5 text-right font-mono">
                    {s.ph == null ? "—" : s.ph.toFixed(1)}
                  </td>
                  <td className="px-4 py-1.5">
                    {top ? (
                      <>
                        <span className="italic">{top[0]}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatPercent(top[1], 0)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {shown < data.n_biosamples && (
        <p className="border-border text-muted-foreground tabular text-2xs border-t px-4 py-2 font-mono">
          {shown.toLocaleString("en-US")} of{" "}
          {data.n_biosamples.toLocaleString("en-US")}, by runs
        </p>
      )}
    </div>
  )
}
