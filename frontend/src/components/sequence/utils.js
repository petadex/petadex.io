import React, { useMemo } from "react"

// ── Selection state helpers ────────────────────────────────────────────────────

export function normalizeRange(a, b) {
  return a <= b ? [a, b] : [b, a]
}

// ── Constants ──────────────────────────────────────────────────────────────────
export const SLOT_WIDTH = 16  // px — must match base font size
const MAX_SLOTS_PER_LINE = 50;

// ── Compute how many AA slots fit in the container ────────────────────────────
export function useSlotsPerLine(containerWidth) {
  const slotsPerLine = useMemo(
    () => Math.min(MAX_SLOTS_PER_LINE, Math.floor(containerWidth / SLOT_WIDTH)),
    [containerWidth],
  )

  return Math.max(1, slotsPerLine);
}

// ── Split sequence into rows ───────────────────────────────────────────────────
export function useSequenceRows(sequence, slotsPerLine) {
  return useMemo(() => {
    if (!sequence?.length || slotsPerLine <= 0) return []
    const rows = []
    for (let pos = 0; pos < sequence.length; pos += slotsPerLine) {
      const slice = sequence.slice(pos, pos + slotsPerLine)
      rows.push({
        startPos: pos,           // 0-based
        startIdx: pos + 1,       // 1-based position label
        slice,
        pads: slotsPerLine - slice.length,
      })
    }
    return rows
  }, [sequence, slotsPerLine])
}

// ── Ruler row — shows 1, every 5 (minor), every 10 (major bold) ───────────────
export const RulerRow = React.memo(({ startIdx, count, slotsPerLine }) => {
  const ticks = []
  for (let i = 0; i < count; i++) {
    const pos = startIdx + i
    ticks.push({ pos, isMajor: pos % 10 === 0, isMinor: pos === 1 || pos % 5 === 0 })
  }
  // Pad remainder
  for (let i = count; i < slotsPerLine; i++) {
    ticks.push({ pos: null })
  }

  return (
    <div className={`grid gap-0.5 px-1.5 justify-items-center`} style={{ gridTemplateColumns: `repeat(${slotsPerLine}, 1fr)` }} >
      {ticks.map((tick, i) => (
        <span
          key={i}
          className={[
            "w-auto",
            tick.isMajor
              ? "text-2xs font-bold text-muted-foreground"
              : tick.isMinor
                ? "text-[9px] text-muted-foreground/70"
                : "",
          ].join(" ")}
        >
          {tick.isMajor ? tick.pos : tick.isMinor ? tick.pos : ""}
        </span>
      ))}
    </div>
  )
})

// ── Single AA span ─────────────────────────────────────────────────────────────
export const AASpan = React.memo(
  ({ char, position, colorScheme, isSelected, muted, onMouseDown, onMouseEnter }) => {
    const bg = colorScheme?.[char] || "var(--surface-sunken)"
    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <span
        className={[
          "inline-flex items-center justify-center h-6",
          "font-mono text-sm font-semibold rounded-xs shrink-0 cursor-pointer",
          "transition-all select-none text-gray-800",
          isSelected
            ? "outline-2 outline-info outline-offset-1 brightness-90"
            : muted
              ? "saturate-50 brightness-90 hover:saturate-100 hover:brightness-100"
              : "hover:brightness-90 hover:outline hover:outline-accent/50",
        ].join(" ")}
        style={{ backgroundColor: bg }}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        title={`${char} @ ${position}`}
      >
        {char}
      </span>
    )
  },
)
