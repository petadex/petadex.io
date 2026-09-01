import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  useSlotsPerLine,
  useSequenceRows,
  RulerRow,
  AASpan,
  normalizeRange,
} from "./utils.js"
import { NUCLEOTIDECOLORS, AACOLORS } from "./constants.js"

// ── Main component ─────────────────────────────────────────────────────────────

export default function SequenceViewer({
  nucleotideSequence = null,
  aminoAcidSequence = null,
  className = "",
  // Controlled external highlight (1-based, inclusive). When set (e.g. a domain
  // is selected in the corpus page's domain track), the viewer selects that
  // region and scrolls into view. `null` clears an externally-driven selection.
  highlightRange = null,
  // When false, apply highlight without scrolling the page (e.g. SignalP
  // auto-highlight on first paint should not yank the viewport down).
  autoScrollOnHighlight = true,
}) {
  const [seqType, setSeqType] = useState("amino-acid")
  const [containerWidth, setWidth] = useState(0)
  const [showRuler, setShowRuler] = useState(true)
  const [selStart, setSelStart] = useState(null) // 1-based
  const [selEnd, setSelEnd] = useState(null) // 1-based
  // True only while the selection is driven by an external domain highlight (so
  // we mute the non-domain residues). Cleared the moment the user drags their
  // own selection.
  const [isExternalHighlight, setIsExternalHighlight] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef(null)
  const isDragging = useRef(false)
  const dragAnchor = useRef(null)
  const containerRef = useRef(null)
  const rootRef = useRef(null)

  const currentSeq =
    seqType === "nucleotide" ? nucleotideSequence : aminoAcidSequence
  const colorScheme = seqType === "nucleotide" ? NUCLEOTIDECOLORS : AACOLORS
  const showToggle = nucleotideSequence !== null && aminoAcidSequence !== null

  // ── Measure container ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width
      if (w && w > 0) setWidth(Math.floor(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const slotsPerLine = useSlotsPerLine(containerWidth)
  const rows = useSequenceRows(currentSeq, slotsPerLine)

  // ── Selection range (1-based, inclusive) ────────────────────────────────────
  const [selLo, selHi] =
    selStart != null && selEnd != null
      ? normalizeRange(selStart, selEnd)
      : [null, null]

  const isSelected = useCallback(
    pos => selLo != null && pos >= selLo && pos <= selHi,
    [selLo, selHi]
  )

  // When a domain highlight is active, residues outside it are muted (in
  // brightness/vibrancy) so the highlighted span stands out.
  const highlightActive = isExternalHighlight && selLo != null

  // ── Mouse handlers ───────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    pos => e => {
      e.preventDefault()
      isDragging.current = true
      dragAnchor.current = pos
      setIsExternalHighlight(false)
      setSelStart(pos)
      setSelEnd(pos)
    },
    []
  )

  const handleMouseEnter = useCallback(
    pos => () => {
      if (!isDragging.current) return
      setSelEnd(pos)
    },
    []
  )

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp)
    return () => window.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseUp])

  // ── Selection info ───────────────────────────────────────────────────────────
  const selectionInfo =
    selLo != null && currentSeq
      ? (() => {
          const slice = currentSeq.slice(selLo - 1, selHi)
          return { slice, lo: selLo, hi: selHi }
        })()
      : null

  const clearSelection = () => {
    setSelStart(null)
    setSelEnd(null)
    setIsExternalHighlight(false)
    setCopied(false)
  }

  const copySelection = async () => {
    if (!selectionInfo) return
    try {
      await navigator.clipboard.writeText(selectionInfo.slice)
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable or denied — silently ignore
    }
  }

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // ── External (controlled) highlight ─────────────────────────────────────────
  // Drive the selection from `highlightRange` so a domain selected in the track
  // lights up the matching residues here (reusing the selection machinery gives
  // the range readout + copy for free). Only re-runs when the prop reference
  // changes, so manual drag-selections are never clobbered.
  useEffect(() => {
    const start = Number(highlightRange?.start)
    const end = Number(highlightRange?.end)
    if (
      highlightRange &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      start >= 1
    ) {
      // Domain coordinates are amino-acid positions.
      setSeqType("amino-acid")
      setSelStart(start)
      setSelEnd(end)
      setIsExternalHighlight(true)
      // Domain track sits below the viewer — scroll only when requested (user
      // clicked a domain). Skip for auto highlights like SignalP on load.
      if (autoScrollOnHighlight) {
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    } else if (highlightRange === null) {
      // External deselection clears the externally-driven selection.
      setSelStart(null)
      setSelEnd(null)
      setIsExternalHighlight(false)
    }
  }, [highlightRange, autoScrollOnHighlight])

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!currentSeq) {
    return (
      <div className={`border border-border rounded-lg ${className}`}>
        <div className="p-8 flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-xl bg-surface-sunken flex items-center justify-center">
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 0v6m0-6H5m11 0v6m-6 0h6m-6-6V7"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            {seqType === "nucleotide"
              ? "Nucleotide sequence not available"
              : "No sequence available"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={` ${className} p-6`} ref={rootRef}>
      {/* ── Toggle ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 items-center justify-between py-2 px-2.5">
        <label className="flex gap-2">
          <input
            type="checkbox"
            className=""
            onClick={() => setShowRuler(!showRuler)}
            defaultChecked={showRuler}
          />
          Show Ruler
        </label>
        <div className="flex gap-2 items-center flex-wrap">
          {showToggle &&
            [
              { value: "amino-acid", label: "Amino Acid" },
              { value: "nucleotide", label: "Nucleotide" },
            ].map(({ value, label }) => (
              <label
                key={value}
                className={[
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer",
                  "text-sm font-medium transition-colors border",
                  seqType === value
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-background text-muted-foreground border-border hover:bg-surface-raised",
                ].join(" ")}
              >
                <input
                  type="radio"
                  value={value}
                  checked={seqType === value}
                  onChange={e => {
                    setSeqType(e.target.value)
                    clearSelection()
                  }}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
        </div>
      </div>

      {/* ── Sequence grid ─────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="border border-border rounded-lg bg-surface-raised overflow-x-auto"
      >
        {containerWidth > 0 && (
          <div className="p-3 space-y-2 font-mono">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx}>
                {/* Ruler */}
                {showRuler && (
                  <RulerRow
                    startIdx={row.startIdx}
                    count={row.slice.length}
                    slotsPerLine={slotsPerLine}
                  />
                )}

                {/* AA spans */}
                <div className="mb-1.5">
                  <div
                    className={`grid gap-0.5 px-1.5`}
                    style={{
                      "grid-template-columns": `repeat(${slotsPerLine}, 1fr)`,
                    }}
                  >
                    {row.slice.split("").map((char, i) => {
                      const pos = row.startIdx + i
                      return (
                        <AASpan
                          key={pos}
                          char={char}
                          position={pos}
                          colorScheme={colorScheme}
                          isSelected={isSelected(pos)}
                          muted={highlightActive && !isSelected(pos)}
                          onMouseDown={handleMouseDown(pos)}
                          onMouseEnter={handleMouseEnter(pos)}
                        />
                      )
                    })}
                    {/* Padding slots to fill line */}
                    {Array.from({ length: row.pads }).map((_, i) => (
                      <span
                        key={`pad-${i}`}
                        className="inline-flex items-center justify-center h-6 font-mono text-xs text-gray-700 bg-border/40 rounded-xs"
                      >
                        ·
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: length + selection bar ────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground p-2">
        {/* Length */}
        <span>
          Length:{" "}
          <span className="font-mono font-semibold text-foreground">
            {currentSeq.length}
          </span>{" "}
          {seqType === "nucleotide" ? "bp" : "aa"}
        </span>

        {/* Selection info */}
        {selectionInfo ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">
              {selectionInfo.lo}–{selectionInfo.hi} (
              {selectionInfo.slice.length}{" "}
              {seqType === "nucleotide" ? "bp" : "aa"})
            </span>
            <button onClick={copySelection} className="btn btn-ghost">
              {copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={clearSelection} className="btn btn-ghost">
              Clear
            </button>
          </div>
        ) : (
          <span className="text-muted-foreground/60 italic">
            Click and drag to select a region
          </span>
        )}
      </div>
    </div>
  )
}
