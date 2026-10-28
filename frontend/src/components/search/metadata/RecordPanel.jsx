// Popout holding one hit's record: a centered dialog over a dimmed page. The
// hits table keeps its scroll position behind it. Closes with ✕, Escape or a
// click on the backdrop, and focus returns to the accession that opened it.
import React, { useEffect, useRef } from "react"
import SequenceRecord from "./SequenceRecord"

export default function RecordPanel({
  hit,
  hits,
  clusters,
  querySequence,
  onClose,
}) {
  const dialogRef = useRef(null)
  const returnFocus = useRef(null)
  const open = Boolean(hit)

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement
    dialogRef.current?.focus()
    const onKey = e => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    // The page behind a modal dialog does not scroll.
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
      returnFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 md:items-center md:p-6"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-title"
        className="flex h-full w-full flex-col overflow-hidden border border-border-strong bg-card shadow-2xl focus:outline-none md:h-auto md:max-h-[88vh] md:max-w-5xl md:rounded-lg"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <span className="label">Sequence record</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sequence record"
            className="btn btn-ghost px-2 py-1 text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <SequenceRecord
            hit={hit}
            hits={hits}
            clusters={clusters}
            querySequence={querySequence}
          />
        </div>
      </div>
    </div>
  )
}
