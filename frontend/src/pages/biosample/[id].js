// src/pages/biosample/[id].js
//
// Client-only dynamic route /biosample/:id — one BioSample from the annotation
// layer (§4.3 of "02 Annotation Layer - Frontend"): the full attribute table, the
// "what this sample reports" chips, the profile with its evidence and in-universe
// flag, the SRA runs, and a keyset-paged list of the ORFs assembled from it.
//
//   GET /api/biosamples/:id              → { annotation | null, runs }
//   GET /api/biosamples/:id/sequences    → { sequences, next_after }
//
// `annotation: null` is not an error: the accession is outside the annotation
// snapshot, but its runs (and ORFs) can still exist, so both are rendered.
import React, { useEffect, useState, useCallback } from "react"
import { Link } from "gatsby"
import Seo from "../../components/seo"
import Container from "../../components/common/Container"
import config from "../../config"
import { useScrollHeader } from "../../hooks/useScrollHeader"
import ProfileBadge from "../../components/annotation/ProfileBadge"
import SamplePinMap from "../../components/annotation/SamplePinMap"
import CoordinateLinks from "../../components/annotation/CoordinateLinks"
import {
  EVIDENCE_META,
  ncbiBiosampleUrl,
  ncbiSraUrl,
} from "../../utils/annotation"

const PAGE_SIZE = 100

// "What this sample reports" chips.
const REPORT_CHIPS = [
  ["has_env", "Environment"],
  ["has_host", "Host"],
  ["has_geo", "Location"],
  ["has_time", "Collection time"],
  ["has_physical", "Physical measurements"],
]

// Attribute table, in display order. Profile fields and the has_* flags are
// shown in their own blocks above, so they are not repeated here.
const ATTRIBUTE_LABELS = {
  metagenome_label: "Metagenome label",
  env_broad_scale: "Biome (stated, env_broad_scale)",
  env_medium: "Environmental medium",
  isolation_source: "Isolation source",
  host: "Host",
  species: "Species",
  bioproject: "BioProject",
  n_bioprojects: "BioProjects",
  n_runs: "Runs",
  country_calc: "Country",
  continent_calc: "Continent",
  collection_year: "Collection year",
  temperature_c: "Temperature (stated, °C)",
  ph: "pH (stated)",
  salinity_psu: "Salinity (stated, PSU)",
  salinity_class: "Salinity class",
  depth_m: "Depth (m)",
  elevation_m: "Elevation (m)",
  library_source: "Library source",
  assay_type: "Assay type",
  feature_completeness: "Feature completeness",
  evidence_depth: "Evidence depth",
  snapshot_id: "Metadata snapshot",
}

const ITALIC = new Set(["species", "host", "metagenome_label"])

function Chip({ on, children }) {
  return (
    <span
      className={on ? "badge badge-success" : "badge badge-muted opacity-60"}
      title={on ? "Reported by the sample" : "Not reported by the sample"}
    >
      {on ? "✓" : "–"} {children}
    </span>
  )
}

function ProfileBlock({ a }) {
  const outOfUniverse = a.in_universe === false
  const unprofilable = a.profile === "unprofilable"
  return (
    <div className="card p-6">
      <span className="label">Environment profile</span>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {unprofilable ? (
          <span className="text-secondary-foreground">
            Sample has no environment description
          </span>
        ) : (
          <ProfileBadge
            profile={a.profile}
            source="own"
            evidence={a.profile_evidence}
          />
        )}
      </div>
      <dl className="mt-4 grid grid-cols-[160px_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Evidence</dt>
        <dd className="m-0">
          {a.profile_evidence}
          {EVIDENCE_META[a.profile_evidence] && (
            <span className="text-muted-foreground">
              {" "}
              — {EVIDENCE_META[a.profile_evidence].title}
            </span>
          )}
        </dd>
        {a.profile_source && (
          <>
            <dt className="text-muted-foreground">Derived from</dt>
            <dd className="m-0 font-mono">{a.profile_source}</dd>
          </>
        )}
        <dt className="text-muted-foreground">In universe</dt>
        <dd className="m-0">{a.in_universe ? "yes" : "no"}</dd>
      </dl>
      {outOfUniverse && !unprofilable && (
        <p className="mt-3 mb-0 p-3 rounded-lg border border-warning/30 bg-warning/5 text-sm text-secondary-foreground">
          Profiled from the submission form template alone; not a statement
          about the sample.
        </p>
      )}
    </div>
  )
}

function SequenceList({ id }) {
  const [rows, setRows] = useState([])
  const [nextAfter, setNextAfter] = useState(0) // 0 = first page; null = done
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadPage = useCallback(
    async after => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `${config.apiUrl}/biosamples/${encodeURIComponent(
            id
          )}/sequences?after=${after}&limit=${PAGE_SIZE}`
        )
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const data = await res.json()
        setRows(prev =>
          after === 0 ? data.sequences : [...prev, ...data.sequences]
        )
        setNextAfter(data.next_after)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [id]
  )

  useEffect(() => {
    setRows([])
    loadPage(0)
  }, [loadPage])

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-foreground m-0 mb-4">
        Sequences from this sample
      </h2>
      {rows.length === 0 && !loading && !error && (
        <p className="text-sm text-muted-foreground m-0">
          No corpus ORFs were assembled from this sample's runs.
        </p>
      )}
      {rows.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="bg-surface-raised text-left py-2 px-2.5 font-semibold">
                ORF
              </th>
              <th className="bg-surface-raised text-left py-2 px-2.5 font-semibold">
                Run
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.orf_id} className="hover:bg-surface-raised">
                <td className="py-1.5 px-2.5">
                  <Link
                    to={`/sequence/orf/${r.orf_id}`}
                    className="font-mono text-info hover:underline"
                  >
                    {r.orf_id}
                  </Link>
                </td>
                <td className="py-1.5 px-2.5 font-mono">{r.run}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </section>
  )
}

export default function BiosamplePage({ params }) {
  useScrollHeader()
  const id = params.id
  const [data, setData] = useState(null)
  const [status, setStatus] = useState("loading") // loading | ready | notfound | error
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    fetch(`${config.apiUrl}/biosamples/${encodeURIComponent(id)}`)
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) return setStatus("notfound")
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setErrorMsg(body.error || `Request failed (${res.status})`)
          return setStatus("error")
        }
        const body = await res.json()
        if (cancelled) return
        setData(body)
        setStatus("ready")
      })
      .catch(() => {
        if (cancelled) return
        setErrorMsg("Could not reach the server.")
        setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const a = data?.annotation ?? null
  const runs = data?.runs ?? []
  const attributes = a
    ? Object.keys(ATTRIBUTE_LABELS)
        .filter(k => a[k] != null && a[k] !== "")
        .map(k => [k, a[k]])
    : []

  return (
    <Container className="py-12 md:py-16 space-y-8">
      <header>
        <span className="label">BioSample</span>
        <h1 className="text-4xl font-semibold text-foreground m-0 font-mono">
          {id}
        </h1>
        <a
          href={ncbiBiosampleUrl(id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-info hover:underline"
        >
          View on NCBI BioSample ↗
        </a>
      </header>

      {status === "loading" && (
        <p className="text-muted-foreground italic">Loading BioSample…</p>
      )}
      {status === "notfound" && (
        <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl text-secondary-foreground">
          No annotation or SRA runs are recorded for{" "}
          <span className="font-mono">{id}</span>.
        </div>
      )}
      {status === "error" && (
        <div className="p-4 bg-error/5 border border-error/20 rounded-xl text-destructive">
          {errorMsg}
        </div>
      )}

      {status === "ready" && (
        <>
          {a ? (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <ProfileBlock a={a} />
                <div className="card p-6">
                  <span className="label">What this sample reports</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {REPORT_CHIPS.map(([k, label]) => (
                      <Chip key={k} on={a[k]}>
                        {label}
                      </Chip>
                    ))}
                  </div>
                  {a.feature_completeness && (
                    <p className="text-sm text-muted-foreground mt-4 mb-0">
                      Feature completeness:{" "}
                      <span className="text-foreground">
                        {a.feature_completeness}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {a.latitude != null && a.longitude != null && (
                <div className="flex flex-col gap-2">
                  <SamplePinMap latitude={a.latitude} longitude={a.longitude} />
                  <CoordinateLinks
                    latitude={a.latitude}
                    longitude={a.longitude}
                  />
                </div>
              )}

              <section className="card p-6">
                <h2 className="text-lg font-semibold text-foreground m-0 mb-4">
                  Attributes
                </h2>
                <dl className="grid grid-cols-[220px_1fr] gap-x-4 gap-y-2 text-sm m-0">
                  {attributes.map(([k, v]) => (
                    <React.Fragment key={k}>
                      <dt className="text-muted-foreground">
                        {ATTRIBUTE_LABELS[k]}
                      </dt>
                      <dd
                        className={`m-0 break-words ${
                          ITALIC.has(k) ? "italic" : ""
                        } ${k === "snapshot_id" ? "font-mono text-xs" : ""}`}
                      >
                        {String(v)}
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              </section>
            </>
          ) : (
            <div className="p-4 rounded-xl border border-border bg-surface-raised text-sm text-secondary-foreground">
              This BioSample is outside the annotation snapshot, so no
              environment profile is available. Its SRA runs are listed below.
            </div>
          )}

          <section className="card p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-foreground m-0 mb-4">
              SRA runs ({runs.length})
            </h2>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground m-0">
                No runs are linked to this sample in SRA metadata.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {[
                      "Run",
                      "Organism",
                      "Assay",
                      "Library source",
                      "Platform",
                      "Collection date",
                      "Released",
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
                  {runs.map(r => (
                    <tr key={r.run} className="hover:bg-surface-raised">
                      <td className="py-1.5 px-2.5">
                        <a
                          href={ncbiSraUrl(r.run)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-info hover:underline"
                        >
                          {r.run}
                        </a>
                      </td>
                      <td className="py-1.5 px-2.5 italic">
                        {r.organism || "-"}
                      </td>
                      <td className="py-1.5 px-2.5">{r.assay_type || "-"}</td>
                      <td className="py-1.5 px-2.5">
                        {r.library_source || "-"}
                      </td>
                      <td className="py-1.5 px-2.5">{r.platform || "-"}</td>
                      {/* Verbatim, as submitted — never parsed as a date. */}
                      <td className="py-1.5 px-2.5">
                        {r.collection_date || "-"}
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        {r.releasedate
                          ? String(r.releasedate).slice(0, 10)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <SequenceList id={id} />
        </>
      )}
    </Container>
  )
}

export const Head = ({ params }) => (
  <Seo
    title={`BioSample ${params?.id ?? ""}`}
    description={`Sample metadata, environment profile, SRA runs and corpus sequences for BioSample ${
      params?.id ?? ""
    } in PETadex.`}
  />
)
