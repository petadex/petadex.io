import React, { useEffect, useRef, useState } from "react"
import { Link } from "gatsby"
import config from "../../config"
import ProteinViewer from "../protein/ProteinViewer"

/** Card frame/tint/chip all use the site's one accent red — no more per-class rainbow. */
const CARD_STYLE = {
  frame: "bg-accent/85",
  art: "bg-gradient-to-br from-accent/25 via-accent/8 to-transparent",
  chip: "border-accent/40 bg-accent/15 text-accent",
}

const VALID_PDB_ID = /^[0-9][A-Za-z0-9]{3}$/

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

/** How long the card+side-text exit transition runs, in ms — must match the CSS duration below. */
const EXIT_DURATION_MS = 500

/**
 * Reveals `text` one character at a time, starting only once `active` is true - for stats that
 * load async, this means the line stays empty (not a "—" placeholder) until the real value is
 * known, so there's no jarring placeholder→real-value swap once the fetch resolves. Calls
 * `onDone` once when it finishes typing, so a parent can chain the next line's `active` off it.
 */
function TypewriterLine({ text, active, speed = 28, className, onDone }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(0)
  }, [text])

  useEffect(() => {
    if (!active || !text || count >= text.length) return undefined
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) {
      setCount(text.length)
      return undefined
    }
    const tickTimer = window.setTimeout(() => setCount(c => c + 1), speed)
    return () => window.clearTimeout(tickTimer)
  }, [active, text, count, speed])

  const done = active && Boolean(text) && count >= text.length
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (done) onDoneRef.current?.()
  }, [done])

  return (
    <p className={className} aria-hidden="true">
      {text.slice(0, count)}
      {active && !done && <span className="typing-cursor" aria-hidden="true" />}
    </p>
  )
}

/** Abstract fold glyph shown when a domain has no structure to embed as card art yet. */
const FoldGlyph = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <path
      d="M4 34c6-10 10-10 16 0s10 10 16 0"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M4 24c6-10 10-10 16 0s10 10 16 0"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M4 14c6-10 10-10 16 0s10 10 16 0"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.3"
    />
  </svg>
)

/**
 * Rollup counts for this CATH domain: distinct predicted structures and distinct named species
 * (genus+species-level identifications only - see DOMAIN_ROLLUP_STATS backend-side), across
 * every enzyme classified under the fold (not a sample).
 */
function useDomainRollupStats(cathId) {
  const [stats, setStats] = useState({ uniquePdbs: null, namedSpecies: null })

  useEffect(() => {
    let cancelled = false
    setStats({ uniquePdbs: null, namedSpecies: null })
    if (!cathId) return undefined

    fetch(`${config.apiUrl}/atlas/domain-stats/${encodeURIComponent(cathId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return
        setStats({ uniquePdbs: data.uniquePdbs ?? null, namedSpecies: data.namedSpecies ?? null })
      })
      .catch(() => {
        if (!cancelled) setStats({ uniquePdbs: null, namedSpecies: null })
      })

    return () => {
      cancelled = true
    }
  }, [cathId])

  return stats
}

/**
 * Sequence-diversity stats for the card's side lines: how many distinct clusters this fold's
 * enzymes collapse into at ≤30/60/90% identity - i.e. how many genuinely distinct representative
 * sequences it has at each threshold, not just how many enzymes. Backed by an in-memory server
 * cache (the underlying query is too slow to run inline), so this is usually fast even on first
 * load.
 */
function useSequenceDiversity(cathId) {
  const [clusters, setClusters] = useState({ clusters30: null, clusters60: null, clusters90: null })

  useEffect(() => {
    let cancelled = false
    setClusters({ clusters30: null, clusters60: null, clusters90: null })
    if (!cathId) return undefined

    fetch(`${config.apiUrl}/atlas/sequence-diversity/${encodeURIComponent(cathId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return
        setClusters({
          clusters30: data.clusters30 ?? null,
          clusters60: data.clusters60 ?? null,
          clusters90: data.clusters90 ?? null,
        })
      })
      .catch(() => {
        if (!cancelled) setClusters({ clusters30: null, clusters60: null, clusters90: null })
      })

    return () => {
      cancelled = true
    }
  }, [cathId])

  return clusters
}

/**
 * Top distinct GenBank-documented functions for this fold's enzymes - a real-data substitute for
 * a curated "known functions" summary, since no such field exists in the schema. `null` while
 * loading/unavailable (falls back to curated `functionalDiversity` prose, then a placeholder);
 * `[]` once loaded means the domain genuinely has no documented functions yet.
 */
function useKnownFunctions(cathId) {
  const [functions, setFunctions] = useState(null)

  useEffect(() => {
    let cancelled = false
    setFunctions(null)
    if (!cathId) return undefined

    fetch(`${config.apiUrl}/atlas/known-functions/${encodeURIComponent(cathId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return
        setFunctions(Array.isArray(data.functions) ? data.functions : [])
      })
      .catch(() => {
        if (!cancelled) setFunctions(null)
      })

    return () => {
      cancelled = true
    }
  }, [cathId])

  return functions
}

/**
 * Clicking through to the full entry animates the card + side text out to the left, then hands
 * off to the page (`onToggleExpanded`) to reveal the full narrative content in their place.
 * `expanded`/`onToggleExpanded` are lifted to the page so that toggle can also control that
 * outer content; going back is handled by the page (see cath-domains.js), since the card
 * unmounts entirely once expanded and has nothing left to click.
 * @param {{ catDomain: import("../../models/CathDomain.js").CathDomain, expanded: boolean, onToggleExpanded: () => void }} props
 */
const CathDomainOverviewPanel = ({ catDomain, expanded, onToggleExpanded }) => {
  const stub = catDomain.isStub()
  const classLabel = catDomain.classLabel()
  const { namedSpecies } = useDomainRollupStats(catDomain.cathId)
  const { clusters30, clusters60, clusters90 } = useSequenceDiversity(catDomain.cathId)
  const knownFunctions = useKnownFunctions(catDomain.cathId)

  const [isLeaving, setIsLeaving] = useState(false)
  const [hideCard, setHideCard] = useState(false)

  // Reset whenever the page says we're collapsed again (e.g. user clicked "Show less" up top),
  // so the card comes back if they navigate back to this view.
  useEffect(() => {
    if (!expanded) {
      setIsLeaving(false)
      setHideCard(false)
    }
  }, [expanded])

  // Cascade: line 1 starts as soon as its data is ready, each subsequent line only once the
  // previous one finishes typing (and its own data is ready), the button once the last line
  // finishes. `stage` = how many lines have finished so far.
  const [stage, setStage] = useState(0)
  const advanceStage = from => {
    window.setTimeout(() => setStage(s => Math.max(s, from + 1)), 180)
  }
  // Safety net: if the stats fetch stalls or fails, still reveal the button after a few seconds
  // instead of leaving the entry point unreachable.
  useEffect(() => {
    const failsafe = window.setTimeout(() => setStage(s => Math.max(s, 3)), 5000)
    return () => window.clearTimeout(failsafe)
  }, [])

  const handleReadFullEntry = () => {
    if (isLeaving) return
    setIsLeaving(true)
    window.setTimeout(() => {
      setHideCard(true)
      onToggleExpanded()
    }, EXIT_DURATION_MS)
  }

  if (hideCard) return null

  const embedPdbId =
    catDomain.structureEmbedPdbId && VALID_PDB_ID.test(catDomain.structureEmbedPdbId)
      ? catDomain.structureEmbedPdbId.toUpperCase()
      : null

  // `active: false` keeps a line empty (never a "—" placeholder) until its real value is in -
  // the typewriter only starts once there's something real to type AND it's this line's turn
  // (stage >= its index), so line 2 never starts before line 1 finishes, etc.
  const sideLines = [
    {
      text: `${clusters30 != null ? clusters30.toLocaleString() : ""} representative sequences at ≤30% identity`,
      active: stage >= 0 && clusters30 != null,
    },
    {
      text: `${clusters60 != null ? clusters60.toLocaleString() : ""} representative sequences at ≤60% identity`,
      active: stage >= 1 && clusters60 != null,
    },
    {
      text: `${clusters90 != null ? clusters90.toLocaleString() : ""} representative sequences at ≤90% identity`,
      active: stage >= 2 && clusters90 != null,
    },
  ]
  const buttonVisible = stage >= 3

  return (
    <div
      id="cat-overview"
      className={`relative mt-6 scroll-mt-28 max-w-[26rem] transition-all duration-500 ease-in ${
        isLeaving ? "opacity-0 -translate-x-16" : "opacity-100 translate-x-0"
      }`}
    >
      {/* colored "card stock" frame, like a TCG card border, with a glossy diagonal sheen swept
          across the whole face (foil-card effect) */}
      <div className={`relative z-10 rounded-3xl p-3 shadow-2xl shadow-black/40 ring-1 ring-white/10 overflow-hidden ${CARD_STYLE.frame}`}>
        <div className="relative rounded-2xl bg-card text-card-foreground overflow-hidden">
          <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight m-0">
                {catDomain.displayName}
              </h2>
              <p className="text-xs font-mono text-muted-foreground m-0 mt-0.5">No. {catDomain.cathId}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${CARD_STYLE.chip}`}
            >
              {classLabel}
            </span>
          </div>

          {stub && (
            <p
              className="mx-4 mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-2xs text-amber-700 dark:text-amber-300/90"
              role="status"
            >
              Unconfirmed / auto-detected — not yet curated.
            </p>
          )}

          {/* card art: in-page 3D embed, chrome-less (no molstar controls) */}
          <div
            className={`mx-4 rounded-xl border-2 border-border/60 aspect-[16/10] relative overflow-hidden ${CARD_STYLE.art}`}
          >
            {embedPdbId ? (
              <ProteinViewer
                accession={`https://files.rcsb.org/download/${embedPdbId}.pdb`}
                showControls={false}
                enableMeasurement={false}
                enableSelection={false}
                width="100%"
                height="100%"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FoldGlyph className="w-14 h-14 text-muted-foreground/40" />
              </div>
            )}
          </div>

          <div className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Enzyme Families
            </span>
            {catDomain.totalFamilyCount != null ? (
              <Link
                to={`/atlas?cath=${encodeURIComponent(catDomain.cathId)}`}
                className="text-sm font-semibold text-accent tabular-nums hover:underline"
              >
                {Number(catDomain.totalFamilyCount).toLocaleString()} families
              </Link>
            ) : (
              <span className="text-sm font-semibold text-foreground tabular-nums">— families</span>
            )}
          </div>

          {catDomain.mechanism?.catalyticTriad && (
            <div className="mx-4 mt-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Catalytic Triad
              </span>
              <p className="text-sm text-foreground font-mono m-0 mt-0.5">
                {catDomain.mechanism.catalyticTriad.residues}
              </p>
            </div>
          )}

          <div className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Named Species
            </span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {namedSpecies != null ? namedSpecies.toLocaleString() : "—"}
            </span>
          </div>

          <div className="mx-4 mt-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Examples of Known Functions
            </span>
            {catDomain.knownFunctionsOverride() ? (
              <p className="text-sm text-foreground m-0 mt-1 line-clamp-4">
                {catDomain.knownFunctionsOverride()}
              </p>
            ) : knownFunctions == null ? (
              <p className="text-sm text-foreground m-0 mt-1">—</p>
            ) : knownFunctions.length > 0 ? (
              <p className="text-sm text-foreground m-0 mt-1 line-clamp-4">
                {knownFunctions.map(f => capitalize(f.func)).join(", ")}
              </p>
            ) : (
              <p className="text-sm text-foreground m-0 mt-1 line-clamp-4">
                {catDomain.functionalDiversity || "Work in progress."}
              </p>
            )}
          </div>

          <div className="pb-3.5" />
        </div>

        {/* glossy sheen, painted on top of everything so it reads as a foil highlight sweeping
            across the whole card face rather than just the frame border */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl mix-blend-overlay"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 20%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.3) 100%)",
          }}
          aria-hidden="true"
        />
      </div>

      {/* side text: real stats fade in line by line; line 4 is the entry point into the full page.
          Stacks below the card on narrow screens; sits beside it (absolute) from lg up. */}
      <div className="mt-6 flex flex-col gap-4 lg:mt-0 lg:absolute lg:top-6 lg:bottom-6 lg:left-[calc(100%+3rem)] lg:justify-between lg:gap-0 pointer-events-none select-none">
        {sideLines.map((line, i) => (
          <TypewriterLine
            key={i}
            text={line.text}
            active={line.active}
            onDone={() => advanceStage(i)}
            className="side-text-shadow text-xl xl:text-2xl font-light text-foreground/80 leading-tight m-0 whitespace-nowrap"
          />
        ))}
        <button
          type="button"
          onClick={handleReadFullEntry}
          className={`side-text-shadow pointer-events-auto w-fit text-left text-xl xl:text-2xl font-light whitespace-nowrap text-accent bg-accent/20 hover:bg-accent/30 backdrop-blur-sm border border-accent/50 rounded-xl px-5 py-2 transition-all duration-500 ${
            buttonVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
          }`}
        >
          Read more insights from PETAdex →
        </button>
      </div>

      <style>{`
        .side-text-shadow {
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7), 0 8px 24px rgba(0, 0, 0, 0.45);
        }
        .typing-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          margin-left: 2px;
          vertical-align: -0.15em;
          background: currentColor;
          animation: typingCursorBlink 0.8s step-end infinite;
        }
        @keyframes typingCursorBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .typing-cursor { display: none; }
        }
      `}</style>
    </div>
  )
}

export default CathDomainOverviewPanel
