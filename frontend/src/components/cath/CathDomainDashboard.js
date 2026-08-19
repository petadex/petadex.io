import React, { useMemo } from "react"
import { hslToRgb } from "../../utils/cathColors"

const MIN_DIAMETER = 56
const MAX_DIAMETER = 176
const SIZE_EXPONENT = 1 // 0.5 = area-true (subtle), 1 = linear (dramatic), >1 = exaggerated further

/** Same per-domain hue technique as the Atlas map (`cathColors.js`), except α/β hydrolase uses
 *  the site's red accent (0) instead of the Atlas's blue (210). */
const CATH_BUBBLE_HUE = {
  "3.40.50.1820": 0, // α/β hydrolase fold — red (site accent), not the Atlas's blue
  "3.90.1300.10": 210, // Peptidase / hydrolase-associated fold — takes the freed-up blue
  "3.40.710.10": 140, // β-lactamase/transpeptidase-like fold
  "3.60.70.12": 25, // Amidase-signature fold
  "2.40.10.10": 270, // Trypsin-like serine protease fold
  "2.60.40.420": 50, // Multicopper oxidase-like fold
}

/** Unresolved/uncurated domains (e.g. "TBDX" atlas placeholders) fall back to neutral slate. */
function getBubbleColors(cathId) {
  const hue = CATH_BUBBLE_HUE[cathId]
  const [r, g, b] = hue == null ? [148, 163, 184] : hslToRgb(hue, 70, 50)
  return { solid: `rgb(${r}, ${g}, ${b})`, tint: `rgba(${r}, ${g}, ${b}, 0.2)` }
}

/**
 * @param {{ catDomain: import("../../models/CathDomain.js").CathDomain, maxFamilyCount: number, onSelect: (cathId: string) => void }} props
 */
const Bubble = ({ catDomain, maxFamilyCount, onSelect }) => {
  const hasData = catDomain.totalFamilyCount != null && catDomain.totalFamilyCount > 0
  // Sizing controlled by SIZE_EXPONENT: 0.5 = area-true, 1 = linear, >1 = exaggerated.
  const ratio = hasData && maxFamilyCount > 0 ? Math.pow(catDomain.totalFamilyCount / maxFamilyCount, SIZE_EXPONENT) : 0
  const diameter = hasData
    ? Math.round(MIN_DIAMETER + ratio * (MAX_DIAMETER - MIN_DIAMETER))
    : MIN_DIAMETER * 0.6
  const colors = getBubbleColors(catDomain.cathId)

  return (
    <button
      type="button"
      onClick={() => onSelect(catDomain.cathId)}
      className="group flex flex-col items-center gap-2 focus-visible:outline-none"
      style={{ width: MAX_DIAMETER + 24 }}
    >
      <span className="text-xs text-foreground leading-tight max-w-[9rem]">{catDomain.displayName}</span>
      <span
        className={`rounded-full flex items-center justify-center text-center transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-ring ${
          hasData ? "border-2" : "bg-muted/20 border border-dashed border-muted-foreground/40 text-muted-foreground"
        }`}
        style={
          hasData
            ? { width: diameter, height: diameter, borderColor: colors.solid, backgroundColor: colors.tint, color: colors.solid }
            : { width: diameter, height: diameter }
        }
      >
        {hasData && (
          <span className="text-sm font-semibold leading-tight px-2">
            {catDomain.totalFamilyCount.toLocaleString()}
          </span>
        )}
      </span>
      <span className="text-2xs text-muted-foreground">
        {hasData ? "families in atlas" : "no atlas data yet"}
      </span>
    </button>
  )
}

/**
 * @param {{ catDomains: import("../../models/CathDomain.js").CathDomain[], onSelect: (cathId: string) => void }} props
 */
const CathDomainDashboard = ({ catDomains, onSelect }) => {
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
        Bubble size shows families in atlas. A bigger bubble represents more families (90% clusters)
        following that fold. Click a domain to read more.
      </p>
      <div className="flex flex-wrap items-end justify-center gap-x-6 gap-y-8 py-4">
        {sorted.map(d => (
          <Bubble key={d.cathId} catDomain={d} maxFamilyCount={maxFamilyCount} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

export default CathDomainDashboard
