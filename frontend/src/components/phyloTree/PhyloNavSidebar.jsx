import React from "react"
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
 * Navigation sidebar for family trees: focus, lineage path, nearby filter,
 * closest-sequence list, and metadata coloring.
 */
export default function PhyloNavSidebar({
  focusedLeafId,
  memberIndex,
  pathLength,
  neighbors,
  neighborhoodActive,
  neighborhoodMode, // "radius" | "knn"
  radius,
  maxRadius,
  kNearest,
  maxKNearest = 50,
  onRadiusChange,
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

  return (
    <aside
      className="flex flex-col gap-4 text-sm self-start lg:sticky lg:top-4 w-full max-h-[65vh] overflow-y-auto overscroll-contain pr-1"
      style={{ scrollbarGutter: "stable" }}
    >
      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Selected sequence
        </h3>
        {focusedLeafId ? (
          <div className="mt-2 space-y-1">
            <p className="m-0 font-mono text-foreground font-medium">{focusLabel}</p>
            <p className="m-0 text-xs text-muted-foreground">
              Enzyme {focusedLeafId}
              {focusMember?.component != null && ` · component ${focusMember.component}`}
              {focusMember?.family_pid != null &&
                ` · ${Number(focusMember.family_pid).toFixed(1)}% identity to family center`}
            </p>
            <Link
              to={`/enzyme/${focusedLeafId}`}
              className="text-accent hover:underline text-xs"
              target="_blank"
            >
              Open enzyme page →
            </Link>
          </div>
        ) : (
          <p className="mt-2 mb-0 text-muted-foreground text-xs">
            Search or click a tip on the tree to select a sequence.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Lineage to the root
        </h3>
        {focusedLeafId && pathLength > 0 ? (
          <div className="mt-2">
            <p className="m-0 text-foreground">
              <span className="font-mono">{focusLabel}</span>
              <span className="text-muted-foreground">
                {" "}
                → {ancestorCount} ancestral node
                {ancestorCount === 1 ? "" : "s"} → root of this family tree
              </span>
            </p>
            <p className="mt-1 mb-0 text-xs text-muted-foreground">
              The red line on the tree shows this path from the tip back to the root.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-2"
              onClick={() => onSelectNeighbor?.(focusedLeafId)}
            >
              Zoom back to this sequence
            </button>
          </div>
        ) : (
          <p className="mt-2 mb-0 text-muted-foreground text-xs">
            Select a sequence to see how it connects back to the root of the tree.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Show nearby only
        </h3>
        <p className="mt-1 mb-2 text-xs text-muted-foreground">
          Dim sequences that are far from the selection so the local region is easier
          to read. Distance means how far apart two tips are along the tree branches
          (tree distance), not a BLAST score.
        </p>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={neighborhoodActive}
            disabled={!focusedLeafId}
            onChange={e => onToggleNeighborhood?.(e.target.checked)}
          />
          <span>Dim distant sequences</span>
        </label>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            className={`btn btn-sm ${neighborhoodMode === "radius" ? "btn-primary" : "btn-secondary"}`}
            disabled={!focusedLeafId}
            onClick={() => onNeighborhoodModeChange?.("radius")}
          >
            By tree distance
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

        {neighborhoodMode === "radius" ? (
          <div className="mb-3">
            <label className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>How far to include</span>
              <span className="font-mono">{formatTreeDistance(radius)}</span>
            </label>
            <input
              type="range"
              className="w-full"
              min={0}
              max={Math.max(maxRadius, 0.001)}
              step={Math.max(maxRadius / 200, 0.0001)}
              value={Math.min(radius, Math.max(maxRadius, 0))}
              disabled={!focusedLeafId}
              onChange={e => onRadiusChange?.(Number(e.target.value))}
            />
            <p className="mt-1 mb-0 text-xs text-muted-foreground">
              Keep tips within this tree distance of the selection; fade the rest.
            </p>
          </div>
        ) : (
          <div className="mb-3">
            <label className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>How many closest tips</span>
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
            <p className="mt-1 mb-2 text-xs text-muted-foreground">
              Keep only the N closest tips (plus the selection); fade everything else.
            </p>
            <div className="flex flex-wrap gap-1">
              {closestShortcuts.map(k => (
                <button
                  key={k}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={!focusedLeafId}
                  onClick={() => onKNearestChange?.(k)}
                >
                  {k === maxKNearest ? `All (${k})` : `Closest ${k}`}
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
          Show full tree again
        </button>
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Closest sequences
        </h3>
        <p className="mt-1 mb-2 text-xs text-muted-foreground">
          Ranked by tree distance (shorter branch path = closer). “Steps” is how many
          branches you cross on that path.
        </p>
        {!focusedLeafId ? (
          <p className="mb-0 text-muted-foreground text-xs">
            Select a sequence to list its closest neighbors.
          </p>
        ) : !neighbors.length ? (
          <p className="mb-0 text-muted-foreground text-xs">No other tips in this tree.</p>
        ) : (
          <ul className="m-0 p-0 list-none max-h-64 overflow-y-auto divide-y divide-border">
            {neighbors.map(n => {
              const label = leafDisplayLabel(n.enzymeId, memberIndex) || n.enzymeId
              const m = memberIndex.get(String(n.enzymeId))
              return (
                <li key={n.enzymeId} className="py-1.5">
                  <button
                    type="button"
                    className="w-full text-left hover:bg-muted/40 rounded px-1 py-0.5"
                    onClick={() => onSelectNeighbor?.(n.enzymeId)}
                  >
                    <div className="font-mono text-foreground truncate">{label}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                      <span>distance {formatTreeDistance(n.patristic)}</span>
                      <span>
                        {n.hops} step{n.hops === 1 ? "" : "s"}
                      </span>
                      {m?.component != null && <span>component {m.component}</span>}
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
          Color the tips
        </h3>
        <label className="block mt-2 text-xs text-muted-foreground mb-1" htmlFor="phylo-color-mode">
          Color by
        </label>
        <select
          id="phylo-color-mode"
          className="input w-full text-sm"
          value={colorMode}
          onChange={e => onColorModeChange?.(e.target.value)}
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
                <span className="truncate text-muted-foreground">{entry.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
