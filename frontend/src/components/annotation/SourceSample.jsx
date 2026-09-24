// frontend/src/components/annotation/SourceSample.jsx
//
// "Source sample" content for the corpus sequence page (§4.2): where this
// sequence came from (run → BioSample) and what kind of place that was (profile +
// its evidence). Built around provenance and profile, not physical measurements —
// stated temperature/pH exist for ~2 % / ~0.7 % of hits and are a bonus row.
// Backed by GET /api/sequences/:orfId/provenance (one row, never a 404).
//
// Rendered as a tab of OriginPanel, which owns the card, the tabs and the map;
// this file supplies the fetch hook and the field list.
import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import config from "../../config"
import ProfileBadge from "./ProfileBadge"
import CoordinateLinks from "./CoordinateLinks"
import {
  PROVENANCE_STATES,
  resolveProfile,
  ncbiSraUrl,
  ncbiBiosampleUrl,
  ncbiBioprojectUrl,
  biosamplePath,
  clusterPath,
} from "../../utils/annotation"

export function OriginRow({ label, children }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4 py-3 border-b border-border/60 last:border-b-0">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-base text-foreground break-words">{children}</div>
    </div>
  )
}

export const ExtLink = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-info hover:underline whitespace-nowrap"
  >
    {children} ↗
  </a>
)

/**
 * @returns {{ row: object | null, status: "loading" | "ready" | "error" }}
 */
export function useSourceSample(orfId) {
  const [row, setRow] = useState(null)
  const [status, setStatus] = useState("loading")

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    fetch(
      `${config.apiUrl}/sequences/${encodeURIComponent(
        String(orfId)
      )}/provenance`
    )
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(data => {
        if (cancelled) return
        setRow(data)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [orfId])

  return { row, status }
}

/**
 * @param {{ row: object | null, status: string, hideCoordinates?: boolean }} props
 *   hideCoordinates: the host already shows the coordinates beside its map.
 */
export function SourceSampleDetails({ row, status, hideCoordinates = false }) {
  if (status !== "ready" || !row) {
    return (
      <p className="text-sm text-muted-foreground m-0">
        {status === "loading"
          ? "Loading sample metadata…"
          : "Sample metadata is unavailable right now."}
      </p>
    )
  }

  const resolved = resolveProfile(row)
  const stateMeta = PROVENANCE_STATES[resolved.state]
  const hasPin = row.latitude != null && row.longitude != null
  const snapshotShowsProfile =
    resolved.state === "profiled" ||
    resolved.state === "unprofilable" ||
    resolved.state === "form_template_only"

  return (
    <div data-testid="source-sample-card">
      <p className="text-sm text-muted-foreground mt-0 mb-4">
        Metadata submitted with the sequencing run this ORF was assembled from.
      </p>

      {stateMeta.copy && (
        <div
          className="mb-4 p-3 rounded-lg border border-border bg-surface-raised text-sm text-secondary-foreground"
          data-provenance-state={resolved.state}
        >
          {stateMeta.copy}
          {stateMeta.detail && (
            <span className="text-muted-foreground"> — {stateMeta.detail}</span>
          )}
        </div>
      )}

      <div className="divide-y divide-border/60">
        {row.run && (
          <OriginRow label="Run">
            <span className="font-mono mr-3">{row.run}</span>
            <ExtLink href={ncbiSraUrl(row.run)}>NCBI SRA</ExtLink>
          </OriginRow>
        )}
        {row.biosample && (
          <OriginRow label="BioSample">
            <Link
              to={biosamplePath(row.biosample)}
              className="font-mono text-info hover:underline mr-3 break-all"
            >
              {row.biosample}
            </Link>
            <ExtLink href={ncbiBiosampleUrl(row.biosample)}>
              NCBI BioSample
            </ExtLink>
          </OriginRow>
        )}
        {row.bioproject && (
          <OriginRow label="BioProject">
            <span className="font-mono mr-3">{row.bioproject}</span>
            <ExtLink href={ncbiBioprojectUrl(row.bioproject)}>
              NCBI BioProject
            </ExtLink>
          </OriginRow>
        )}
        {row.organism && (
          <OriginRow label="Organism">
            <span className="italic">{row.organism}</span>
          </OriginRow>
        )}
        {row.country && <OriginRow label="Country">{row.country}</OriginRow>}
        {row.collection_date && (
          // Raw text as submitted — a year, a range, or ISO. Never parsed.
          <OriginRow label="Collection date">{row.collection_date}</OriginRow>
        )}
        {row.isolation_source && (
          <OriginRow label="Isolation source">{row.isolation_source}</OriginRow>
        )}
        {/* The biome as the submitter stated it (ENVO env_broad_scale) — not
            the geocoded WWF ecoregion, which is never shown (§5). */}
        {row.env_broad_scale && (
          <OriginRow label="Biome (stated)">{row.env_broad_scale}</OriginRow>
        )}
        {row.env_medium && (
          <OriginRow label="Environmental medium">{row.env_medium}</OriginRow>
        )}
        {hasPin && !hideCoordinates && (
          <OriginRow label="Coordinates (stated)">
            <CoordinateLinks
              latitude={row.latitude}
              longitude={row.longitude}
            />
          </OriginRow>
        )}

        <OriginRow label="Environment profile">
          {resolved.profile ? (
            <span className="inline-flex flex-col gap-1">
              <ProfileBadge {...resolved} />
              {resolved.source === "own" && row.in_universe === true && (
                <span className="text-xs text-muted-foreground">
                  Evidence: {row.profile_evidence}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {snapshotShowsProfile
                ? "No environment profile"
                : "Not available"}
            </span>
          )}
        </OriginRow>

        {row.stated_temperature_c != null && (
          <OriginRow label="Temperature (stated)">
            {row.stated_temperature_c} °C
          </OriginRow>
        )}
        {row.stated_ph != null && (
          <OriginRow label="pH (stated)">{row.stated_ph}</OriginRow>
        )}

        {row.pid90 != null && (
          <OriginRow label="90% cluster">
            <Link
              to={clusterPath(row.pid90)}
              className="font-mono text-info hover:underline"
            >
              {row.pid90}
            </Link>
          </OriginRow>
        )}
      </div>

      {row.snapshot_id && (
        <p className="text-2xs text-muted-foreground mt-4 mb-0 font-mono">
          metadata snapshot {row.snapshot_id}
        </p>
      )}
    </div>
  )
}
