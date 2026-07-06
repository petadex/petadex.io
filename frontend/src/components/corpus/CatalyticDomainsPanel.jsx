// frontend/src/components/corpus/CatalyticDomainsPanel.jsx
//
// Catalytic-domain evidence for a corpus ORF, from the corpus-keyed route
// GET /api/orf/{orfId}/domains (petadex_catalytic_domains + pazy_hmms). This is a
// FACTUAL, deterministic HMM match — framed as EVIDENCE with coordinates, never
// as a function claim ("is a PETase"). See the framing discipline in "01 -
// Per-Sequence Annotation Plan" and "03 - Frontend Wiring".
//
// NOTE: this intentionally does NOT use the curated LazyPetadexCatalyticDomainsPanel
// / /api/petadex-domains route — that route resolves the integer id against the
// enzyme_fastaa namespace (a different protein for the same integer) and serves a
// mismatched sequence. This panel is keyed purely on the corpus orf_id.
import React, { useEffect, useState } from "react"
import { Link } from "gatsby"
import config from "../../config"

// PAZy HMM tracks do not currently carry a Pfam accession. When one becomes
// available on a domain record (e.g. `pfam_accession`/`pfam`), we link it to the
// matching /cath-domains profile. Until then this returns null (no link shown).
function pfamAccessionOf(d) {
  const raw = String(d?.pfam_accession || d?.pfam || "").trim().toUpperCase()
  return /^PF\d{3,}$/.test(raw) ? raw : null
}

// Deterministic per-domain hue (same golden-angle scheme used for family colors
// elsewhere) so a domain's track block and its legend swatch always match.
const domainHue = i => (i * 137.508) % 360

// Small caret marking a domain boundary (start or end) on the SEQUENCE axis,
// with its residue-position label. `leftPct` is the boundary position along the
// 1..length axis; these ARE sequence coordinates (unlike catalytic match states).
function BoundaryTick({ leftPct, pos, hue, dim }) {
  return (
    <div
      className={`absolute top-0 flex flex-col items-center ${
        dim ? "opacity-40" : ""
      }`}
      style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
    >
      {/* caret points UP at the domain block above */}
      <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
        <path d="M4.5 0 L9 6 L0 6 Z" fill={`hsl(${hue} 65% 45%)`} />
      </svg>
      <span className="text-[9px] leading-none font-mono text-muted-foreground mt-0.5">
        {pos}
      </span>
    </div>
  )
}

/**
 * The specifically-hit catalytic residues annotated on the PAZy HMM MODEL axis
 * (match-state coordinates). These are deliberately NOT placed on the 1..length
 * sequence axis: `catalytic_match_states` are HMM-relative positions, so putting
 * them on the sequence line would be a fabricated coordinate (see the framing
 * discipline in "01"/"04"). Each hit residue is a small down-arrow at its match
 * state, labelled with the residue letter (above) and the state number (below).
 * Residue letters (`catalytic_residues`) are paired with states by index (both
 * are ordered N→C); a missing letter falls back to "•".
 */
function HmmStateMap({ residues, states }) {
  const pairs = states
    .map((s, i) => ({ residue: residues[i] || "•", state: Number(s) }))
    .filter(p => Number.isFinite(p.state))
  if (!pairs.length) return null

  const maxState = Math.max(...pairs.map(p => p.state))
  const denom = Math.max(maxState - 1, 1)
  const pct = s => ((s - 1) / denom) * 100

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <p className="text-2xs font-medium text-muted-foreground m-0 mb-3">
        Hit catalytic residues · PAZy HMM match-state coordinates{" "}
        <span className="font-normal text-muted-foreground/80">
          (model positions, not sequence residues)
        </span>
      </p>
      <div className="relative h-8">
        {/* HMM model axis line */}
        <div className="absolute left-0 right-0 bottom-3 h-px bg-border" />
        {pairs.map((p, i) => (
          <div
            key={`${p.residue}-${p.state}-${i}`}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${pct(p.state)}%`, transform: "translateX(-50%)" }}
            title={`Catalytic ${p.residue} at HMM match state ${p.state}`}
          >
            <span className="text-2xs font-mono font-semibold text-foreground leading-none">
              {p.residue}
            </span>
            {/* arrow points DOWN at the model axis */}
            <svg
              width="9"
              height="6"
              viewBox="0 0 9 6"
              className="my-0.5"
              aria-hidden="true"
            >
              <path d="M4.5 6 L9 0 L0 0 Z" fill="hsl(150 60% 38%)" />
            </svg>
            <span className="text-[9px] font-mono text-muted-foreground leading-none">
              {p.state}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80">
        <span>match state 1</span>
        <span>{maxState}</span>
      </div>
    </div>
  )
}

/**
 * Standalone linear representation of the sequence (a 1..length axis) with the
 * factual catalytic domains drawn on it to scale. This is NOT overlaid on the
 * residue-by-residue SequenceViewer — it's its own schematic line. The domain
 * spans (`domain_start`–`domain_end`) ARE sequence coordinates, so each domain
 * is a block positioned proportionally along the axis, with small boundary carets
 * marking the start/end residue positions. No fabricated residue positions: the
 * catalytic residues are HMM-relative, so they are annotated separately on a
 * per-domain HMM match-state axis (see HmmStateMap), never as ticks on this line.
 *
 * Each domain block is selectable; selecting one highlights the matching region
 * in the SequenceViewer above (via the panel's `onSelectDomain` callback).
 *
 * @param {{
 *   domains: any[],
 *   seqLength: number | null,
 *   selectedIdx: number | null,
 *   onToggle: (i: number) => void,
 * }} props
 */
function DomainTrack({ domains, seqLength, selectedIdx, onToggle }) {
  const len = Number(seqLength)
  if (!Number.isFinite(len) || len <= 0 || !domains?.length) return null

  const hasSelection = selectedIdx != null

  return (
    <div className="mb-5">
      <div className="flex justify-between text-2xs text-muted-foreground font-mono mb-1">
        <span>1</span>
        <span>{len} aa</span>
      </div>

      {/* Schematic line: the whole sequence as the base bar, domains as scaled
          selectable blocks positioned along it. */}
      <div
        className="relative h-7 w-full rounded bg-surface-sunken border border-border overflow-hidden"
        role="group"
        aria-label={`Catalytic domain map across ${len} residues`}
      >
        {domains.map((d, i) => {
          const start = Math.max(1, Number(d.domain_start) || 1)
          const end = Math.min(len, Number(d.domain_end) || len)
          if (!(end >= start)) return null
          const left = ((start - 1) / len) * 100
          const width = Math.max(((end - start + 1) / len) * 100, 0.5)
          const active = selectedIdx === i
          return (
            <button
              type="button"
              key={`${d.pazy_hmm_id}-${i}`}
              onClick={() => onToggle(i)}
              aria-pressed={active}
              title={`${d.domain || d.pazy_hmm_id} · residues ${start}–${end}${
                active ? " (selected)" : " — click to highlight in sequence"
              }`}
              className={[
                "absolute top-0 h-full flex items-center justify-center overflow-hidden",
                "cursor-pointer transition-all focus:outline-none",
                active
                  ? "ring-2 ring-inset ring-foreground z-10"
                  : hasSelection
                  ? "opacity-40 hover:opacity-70"
                  : "hover:brightness-110",
              ].join(" ")}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: `hsl(${domainHue(i)} 65% 52% / 0.9)`,
              }}
            >
              <span className="text-2xs font-medium text-white px-1 truncate">
                {d.domain || d.pazy_hmm_id}
              </span>
            </button>
          )
        })}
      </div>

      {/* Domain boundary carets: small arrows at each domain's start/end with the
          residue-position label (sequence coordinates). */}
      <div className="relative h-4 mt-1">
        {domains.map((d, i) => {
          const start = Math.max(1, Number(d.domain_start) || 1)
          const end = Math.min(len, Number(d.domain_end) || len)
          if (!(end >= start)) return null
          const active = selectedIdx === i
          const dim = hasSelection && !active
          return (
            <React.Fragment key={`bound-${d.pazy_hmm_id}-${i}`}>
              <BoundaryTick
                leftPct={((start - 1) / len) * 100}
                pos={start}
                hue={domainHue(i)}
                dim={dim}
              />
              <BoundaryTick
                leftPct={(end / len) * 100}
                pos={end}
                hue={domainHue(i)}
                dim={dim}
              />
            </React.Fragment>
          )
        })}
      </div>

      {/* Legend: domain name + exact residue range, color-matched to the track.
          Also selectable, mirroring the blocks. */}
      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
        {domains.map((d, i) => {
          const active = selectedIdx === i
          return (
            <button
              type="button"
              key={`legend-${d.pazy_hmm_id}-${i}`}
              onClick={() => onToggle(i)}
              aria-pressed={active}
              className={[
                "inline-flex items-center gap-1.5 text-2xs rounded px-1.5 py-0.5 transition-colors",
                "focus:outline-none focus:ring-1 focus:ring-foreground/40",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-surface-raised",
              ].join(" ")}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: `hsl(${domainHue(i)} 65% 52%)` }}
              />
              <span className={active ? "text-foreground" : "text-foreground/90"}>
                {d.domain || d.pazy_hmm_id}
              </span>
              <span className="font-mono">
                ({d.domain_start}–{d.domain_end})
              </span>
            </button>
          )
        })}
      </div>

      {hasSelection && (
        <p className="text-2xs text-muted-foreground mt-1.5 m-0">
          Highlighting residues {domains[selectedIdx]?.domain_start}–
          {domains[selectedIdx]?.domain_end} in the sequence above. Click again
          to clear.
        </p>
      )}
    </div>
  )
}

function Domain({ d }) {
  const residues = Array.isArray(d.catalytic_residues)
    ? d.catalytic_residues.filter(Boolean)
    : []
  const states = Array.isArray(d.catalytic_match_states)
    ? d.catalytic_match_states.filter(Boolean)
    : []

  const pfam = pfamAccessionOf(d)

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-foreground m-0">
          {d.domain || "PAZy HMM domain"}
        </h3>
        <span className="font-mono text-xs text-muted-foreground">
          residues {d.domain_start}–{d.domain_end}
        </span>
      </div>

      {pfam && (
        <p className="text-xs mt-1 mb-0">
          <Link
            to={`/cath-domains?pfam=${pfam}`}
            className="text-accent hover:text-accent-hover underline underline-offset-2"
          >
            View CATH domain profile ({pfam})
          </Link>
        </p>
      )}

      <p className="text-sm text-secondary-foreground mt-2 mb-0">
        Matched PAZy HMM{" "}
        <span className="font-mono text-foreground">{d.pazy_hmm_id}</span> over
        residues {d.domain_start}–{d.domain_end}.
        {residues.length > 0 && (
          <>
            {" "}
            Catalytic residues{" "}
            <span className="font-mono text-foreground">
              {residues.join(", ")}
            </span>{" "}
            present
            {states.length > 0 && (
              <>
                {" "}
                (HMM match states{" "}
                <span className="font-mono">{states.join(", ")}</span>)
              </>
            )}
            .
          </>
        )}
      </p>

      {states.length > 0 && <HmmStateMap residues={residues} states={states} />}

      {d.evidence_type && (
        <p className="text-xs text-muted-foreground mt-2 mb-0">
          Evidence: {d.evidence_type}
          {d.date_performed
            ? ` · ${String(d.date_performed).slice(0, 10)}`
            : ""}
        </p>
      )}
    </div>
  )
}

/**
 * @param {{
 *   orfId: number | string | null,
 *   seqLength?: number | null,
 *   onSelectDomain?: (range: { start: number, end: number, label: string } | null) => void,
 * }} props
 */
export default function CatalyticDomainsPanel({
  orfId,
  seqLength,
  onSelectDomain,
}) {
  const [domains, setDomains] = useState([])
  const [status, setStatus] = useState("idle") // idle | loading | ready | empty | error
  const [selectedIdx, setSelectedIdx] = useState(null)

  // Reset any selection when the ORF changes (and clear the parent highlight).
  useEffect(() => {
    setSelectedIdx(null)
    onSelectDomain?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orfId])

  const toggleDomain = i => {
    const next = selectedIdx === i ? null : i
    setSelectedIdx(next)
    if (next == null) {
      onSelectDomain?.(null)
      return
    }
    const d = domains[next]
    onSelectDomain?.({
      start: Number(d.domain_start),
      end: Number(d.domain_end),
      label: d.domain || d.pazy_hmm_id,
    })
  }

  useEffect(() => {
    if (orfId == null || orfId === "") {
      setStatus("idle")
      return
    }

    let cancelled = false
    setStatus("loading")

    fetch(`${config.apiUrl}/orf/${encodeURIComponent(String(orfId))}/domains`)
      .then(async res => {
        if (cancelled) return
        if (!res.ok) {
          setStatus("error")
          return
        }
        const data = await res.json()
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        setDomains(list)
        setStatus(list.length ? "ready" : "empty")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [orfId])

  // Render nothing while loading/idle (avoids layout flash on the common
  // no-domains case).
  if (status === "idle" || status === "loading") return null

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-semibold text-foreground m-0">
          Catalytic domains
        </h2>
        <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
          Factual · HMM evidence
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Deterministic PAZy HMM matches with coordinates — shown as evidence, not
        a function assignment.
      </p>

      {status === "ready" && (
        <>
          <DomainTrack
            domains={domains}
            seqLength={seqLength}
            selectedIdx={selectedIdx}
            onToggle={toggleDomain}
          />
          <div className="space-y-3">
            {domains.map((d, i) => (
              <Domain key={`${d.pazy_hmm_id}-${i}`} d={d} />
            ))}
          </div>
        </>
      )}

      {status === "empty" && (
        <p className="text-sm text-muted-foreground m-0">
          No PAZy catalytic-HMM match is recorded for this ORF.
        </p>
      )}

      {status === "error" && (
        <p className="text-sm text-muted-foreground m-0">
          Catalytic-domain evidence could not be loaded.
        </p>
      )}
    </section>
  )
}
