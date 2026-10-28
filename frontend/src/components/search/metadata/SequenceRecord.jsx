// Sequence record: what the metadata store holds about one hit. An overview of
// its fields, each with its evidence class; the characterized enzymes of its
// 90 % and 60 % clusters; and, for Logan hits, the BioSamples it was found in.
import React, { useState } from "react"
import config from "../../../config"
import { alignedColumns } from "../../../utils/alignment"
import {
  characterizedRelatives,
  clusterLabel,
  fieldEvidence,
  formatNumber,
  formatPercent,
  listValue,
  profileName,
  support,
  yesNo,
} from "../../../utils/searchMetadata"
import {
  DoiLinks,
  Disclosure,
  EvidenceBadge,
  Field,
  NcbiLink,
  OriginTag,
  tdClass,
  thClass,
} from "./parts"

const range = (lo, hi, digits) =>
  lo == null || hi == null || lo === hi
    ? ""
    : ` (IQR ${formatNumber(lo, digits)}–${formatNumber(hi, digits)})`

function AlignmentFields({ hit }) {
  return (
    <>
      <Field label="Origin">
        {hit.db ? <OriginTag db={hit.db} /> : hit.origin || "—"}
      </Field>
      <Field label="Identity to query">
        {hit.identity?.toFixed(1)} % over {hit.query_coverage ?? "—"} % of the
        query ({hit.query_start}–{hit.query_end}), e-value{" "}
        {hit.evalue === 0 ? "0" : hit.evalue?.toExponential(1)}
      </Field>
      <Field label="Length">
        {hit.target_sequence
          ? `${hit.target_sequence.length.toLocaleString("en-US")} aa`
          : null}
      </Field>
      <Field label="Clusters">
        {hit.card && (hit.card.c90 || hit.card.c60 || hit.card.c30) ? (
          <span className="font-mono">
            {[
              ["c90", "90 %"],
              ["c60", "60 %"],
              ["c30", "30 %"],
            ]
              .filter(([k]) => hit.card[k])
              .map(([k, l]) => `${clusterLabel(hit.card[k])} (${l})`)
              .join(" · ")}
          </span>
        ) : null}
      </Field>
    </>
  )
}

function LoganFields({ c }) {
  const ev = f => fieldEvidence("logan", f)
  const s = support({ db: "logan", card: c })
  return (
    <>
      <Field label="Seen in" evidence={ev("n_biosamples")}>
        {s.text &&
          `${s.text}${
            c.n_runs != null
              ? `, ${formatNumber(c.n_runs)} run${c.n_runs === 1 ? "" : "s"}`
              : ""
          }`}
      </Field>
      <Field label="Support tier" evidence={ev("support_tier")}>
        {c.support_tier && (
          <>
            {c.support_tier}{" "}
            <span className="text-xs text-muted-foreground">
              (singleton = 1 BioSample, low &lt; 5, moderate &lt; 50, high ≥ 50)
            </span>
          </>
        )}
      </Field>
      <Field label="Dominant profile" evidence={ev("prof_dominant")}>
        {c.prof_dominant &&
          `${profileName(c.prof_dominant)}${
            c.prof_dominant_share != null
              ? `, ${formatPercent(c.prof_dominant_share, 0)} of its samples`
              : ""
          }`}
      </Field>
      <Field label="Measured temperature" evidence={ev("meas_temp_median")}>
        {c.meas_temp_median != null &&
          `${formatNumber(c.meas_temp_median, 1)} °C median of ${
            c.meas_temp_n
          } sample${c.meas_temp_n === 1 ? "" : "s"}`}
      </Field>
      <Field label="Measured pH" evidence={ev("meas_ph_median")}>
        {c.meas_ph_median != null && formatNumber(c.meas_ph_median, 1)}
      </Field>
      <Field label="Environment temperature" evidence={ev("tenv")}>
        {c.tenv != null &&
          `${formatNumber(c.tenv, 1)} °C${range(c.tenv_q25, c.tenv_q75, 1)}`}
      </Field>
      <Field label="Environment pH" evidence={ev("phenv")}>
        {c.phenv != null && formatNumber(c.phenv, 1)}
      </Field>
    </>
  )
}

function NrFields({ c }) {
  const ev = f => fieldEvidence("ncbi_nr", f)
  const lineage = [c.superkingdom, c.phylum, c.genus].filter(Boolean)
  return (
    <>
      <Field label="Organism" evidence={ev("organism")}>
        {c.organism && (
          <>
            <em>{c.organism}</em>
            {c.lca_rank && (
              <span className="text-muted-foreground"> ({c.lca_rank})</span>
            )}
          </>
        )}
      </Field>
      <Field label="Lineage" evidence={ev("phylum")}>
        {lineage.length ? lineage.join(" › ") : null}
      </Field>
      <Field label="Catalytic core" evidence={ev("core_complete")}>
        {c.core_complete == null
          ? null
          : c.core_complete
          ? "complete"
          : "incomplete"}
      </Field>
      <Field label="Protein records" evidence={ev("n_accessions")}>
        {c.n_accessions != null && formatNumber(c.n_accessions)}
      </Field>
      <Field label="Genomes" evidence={ev("n_assemblies")}>
        {c.n_assemblies != null &&
          `${formatNumber(c.n_assemblies)} assembl${
            c.n_assemblies === 1 ? "y" : "ies"
          }${
            c.frac_mag != null
              ? `, ${formatPercent(c.frac_mag, 0)} metagenome-assembled`
              : ""
          }`}
      </Field>
      <Field label="Isolation source" evidence={ev("isolation_source")}>
        {c.isolation_source}
      </Field>
      <Field label="Host" evidence={ev("host")}>
        {c.host}
      </Field>
      <Field label="Country" evidence={ev("country")}>
        {c.country}
      </Field>
      <Field label="Dominant profile" evidence={ev("prof_dominant")}>
        {profileName(c.prof_dominant)}
      </Field>
      <Field label="Nearest Plasticome" evidence={ev("nearest_pl")}>
        {c.nearest_pl &&
          `${c.nearest_pl}${
            c.pident_to_pl != null
              ? `, ${formatNumber(c.pident_to_pl, 1)} % identity`
              : ""
          }`}
      </Field>
      <Field label="Organism optimum" evidence={ev("t_opt_c")}>
        {[
          c.t_opt_c != null && `${formatNumber(c.t_opt_c, 1)} °C`,
          c.ph_opt != null && `pH ${formatNumber(c.ph_opt, 1)}`,
          c.oxygen,
        ]
          .filter(Boolean)
          .join(" · ") || null}
      </Field>
    </>
  )
}

function PlasticomeFields({ c }) {
  const ev = f => fieldEvidence("plasticome", f)
  const join = v => listValue(v).join("; ") || null
  return (
    <>
      <Field label="Enzyme" evidence={ev("enzyme_names")}>
        {join(c.enzyme_names)}
      </Field>
      <Field label="Substrates" evidence={ev("substrates")}>
        {join(c.substrates)}
      </Field>
      <Field label="EC" evidence={ev("ec")}>
        {c.ec}
      </Field>
      <Field label="Organism" evidence={ev("organism")}>
        {c.organism && <em>{c.organism}</em>}
      </Field>
      <Field label="Activity" evidence={ev("activity_mode")}>
        {c.activity_mode}
      </Field>
      <Field label="Accession" evidence={ev("accession")}>
        {c.accession && <NcbiLink kind="protein" id={c.accession} />}
      </Field>
      <Field label="Structure" evidence={ev("pdb")}>
        {c.pdb ? (
          <a
            href={`https://www.rcsb.org/structure/${encodeURIComponent(c.pdb)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-info hover:underline"
          >
            {c.pdb}
          </a>
        ) : (
          yesNo(c.has_structure)
        )}
      </Field>
      <Field label="CATH" evidence={ev("cath")}>
        {c.cath && <span className="font-mono">{c.cath}</span>}
      </Field>
      <Field label="Organism optimum" evidence={ev("t_opt_c")}>
        {[
          c.t_opt_c != null && `${formatNumber(c.t_opt_c, 1)} °C`,
          c.ph_opt != null && `pH ${formatNumber(c.ph_opt, 1)}`,
        ]
          .filter(Boolean)
          .join(" · ") || null}
      </Field>
      <Field label="Papers" evidence={ev("doi")}>
        {listValue(c.doi).length ? (
          <DoiLinks dois={listValue(c.doi)} max={20} />
        ) : null}
      </Field>
    </>
  )
}

function CharacterizedRelatives({ rows }) {
  if (!rows.length)
    return <p className="px-4 py-3 text-sm text-muted-foreground">None</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={thClass}>Enzyme</th>
            <th className={thClass}>Cluster</th>
            <th className={thClass}>Substrates</th>
            <th className={`${thClass} text-right`}>Identity to query</th>
            <th className={thClass}>Structure</th>
            <th className={thClass}>Papers</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className={tdClass}>
                <span className="font-semibold">
                  {listValue(r.enzyme_names)[0] || r.id}
                </span>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {r.id}
                </span>
                {r.organism && (
                  <span className="block text-xs italic text-secondary-foreground">
                    {r.organism}
                  </span>
                )}
              </td>
              <td className={`${tdClass} whitespace-nowrap`}>{r.level}</td>
              <td className={tdClass}>
                {listValue(r.substrates).join(", ") || "—"}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {r.hit ? (
                  `${r.hit.identity.toFixed(1)} %`
                ) : (
                  <span className="text-muted-foreground">not in the hits</span>
                )}
              </td>
              <td className={tdClass}>
                {r.pdb ? (
                  <a
                    href={`https://www.rcsb.org/structure/${encodeURIComponent(
                      r.pdb
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-info hover:underline"
                  >
                    {r.pdb}
                  </a>
                ) : (
                  yesNo(r.has_structure) || "—"
                )}
              </td>
              <td className={tdClass}>
                <DoiLinks dois={listValue(r.doi)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The BioSamples a Logan sequence was found in. Closed by default and fetched
 * on first open, so a record never pays for a list nobody asked for. A failed
 * lookup stays inside this section; the rest of the record is unaffected.
 */
function FoundInSamples({ id, count }) {
  const [state, setState] = useState({ kind: "idle" })

  const load = async () => {
    if (state.kind !== "idle") return
    setState({ kind: "loading" })
    try {
      const resp = await fetch(
        `${config.apiUrl}/sequence/${encodeURIComponent(id)}/samples`
      )
      if (resp.status === 404) return setState({ kind: "none" })
      if (!resp.ok) return setState({ kind: "unavailable" })
      setState({ kind: "loaded", data: await resp.json() })
    } catch {
      setState({ kind: "unavailable" })
    }
  }

  const total = state.kind === "loaded" ? state.data.n_biosamples : count

  return (
    <Disclosure
      title="Found in Samples"
      count={total != null ? formatNumber(total) : null}
      onToggle={e => e.currentTarget.open && load()}
    >
      {state.kind === "loading" && (
        <p role="status" className="px-4 py-3 text-sm text-muted-foreground">
          Loading…
        </p>
      )}
      {state.kind === "none" && (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          No sample record.
        </p>
      )}
      {state.kind === "unavailable" && (
        <p role="status" className="px-4 py-3 text-sm text-warning">
          Sample lookup unavailable.
        </p>
      )}
      {state.kind === "loaded" && <SamplesTable data={state.data} />}
    </Disclosure>
  )
}

function SamplesTable({ data }) {
  const shown = data.samples.length
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={thClass}>BioSample</th>
              <th className={thClass}>Study</th>
              <th className={thClass}>Sample</th>
              <th className={thClass}>Most abundant organisms</th>
              <th className={`${thClass} text-right`}>Runs</th>
            </tr>
          </thead>
          <tbody>
            {data.samples.map(s => {
              const where = [
                s.isolation_source || s.env_medium || s.env_broad_scale,
                s.host,
                s.country,
              ].filter(Boolean)
              return (
                <tr key={s.biosample}>
                  {/* NCBI's BioSample page lists the sample's runs. */}
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <NcbiLink kind="biosample" id={s.biosample} />
                  </td>
                  <td className={`${tdClass} max-w-80`}>
                    <NcbiLink kind="bioproject" id={s.bioproject} />
                    {s.bioproject_title && (
                      <span className="block text-xs text-secondary-foreground">
                        {s.bioproject_title.length > 120
                          ? `${s.bioproject_title.slice(0, 120)}…`
                          : s.bioproject_title}
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>
                    {s.profile && (
                      <>
                        {profileName(s.profile)}
                        {s.profile_evidence &&
                          s.profile_evidence !== "none" &&
                          s.profile_evidence !== "stated" && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({s.profile_evidence})
                            </span>
                          )}
                        <EvidenceBadge evidence="profile" />
                      </>
                    )}
                    {where.length > 0 && (
                      <span className="block">
                        {where.join(" · ")}
                        <EvidenceBadge evidence="stated" />
                      </span>
                    )}
                    {(s.temperature_c != null || s.ph != null) && (
                      <span className="block text-xs">
                        {[
                          s.temperature_c != null &&
                            `${formatNumber(s.temperature_c, 1)} °C`,
                          s.ph != null && `pH ${formatNumber(s.ph, 1)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        <EvidenceBadge evidence="stated" />
                      </span>
                    )}
                    {!s.profile && !where.length && "—"}
                  </td>
                  <td
                    className={`${tdClass} text-xs text-secondary-foreground`}
                  >
                    {(s.top_species || []).length
                      ? s.top_species.slice(0, 4).map(([name, share]) => (
                          <span key={name} className="block">
                            <em>{name}</em> {formatPercent(share, 0)}
                          </span>
                        ))
                      : "—"}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatNumber(s.n_runs)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {shown < data.n_biosamples && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground tabular-nums">
          {formatNumber(shown)} of {formatNumber(data.n_biosamples)}, most runs
          first
        </p>
      )}
    </>
  )
}

const BLOCK = 60

/**
 * Query against this hit, residue by residue, from the hit's btop: blocks of
 * 60 columns, each a query line, a match line ("|" identical) and a hit line,
 * numbered by position in each sequence.
 */
function PairwiseAlignment({ hit, querySequence }) {
  const cols = alignedColumns(hit, querySequence)
  if (!cols) return null
  // Label column wide enough for the hit's full id.
  const labelW = Math.max(8, hit.target_id.length + 1)
  const same = cols.filter(c => c.same).length
  const gaps = cols.filter(c => c.q === "-" || c.t === "-").length
  const blocks = []
  for (let i = 0; i < cols.length; i += BLOCK)
    blocks.push(cols.slice(i, i + BLOCK))
  const first = (block, key) => block.find(c => c[key] != null)?.[key] ?? ""
  const last = (block, key) =>
    [...block].reverse().find(c => c[key] != null)?.[key] ?? ""
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <p className="text-xs text-muted-foreground tabular-nums">
        {cols.length} columns · {same} identical (
        {formatPercent(same / cols.length, 1)}) · {gaps} gaps
      </p>
      <div className="overflow-x-auto">
        <pre className="font-mono text-xs leading-5">
          {blocks.map((b, i) => (
            <span key={i} className="block pb-2">
              <span className="text-muted-foreground">
                {"Query".padEnd(labelW)}
                {String(first(b, "qpos")).padStart(4)}{" "}
              </span>
              {b.map(c => c.q).join("")}
              <span className="text-muted-foreground"> {last(b, "qpos")}</span>
              {"\n"}
              <span className="text-muted-foreground">
                {" ".repeat(labelW + 5)}
              </span>
              <span className="text-success">
                {b.map(c => (c.same ? "|" : " ")).join("")}
              </span>
              {"\n"}
              <span className="text-muted-foreground">
                {hit.target_id.padEnd(labelW)}
                {String(first(b, "tpos")).padStart(4)}{" "}
              </span>
              {b.map((c, k) => (
                <span
                  key={k}
                  className={
                    c.same
                      ? ""
                      : c.t === "-"
                      ? "text-muted-foreground"
                      : "text-warning"
                  }
                >
                  {c.t}
                </span>
              ))}
              <span className="text-muted-foreground"> {last(b, "tpos")}</span>
            </span>
          ))}
        </pre>
      </div>
    </div>
  )
}

/**
 * One hit's record. `hits` is the whole result: characterized relatives that
 * were themselves hits show their identity to the query.
 */
export default function SequenceRecord({ hit, hits, clusters, querySequence }) {
  if (!hit) return null
  const c = hit.card
  const relatives = characterizedRelatives(hit, hits, clusters)

  return (
    <section aria-labelledby="record-title" className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-background p-4">
        <h2
          id="record-title"
          className="mb-2 font-mono text-lg font-semibold text-foreground"
        >
          {hit.target_id}
        </h2>
        <div className="grid gap-x-6 md:grid-cols-2">
          <AlignmentFields hit={hit} />
          {c && hit.db === "logan" && <LoganFields c={c} />}
          {c && hit.db === "ncbi_nr" && <NrFields c={c} />}
          {c && hit.db === "plasticome" && <PlasticomeFields c={c} />}
        </div>
        {!c && (
          <p className="mt-2 text-xs text-muted-foreground">
            The metadata store has no record for this sequence.
          </p>
        )}
      </div>

      {hit.btop && querySequence && (
        <Disclosure
          key={`pairwise-${hit.target_id}`}
          title="Alignment to query"
        >
          <PairwiseAlignment hit={hit} querySequence={querySequence} />
        </Disclosure>
      )}

      <Disclosure
        key={`relatives-${hit.target_id}`}
        title="Characterized relatives"
        count={relatives.length}
        defaultOpen
      >
        <CharacterizedRelatives rows={relatives} />
      </Disclosure>

      {/* Keyed by id: a new record starts closed and unfetched. */}
      {hit.db === "logan" && (
        <FoundInSamples
          key={hit.target_id}
          id={hit.target_id}
          count={c?.n_biosamples ?? null}
        />
      )}
    </section>
  )
}
