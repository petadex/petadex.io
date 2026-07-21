import React from "react"
import { Link } from "gatsby"

/**
 * Placeholder until Denis delivers BacDrive CSV + join key.
 */
export default function BacDriveStub({ entityLabel = "this record" }) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-surface-raised p-5">
      <h3 className="text-base font-semibold text-foreground m-0 mb-2">
        BacDrive enrichment
      </h3>
      <p className="text-sm text-muted-foreground m-0">
        BacDrive / BacDive annotations for {entityLabel} are pending Denis&apos;s
        CSV upload and join key (biosample or organism). SRA metadata below is
        live from <span className="font-mono text-xs">sra_metadata</span>.
      </p>
    </section>
  )
}

export function NcbiLink({ href, children }) {
  if (!href) return <span>{children}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-info hover:underline break-all"
    >
      {children}
    </a>
  )
}

export function OrganismLink({ organism }) {
  if (!organism) return null
  return (
    <Link
      to={`/organism/${encodeURIComponent(organism)}`}
      className="italic text-info border-b border-transparent hover:border-info"
    >
      {organism}
    </Link>
  )
}

export function BiosampleLink({ biosample }) {
  if (!biosample) return null
  return (
    <Link
      to={`/biosample/${encodeURIComponent(biosample)}`}
      className="font-mono text-info border-b border-transparent hover:border-info break-all"
    >
      {biosample}
    </Link>
  )
}

export function SraRunLink({ acc }) {
  if (!acc) return null
  return (
    <Link
      to={`/sra/${encodeURIComponent(acc)}`}
      className="font-mono text-info border-b border-transparent hover:border-info break-all"
    >
      {acc}
    </Link>
  )
}

/** Key/value grid for an SRA metadata object. */
export function SraMetaTable({ rows }) {
  const entries = (rows || []).filter(
    ([, v]) => v != null && v !== "" && v !== "uncalculated"
  )
  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground m-0">No metadata fields.</p>
    )
  }
  return (
    <div className="divide-y divide-border/60">
      {entries.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[160px_1fr] gap-3 py-2 text-sm"
        >
          <div className="font-medium text-muted-foreground">{label}</div>
          <div className="text-foreground break-words">{value}</div>
        </div>
      ))}
    </div>
  )
}

export function OrfList({ orfs, empty = "No PETadex ORFs linked to this run." }) {
  if (!orfs?.length) {
    return <p className="text-sm text-muted-foreground m-0">{empty}</p>
  }
  return (
    <ul className="m-0 p-0 list-none divide-y divide-border/60">
      {orfs.map(o => (
        <li key={o.orf_id} className="py-2 flex flex-wrap gap-3 text-sm">
          <Link
            to={`/sequence/orf/${o.orf_id}`}
            className="font-mono text-info hover:underline"
          >
            ORF {o.orf_id}
          </Link>
          {o.contig != null && (
            <span className="text-muted-foreground">contig {o.contig}</span>
          )}
          {o.orf_start != null && o.orf_end != null && (
            <span className="text-muted-foreground">
              {o.orf_start}–{o.orf_end}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
