import { EVIDENCE_LABEL, type Evidence } from "@/lib/searchMetadata"

/**
 * How a value is known. Each class keeps its own outline treatment so the
 * badge never relies on color alone: the label is always printed.
 */
const STYLE: Record<Evidence, string> = {
  stated: "border-border-strong text-foreground",
  measured: "border-info/60 text-info",
  organism_physiology: "border-success/60 text-success",
  inferred: "border-warning/60 text-warning border-dashed",
  profile: "border-chart-4/60 text-chart-4",
}

export function EvidenceBadge({ evidence }: { evidence: Evidence | null }) {
  if (!evidence) return null
  return (
    <span
      className={`text-2xs inline-flex shrink-0 items-center rounded-sm border px-1 font-mono leading-4 whitespace-nowrap ${STYLE[evidence]}`}
    >
      {EVIDENCE_LABEL[evidence]}
    </span>
  )
}
