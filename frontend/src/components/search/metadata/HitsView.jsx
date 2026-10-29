// Hits: every hit of a search_version 1.5.0 result, with what the metadata
// store records about each. Search rank order by default; every other order
// and every filter is the viewer's choice. An accession opens its record.
import React, { useMemo, useState } from "react"
import {
  downloadCSV,
  downloadFile,
  generateCSV,
} from "../../../utils/csvDownload"
import Dropdown from "../../common/Dropdown"
import {
  ORIGIN_LABEL,
  clusterLabel,
  SAMPLE_KEYWORDS,
  familyEnzymes,
  fieldEvidence,
  filterHits,
  hitIsolation,
  hitKeywords,
  listValue,
  onePerCluster,
  profileName,
  sortHits,
  toFasta,
} from "../../../utils/searchMetadata"
import {
  EvidenceBadge,
  MethodsLink,
  OriginTag,
  RecordLink,
  SectionTitle,
} from "./parts"

const PAGE = 50

const RANK_ORDER =
  "ordered by bit score, highest first; ties broken by lower e-value."

const IDENTITY_WINDOWS = [
  { value: "0-100", label: "any" },
  { value: "90-100", label: "90–100 %" },
  { value: "70-90", label: "70–90 %" },
  { value: "50-70", label: "50–70 %" },
]

const COVERAGE_FLOORS = [
  { value: 0, label: "any" },
  { value: 50, label: "≥ 50 %" },
  { value: 80, label: "≥ 80 %" },
]

const ORIGINS = [
  { value: "", label: "all origins" },
  { value: "relatives", label: "uncharacterized (nr and Logan)" },
  { value: "plasticome", label: ORIGIN_LABEL.plasticome },
  { value: "ncbi_nr", label: ORIGIN_LABEL.ncbi_nr },
  { value: "logan", label: ORIGIN_LABEL.logan },
]

const KEYWORDS = [
  { value: "", label: "any" },
  ...SAMPLE_KEYWORDS.map(k => ({ value: k, label: k })),
]

// `help` is the header's hover text: what the field is, in a sentence or two.
const COLUMNS = [
  {
    label: "#",
    key: "rank",
    help: `Rank in the search results, ${RANK_ORDER}`,
  },
  {
    label: "Accession",
    key: "accession",
    help: "PETadex ID of the matching sequence, and its source: Plasticome (characterized enzymes), NCBI nr, or Logan (assembled from public sequencing runs). Click to open its record.",
  },
  {
    label: "Name",
    key: "name",
    help: "Enzyme name, for characterized (Plasticome) enzymes.",
  },
  {
    label: "Organism",
    key: "organism",
    help: "Organism, as stated in the Plasticome or NCBI record. Logan sequences come from mixed samples and have none.",
  },
  {
    label: "Family",
    key: "family_label",
    help: "60 % identity cluster the hit belongs to, named by its centroid sequence.",
  },
  {
    label: "Identity",
    key: "identity",
    help: "Percent of aligned positions where the hit has the same amino acid as the query.",
  },
  {
    label: "E-value",
    key: "evalue",
    help: "Number of hits this good expected by chance in a database this size. Lower is more significant.",
  },
  {
    label: "Coverage",
    key: "query_coverage",
    help: "Percent of the query's length covered by the alignment.",
  },
  {
    label: "Environment",
    key: "profile_sort",
    minWidth: "11rem",
    help: "Logan: most common environment profile among the sequence's samples, and the recorded isolation source of its sample with most runs. nr: the genome's recorded isolation source.",
  },
  {
    label: "Sample keywords",
    key: "keywords_sort",
    help: "Words found in the recorded text and study title of the samples a Logan hit was assembled from (saline, hot, waste, plastic). A literal text match about the sample, not a property of the enzyme.",
  },
  {
    label: "Country",
    key: "country",
    help: "Country recorded on the sequence's genome BioSamples (NCBI nr only).",
  },
  {
    label: "Characterized in family",
    key: "family_enzymes",
    minWidth: "10rem",
    help: "Plasticome (characterized) enzymes in the hit's 60 % family. Open the record for the list.",
  },
]

const th =
  "cursor-pointer select-none whitespace-nowrap bg-surface-raised text-left py-2 px-2.5 font-semibold"
const td = "py-2 px-2.5 align-top"
const dash = <span className="text-muted-foreground">-</span>

/** Sortable and displayed fields, flattened from the hit and its record. */
function toRow(hit, clusters, batch) {
  const c = hit.card || {}
  const members = familyEnzymes(hit, clusters)
  const keywords = hit.db === "logan" ? hitKeywords(batch, hit.target_id) : []
  return {
    ...hit,
    keywords,
    keywords_sort: keywords.length ? keywords.join(" ") : null,
    sample_isolation:
      hit.db === "logan" ? hitIsolation(batch, hit.target_id) : null,
    name: hit.name || listValue(c.enzyme_names)[0] || null,
    organism: hit.organism || c.organism || null,
    family_label: clusterLabel(c.c60),
    profile_sort: profileName(c.prof_dominant),
    country: c.country ?? null,
    family_enzymes: members.length || null,
    family_first: members.length
      ? listValue(members[0].enzyme_names)[0] || members[0].id
      : null,
    family_all: members
      .map(m => listValue(m.enzyme_names)[0] || m.id)
      .join(", "),
  }
}

function Valued({ value, evidence, italic = false }) {
  if (!value) return dash
  return (
    <>
      {italic ? <em>{value}</em> : value}
      <EvidenceBadge evidence={evidence} />
    </>
  )
}

function HitRow({ row, totalHits, onOpenRecord, samplesStatus }) {
  const c = row.card || {}
  return (
    <tr className="hover:bg-surface-raised">
      <td
        className={`${td} tabular-nums`}
        title={`Rank ${row.rank} of ${totalHits}: ${RANK_ORDER}`}
      >
        {row.rank}
      </td>
      <td className={`${td} whitespace-nowrap`}>
        <RecordLink id={row.accession} onOpen={onOpenRecord} />
        <span className="block text-xs text-muted-foreground">
          <OriginTag db={row.db} />
        </span>
      </td>
      <td className={td}>
        <Valued
          value={row.name}
          evidence={fieldEvidence(row.db, "enzyme_names")}
        />
      </td>
      <td className={td}>
        <Valued
          value={row.organism}
          evidence={fieldEvidence(row.db, "organism")}
          italic
        />
      </td>
      <td className={`${td} font-mono text-xs`} title={c.c60 || undefined}>
        {row.family_label || dash}
      </td>
      <td className={`${td} whitespace-nowrap`}>
        <span
          className="inline-block h-1.5 bg-success rounded-md mr-1 align-middle"
          style={{ width: `${Math.min(row.identity ?? 0, 100) * 0.6}px` }}
        />
        {row.identity?.toFixed(1) ?? "-"}%
      </td>
      <td className={`${td} whitespace-nowrap`}>
        {row.evalue === 0 ? "0" : row.evalue?.toExponential(1) ?? "-"}
      </td>
      <td className={td}>{row.query_coverage ?? "-"}%</td>
      <td className={td}>
        {row.profile_sort && (
          <span className="block">
            {row.profile_sort}
            {c.prof_dominant_share != null && c.prof_dominant_share < 1 && (
              <span className="text-muted-foreground">
                {" "}
                ({Math.round(c.prof_dominant_share * 100)} %)
              </span>
            )}
            <EvidenceBadge evidence="profile" />
          </span>
        )}
        {row.sample_isolation && (
          <span className="block text-secondary-foreground">
            {row.sample_isolation}
            <EvidenceBadge evidence="stated" />
          </span>
        )}
        {c.isolation_source && (
          <span className="block text-secondary-foreground">
            {c.isolation_source}
            <EvidenceBadge
              evidence={fieldEvidence(row.db, "isolation_source")}
            />
          </span>
        )}
        {!row.profile_sort &&
          !c.isolation_source &&
          !row.sample_isolation &&
          dash}
      </td>
      <td className={td}>
        {row.keywords.length ? (
          <span className="flex flex-wrap gap-1">
            {row.keywords.map(k => (
              <span
                key={k}
                className="rounded-full border border-border bg-surface-sunken px-2 text-xs text-secondary-foreground"
              >
                {k}
              </span>
            ))}
          </span>
        ) : row.db === "logan" && samplesStatus === "loading" ? (
          <span className="text-muted-foreground/60">…</span>
        ) : (
          dash
        )}
      </td>
      <td className={td}>
        <Valued
          value={row.country}
          evidence={fieldEvidence(row.db, "country")}
        />
      </td>
      <td className={td} title={row.family_all || undefined}>
        {row.family_enzymes ? (
          <>
            <span className="tabular-nums">{row.family_enzymes}</span> ·{" "}
            {row.family_first}
            {row.family_enzymes > 1 ? "…" : ""}
          </>
        ) : (
          <span className="text-muted-foreground">none</span>
        )}
      </td>
    </tr>
  )
}

export default function HitsView({
  hits,
  samples = null,
  clusters,
  metadata,
  sessionId,
  onOpenRecord,
}) {
  const [keyword, setKeyword] = useState("")
  const [identity, setIdentity] = useState("0-100")
  const [minCoverage, setMinCoverage] = useState(0)
  const [origin, setOrigin] = useState("")
  const [perCluster, setPerCluster] = useState(false)
  const [sortKey, setSortKey] = useState("rank")
  const [sortDir, setSortDir] = useState("asc")
  const [page, setPage] = useState(0)
  const [toast, setToast] = useState("")

  const allRows = useMemo(
    () => hits.map(h => toRow(h, clusters, samples?.data)),
    [hits, clusters, samples?.data]
  )

  const rows = useMemo(() => {
    let out = filterHits(allRows, {
      identity: identity.split("-").map(Number),
      minCoverage,
      origin,
    })
    // Collapse before sorting, so each cluster keeps its best-ranked hit
    // whatever order is chosen.
    if (keyword) out = out.filter(r => r.keywords.includes(keyword))
    if (perCluster) out = onePerCluster(out, "c90")
    return sortHits(out, sortKey, sortDir)
  }, [
    allRows,
    identity,
    minCoverage,
    origin,
    keyword,
    perCluster,
    sortKey,
    sortDir,
  ])

  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const current = Math.min(page, pages - 1)
  const shown = rows.slice(current * PAGE, current * PAGE + PAGE)

  // Every filter or sort change returns to the first page.
  const change = setter => value => {
    setter(value)
    setPage(0)
  }

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(0)
  }

  const flash = text => {
    setToast(text)
    setTimeout(() => setToast(t => (t === text ? "" : t)), 3500)
  }

  const withSeq = rows.filter(h => h.target_sequence).length

  // The Clipboard API is missing or refused in some browsers and on plain
  // http; the hidden-textarea copy still works there.
  const copyFasta = async () => {
    const text = toFasta(rows)
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      const area = document.createElement("textarea")
      area.value = text
      area.setAttribute("readonly", "")
      area.style.position = "fixed"
      area.style.opacity = "0"
      document.body.appendChild(area)
      area.select()
      try {
        ok = document.execCommand("copy")
      } catch {
        ok = false
      }
      area.remove()
    }
    flash(
      ok
        ? `Copied ${withSeq} sequences`
        : "Copy was blocked. Use Download FASTA instead."
    )
  }

  const downloadFasta = () =>
    downloadFile(
      toFasta(rows) + "\n",
      `petadex-results-${sessionId || "search"}.fasta`
    )

  const downloadCsv = () => {
    const headers = [
      "#",
      "Accession",
      "Origin",
      "Name",
      "Organism",
      "Family (60 % cluster)",
      "90 % cluster",
      "Identity (%)",
      "E-value",
      "Coverage (%)",
      "Environment profile",
      "Isolation source",
      "Sample keywords",
      "Country",
      "Characterized enzymes in family",
      // Last: by far the widest field, as in DIAMOND's own full_sseq column.
      "Target sequence",
    ]
    const body = rows.map(h => [
      h.rank,
      h.accession,
      ORIGIN_LABEL[h.db] || "",
      h.name || "",
      h.organism || "",
      h.family_label || "",
      clusterLabel(h.card?.c90) || "",
      h.identity?.toFixed(1) ?? "",
      h.evalue ?? "",
      h.query_coverage ?? "",
      h.card?.prof_dominant || "",
      h.card?.isolation_source || h.sample_isolation || "",
      h.keywords.join("; "),
      h.country || "",
      h.family_all || "",
      h.target_sequence || "",
    ])
    downloadCSV(
      generateCSV(headers, body),
      `petadex-results-${sessionId || "search"}`
    )
  }

  const downloadJson = () =>
    downloadFile(
      JSON.stringify({ metadata, results: rows }, null, 2),
      `petadex-results-${sessionId || "search"}.json`,
      "application/json"
    )

  return (
    <section aria-labelledby="hits-title" className="flex flex-col gap-3">
      {/* Title on the left, filters right-aligned on the same row; they wrap
          under the title on narrow screens. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div id="hits-title">
          <SectionTitle
            as="h2"
            title="Hits"
            count={`${rows.length} of ${hits.length}`}
          />
        </div>
        <MethodsLink anchor="hits" />
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-secondary-foreground">
          <Dropdown
            label="Origin"
            value={origin}
            options={ORIGINS}
            onChange={change(setOrigin)}
          />
          <Dropdown
            label="Identity to query"
            value={identity}
            options={IDENTITY_WINDOWS}
            onChange={change(setIdentity)}
          />
          <Dropdown
            label="Query coverage"
            value={minCoverage}
            options={COVERAGE_FLOORS}
            onChange={change(setMinCoverage)}
          />
          {samples?.status === "ready" && (
            <Dropdown
              label="Sample keyword"
              value={keyword}
              options={KEYWORDS}
              onChange={change(setKeyword)}
            />
          )}
        </div>
      </div>

      {/* Second row: the duplicate toggle, then what to do with the rows. */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          aria-pressed={perCluster}
          onClick={() => change(setPerCluster)(!perCluster)}
          title="Keep only the best-ranked hit of each 90 % identity cluster"
          className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${
            perCluster
              ? "border-accent bg-accent-subtle text-foreground"
              : "border-border bg-background hover:bg-surface-raised"
          }`}
        >
          Hide near-duplicates
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span role="status" className="self-center text-xs text-accent">
            {toast}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={copyFasta}
            disabled={!withSeq}
            title={`Copies the ${withSeq} hits matching these filters, not only this page`}
          >
            Copy {withSeq} as FASTA
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={downloadFasta}
            disabled={!withSeq}
            title={`Downloads the ${withSeq} hits matching these filters`}
          >
            ⬇ FASTA
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={downloadCsv}
            title={`Downloads the ${rows.length} hits matching these filters`}
          >
            ⬇ CSV
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={downloadJson}
            title={`Downloads the ${rows.length} hits matching these filters`}
          >
            ⬇ JSON
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {COLUMNS.map(({ label, key, minWidth, help }) => (
                <th
                  key={key}
                  className={th}
                  style={{ minWidth: minWidth || undefined }}
                  onClick={() => handleSort(key)}
                  title={`${help}\n\nClick to sort.`}
                  aria-sort={
                    sortKey === key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">
                    {label}
                  </span>
                  <span
                    className={`ml-1 ${
                      sortKey === key ? "opacity-100" : "opacity-30"
                    } text-xs`}
                  >
                    {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(row => (
              <HitRow
                key={`${row.rank}-${row.accession}`}
                row={row}
                totalHits={hits.length}
                onOpenRecord={onOpenRecord}
                samplesStatus={samples?.status}
              />
            ))}
            {!shown.length && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className={`${td} text-center text-muted-foreground`}
                >
                  No hits match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </button>
          <span className="text-secondary-foreground tabular-nums">
            Page {current + 1} of {pages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
