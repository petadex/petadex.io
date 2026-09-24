// frontend/src/components/annotation/ProfileBadge.jsx
//
// Environment profile + its evidence, always shown together. Stated, inferred and
// form-template profiles must look visibly different, and a profile borrowed from
// the hit's 90% cluster must say so — it is a statement about the cluster, not
// about this sequence's own sample. Every badge links to its profile page, so any
// profile shown anywhere is one click from the other samples that share it.
import React from "react"
import { Link } from "gatsby"
import {
  profileLabel,
  profilePath,
  EVIDENCE_META,
} from "../../utils/annotation"

const LINK_CLASS =
  "inline-flex items-center gap-1 whitespace-nowrap no-underline hover:opacity-80"

const pct = frac => (frac == null ? null : `${Math.round(frac * 100)}%`)

/**
 * @param {{
 *   profile: string | null,
 *   source?: "own" | "cluster" | null,
 *   evidence?: string | null,
 *   clusterFrac?: number | null,
 *   clusterNProfiled?: number | null,
 * }} props
 */
export default function ProfileBadge({
  profile,
  source = "own",
  evidence = null,
  clusterFrac = null,
  clusterNProfiled = null,
}) {
  if (!profile) return null
  const label = profileLabel(profile)

  if (source === "cluster") {
    const share = pct(clusterFrac)
    const title =
      `Dominant profile of this sequence's 90% cluster` +
      (share ? ` (${share} of ` : "") +
      (share && clusterNProfiled != null
        ? `${clusterNProfiled.toLocaleString()} profiled ORFs)`
        : share
        ? "profiled ORFs)"
        : "") +
      ". The sequence's own sample has no usable profile."
    return (
      <Link
        to={profilePath(profile)}
        className={LINK_CLASS}
        title={title}
        data-profile-source="cluster"
      >
        <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          cluster
        </span>
        <span className="badge badge-muted border-dashed italic">{label}</span>
      </Link>
    )
  }

  const meta = EVIDENCE_META[evidence] ?? EVIDENCE_META.stated
  const style =
    evidence === "inferred"
      ? "badge badge-muted border-dashed"
      : evidence === "form_template"
      ? "badge badge-warning border-dotted"
      : evidence === "none"
      ? "badge badge-muted"
      : "badge badge-info"

  return (
    <Link
      to={profilePath(profile)}
      className={LINK_CLASS}
      title={meta.title}
      data-profile-source="own"
      data-profile-evidence={evidence ?? ""}
    >
      <span className={style}>{label}</span>
      {meta.marker && (
        <span className="text-2xs text-muted-foreground italic">
          {meta.marker}
        </span>
      )}
    </Link>
  )
}
