import type {
  LoganMetadata,
  NcbiNrMetadata,
  SearchHit,
  SearchResultMetadata,
} from "@/lib/api/types"
import {
  characterizedRelatives,
  clusterLabel,
  fieldEvidence,
  formatPercent,
  listValue,
  ORIGIN_LABEL,
} from "@/lib/searchMetadata"
import { Field } from "./Field"
import { CountBadge, SectionTitle } from "./SectionTitle"

function num(value: number | null | undefined, digits = 0, unit = "") {
  return value == null ? null : `${value.toFixed(digits)}${unit}`
}

function yesNo(value: boolean | null | undefined) {
  return value == null ? null : value ? "yes" : "no"
}

function OriginFields({ hit }: { hit: SearchHit }) {
  const ev = (field: string) => fieldEvidence(hit.origin, field)

  if (hit.origin === "logan") {
    const m = hit.metadata as LoganMetadata
    const tenvRange =
      m.tenv_q25 != null && m.tenv_q75 != null
        ? ` (${m.tenv_q25.toFixed(0)}–${m.tenv_q75.toFixed(0)})`
        : ""
    return (
      <>
        <Field
          label="Dominant environment"
          value={
            m.prof_dominant &&
            `${m.prof_dominant}${m.prof_dominant_share != null ? ` · ${formatPercent(m.prof_dominant_share, 0)}` : ""}`
          }
          evidence={ev("prof_dominant")}
        />
        <Field
          label="Environment temperature"
          value={m.tenv != null && `${m.tenv.toFixed(0)} °C${tenvRange}`}
          evidence={ev("tenv")}
        />
        <Field
          label="Environment pH"
          value={num(m.phenv, 1)}
          evidence={ev("phenv")}
        />
        <Field
          label="Measured temperature"
          value={
            m.meas_temp_median != null &&
            `${m.meas_temp_median.toFixed(0)} °C${m.meas_temp_n != null ? ` · n ${m.meas_temp_n}` : ""}`
          }
          evidence={ev("meas_temp_median")}
        />
        <Field
          label="Measured pH"
          value={num(m.meas_ph_median, 1)}
          evidence={ev("meas_ph_median")}
        />
      </>
    )
  }

  if (hit.origin === "ncbi_nr") {
    const m = hit.metadata as NcbiNrMetadata
    return (
      <>
        <Field
          label="Organism"
          value={
            m.organism &&
            `${m.organism}${m.lca_rank ? ` (${m.lca_rank})` : ""}${m.taxon_conflict ? " · taxon conflict" : ""}`
          }
          evidence={ev("organism")}
        />
        <Field
          label="Lineage"
          value={[m.superkingdom, m.phylum, m.genus]
            .filter(Boolean)
            .join(" › ")}
          evidence={ev("phylum")}
        />
        <Field
          label="Nearest characterized"
          value={
            m.nearest_pl &&
            `${m.nearest_pl}${m.pident_to_pl != null ? ` · ${m.pident_to_pl.toFixed(1)} %` : ""}`
          }
          evidence={ev("nearest_pl")}
        />
        <Field
          label="Isolation source"
          value={m.isolation_source}
          evidence={ev("isolation_source")}
        />
        <Field label="Host" value={m.host} evidence={ev("host")} />
        <Field label="Country" value={m.country} evidence={ev("country")} />
        <Field
          label="MAG fraction"
          value={m.frac_mag != null && formatPercent(m.frac_mag, 0)}
          evidence={ev("frac_mag")}
        />
        <Field
          label="Isolate genome"
          value={yesNo(m.any_isolate)}
          evidence={ev("any_isolate")}
        />
        <Field
          label="Environment profile"
          value={m.prof_dominant}
          evidence={ev("prof_dominant")}
        />
        <Field
          label="Optimum temperature"
          value={num(m.t_opt_c, 0, " °C")}
          evidence={ev("t_opt_c")}
        />
        <Field
          label="Optimum pH"
          value={num(m.ph_opt, 1)}
          evidence={ev("ph_opt")}
        />
        <Field label="Oxygen" value={m.oxygen} evidence={ev("oxygen")} />
      </>
    )
  }

  return null
}

/** Support counts: what the sequence was observed in, per origin. */
function SupportFields({ hit }: { hit: SearchHit }) {
  const ev = (field: string) => fieldEvidence(hit.origin, field)
  const fmt = (v: number | null | undefined) =>
    v == null ? null : v.toLocaleString("en-US")

  if (hit.origin === "logan") {
    const m = hit.metadata as LoganMetadata
    return (
      <>
        <Field
          label="Samples"
          value={
            m.n_biosamples != null &&
            `${fmt(m.n_biosamples)}${m.support_tier ? ` · ${m.support_tier}` : ""}`
          }
          evidence={ev("n_biosamples")}
        />
        <Field
          label="Studies"
          value={fmt(m.n_bioprojects)}
          evidence={ev("n_bioprojects")}
        />
        <Field label="Runs" value={fmt(m.n_runs)} evidence={ev("n_runs")} />
      </>
    )
  }
  if (hit.origin === "ncbi_nr") {
    const m = hit.metadata as NcbiNrMetadata
    return (
      <>
        <Field
          label="Assemblies"
          value={fmt(m.n_assemblies)}
          evidence={ev("n_assemblies")}
        />
        <Field
          label="Samples"
          value={fmt(m.n_biosamples)}
          evidence={ev("n_biosamples")}
        />
        <Field
          label="Accessions"
          value={fmt(m.n_accessions)}
          evidence={ev("n_accessions")}
        />
      </>
    )
  }
  return null
}

export function SequenceRecord({
  hit,
  hits,
  clusters,
}: {
  hit: SearchHit
  hits: SearchHit[]
  clusters: SearchResultMetadata["clusters"]
}) {
  const m = hit.metadata
  const nr = hit.origin === "ncbi_nr" ? (m as NcbiNrMetadata | null) : null
  const relatives = m ? characterizedRelatives(hit, hits, clusters) : []
  const nSamples =
    hit.origin === "logan"
      ? ((m as LoganMetadata | null)?.n_biosamples ?? null)
      : null

  return (
    <article aria-labelledby="record-title" className="space-y-6">
      <header className="flex flex-wrap items-baseline gap-3">
        <h2
          id="record-title"
          className="text-foreground font-mono text-lg font-semibold"
        >
          {hit.target_id}
        </h2>
        <span className="text-muted-foreground text-sm">
          {hit.origin ? ORIGIN_LABEL[hit.origin] : "—"} · rank {hit.rank}
        </span>
      </header>

      <dl className="border-border bg-surface-raised grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field
          label="Identity"
          value={`${hit.percent_identity.toFixed(1)} %`}
        />
        <Field
          label="Coverage"
          value={hit.query_coverage != null && `${hit.query_coverage} %`}
        />
        <Field
          label="Alignment"
          value={`${hit.query_start}–${hit.query_end} / ${hit.target_start}–${hit.target_end}`}
        />
        <Field
          label="E-value · bits"
          value={`${hit.evalue.toExponential(1)} · ${hit.bitscore.toFixed(0)}`}
        />
        {m && (
          <>
            <Field
              label="Catalytic core"
              value={
                m.n_cores != null &&
                `${m.n_cores}${nr?.core_complete != null ? ` · ${nr.core_complete ? "complete" : "partial"}` : ""}`
              }
              evidence={nr?.core_complete != null ? "stated" : null}
            />
            <Field
              label="Clusters 90 · 60 · 30"
              value={[m.c90, m.c60, m.c30]
                .map(c => clusterLabel(c) ?? "—")
                .join(" · ")}
            />
            <Field label="Component" value={m.component ?? null} />
            <SupportFields hit={hit} />
            <OriginFields hit={hit} />
          </>
        )}
      </dl>

      {m && (
        <details open className="border-border rounded-lg border">
          <summary className="cursor-pointer px-4 py-3">
            <span className="inline-flex">
              <SectionTitle
                as="h3"
                title="Characterized relatives"
                count={relatives.length}
              />
            </span>
          </summary>
          {relatives.length > 0 && (
            <div className="border-border overflow-x-auto border-t">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">ID</th>
                    <th className="px-4 py-2 font-medium">Enzyme</th>
                    <th className="px-4 py-2 font-medium">Substrates</th>
                    <th className="px-4 py-2 font-medium">EC</th>
                    <th className="px-4 py-2 font-medium">Organism</th>
                    <th className="px-4 py-2 font-medium">Structure</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Identity to query
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {relatives.map(({ id, member, hit: plHit }) => (
                    <tr key={id} className="border-border border-t">
                      <td className="px-4 py-1.5 font-mono">{id}</td>
                      <td className="px-4 py-1.5">
                        {listValue(member.enzyme_names).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-1.5">
                        {listValue(member.substrates).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-1.5 font-mono">
                        {listValue(member.ec).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-1.5 italic">
                        {member.organism ?? "—"}
                      </td>
                      <td className="px-4 py-1.5 font-mono">
                        {listValue(member.pdb).join(", ") ||
                          yesNo(member.has_structure) ||
                          "—"}
                      </td>
                      <td className="tabular px-4 py-1.5 text-right font-mono">
                        {plHit ? `${plHit.percent_identity.toFixed(1)} %` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      )}

      {hit.origin === "logan" && (
        <details className="border-border rounded-lg border">
          <summary className="text-foreground flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
            Found in Samples
            {nSamples != null && <CountBadge count={nSamples} />}
          </summary>
          {/* Slot: per-sequence sample lookup (GET /api/sequence/:id/samples, not built yet). */}
          <p className="border-border text-muted-foreground border-t px-4 py-3 text-xs">
            Not loaded
          </p>
        </details>
      )}
    </article>
  )
}
