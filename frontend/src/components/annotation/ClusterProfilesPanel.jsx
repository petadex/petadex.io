// frontend/src/components/annotation/ClusterProfilesPanel.jsx
//
// Environment-profile distribution of a 90% cluster (§4.4), backed by
// GET /api/clusters/:pid90/profiles. Joined onto the block_90pid view the cluster
// page already shows (pid90 = cluster_id).
//
// Form: one horizontal bar per profile, sorted, single hue. A cluster can span
// 21 profiles, far past what a categorical palette can keep distinguishable, and
// the job here is magnitude per named profile, which bars in one hue do cleanly.
// `unprofilable` ORFs are reported as a count, not a bar — they usually dwarf the
// profiled ones and would flatten every other bar to nothing.
//
// The specialist/generalist (entropy) badge is gated on n_orfs_profiled ≥ a size
// floor: most single-profile clusters hold exactly one profiled ORF, so their
// entropy is 0 by construction. The floor is an open decision, so until it is set
// (SPECIALIST_BADGE_FLOOR = null) the badge is not rendered at all.
import React, { useEffect, useState } from "react"
import config from "../../config"
import { Link } from "gatsby"
import { profileLabel, profilePath } from "../../utils/annotation"

// TODO(decision, §9): set the n_orfs_profiled floor for the specialist badge.
export const SPECIALIST_BADGE_FLOOR = null

export function showSpecialistBadge(summary, floor = SPECIALIST_BADGE_FLOOR) {
  return (
    floor != null &&
    summary?.n_orfs_profiled != null &&
    summary.n_orfs_profiled >= floor
  )
}

const fmt = n => (n == null ? "—" : Number(n).toLocaleString())

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-primary">{value}</span>
    </div>
  )
}

/** @param {{ pid90: string | number }} props */
export default function ClusterProfilesPanel({ pid90 }) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState("loading") // loading | ready | absent | error

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    fetch(`${config.apiUrl}/clusters/${encodeURIComponent(pid90)}/profiles`)
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) return setStatus("absent")
        if (!res.ok) return setStatus("error")
        const body = await res.json()
        if (cancelled) return
        setData(body)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [pid90])

  const header = (
    <h2 className="text-lg font-semibold text-foreground m-0 mb-1">
      Environment profiles
    </h2>
  )

  if (status !== "ready") {
    return (
      <section className="card p-6">
        {header}
        <p className="text-sm text-muted-foreground m-0">
          {status === "loading"
            ? "Loading environment profiles…"
            : status === "absent"
            ? "This cluster is not in the annotation snapshot."
            : "Environment profiles are unavailable right now."}
        </p>
      </section>
    )
  }

  // §6 state 6: NULL means no linked ORF — never shown as 0.
  if (data.n_orfs == null) {
    return (
      <section className="card p-6" data-cluster-state="no-provenance">
        {header}
        <p className="text-sm text-secondary-foreground m-0">
          No environmental provenance — none of this cluster's ORFs link to a
          sequencing sample.
        </p>
      </section>
    )
  }

  const profiled = data.distribution.filter(d => d.profile !== "unprofilable")
  const unprofilable = data.distribution.find(d => d.profile === "unprofilable")
  const max = Math.max(1, ...profiled.map(d => d.n_orfs || 0))

  return (
    <section className="card p-6" data-testid="cluster-profiles">
      <div className="flex items-center justify-between gap-3">
        {header}
        {showSpecialistBadge(data) && (
          <span
            className="badge badge-info"
            title={`Shannon entropy ${data.shannon_entropy?.toFixed(
              2
            )} over ${fmt(data.n_orfs_profiled)} profiled ORFs`}
            data-testid="specialist-badge"
          >
            {data.n_profiles === 1 ? "Single-profile" : "Multi-profile"}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-0 mb-4">
        Environment profiles of the samples this cluster's ORFs were assembled
        from.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat label="ORFs" value={fmt(data.n_orfs)} />
        <Stat label="Profiled ORFs" value={fmt(data.n_orfs_profiled)} />
        <Stat label="Profiles" value={fmt(data.n_profiles)} />
        <Stat
          label="Dominant"
          value={
            data.dominant_profile
              ? `${profileLabel(data.dominant_profile)}${
                  data.dominant_frac != null
                    ? ` · ${Math.round(data.dominant_frac * 100)}%`
                    : ""
                }`
              : "—"
          }
        />
      </div>

      {profiled.length > 0 ? (
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {profiled.map(d => (
            <li
              key={d.profile}
              className="grid grid-cols-[10rem_1fr_6rem] items-center gap-3 text-sm"
              title={`${profileLabel(d.profile)}: ${fmt(
                d.n_orfs
              )} ORFs from ${fmt(d.n_biosamples)} BioSamples in ${fmt(
                d.n_bioprojects
              )} BioProjects`}
            >
              <Link
                to={profilePath(d.profile)}
                className="text-secondary-foreground truncate hover:text-info hover:underline"
              >
                {profileLabel(d.profile)}
              </Link>
              <span className="h-2 bg-surface-sunken rounded-sm overflow-hidden">
                <span
                  className="block h-full bg-accent rounded-r"
                  style={{
                    width: `${Math.max(0.5, ((d.n_orfs || 0) / max) * 100)}%`,
                  }}
                />
              </span>
              <span className="text-right text-muted-foreground tabular-nums">
                {fmt(d.n_orfs)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground m-0">
          None of this cluster's samples carry an environment description.
        </p>
      )}

      {unprofilable?.n_orfs > 0 && (
        <p className="text-xs text-muted-foreground mt-4 mb-0">
          Plus {fmt(unprofilable.n_orfs)} ORFs from samples with no environment
          description.
        </p>
      )}
    </section>
  )
}
