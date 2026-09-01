// frontend/src/components/corpus/SignalPeptidePanel.jsx
//
// Angela SignalP6 predictions for a corpus ORF (GET /api/orf/:id/annotations).
// Table signalp6_orf_predictions stores positive hits only (top_signal 1–5).
import React, { useEffect, useState } from "react"
import config from "../../config"

function fmtProb(value) {
  if (value == null || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return `${(n * 100).toFixed(1)}%`
}

function probPct(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n * 100))
}

/** Soft, distinct chips per SignalP class (avoid purple / glow aesthetics). */
const TYPE_STYLES = {
  SP: "bg-teal-700/15 text-teal-900 border-teal-700/30",
  LIPO: "bg-amber-700/15 text-amber-950 border-amber-700/30",
  TAT: "bg-sky-800/15 text-sky-950 border-sky-800/30",
  TATLIPO: "bg-orange-800/15 text-orange-950 border-orange-800/30",
  PILIN: "bg-stone-700/15 text-stone-900 border-stone-700/30",
}

function TypeBadge({ label, description }) {
  const style = TYPE_STYLES[label] || "bg-secondary text-secondary-foreground border-border"
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span
        className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-sm font-semibold tracking-wide ${style}`}
      >
        {label}
      </span>
      {description ? (
        <p className="text-sm text-muted-foreground m-0 leading-snug">{description}</p>
      ) : null}
    </div>
  )
}

function ProbMeter({ label, value }) {
  const text = fmtProb(value)
  if (text == null) return null
  const pct = probPct(value)
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-primary tabular-nums">{text}</span>
      </div>
      <div
        className="h-2 rounded-full bg-border/80 overflow-hidden"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div
          className="h-full rounded-full bg-primary/80 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/**
 * N→C bar: shaded signal segment + mature region + cleavage tick.
 */
function CleavageSchematic({ seqLength, cleavagePos }) {
  const len = Number(seqLength)
  const cut = Number(cleavagePos)
  if (!Number.isFinite(len) || len <= 0 || !Number.isFinite(cut) || cut <= 0) {
    return null
  }
  const end = Math.min(cut, len)
  const signalPct = (end / len) * 100

  return (
    <div className="rounded-lg border border-border/80 bg-surface-raised/40 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-medium text-foreground">Cleavage map</span>
        <span className="text-xs text-muted-foreground font-mono">
          cut after {end} · {len} aa
        </span>
      </div>
      <div className="relative pt-5 pb-6">
        <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
          <div
            className="h-full bg-teal-700/55"
            style={{ width: `${signalPct}%` }}
            title={`Predicted signal · residues 1–${end}`}
          />
          <div
            className="h-full bg-muted/40 flex-1"
            title={`Mature region · residues ${end + 1}–${len}`}
          />
        </div>
        <div
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${signalPct}%`, transform: "translateX(-50%)" }}
        >
          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap mb-0.5">
            CS {end}
          </span>
          <div className="w-px h-3 bg-foreground/70" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>N · 1</span>
          <span>C · {len}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-700/55" />
          Signal (1–{end})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted/60 border border-border" />
          Mature ({end + 1}–{len})
        </span>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   orfId: number | string | null,
 *   seqLength?: number | null,
 *   onHighlightRange?: (range: { start: number, end: number } | null) => void,
 * }} props
 */
export default function SignalPeptidePanel({
  orfId,
  seqLength = null,
  onHighlightRange = null,
}) {
  const [status, setStatus] = useState("idle") // idle | loading | ready | empty | missing | error
  const [payload, setPayload] = useState(null)

  useEffect(() => {
    if (orfId == null || orfId === "") {
      setStatus("idle")
      setPayload(null)
      return
    }

    let cancelled = false
    setStatus("loading")

    fetch(`${config.apiUrl}/orf/${encodeURIComponent(String(orfId))}/annotations`)
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) {
          setStatus("empty")
          return
        }
        if (!res.ok) {
          setStatus("error")
          return
        }
        const data = await res.json()
        if (cancelled) return
        setPayload(data)
        const sp = data?.signalp
        if (sp && sp.available === false) {
          setStatus("missing")
        } else if (sp?.prediction) {
          setStatus("ready")
        } else {
          setStatus("empty")
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [orfId])

  const prediction = payload?.signalp?.prediction ?? null
  const localization = payload?.localization ?? null
  const biochemical = payload?.biochemical ?? null

  useEffect(() => {
    if (!onHighlightRange) return
    if (prediction?.cleavage_pos != null && Number(prediction.cleavage_pos) > 0) {
      const end = Number(prediction.cleavage_pos)
      const max = seqLength != null ? Number(seqLength) : end
      onHighlightRange({ start: 1, end: Math.min(end, max) })
    } else {
      onHighlightRange(null)
    }
    return () => {
      onHighlightRange(null)
    }
  }, [prediction, seqLength, onHighlightRange])

  if (status === "idle") return null

  const pendingChips = []
  if (localization?.available === false) {
    pendingChips.push("DeepLoc localization")
  }
  if (biochemical?.available === false) {
    pendingChips.push("Extra biochem (instability, aromaticity)")
  }

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground m-0">
          Signal peptide
        </h2>
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          Angela · SignalP 6
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Predicted N-terminal signal from SignalP 6.0.
      </p>

      {status === "loading" && (
        <p className="text-sm text-muted-foreground italic m-0">
          Loading predictions…
        </p>
      )}

      {status === "missing" && (
        <p className="text-sm text-muted-foreground m-0">
          SignalP data is not available in this database snapshot.
        </p>
      )}

      {status === "empty" && (
        <p className="text-sm text-muted-foreground m-0">
          No signal peptide predicted for this ORF.
        </p>
      )}

      {status === "error" && (
        <p className="text-sm text-muted-foreground m-0">
          Sequence predictions could not be loaded.
        </p>
      )}

      {status === "ready" && prediction && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
            <TypeBadge
              label={prediction.label}
              description={prediction.description}
            />
            <div className="space-y-3">
              <ProbMeter label="Signal probability" value={prediction.signal_prob} />
              <ProbMeter
                label="Cleavage probability"
                value={prediction.cleavage_prob}
              />
              {prediction.cleavage_pos != null && (
                <p className="text-xs text-muted-foreground m-0">
                  Cleavage after residue{" "}
                  <span className="font-mono text-foreground">
                    {prediction.cleavage_pos}
                  </span>
                </p>
              )}
            </div>
          </div>

          <CleavageSchematic
            seqLength={seqLength}
            cleavagePos={prediction.cleavage_pos}
          />
        </div>
      )}

      {pendingChips.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border/60">
          <p className="text-xs text-muted-foreground m-0 mb-2">Coming soon</p>
          <div className="flex flex-wrap gap-2">
            {pendingChips.map(label => (
              <span
                key={label}
                className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
