import React from "react"

/**
 * Callout box offset from the residue with an arrow pointing at the highlight.
 *
 * `annotation.seqPos` is the internal Mol* label_seq_id, not a publication residue number -
 * `annotation.label` (e.g. "S160") is shown instead when set.
 *
 * @param {{
 *   mode: 'hover' | 'pinned',
 *   annotation: { seqPos: number, aa?: string, label?: string, note?: string },
 *   group?: { label?: string, color?: string } | null,
 *   layout: {
 *     anchor: { x: number, y: number },
 *     box: { left: number, top: number, width: number, height: number },
 *     arrowEnd: { x: number, y: number },
 *   },
 *   onDismiss?: () => void,
 * }} props
 */
export default function AnnotationResidueCallout({
  mode,
  annotation,
  group,
  layout,
  onDismiss,
}) {
  if (!annotation || !layout) return null

  const isPinned = mode === "pinned"
  const accent = group?.color || "#ff2ea6"
  const markerId = `annotation-callout-arrow-${annotation.seqPos}-${mode}`
  const { anchor, box, arrowEnd } = layout

  const line = {
    x1: arrowEnd.x,
    y1: arrowEnd.y,
    x2: anchor.x,
    y2: anchor.y,
  }

  return (
    <div
      className="absolute inset-0 z-30 overflow-hidden pointer-events-none"
      aria-hidden={!isPinned}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L8,4 L0,8 z" fill={accent} />
          </marker>
        </defs>
        <line
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={accent}
          strokeWidth={2}
          markerEnd={`url(#${markerId})`}
        />
        <circle cx={anchor.x} cy={anchor.y} r={4} fill={accent} stroke="#fff" strokeWidth={1.5} />
      </svg>

      <div
        className={`absolute rounded-lg border border-border shadow-lg backdrop-blur ${
          isPinned ? "bg-background/95 p-3 pointer-events-auto" : "bg-background/90 px-2.5 py-2"
        }`}
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          maxWidth: box.width,
        }}
        role={isPinned ? "dialog" : "tooltip"}
        aria-label={`Residue ${annotation.seqPos} annotation`}
      >
        <div className="flex items-start gap-2">
          <span
            className="mt-1 inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: accent }}
          />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-mono font-semibold text-foreground">
              {annotation.label
                ? annotation.label
                : `${annotation.seqPos}${annotation.aa ? ` ${annotation.aa}` : ""}`}
            </p>
            {group?.label ? (
              <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
                {group.label}
              </p>
            ) : null}
            {isPinned && annotation.note ? (
              <p className="m-0 mt-2 text-xs text-foreground leading-relaxed">
                {annotation.note}
              </p>
            ) : !isPinned && annotation.note ? (
              <p className="m-0 mt-1 text-[11px] text-muted-foreground line-clamp-2">
                {annotation.note}
              </p>
            ) : null}
          </div>
          {isPinned && onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 text-muted-foreground hover:text-foreground text-lg leading-none p-0.5 pointer-events-auto"
              aria-label="Dismiss annotation"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
