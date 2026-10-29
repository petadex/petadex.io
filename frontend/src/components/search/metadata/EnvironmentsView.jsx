// Environments: how much more (or less) often each environment profile holds
// this search's Logan sequences than a random PETadex Logan sequence. The unit is
// the sequence: each one weighs 1, split over the profiles of the BioSamples it
// was assembled from (summary.environments, computed by the aggregator).
// Stratified by identity to the query: the closest relatives alone, then
// looser, then every hit (the aggregator's own rows).
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  IDENTITY_STRATA,
  MIN_SEQUENCES_FOR_RATIO,
  environmentRows,
  environmentsFromHits,
  formatNumber,
  formatPercent,
  formatX,
  batchTotals,
  hitsInProfile,
  profileName,
  profileSamples,
} from "../../../utils/searchMetadata"
import { formatP, profileStats } from "../../../utils/enrichmentStats"
import {
  Disclosure,
  MethodsLink,
  NcbiLink,
  RecordLink,
  SectionTitle,
  tdClass,
  thClass,
} from "./parts"

// Diverging pair, validated in both themes: warm for more than expected,
// cool for fewer. The direction is also carried by the side of the 1× line.
const ENRICHED_COLOR = "var(--env-enriched)"
const DEPLETED_COLOR = "var(--env-depleted)"

const W = 640
const ROW_H = 26
const M = { l: 150, r: 56, t: 22, b: 22 }
// The axis spans at least 1/4×–4× and at most 1/32×–32×; values beyond clamp.
const MIN_SPAN = 2
const MAX_SPAN = 5

/** Bar from x0 to x1, rounded only at the end away from the 1× line. */
function divergingBar(x0, x1, y, h, r = 3) {
  const w = Math.abs(x1 - x0)
  if (w < 0.5) return null
  r = Math.min(r, w, h / 2)
  if (x1 > x0)
    return `M${x0},${y}H${x1 - r}Q${x1},${y} ${x1},${y + r}V${
      y + h - r
    }Q${x1},${y + h} ${x1 - r},${y + h}H${x0}Z`
  return `M${x0},${y}H${x1 + r}Q${x1},${y} ${x1},${y + r}V${y + h - r}Q${x1},${
    y + h
  } ${x1 + r},${y + h}H${x0}Z`
}

const tickLabel = p => (p >= 0 ? `${2 ** p}×` : `1/${2 ** -p}×`)

const fewSequences = row => row.sequences < MIN_SEQUENCES_FOR_RATIO

// q below this is drawn bright; at or above, faded.
const SIGNIFICANCE = 0.05

function Tooltip({ tip, stats, strata, minIdentity }) {
  if (!tip) return null
  const { row, x, y } = tip
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-30 w-80 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left: x, top: y }}
    >
      <div className="font-semibold">{profileName(row.profile)}</div>
      <div>Hits from this search: {formatPercent(row.share)}</div>
      <div>
        Random PETadex sequence: {formatPercent(row.background_share, 2)}
      </div>
      {row.x_expected != null && (
        <div className="font-bold">{formatX(row.x_expected)}× expected</div>
      )}
      <div className="text-muted-foreground">
        {formatNumber(row.sequences, 1)} sequences
        {fewSequences(row) ? " (fewer than 5)" : ""}
      </div>
      {strata && (
        <StrataTable
          profile={row.profile}
          strata={strata}
          minIdentity={minIdentity}
        />
      )}
      {stats && <SignificanceTable profile={row.profile} stats={stats} />}
    </div>
  )
}

/** One profile's × expected in every identity stratum, side by side. */
function StrataTable({ profile, strata, minIdentity }) {
  return (
    <div className="mt-2 border-t border-border pt-2">
      <table className="w-full text-2xs tabular-nums">
        <thead className="text-muted-foreground">
          <tr>
            <th className="pr-2 text-left font-normal">Identity</th>
            <th className="pr-2 text-right font-normal">×</th>
            <th className="text-right font-normal">Sequences</th>
          </tr>
        </thead>
        <tbody>
          {IDENTITY_STRATA.map(({ min, label }) => {
            const env = strata[min]
            const r = env.profiles.find(p => p.profile === profile)
            return (
              <tr key={min} className={min === minIdentity ? "font-bold" : ""}>
                <td className="pr-2">{label}</td>
                <td className="pr-2 text-right font-mono">
                  {formatX(r?.x_expected)}
                </td>
                <td className="text-right font-mono">
                  {formatNumber(r?.sequences ?? 0, 1)} / {env.n_sequences}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const UNITS = [
  { key: "sequence", label: "Per sequence" },
  { key: "cluster", label: "Per 90 % cluster" },
]

// Prototype significance, hover only: ratio, 95 % interval and BH q-value per
// counting unit. Computed in the browser from the hits on the page.
function SignificanceTable({ profile, stats }) {
  return (
    <div className="mt-2 border-t border-border pt-2">
      <table className="w-full text-2xs tabular-nums">
        <thead className="text-muted-foreground">
          <tr>
            <th className="pr-2 text-left font-normal">Unit</th>
            <th className="pr-2 text-right font-normal">×</th>
            <th className="pr-2 text-right font-normal">95 % CI</th>
            <th className="text-right font-normal">q</th>
          </tr>
        </thead>
        <tbody>
          {UNITS.map(({ key, label }) => {
            const r = stats[key].byProfile[profile]
            if (!r) return null
            return (
              <tr key={key}>
                <td className="pr-2">
                  {label}{" "}
                  <span className="text-muted-foreground">
                    ({r.k}/{stats[key].n})
                  </span>
                </td>
                <td className="pr-2 text-right font-mono">
                  {formatX(r.ratio)}
                </td>
                <td className="pr-2 text-right font-mono">
                  {formatX(r.ciLow)}–{formatX(r.ciHigh)}
                </td>
                <td
                  className={`text-right font-mono ${
                    r.q < 0.05 ? "font-bold" : "text-muted-foreground"
                  }`}
                >
                  {formatP(r.q)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-1 text-2xs text-muted-foreground">
        Binomial test against a random PETadex Logan sequence; q is
        Benjamini–Hochberg across all profiles. Prototype.
      </p>
    </div>
  )
}

/** Chart order: most enriched at the top, most depleted at the bottom. */
const chartOrder = rows =>
  rows
    .filter(r => r.x_expected != null)
    .sort((a, b) => b.x_expected - a.x_expected)

function ProfileChart({ rows, stats, unit, onPick, strata, minIdentity }) {
  const [tip, setTip] = useState(null)
  const sorted = useMemo(() => chartOrder(rows), [rows])
  const iw = W - M.l - M.r
  const height = M.t + M.b + sorted.length * ROW_H
  const log2 = x => Math.log2(Math.max(x, 2 ** -MAX_SPAN))
  const span = Math.min(
    MAX_SPAN,
    Math.max(
      MIN_SPAN,
      Math.ceil(Math.max(...sorted.map(r => Math.abs(log2(r.x_expected)))))
    )
  )
  const sx = x =>
    M.l + ((Math.max(-span, Math.min(span, log2(x))) + span) / (2 * span)) * iw
  const center = sx(1)
  const ticks = []
  for (let p = -span; p <= span; p++) ticks.push(p)

  const move = (row, e) => {
    const pad = 14
    let x = e.clientX + pad
    let y = e.clientY + pad
    if (x + 330 > window.innerWidth) x = e.clientX - 330 - pad
    if (y + 320 > window.innerHeight) y = e.clientY - 320 - pad
    setTip({ row, x, y })
  }

  return (
    <div className="max-w-3xl">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label="Each environment profile's share of this search's Logan sequences, as a multiple of its share for a random PETadex Logan sequence: right of 1× is enriched, left is depleted"
      >
        <text
          x={center - 8}
          y={12}
          textAnchor="end"
          fill={DEPLETED_COLOR}
          className="text-2xs font-semibold"
        >
          ← depleted
        </text>
        <text
          x={center + 8}
          y={12}
          fill={ENRICHED_COLOR}
          className="text-2xs font-semibold"
        >
          enriched →
        </text>
        {ticks.map(p => {
          const x = sx(2 ** p)
          return (
            <g key={p}>
              <line
                x1={x}
                x2={x}
                y1={M.t}
                y2={height - M.b}
                stroke="var(--border)"
              />
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                // Each side's ticks take its direction's color; 1× stays neutral.
                fill={
                  p > 0
                    ? ENRICHED_COLOR
                    : p < 0
                    ? DEPLETED_COLOR
                    : "var(--muted-foreground)"
                }
                className="font-mono text-2xs"
              >
                {tickLabel(p)}
              </text>
            </g>
          )
        })}
        {sorted.map((row, i) => {
          const y = M.t + i * ROW_H
          const mid = y + ROW_H / 2 + 3.5
          const enriched = row.x_expected >= 1
          // Faded unless significant at the chosen unit. A profile the test
          // could not score (no background share) is faded too.
          const q = stats?.[unit]?.byProfile[row.profile]?.q
          const faded = !(q < SIGNIFICANCE)
          return (
            <g key={row.profile} opacity={faded ? 0.4 : 1}>
              <text
                x={M.l - 8}
                y={mid}
                textAnchor="end"
                className="fill-foreground text-[11px]"
              >
                {profileName(row.profile)}
              </text>
              <path
                d={divergingBar(center, sx(row.x_expected), y + 7, 12)}
                fill={enriched ? ENRICHED_COLOR : DEPLETED_COLOR}
              />
              <text
                x={W - 4}
                y={mid}
                textAnchor="end"
                className="fill-foreground font-mono text-[11px] tabular-nums"
              >
                {formatX(row.x_expected)}×
              </text>
              <rect
                x={0}
                y={y}
                width={W}
                height={ROW_H}
                className="cursor-pointer fill-transparent hover:fill-foreground/5"
                onMouseEnter={e => move(row, e)}
                onMouseMove={e => move(row, e)}
                onMouseLeave={() => setTip(null)}
                onClick={() => onPick(row.profile)}
                aria-label={`${profileName(row.profile)}: ${formatX(
                  row.x_expected
                )}× expected (hits from this search ${formatPercent(
                  row.share
                )}, random PETadex sequence ${formatPercent(
                  row.background_share,
                  2
                )}, ${formatNumber(row.sequences, 1)} sequences)`}
              />
            </g>
          )
        })}
        <line
          x1={center}
          x2={center}
          y1={M.t - 4}
          y2={height - M.b}
          stroke="var(--border-strong)"
          strokeWidth={1.5}
        />
      </svg>
      <Tooltip
        tip={tip}
        stats={stats}
        strata={strata}
        minIdentity={minIdentity}
      />
    </div>
  )
}

function ProfileHits({ members, onOpenRecord }) {
  if (!members.length)
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        No hit with a sample record in this profile.
      </p>
    )
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${thClass} text-right`}>Rank</th>
            <th className={thClass}>Sequence</th>
            <th className={`${thClass} text-right`}>Identity</th>
            <th className={`${thClass} text-right`}>BioSamples</th>
            <th className={`${thClass} text-right`}>Studies</th>
            <th className={`${thClass} text-right`}>
              Its samples in this profile
            </th>
            <th className={thClass}>Its dominant profile</th>
          </tr>
        </thead>
        <tbody>
          {members.map(({ hit, share }) => (
            <tr key={hit.target_id} className="hover:bg-surface-raised">
              <td
                className={`${tdClass} text-right tabular-nums text-muted-foreground`}
              >
                {hit.rank}
              </td>
              <td className={tdClass}>
                <RecordLink id={hit.target_id} onOpen={onOpenRecord} />
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {hit.identity?.toFixed(1)} %
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {formatNumber(hit.card?.n_biosamples)}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {formatNumber(hit.card?.n_bioprojects)}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {formatPercent(share, 0)}
              </td>
              <td className={tdClass}>
                {profileName(hit.card?.prof_dominant) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The BioSamples of one environment profile, from the batch Found in Samples
 * lookup: each with its study, recorded text, top species, keywords, and the
 * hits it holds.
 */
const SAMPLE_PAGE = 20

function ProfileSamples({ samples, onOpenRecord }) {
  const [showAll, setShowAll] = useState(false)
  if (!samples.length)
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        No sample record in this profile.
      </p>
    )
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={thClass}>BioSample</th>
            <th className={thClass}>Study</th>
            <th className={thClass}>Isolation source / medium</th>
            <th className={thClass}>Country</th>
            <th className={thClass}>Most abundant organisms</th>
            <th className={thClass}>Keywords</th>
            <th className={thClass}>Hits</th>
          </tr>
        </thead>
        <tbody>
          {(showAll ? samples : samples.slice(0, SAMPLE_PAGE)).map(s => (
            <tr key={s.biosample} className="hover:bg-surface-raised">
              <td className={`${tdClass} whitespace-nowrap`}>
                <NcbiLink kind="biosample" id={s.biosample} />
              </td>
              <td className={`${tdClass} max-w-72`}>
                <NcbiLink kind="bioproject" id={s.bioproject} />
                {s.bioproject_title && (
                  <span className="block text-xs text-secondary-foreground">
                    {s.bioproject_title.length > 110
                      ? `${s.bioproject_title.slice(0, 110)}…`
                      : s.bioproject_title}
                  </span>
                )}
              </td>
              <td className={tdClass}>
                {s.isolation_source || s.env_medium || "—"}
              </td>
              <td className={tdClass}>{s.country || "—"}</td>
              <td className={`${tdClass} text-xs text-secondary-foreground`}>
                {(s.top_species || []).length
                  ? s.top_species.slice(0, 3).map(([name, share]) => (
                      <span key={name} className="block">
                        <em>{name}</em> {formatPercent(share, 0)}
                      </span>
                    ))
                  : "—"}
              </td>
              <td className={tdClass}>
                {(s.keywords || []).length ? (
                  <span className="flex flex-wrap gap-1">
                    {s.keywords.map(k => (
                      <span
                        key={k}
                        className="rounded-full border border-border bg-surface-sunken px-2 text-xs text-secondary-foreground"
                      >
                        {k}
                      </span>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className={tdClass}>
                <span className="flex flex-col gap-0.5">
                  {s.hits.map(h => (
                    <RecordLink
                      key={h.target_id}
                      id={h.target_id}
                      onOpen={onOpenRecord}
                    />
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {samples.length > SAMPLE_PAGE && (
        <div className="border-t border-border px-4 py-2">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => setShowAll(v => !v)}
          >
            {showAll
              ? `Show the first ${SAMPLE_PAGE}`
              : `Show all ${samples.length} samples`}
          </button>
        </div>
      )}
    </div>
  )
}

export default function EnvironmentsView({
  hits,
  environments,
  samples = null,
  onOpenRecord,
}) {
  const batch = samples?.status === "ready" ? samples.data : null
  // Identity stratum: every hit by default; 90 and 70 keep closer relatives.
  const [minIdentity, setMinIdentity] = useState(0)
  const strata = useMemo(() => {
    const out = {}
    for (const { min } of IDENTITY_STRATA)
      out[min] =
        min === 0
          ? environments
          : environmentsFromHits(
              hits.filter(h => (h.identity ?? 0) >= min),
              environments?.profiles
            )
    return out
  }, [hits, environments])
  const stratumHits = useMemo(
    () => hits.filter(h => (h.identity ?? 0) >= minIdentity),
    [hits, minIdentity]
  )
  const env = strata[minIdentity]
  const totals = useMemo(
    () => (batch ? batchTotals(batch, stratumHits) : null),
    [batch, stratumHits]
  )
  const rows = useMemo(() => environmentRows(env?.profiles), [env])
  // Significance unit: each sequence by default (the aggregator's unit). The
  // toggle counts each 90 % cluster once, so a lineage seen many times in one
  // study weighs like one observation.
  const [unit, setUnit] = useState("sequence")
  const stats = useMemo(
    () =>
      rows.length
        ? {
            sequence: profileStats(stratumHits, rows, "sequence"),
            cluster: profileStats(stratumHits, rows, "cluster"),
          }
        : null,
    [stratumHits, rows]
  )
  // Every profile, in the chart's order; profiles the chart can't place
  // (no background share) last.
  const listed = useMemo(() => {
    const charted = chartOrder(rows)
    return [...charted, ...rows.filter(r => !charted.includes(r))]
  }, [rows])
  const detailsRef = useRef(null)
  // Open profiles, held in state so a re-render never closes one.
  const [open, setOpen] = useState(() => new Set())
  const setProfileOpen = (profile, isOpen) =>
    setOpen(prev => {
      if (prev.has(profile) === isOpen) return prev
      const next = new Set(prev)
      isOpen ? next.add(profile) : next.delete(profile)
      return next
    })
  // A bar click opens its profile, then scrolls it to the top once rendered.
  const [scrollTo, setScrollTo] = useState(null)
  const pick = profile => {
    setProfileOpen(profile, true)
    setScrollTo({ profile })
  }
  useEffect(() => {
    if (!scrollTo) return
    detailsRef.current
      ?.querySelector(`details[data-profile="${scrollTo.profile}"]`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [scrollTo])

  if (!environments?.profiles?.length)
    return (
      <p className="text-sm text-muted-foreground">
        No Logan hit in this search has a profiled sample.
      </p>
    )

  const stratumLabel = IDENTITY_STRATA.find(s => s.min === minIdentity).label

  return (
    <section aria-labelledby="env-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div id="env-title">
          <SectionTitle
            as="h2"
            title="Environments, per sequence"
            count={`${formatNumber(env.n_sequences)} Logan sequences${
              minIdentity ? ` at ${stratumLabel} identity` : ""
            }${
              totals
                ? ` · ${formatNumber(totals.samples)} samples · ${formatNumber(
                    totals.studies
                  )} studies`
                : ""
            }`}
          />
        </div>
        <div
          role="group"
          aria-label="Identity to the query"
          className="ml-auto flex items-center gap-1 text-xs text-secondary-foreground"
        >
          <span className="mr-1">Identity to query</span>
          {IDENTITY_STRATA.map(({ min, label }) => (
            <button
              key={min}
              type="button"
              aria-pressed={minIdentity === min}
              onClick={() => setMinIdentity(min)}
              title={`${formatNumber(
                strata[min].n_sequences
              )} profiled Logan sequences`}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                minIdentity === min
                  ? "border-accent bg-accent-subtle text-foreground"
                  : "border-border bg-background hover:bg-surface-raised"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-4">
        <div className="flex flex-wrap gap-4 text-xs text-secondary-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i
              className="inline-block h-2.5 w-2.5 rounded-xs"
              style={{ background: ENRICHED_COLOR }}
            />
            Enriched: more of this search's Logan hits than expected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i
              className="inline-block h-2.5 w-2.5 rounded-xs"
              style={{ background: DEPLETED_COLOR }}
            />
            Depleted: fewer than expected
          </span>
          <span className="opacity-60">
            Faded: not significant (q ≥ {SIGNIFICANCE})
          </span>
          <button
            type="button"
            aria-pressed={unit === "cluster"}
            onClick={() => setUnit(unit === "cluster" ? "sequence" : "cluster")}
            title="Test significance counting each 90 % cluster once, instead of each sequence"
            className={`ml-auto cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
              unit === "cluster"
                ? "border-accent bg-accent-subtle text-foreground"
                : "border-border bg-background hover:bg-surface-raised"
            }`}
          >
            Significance per 90 % cluster
          </button>
          <MethodsLink anchor="environments" />
        </div>
        {env.n_sequences ? (
          <ProfileChart
            rows={rows}
            stats={stats}
            unit={unit}
            onPick={pick}
            strata={strata}
            minIdentity={minIdentity}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No profiled Logan hit at {stratumLabel} identity.
          </p>
        )}
      </div>

      {env.n_sequences > 0 && (
        <div className="flex flex-col gap-2">
          <SectionTitle title="BioSamples by environment" />
          <p className="text-xs text-muted-foreground">
            In the chart's order, most enriched first. Click a bar to open its
            profile.
          </p>
          <div ref={detailsRef} className="flex flex-col gap-2">
            {listed.map(row => {
              const members = hitsInProfile(stratumHits, row.profile)
              if (!members.length) return null
              const inProfile = batch
                ? profileSamples(batch, stratumHits, row.profile)
                : null
              return (
                <Disclosure
                  key={row.profile}
                  data-profile={row.profile}
                  open={open.has(row.profile)}
                  onToggle={e =>
                    setProfileOpen(row.profile, e.currentTarget.open)
                  }
                  title={profileName(row.profile)}
                  count={`${
                    row.sequences >= MIN_SEQUENCES_FOR_RATIO
                      ? `${formatX(row.x_expected)}× expected · `
                      : ""
                  }${members.length} hits${
                    inProfile
                      ? ` · ${inProfile.samples.length} samples · ${inProfile.studies} studies`
                      : ""
                  }`}
                >
                  {inProfile ? (
                    <ProfileSamples
                      samples={inProfile.samples}
                      onOpenRecord={onOpenRecord}
                    />
                  ) : (
                    <ProfileHits
                      members={members}
                      onOpenRecord={onOpenRecord}
                    />
                  )}
                </Disclosure>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
