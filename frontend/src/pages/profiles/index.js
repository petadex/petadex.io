// src/pages/profiles/index.js
//
// /profiles — the 21 environment profiles plus `unprofilable` (§4.5), from the
// precomputed profile_summary via GET /api/profiles. BioSample counts are split
// by evidence so it is clear how much of each class rests on a stated profile.
//
// Descriptions are an open content task (§2.5): no definition exists outside the
// rules in profile_rules.py. Add them to PROFILE_DESCRIPTIONS in utils/annotation.js (or as a
// profile_summary column) and they render on the cards automatically.
import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import Seo from "../../components/seo"
import Container from "../../components/common/Container"
import config from "../../config"
import { useScrollHeader } from "../../hooks/useScrollHeader"
import {
  profileLabel,
  profilePath,
  PROFILE_DESCRIPTIONS,
} from "../../utils/annotation"

const fmt = n => (n == null ? "—" : Number(n).toLocaleString())

const EVIDENCE_ROWS = [
  ["n_stated", "Stated"],
  ["n_inferred", "Inferred"],
  ["n_form_template", "From submission form"],
  ["n_none", "No description"],
]

function ProfileCard({ p }) {
  const description = p.description ?? PROFILE_DESCRIPTIONS[p.profile] ?? null
  return (
    <article className="card p-5 flex flex-col gap-3">
      <header>
        <h2 className="text-base font-semibold text-foreground m-0">
          <Link
            to={profilePath(p.profile)}
            className="text-foreground hover:text-info hover:underline"
          >
            {profileLabel(p.profile)}
          </Link>
        </h2>
        <span className="font-mono text-2xs text-muted-foreground">
          {p.profile}
        </span>
      </header>
      {description && (
        <p className="text-sm text-secondary-foreground m-0">{description}</p>
      )}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-primary tabular-nums">
          {fmt(p.n_biosamples)}
        </span>
        <span className="text-sm text-muted-foreground">BioSamples</span>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm m-0">
        {EVIDENCE_ROWS.filter(([k]) => p[k] > 0).map(([k, label]) => (
          <React.Fragment key={k}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="m-0 text-right tabular-nums">{fmt(p[k])}</dd>
          </React.Fragment>
        ))}
        <dt className="text-muted-foreground border-t border-border/60 pt-1">
          In universe
        </dt>
        <dd className="m-0 text-right tabular-nums border-t border-border/60 pt-1">
          {fmt(p.n_in_universe)}
        </dd>
        <dt className="text-muted-foreground">BioProjects</dt>
        <dd className="m-0 text-right tabular-nums">{fmt(p.n_bioprojects)}</dd>
      </dl>
    </article>
  )
}

export default function ProfilesPage() {
  useScrollHeader()
  const [profiles, setProfiles] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${config.apiUrl}/profiles`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(rows => !cancelled && setProfiles(rows))
      .catch(
        () => !cancelled && setError("Profiles are unavailable right now.")
      )
    return () => {
      cancelled = true
    }
  }, [])

  // `unprofilable` last: it is the absence of a profile, not a class.
  const ordered = profiles
    ? [
        ...profiles.filter(p => p.profile !== "unprofilable"),
        ...profiles.filter(p => p.profile === "unprofilable"),
      ]
    : []
  const snapshot = profiles?.[0]?.snapshot_id

  return (
    <Container className="py-12 md:py-16 space-y-8">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-semibold text-foreground m-0">
          Environment profiles
        </h1>
        <p className="text-muted-foreground mt-3">
          Every BioSample in the corpus is assigned one environment profile from
          its submitted metadata. A profile is only as strong as its evidence:
          stated in the record, inferred from other fields, or taken from the
          submission form template alone.
        </p>
      </header>

      {error && <p className="text-destructive">{error}</p>}
      {!profiles && !error && (
        <p className="text-muted-foreground italic">Loading profiles…</p>
      )}

      {profiles && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map(p => (
              <ProfileCard key={p.profile} p={p} />
            ))}
          </div>
          {snapshot && (
            <p className="text-2xs text-muted-foreground font-mono">
              metadata snapshot {snapshot}
            </p>
          )}
        </>
      )}
    </Container>
  )
}

export const Head = () => (
  <Seo
    title="Environment profiles"
    description="The environment profiles PETadex assigns to sequencing samples, with BioSample counts by evidence."
  />
)
