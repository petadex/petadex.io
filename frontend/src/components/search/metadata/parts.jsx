// Small building blocks shared by the search-results metadata views.
import React from "react"
import {
  EVIDENCE_LABEL,
  ORIGIN_LABEL,
  ncbiUrl,
  doiUrl,
} from "../../../utils/searchMetadata"

// The label always carries the meaning; color only tells the five apart at a
// glance. Profile is dashed: it is a classification of the sample, not a value.
const EVIDENCE_CLASS = {
  stated: "text-info border-info/50",
  measured: "text-success border-success/50",
  organism_physiology: "text-warning border-warning/50",
  inferred: "text-accent border-accent/50",
  profile: "text-muted-foreground border-muted-foreground/60 border-dashed",
}

const EVIDENCE_TITLE = {
  stated: "Stated in the source record",
  measured: "Measured: counted or read from sequencing data",
  organism_physiology:
    "Physiology of the organism (BacDive), not a measurement of this enzyme",
  inferred: "Inferred by a model from other fields",
  profile: "Environment profile, sorted from the BioSample description",
}

export function EvidenceBadge({ evidence }) {
  if (!evidence || !EVIDENCE_LABEL[evidence]) return null
  return (
    <span
      className={`ml-1.5 inline-block whitespace-nowrap rounded-sm border px-1 align-[1px] font-mono text-2xs leading-4 ${EVIDENCE_CLASS[evidence]}`}
      title={EVIDENCE_TITLE[evidence]}
    >
      {EVIDENCE_LABEL[evidence]}
    </span>
  )
}

export function CountBadge({ children }) {
  return (
    <span className="rounded-full border border-border bg-surface-sunken px-2 text-sm font-normal tabular-nums text-secondary-foreground">
      {children}
    </span>
  )
}

export function SectionTitle({ title, count, as: Tag = "h3" }) {
  return (
    <Tag className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
      {title}
      {count != null && <CountBadge>{count}</CountBadge>}
    </Tag>
  )
}

/** Collapsible panel; the summary row holds the title and its count. */
export function Disclosure({
  title,
  count,
  defaultOpen = false,
  onToggle,
  children,
  ...rest
}) {
  return (
    <details
      className="group rounded-md border border-border bg-background"
      open={defaultOpen || undefined}
      onToggle={onToggle}
      {...rest}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="text-xs text-muted-foreground transition-transform group-open:rotate-90"
        >
          ▸
        </span>
        <SectionTitle title={title} count={count} />
      </summary>
      <div className="border-t border-border">{children}</div>
    </details>
  )
}

/** One label / value row of a record overview. Empty values render nothing. */
export function Field({ label, evidence, children }) {
  if (children == null || children === "" || children === false) return null
  return (
    <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-2 border-b border-border py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="wrap-anywhere">
        {children}
        <EvidenceBadge evidence={evidence} />
      </span>
    </div>
  )
}

export function NcbiLink({ kind, id }) {
  if (!id) return "—"
  return (
    <a
      href={ncbiUrl(kind, id)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-info hover:underline"
    >
      {id}
    </a>
  )
}

export function DoiLinks({ dois, max = 2 }) {
  if (!dois.length) return "—"
  return dois.slice(0, max).map(d => (
    <a
      key={d}
      href={doiUrl(d)}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-info hover:underline"
    >
      {d}
    </a>
  ))
}

/**
 * A hit id that opens its sequence record.
 *
 * TODO: these open a popout (SequenceRecord) only because the per-sequence
 * pages for the new dataset aren't built yet. Once they are, make this a link
 * to the hit's real sequence page in the database and drop the popout; the
 * alignment map rows (AlignmentView) and ResultsView's recordId state go with it.
 */
export function RecordLink({ id, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="cursor-pointer font-mono text-base font-semibold text-accent underline decoration-dotted underline-offset-2 hover:text-accent-hover"
    >
      {id}
    </button>
  )
}

export const thClass =
  "whitespace-nowrap border-b border-border bg-surface-raised px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-tighter text-muted-foreground"

export const tdClass = "border-b border-border px-2.5 py-2 align-top"

const ORIGIN_COLOR = {
  plasticome: "var(--origin-plasticome)",
  ncbi_nr: "var(--origin-ncbi-nr)",
  logan: "var(--origin-logan)",
}

/** Origin label with its color swatch. The text, not the color, names it. */
export function OriginTag({ db, className = "" }) {
  if (!db) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}
    >
      <i
        aria-hidden="true"
        className="inline-block h-2 w-2 shrink-0 rounded-xs"
        style={{ background: ORIGIN_COLOR[db] }}
      />
      {ORIGIN_LABEL[db] || db}
    </span>
  )
}
