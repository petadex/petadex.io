import type { ReactNode } from "react"
import type { Evidence } from "@/lib/searchMetadata"
import { EvidenceBadge } from "./EvidenceBadge"

/** One labelled value in a record block. Absent values render as an em dash. */
export function Field({
  label,
  value,
  evidence = null,
  hideEmpty = false,
}: {
  label: string
  value: ReactNode
  evidence?: Evidence | null
  /** Render nothing, rather than an em dash, when the value is absent. */
  hideEmpty?: boolean
}) {
  // `false` covers the `cond && value` idiom at call sites.
  const empty =
    value === null || value === undefined || value === "" || value === false
  if (empty && hideEmpty) return null
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-2xs tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="min-w-0 break-words">{empty ? "—" : value}</span>
        {!empty && <EvidenceBadge evidence={evidence} />}
      </dd>
    </div>
  )
}
