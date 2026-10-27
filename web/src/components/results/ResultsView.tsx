"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { isJobId } from "@/lib/api/search"
import type { SearchHit } from "@/lib/api/types"
import {
  enrichmentStatus,
  hasEnrichment,
  relativeHits,
} from "@/lib/searchMetadata"
import { useSearchPoll, type SearchPollState } from "@/lib/useSearchPoll"
import { EnvironmentsChart } from "./EnvironmentsChart"
import { RelativesTable } from "./RelativesTable"
import { CountBadge } from "./SectionTitle"
import { SequenceRecord } from "./SequenceRecord"

/** The stored depth. Summary counts cover all stored hits, so the table does too. */
const MAX_RESULTS = 500

type View = "relatives" | "environments" | "record"

function Status({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="text-muted-foreground py-16 text-sm">
      {children}
    </p>
  )
}

export function ResultsView() {
  const job = useSearchParams().get("job")
  if (!isJobId(job)) return <Status>No search job.</Status>
  return <ResultsForJob key={job} jobId={job} />
}

function ResultsForJob({ jobId }: { jobId: string }) {
  const state = useSearchPoll(jobId, MAX_RESULTS)
  if (state.kind !== "completed") return <PendingState state={state} />
  return <CompletedResult result={state.result} />
}

function PendingState({
  state,
}: {
  state: Exclude<SearchPollState, { kind: "completed" }>
}) {
  switch (state.kind) {
    case "loading":
      return <Status>Loading…</Status>
    case "processing":
      return <Status>Searching…</Status>
    case "not_found":
      return <Status>Result not found or expired.</Status>
    case "timed_out":
      return <Status>No stored result yet.</Status>
    case "failed":
      return <Status>Search failed: {state.error}</Status>
  }
}

function CompletedResult({
  result,
}: {
  result: Extract<SearchPollState, { kind: "completed" }>["result"]
}) {
  const { results: hits, metadata } = result
  const status = enrichmentStatus(metadata)
  const showMetadata = hasEnrichment(status)
  const relatives = useMemo(() => relativeHits(hits), [hits])
  const environments = showMetadata
    ? (metadata.summary?.environments ?? null)
    : null

  const [view, setView] = useState<View>("relatives")
  const [selected, setSelected] = useState<SearchHit | null>(null)

  function select(hit: SearchHit) {
    setSelected(hit)
    setView("record")
  }

  const tabs: { id: View; label: string; count?: number; hidden?: boolean }[] =
    [
      { id: "relatives", label: "Relatives", count: relatives.length },
      {
        id: "environments",
        label: "Environments",
        count: environments?.n_sequences,
        hidden: !environments?.profiles.length,
      },
      { id: "record", label: "Sequence record", hidden: !selected },
    ]

  const facts = [
    metadata.query_length != null && `${metadata.query_length} aa query`,
    metadata.database_release && `Release ${metadata.database_release}`,
    metadata.database_size != null &&
      `${metadata.database_size.toLocaleString("en-US")} sequences`,
    metadata.search_time_ms != null &&
      `${(metadata.search_time_ms / 1000).toFixed(1)} s`,
    `${metadata.num_results.toLocaleString("en-US")} hits`,
    showMetadata &&
      metadata.metadata_version &&
      `Metadata ${metadata.metadata_version}`,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {metadata.query_header || "Search results"}
        </h1>
        <p className="text-muted-foreground tabular font-mono text-xs">
          {facts.join(" · ")}
        </p>
        {status === "failed" && (
          <p role="status" className="text-warning text-xs">
            Metadata lookup failed.
          </p>
        )}
      </header>

      <div
        role="tablist"
        aria-label="Result views"
        className="border-border flex gap-1 border-b"
      >
        {tabs
          .filter(t => !t.hidden)
          .map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={view === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setView(tab.id)}
              className={`-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-sm ${
                view === tab.id
                  ? "border-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              {tab.label}
              {tab.count != null && <CountBadge count={tab.count} />}
            </button>
          ))}
      </div>

      <div role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`}>
        {view === "relatives" && (
          <RelativesTable
            hits={relatives}
            showMetadata={showMetadata}
            selectedId={selected?.target_id ?? null}
            onSelect={select}
          />
        )}
        {view === "environments" && environments && (
          <EnvironmentsChart
            environments={environments}
            hits={hits}
            onSelect={select}
          />
        )}
        {view === "record" && selected && (
          <SequenceRecord
            hit={selected}
            hits={hits}
            clusters={showMetadata ? metadata.clusters : null}
          />
        )}
      </div>
    </div>
  )
}
