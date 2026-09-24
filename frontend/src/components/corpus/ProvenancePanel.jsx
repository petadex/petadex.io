// frontend/src/components/corpus/ProvenancePanel.jsx
//
// Provenance is a FACT about where a sequence came from (origin tier + the
// external record it was assembled/derived from). It is stated plainly — never a
// homology/function claim. The block is dispatched on `orf_origin`
// (0=PAZy, 1=NR, 2=Logan) and rendered from whichever sub-object the backend
// populated (`sra` / `nr` / `pazy`). See "01 - Per-Sequence Annotation Plan"
// (fact vs. comparison) and "02 - Backend Routing Plan" (the orf_origin dispatch).
import React from "react"
import CoordinateLinks from "../annotation/CoordinateLinks"
import { Link } from "gatsby"
import { OriginRow as Row, ExtLink } from "../annotation/SourceSample"
import {
  biosamplePath,
  ncbiBioprojectUrl,
  ncbiSraUrl,
} from "../../utils/annotation"

export const ORIGIN_META = {
  0: {
    label: "PAZy",
    key: "pazy",
    blurb: "Curated PAZy entry — this sequence is that record.",
  },
  1: { label: "NR", key: "nr", blurb: "NCBI non-redundant protein." },
  2: {
    label: "Logan",
    key: "sra",
    blurb: "Assembled from an SRA run (Logan corpus).",
  },
}

// Friendly labels for the fields we know how to surface, in display order.
// Anything else the backend returns is shown generically below.
const FIELD_LABELS = {
  organism: "Organism",
  definition: "Definition",
  taxonomy: "Taxonomy",
  journal: "Journal",
  country: "Country",
  component: "Component",
  family: "Family",
  enzyme: "Enzyme",
  bioproject: "BioProject",
  biosample: "BioSample",
  geo_loc_country: "Geo. country",
  geo_loc_continent: "Geo. continent",
  collection_date: "Collection date",
  study: "SRA study",
  assay: "Assay",
  platform: "Platform",
}

const ITALIC_FIELDS = new Set(["organism", "taxonomy"])

/**
 * @param {{
 *   orfOrigin: number | null,
 *   provenance: Record<string, any> | null,
 * }} props
 */
// Identifier fields rendered as links: internal pages where PETadex has one,
// otherwise the NCBI record.
function linkedValue(k, v) {
  if (k === "biosample")
    return (
      <Link
        to={biosamplePath(v)}
        className="font-mono text-info hover:underline"
      >
        {v}
      </Link>
    )
  if (k === "bioproject")
    return (
      <>
        <span className="font-mono mr-3">{v}</span>
        <ExtLink href={ncbiBioprojectUrl(v)}>NCBI BioProject</ExtLink>
      </>
    )
  if (k === "study")
    return (
      <>
        <span className="font-mono mr-3">{v}</span>
        <ExtLink href={ncbiSraUrl(v)}>NCBI SRA</ExtLink>
      </>
    )
  return null
}

/**
 * @param {{ orfOrigin: number | null, provenance: object | null, hideCoordinates?: boolean }} props
 */
export function ProvenanceDetails({
  orfOrigin,
  provenance,
  hideCoordinates = false,
}) {
  const meta = ORIGIN_META[orfOrigin]

  if (!meta || !provenance) {
    return (
      <p className="text-sm text-muted-foreground m-0">
        Origin metadata is unavailable for this sequence.
      </p>
    )
  }

  // Backend folds the origin-specific fields under `sra`/`nr`/`pazy`; tolerate a
  // flat block too (thin normalization — see "03 - Frontend Wiring").
  const sub =
    (provenance[meta.key] && typeof provenance[meta.key] === "object"
      ? provenance[meta.key]
      : provenance) || {}

  const externalLink = provenance.external_link || provenance.ncbi_url || null
  const accession =
    provenance.genbank_accession_id ||
    provenance.library_id ||
    provenance.accession ||
    null

  // Locus fields that live on the top-level block for Logan ORFs.
  const locusBits = [
    provenance.contig != null ? `contig ${provenance.contig}` : null,
    provenance.orf_start != null && provenance.orf_end != null
      ? `${provenance.orf_start}–${provenance.orf_end}`
      : null,
  ].filter(Boolean)

  const knownEntries = Object.keys(FIELD_LABELS)
    .filter(k => sub[k] != null && sub[k] !== "")
    .map(k => [k, sub[k]])

  return (
    <div data-testid="provenance-details">
      <p className="text-sm text-muted-foreground mt-0 mb-4">{meta.blurb}</p>

      <div className="divide-y divide-border/60">
        {accession && (
          <Row label={meta.key === "sra" ? "Library / run" : "Accession"}>
            {externalLink ? (
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-info hover:underline break-all"
              >
                {accession}
              </a>
            ) : (
              <span className="font-mono break-all">{accession}</span>
            )}
          </Row>
        )}

        {locusBits.length > 0 && (
          <Row label="Locus">{locusBits.join(", ")}</Row>
        )}

        {knownEntries.map(([k, v]) => (
          <Row key={k} label={FIELD_LABELS[k]}>
            {linkedValue(k, String(v)) ?? (
              <span className={ITALIC_FIELDS.has(k) ? "italic" : undefined}>
                {String(v)}
              </span>
            )}
          </Row>
        ))}

        {sub.lat != null && sub.lon != null && !hideCoordinates && (
          <Row label="Coordinates (stated)">
            <CoordinateLinks latitude={sub.lat} longitude={sub.lon} />
          </Row>
        )}
      </div>

      {knownEntries.length === 0 && locusBits.length === 0 && !accession && (
        <p className="text-sm text-muted-foreground m-0">
          No additional origin metadata is recorded for this sequence.
        </p>
      )}
    </div>
  )
}

/** Standalone card form. The corpus sequence page shows ProvenanceDetails as a
 *  tab of OriginPanel instead. */
export default function ProvenancePanel({ orfOrigin, provenance }) {
  const meta = ORIGIN_META[orfOrigin]
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-foreground m-0">
          Provenance
        </h2>
        {meta && (
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            Source tier: {meta.label}
          </span>
        )}
      </div>
      <ProvenanceDetails orfOrigin={orfOrigin} provenance={provenance} />
    </section>
  )
}
