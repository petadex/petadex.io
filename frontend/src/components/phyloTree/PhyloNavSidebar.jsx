import React, { useMemo } from "react"
import { Link } from "gatsby"
import { leafDisplayLabel } from "./leafUtils"
import { COLOR_MODES } from "./metadataColors"

function formatTreeDistance(d) {
  if (!Number.isFinite(d)) return "—"
  if (d === 0) return "0"
  if (d < 0.001) return d.toExponential(2)
  if (d < 1) return d.toFixed(4)
  return d.toFixed(3)
}

/** Six presets as ~5/10/25/50/75/100% of other tips (deduped, ascending). */
function closestCountPresets(maxK) {
  const n = Math.max(1, Math.floor(Number(maxK) || 1))
  const raw = [
    Math.max(1, Math.round(n * 0.05)),
    Math.max(1, Math.round(n * 0.1)),
    Math.max(1, Math.round(n * 0.25)),
    Math.max(1, Math.round(n * 0.5)),
    Math.max(1, Math.round(n * 0.75)),
    n,
  ]
  return [...new Set(raw)].sort((a, b) => a - b)
}

/**
 * Compact visual path: tip → ancestors → root (no paragraph).
 */
function LineageVisual({ tipLabel, ancestorCount }) {
  const steps = Math.max(0, ancestorCount)
  const nodes = ["tip", ...Array.from({ length: Math.min(steps, 6) }, (_, i) => `a${i}`), "root"]
  return (
    <div className="mt-2" aria-label={`${steps} steps from tip to root`}>
      <div className="flex items-center gap-1 overflow-x-auto py-1">
        {nodes.map((id, i) => {
          const isTip = i === 0
          const isRoot = i === nodes.length - 1
          return (
            <React.Fragment key={id}>
              {i > 0 && (
                <span className="h-px w-3 shrink-0 bg-destructive/70" aria-hidden />
              )}
              <span
                className={`shrink-0 rounded-full border ${
                  isTip
                    ? "w-2.5 h-2.5 bg-destructive border-destructive"
                    : isRoot
                      ? "w-2.5 h-2.5 bg-foreground border-foreground"
                      : "w-2 h-2 bg-destructive/40 border-destructive/50"
                }`}
                title={isTip ? tipLabel : isRoot ? "root" : "ancestor"}
              />
            </React.Fragment>
          )
        })}
      </div>
      <p className="m-0 mt-1 font-mono text-xs text-foreground truncate">{tipLabel}</p>
      <p className="m-0 text-xs text-muted-foreground">
        {steps} step{steps === 1 ? "" : "s"} → root
        {steps > 6 ? " (path shortened)" : ""}
      </p>
    </div>
  )
}

function DistanceRuler({ neighbors }) {
  const maxDist = useMemo(() => {
    let m = 0
    for (const n of neighbors || []) {
      if (Number.isFinite(n.patristic) && n.patristic > m) m = n.patristic
    }
    return m || 1
  }, [neighbors])

  if (!neighbors?.length) return null

  return (
    <div className="mb-2 rounded border border-border bg-muted/20 px-2 py-1.5">
      <div className="flex justify-between text-2xs text-muted-foreground mb-1">
        <span>0</span>
        <span>tree distance</span>
        <span className="font-mono">{formatTreeDistance(maxDist)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-accent/70"
          style={{ width: "100%" }}
          aria-hidden
        />
      </div>
      <div className="mt-1 flex justify-between text-2xs text-muted-foreground">
        <span>near</span>
        <span>far</span>
      </div>
    </div>
  )
}

/**
 * Navigation sidebar for family trees — short labels only (Pixeldom4 review).
 */
export default function PhyloNavSidebar({
  focusedLeafId,
  memberIndex,
  pathLength,
  neighbors,
  neighborhoodActive,
  neighborhoodMode, // "hops" | "knn"
  hopRadius,
  maxHopRadius,
  kNearest,
  maxKNearest = 50,
  onHopRadiusChange,
  onKNearestChange,
  onNeighborhoodModeChange,
  onToggleNeighborhood,
  onClearNeighborhood,
  onSelectNeighbor,
  colorMode,
  onColorModeChange,
  colorLegend,
}) {
  const focusMember = focusedLeafId
    ? memberIndex.get(String(focusedLeafId))
    : null
  const focusLabel = focusedLeafId
    ? leafDisplayLabel(focusedLeafId, memberIndex) || focusedLeafId
    : null
  const closestShortcuts = closestCountPresets(maxKNearest)
  const ancestorCount = Math.max(0, pathLength - 1)
  const maxNeighborDist = useMemo(() => {
    let m = 0
    for (const n of neighbors || []) {
      if (Number.isFinite(n.patristic) && n.patristic > m) m = n.patristic
    }
    return m || 1
  }, [neighbors])

  return (
    <aside
      className="flex flex-col gap-3 text-sm self-start lg:sticky lg:top-4 w-full max-h-[65vh] overflow-y-auto overscroll-contain pr-1"
      style={{ scrollbarGutter: "stable" }}
    >
      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Selected
        </h3>
        {focusedLeafId ? (
          <div className="mt-2 space-y-1">
            <p className="m-0 font-mono text-foreground font-medium truncate">{focusLabel}</p>
            {focusMember?.family_pid != null && (
              <p className="m-0 text-xs text-foreground">
                Identity to family centroid:{" "}
                <span className="font-mono font-semibold">
                  {Number(focusMember.family_pid).toFixed(1)}%
                </span>
              </p>
            )}
            {focusMember?.component != null && (
              <p className="m-0 text-xs text-muted-foreground">
                Component {focusMember.component}
              </p>
            )}
            <Link
              to={`/enzyme/${focusedLeafId}`}
              className="text-accent hover:underline text-xs"
              target="_blank"
            >
              Enzyme page →
            </Link>
          </div>
        ) : (
          <p className="mt-2 mb-0 text-muted-foreground text-xs">Select a tip.</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Path to root
        </h3>
        {focusedLeafId && pathLength > 0 ? (
          <>
            <LineageVisual tipLabel={focusLabel} ancestorCount={ancestorCount} />
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-2"
              onClick={() => onSelectNeighbor?.(focusedLeafId)}
            >
              Re-zoom
            </button>
          </>
        ) : (
          <p className="mt-2 mb-0 text-muted-foreground text-xs">Select a tip.</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nearby
        </h3>
        <label className="flex items-center gap-2 cursor-pointer mt-2 mb-2">
          <input
            type="checkbox"
            checked={neighborhoodActive}
            disabled={!focusedLeafId}
            onChange={e => onToggleNeighborhood?.(e.target.checked)}
          />
          <span>Dim far tips</span>
        </label>

        <div className="flex gap-2 mb-2">
          <button
            type="button"
            className={`btn btn-sm ${neighborhoodMode === "hops" ? "btn-primary" : "btn-secondary"}`}
            disabled={!focusedLeafId}
            onClick={() => onNeighborhoodModeChange?.("hops")}
          >
            By steps
          </button>
          <button
            type="button"
            className={`btn btn-sm ${neighborhoodMode === "knn" ? "btn-primary" : "btn-secondary"}`}
            disabled={!focusedLeafId}
            onClick={() => onNeighborhoodModeChange?.("knn")}
          >
            Closest N
          </button>
        </div>

        {neighborhoodMode === "hops" ? (
          <div className="mb-2">
            <label className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Max steps</span>
              <span className="font-mono">
                {hopRadius} / {maxHopRadius}
              </span>
            </label>
            <input
              type="range"
              className="w-full"
              min={0}
              max={Math.max(maxHopRadius, 1)}
              step={1}
              value={Math.min(hopRadius, Math.max(maxHopRadius, 0))}
              disabled={!focusedLeafId}
              onChange={e => onHopRadiusChange?.(Number(e.target.value))}
            />
          </div>
        ) : (
          <div className="mb-2">
            <label className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Keep N closest</span>
              <span className="font-mono">
                {kNearest} / {maxKNearest}
              </span>
            </label>
            <input
              type="range"
              className="w-full"
              min={1}
              max={maxKNearest}
              step={1}
              value={Math.min(kNearest, maxKNearest)}
              disabled={!focusedLeafId}
              onChange={e => onKNearestChange?.(Number(e.target.value))}
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {closestShortcuts.map(k => (
                <button
                  key={k}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={!focusedLeafId}
                  onClick={() => onKNearestChange?.(k)}
                >
                  {k === maxKNearest ? `All` : `${k}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!neighborhoodActive}
          onClick={() => onClearNeighborhood?.()}
        >
          Show all
        </button>
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Closest
        </h3>
        <DistanceRuler neighbors={neighbors} />
        {!focusedLeafId ? (
          <p className="mb-0 text-muted-foreground text-xs">Select a tip.</p>
        ) : !neighbors.length ? (
          <p className="mb-0 text-muted-foreground text-xs">No neighbors.</p>
        ) : (
          <ul className="m-0 p-0 list-none max-h-64 overflow-y-auto divide-y divide-border">
            {neighbors.map(n => {
              const label = leafDisplayLabel(n.enzymeId, memberIndex) || n.enzymeId
              const barPct = Math.min(
                100,
                (100 * (Number.isFinite(n.patristic) ? n.patristic : 0)) / maxNeighborDist,
              )
              return (
                <li key={n.enzymeId} className="py-1.5">
                  <button
                    type="button"
                    className="w-full text-left hover:bg-muted/40 rounded px-1 py-0.5"
                    onClick={() => onSelectNeighbor?.(n.enzymeId)}
                  >
                    <div className="font-mono text-foreground truncate text-xs">{label}</div>
                    <div className="mt-0.5 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-accent/80"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <div className="text-2xs text-muted-foreground flex gap-x-2 mt-0.5">
                      <span>{formatTreeDistance(n.patristic)}</span>
                      <span>
                        {n.hops} step{n.hops === 1 ? "" : "s"}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Color tips
        </h3>
        <select
          id="phylo-color-mode"
          className="input w-full text-sm mt-2"
          value={colorMode}
          onChange={e => onColorModeChange?.(e.target.value)}
          aria-label="Color by"
        >
          {COLOR_MODES.map(m => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {colorLegend?.length > 0 && (
          <ul className="mt-3 mb-0 p-0 list-none space-y-1 max-h-40 overflow-y-auto">
            {colorLegend.map(entry => (
              <li key={entry.label} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block w-3 h-3 rounded-sm shrink-0 border border-border"
                  style={{ background: entry.color }}
                />
                <span className="truncate text-muted-foreground flex-1">{entry.label}</span>
                {entry.pct != null && (
                  <span className="font-mono text-muted-foreground shrink-0">{entry.pct}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
