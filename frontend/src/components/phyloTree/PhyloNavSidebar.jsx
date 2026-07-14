import React from "react"
import { Link } from "gatsby"
import { leafDisplayLabel } from "./leafUtils"
import { COLOR_MODES } from "./metadataColors"

function formatPatristic(d) {
  if (!Number.isFinite(d)) return "—"
  if (d === 0) return "0"
  if (d < 0.001) return d.toExponential(2)
  if (d < 1) return d.toFixed(4)
  return d.toFixed(3)
}

/**
 * Navigation sidebar for the phylo-tree prototype: root path, neighbors,
 * local neighborhood controls, and metadata coloring.
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
  onRadiusChange,
  onKNearestChange,
  onNeighborhoodModeChange,
  onToggleNeighborhood,
  onFitNeighborhood,
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

  return (
    <aside
      className="flex flex-col gap-4 text-sm self-start lg:sticky lg:top-4 w-full max-h-[65vh] overflow-y-auto overscroll-contain pr-1"
      style={{ scrollbarGutter: "stable" }}
    >
      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Focus
        </h3>
        {focusedLeafId ? (
          <div className="mt-2 space-y-1">
            <p className="m-0 font-mono text-foreground font-medium">{focusLabel}</p>
            <p className="m-0 text-xs text-muted-foreground">
              Enzyme {focusedLeafId}
              {focusMember?.component != null && ` · comp ${focusMember.component}`}
              {focusMember?.family_pid != null &&
                ` · ${Number(focusMember.family_pid).toFixed(1)}% pid`}
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
            Search or click a leaf to focus a tip.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Path to root
        </h3>
        {focusedLeafId && pathLength > 0 ? (
          <div className="mt-2">
            <p className="m-0 text-foreground">
              <span className="font-mono">{focusLabel}</span>
              <span className="text-muted-foreground">
                {" "}
                → {Math.max(0, pathLength - 1)} ancestral node
                {pathLength - 1 === 1 ? "" : "s"} → root
              </span>
            </p>
            <p className="mt-1 mb-0 text-xs text-muted-foreground">
              Red stroke on the tree traces this path (tip → root).
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-2"
              onClick={() => onSelectNeighbor?.(focusedLeafId)}
            >
              Re-zoom to tip
            </button>
          </div>
        ) : (
          <p className="mt-2 mb-0 text-muted-foreground text-xs">
            Focus a tip to see its lineage traceback.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Local neighborhood
        </h3>
        <p className="mt-1 mb-2 text-xs text-muted-foreground">
          Soft local clade: keep tips within a patristic radius (or k nearest) of
          the focus; dim the rest.
        </p>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={neighborhoodActive}
            disabled={!focusedLeafId}
            onChange={e => onToggleNeighborhood?.(e.target.checked)}
          />
          <span>Enable local clade view</span>
        </label>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            className={`btn btn-sm ${neighborhoodMode === "radius" ? "btn-primary" : "btn-secondary"}`}
            disabled={!focusedLeafId}
            onClick={() => onNeighborhoodModeChange?.("radius")}
          >
            Patristic radius
          </button>
          <button
            type="button"
            className={`btn btn-sm ${neighborhoodMode === "knn" ? "btn-primary" : "btn-secondary"}`}
            disabled={!focusedLeafId}
            onClick={() => onNeighborhoodModeChange?.("knn")}
          >
            k-nearest
          </button>
        </div>

        {neighborhoodMode === "radius" ? (
          <div className="mb-3">
            <label className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Radius (patristic)</span>
              <span className="font-mono">{formatPatristic(radius)}</span>
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
          </div>
        ) : (
          <div className="mb-3">
            <label className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>k nearest neighbors</span>
              <span className="font-mono">{kNearest}</span>
            </label>
            <input
              type="range"
              className="w-full"
              min={1}
              max={50}
              step={1}
              value={kNearest}
              disabled={!focusedLeafId}
              onChange={e => onKNearestChange?.(Number(e.target.value))}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {[5, 10, 15, 25].map(k => (
                <button
                  key={k}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={!focusedLeafId}
                  onClick={() => onKNearestChange?.(k)}
                >
                  k={k}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!neighborhoodActive || !focusedLeafId}
            onClick={() => onFitNeighborhood?.()}
          >
            Fit to neighborhood
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!neighborhoodActive}
            onClick={() => onClearNeighborhood?.()}
          >
            Clear
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nearby sequences
        </h3>
        <p className="mt-1 mb-2 text-xs text-muted-foreground">
          Ranked by patristic distance (branch-length path via LCA); hops shown
          secondarily.
        </p>
        {!focusedLeafId ? (
          <p className="mb-0 text-muted-foreground text-xs">Focus a tip to list neighbors.</p>
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
                      <span>d={formatPatristic(n.patristic)}</span>
                      <span>{n.hops} hop{n.hops === 1 ? "" : "s"}</span>
                      {m?.component != null && <span>comp {m.component}</span>}
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
          Color by metadata
        </h3>
        <label className="block mt-2 text-xs text-muted-foreground mb-1" htmlFor="phylo-color-mode">
          Mode
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
