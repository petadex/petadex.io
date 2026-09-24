// src/pages/profiles/[slug].js
//
// Client-only dynamic route /profiles/:slug — one environment profile and the
// BioSamples that carry it. Every profile badge on the site links here, so any
// profile shown on a sequence, search hit or cluster is one click from the other
// samples that share it (and from them, their sequences).
//
//   GET /api/profiles/:slug                            counts by evidence
//   GET /api/profiles/:slug/biosamples?after=&evidence=  keyset-paged, in universe
//
// Only in-universe BioSamples are listed: an out-of-universe profile rests on the
// submission form template alone and is not a statement about the sample. The
// evidence filter lives in the URL (?evidence=) so it survives back-navigation.
import React, { useCallback, useEffect, useState } from "react"
import { Link } from "gatsby"
import Seo from "../../components/seo"
import Container from "../../components/common/Container"
import config from "../../config"
import { useScrollHeader } from "../../hooks/useScrollHeader"
import {
  profileLabel,
  biosamplePath,
  EVIDENCE_META,
  PROFILE_DESCRIPTIONS,
} from "../../utils/annotation"

const PAGE_SIZE = 50

// Counts are of IN-UNIVERSE samples, matching the list. Stated and inferred are
// always in universe; profile_summary.n_form_template counts every form-template
// sample, so its in-universe share is derived.
const EVIDENCE_FILTERS = [
  { value: "", label: "All", count: p => p.n_in_universe },
  { value: "stated", label: "Stated", count: p => p.n_stated },
  { value: "inferred", label: "Inferred", count: p => p.n_inferred },
  {
    value: "form_template",
    label: "From submission form",
    count: p => Math.max(0, p.n_in_universe - p.n_stated - p.n_inferred),
  },
]

const fmt = n => (n == null ? "—" : Number(n).toLocaleString())

function readEvidenceParam() {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("evidence") || ""
}

function writeEvidenceParam(value) {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  if (value) url.searchParams.set("evidence", value)
  else url.searchParams.delete("evidence")
  window.history.replaceState(window.history.state, "", url)
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold text-primary tabular-nums">
        {value}
      </span>
    </div>
  )
}

function BiosampleTable({ slug, evidence }) {
  const [rows, setRows] = useState([])
  const [nextAfter, setNextAfter] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadPage = useCallback(
    async after => {
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams({ after, limit: String(PAGE_SIZE) })
        if (evidence) qs.set("evidence", evidence)
        const res = await fetch(
          `${config.apiUrl}/profiles/${encodeURIComponent(
            slug
          )}/biosamples?${qs}`
        )
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const data = await res.json()
        setRows(prev =>
          after === "" ? data.biosamples : [...prev, ...data.biosamples]
        )
        setNextAfter(data.next_after)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [slug, evidence]
  )

  useEffect(() => {
    setRows([])
    loadPage("")
  }, [loadPage])

  return (
    <>
      {rows.length === 0 && !loading && !error && (
        <p className="text-sm text-muted-foreground m-0">
          No BioSamples match this filter.
        </p>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {[
                  "BioSample",
                  "Evidence",
                  "Isolation source",
                  "Biome (stated)",
                  "Country",
                  "Year",
                  "Coordinates",
                ].map(h => (
                  <th
                    key={h}
                    className="bg-surface-raised text-left py-2 px-2.5 font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.biosample} className="hover:bg-surface-raised">
                  <td className="py-1.5 px-2.5 whitespace-nowrap">
                    <Link
                      to={biosamplePath(r.biosample)}
                      className="font-mono text-info hover:underline"
                    >
                      {r.biosample}
                    </Link>
                  </td>
                  <td
                    className="py-1.5 px-2.5 whitespace-nowrap"
                    title={EVIDENCE_META[r.profile_evidence]?.title}
                  >
                    {r.profile_evidence === "stated" ? (
                      "stated"
                    ) : (
                      <span className="italic text-muted-foreground">
                        {EVIDENCE_META[r.profile_evidence]?.marker ??
                          r.profile_evidence}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5">{r.isolation_source || "-"}</td>
                  <td className="py-1.5 px-2.5">{r.env_broad_scale || "-"}</td>
                  <td className="py-1.5 px-2.5 capitalize">
                    {r.country || "-"}
                  </td>
                  <td className="py-1.5 px-2.5 tabular-nums">
                    {r.collection_year ?? "-"}
                  </td>
                  <td className="py-1.5 px-2.5 text-muted-foreground">
                    {r.has_coordinates ? "yes" : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {rows.length.toLocaleString()} shown
          {nextAfter == null && rows.length > 0 ? " (all)" : ""}
        </span>
        {nextAfter != null && rows.length > 0 && (
          <button
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => loadPage(nextAfter)}
          >
            {loading ? "Loading…" : `Load ${PAGE_SIZE} more`}
          </button>
        )}
        {loading && rows.length === 0 && (
          <span className="text-muted-foreground italic">Loading…</span>
        )}
        {error && <span className="text-destructive">{error}</span>}
      </div>
    </>
  )
}

export default function ProfilePage({ params }) {
  useScrollHeader()
  const slug = params.slug
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState("loading") // loading | ready | notfound | error
  const [evidence, setEvidenceState] = useState(readEvidenceParam)
  const setEvidence = value => {
    setEvidenceState(value)
    writeEvidenceParam(value)
  }

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    fetch(`${config.apiUrl}/profiles/${encodeURIComponent(slug)}`)
      .then(async res => {
        if (cancelled) return
        if (res.status === 404 || res.status === 400)
          return setStatus("notfound")
        if (!res.ok) return setStatus("error")
        const body = await res.json()
        if (cancelled) return
        setProfile(body)
        setStatus("ready")
      })
      .catch(() => !cancelled && setStatus("error"))
    return () => {
      cancelled = true
    }
  }, [slug])

  const description = profile?.description ?? PROFILE_DESCRIPTIONS[slug] ?? null
  const isUnprofilable = slug === "unprofilable"

  return (
    <Container className="py-12 md:py-16 space-y-8">
      <div>
        <Link
          to="/profiles/"
          className="text-sm text-info no-underline hover:underline"
        >
          ← All environment profiles
        </Link>
        <span className="label block mt-4">Environment profile</span>
        <h1 className="text-4xl font-semibold text-foreground m-0">
          {profileLabel(slug)}
        </h1>
        <span className="font-mono text-xs text-muted-foreground">{slug}</span>
        {description && (
          <p className="text-secondary-foreground mt-3 max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {status === "loading" && (
        <p className="text-muted-foreground italic">Loading profile…</p>
      )}
      {status === "notfound" && (
        <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl text-secondary-foreground">
          There is no environment profile called{" "}
          <span className="font-mono">{slug}</span>.{" "}
          <Link to="/profiles/" className="text-info hover:underline">
            See all profiles
          </Link>
          .
        </div>
      )}
      {status === "error" && (
        <div className="p-4 bg-error/5 border border-error/20 rounded-xl text-destructive">
          This profile is unavailable right now.
        </div>
      )}

      {status === "ready" && profile && (
        <>
          <section className="card p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="BioSamples" value={fmt(profile.n_biosamples)} />
              <Stat label="In universe" value={fmt(profile.n_in_universe)} />
              <Stat
                label={isUnprofilable ? "No description" : "Stated"}
                value={fmt(isUnprofilable ? profile.n_none : profile.n_stated)}
              />
              <Stat label="BioProjects" value={fmt(profile.n_bioprojects)} />
            </div>
          </section>

          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground m-0">
                BioSamples with this profile
              </h2>
              {!isUnprofilable && (
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Filter by evidence"
                >
                  {EVIDENCE_FILTERS.filter(
                    f => f.value === "" || f.count(profile) > 0
                  ).map(f => (
                    <button
                      key={f.value || "all"}
                      className={
                        evidence === f.value
                          ? "badge badge-info cursor-pointer"
                          : "badge badge-muted cursor-pointer hover:text-foreground"
                      }
                      aria-pressed={evidence === f.value}
                      onClick={() => setEvidence(f.value)}
                    >
                      {f.label} · {fmt(f.count(profile))}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0 mb-4">
              In-universe samples only, ordered by accession. Open a BioSample
              to see its full metadata and the sequences assembled from it.
            </p>
            <BiosampleTable slug={slug} evidence={evidence} />
          </section>
        </>
      )}
    </Container>
  )
}

export const Head = ({ params }) => (
  <Seo
    title={`${profileLabel(params?.slug) ?? "Profile"} — environment profile`}
    description={`BioSamples in PETadex carrying the ${
      profileLabel(params?.slug) ?? ""
    } environment profile, with their evidence and source metadata.`}
  />
)
