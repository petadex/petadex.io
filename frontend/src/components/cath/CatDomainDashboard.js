import React, { useMemo } from "react"

const MIN_DIAMETER = 56
const MAX_DIAMETER = 176
const SIZE_EXPONENT = 1 // 0.5 = area-true (subtle), 1 = linear (dramatic), >1 = exaggerated further

/**
 * @param {{ catDomain: import("../../utils/buildCatDomainModels.js").CatDomainModel, maxFamilyCount: number, onSelect: (cathId: string) => void }} props
 */
const Bubble = ({ catDomain, maxFamilyCount, onSelect }) => {
  const hasData = catDomain.totalFamilyCount != null && catDomain.totalFamilyCount > 0
  // Sizing controlled by SIZE_EXPONENT: 0.5 = area-true, 1 = linear, >1 = exaggerated.
  const ratio = hasData && maxFamilyCount > 0 ? Math.pow(catDomain.totalFamilyCount / maxFamilyCount, SIZE_EXPONENT) : 0
  const diameter = hasData
    ? Math.round(MIN_DIAMETER + ratio * (MAX_DIAMETER - MIN_DIAMETER))
    : MIN_DIAMETER * 0.6

  return (
    <button
      type="button"
      onClick={() => onSelect(catDomain.cathId)}
      className="group flex flex-col items-center gap-2 focus-visible:outline-none"
      style={{ width: MAX_DIAMETER + 24 }}
    >
      <span
        className={`rounded-full flex items-center justify-center text-center transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-ring ${
          hasData
            ? "bg-accent/20 border-2 border-accent text-accent"
            : "bg-muted/20 border border-dashed border-muted-foreground/40 text-muted-foreground"
        }`}
        style={{ width: diameter, height: diameter }}
      >
        {hasData && (
          <span className="text-sm font-semibold leading-tight px-2">
            {catDomain.totalFamilyCount.toLocaleString()}
          </span>
        )}
      </span>
      <span className="text-xs text-foreground leading-tight max-w-[9rem]">{catDomain.displayName}</span>
      <span className="text-2xs text-muted-foreground">
        {hasData ? "families in atlas" : "no atlas data yet"}
      </span>
    </button>
  )
}

/**
 * @param {{ catDomains: import("../../utils/buildCatDomainModels.js").CatDomainModel[], onSelect: (cathId: string) => void }} props
 */
const CatDomainDashboard = ({ catDomains, onSelect }) => {
  const sorted = useMemo(
    () => [...catDomains].sort((a, b) => (b.totalFamilyCount ?? 0) - (a.totalFamilyCount ?? 0)),
    [catDomains],
  )
  const maxFamilyCount = useMemo(
    () => Math.max(...sorted.map(d => d.totalFamilyCount ?? 0), 1),
    [sorted],
  )

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-muted-foreground mb-6">
        Bubble size shows families in atlas — bigger means more real sequence data behind that
        fold. Click a domain to read more.
      </p>
      <div className="flex flex-wrap items-end justify-center gap-x-6 gap-y-8 py-4">
        {sorted.map(d => (
          <Bubble key={d.cathId} catDomain={d} maxFamilyCount={maxFamilyCount} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

export default CatDomainDashboard
