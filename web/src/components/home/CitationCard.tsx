"use client"

import { useEffect, useRef, useState } from "react"

/**
 * The BibTeX entry, kept byte-for-byte identical to the one the current site
 * publishes.
 *
 * A citation string is a stable identifier once anyone has pasted it into a
 * manuscript, so it is not something to tidy up in passing. The `note` field
 * still claims v0.4 (Apr 2026); whether that version label is current is a
 * content question for the maintainers, not a rebuild change.
 */
const BIBTEX = `@misc{petadex2026,
  title  = {PETadex: an open atlas of plastic-degrading enzymes},
  author = {The PETadex contributors},
  year   = {2026},
  url    = {https://petadex.net},
  note   = {v0.4 (Apr 2026)}
}`

/** Fields highlighted when the entry is rendered, so keys read apart from values. */
const BIBTEX_LINES = BIBTEX.split("\n")

export function CitationCard() {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A copy right before unmount would otherwise leave a timer holding a setter
  // for a component that is gone.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(BIBTEX)
    } catch {
      // Clipboard access is refused on insecure origins and by some privacy
      // settings. The entry is on screen and selectable either way, so this
      // fails quietly rather than raising an alert over a non-critical action.
      return
    }
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      <div className="border-border text-2xs text-muted-foreground flex items-center justify-between border-b px-4 py-2.5 font-mono">
        <span>citation.bib</span>
        <button
          type="button"
          onClick={copy}
          className="hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors"
        >
          {copied ? (
            <>
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-3"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              copied
            </>
          ) : (
            <>
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-3"
              >
                <rect x="6" y="6" width="11" height="11" rx="1.5" />
                <path d="M14 6V4.5A1.5 1.5 0 0 0 12.5 3h-7A1.5 1.5 0 0 0 4 4.5v8A1.5 1.5 0 0 0 5.5 14H7" />
              </svg>
              copy
            </>
          )}
          <span className="sr-only">
            {copied ? "BibTeX entry copied" : "Copy the BibTeX entry"}
          </span>
        </button>
      </div>

      <pre className="text-foreground overflow-x-auto px-4 py-4 font-mono text-xs leading-relaxed">
        <code>
          {BIBTEX_LINES.map((line, index) => {
            const match = /^(\s+)(\w+)(\s*=\s*)(.*)$/.exec(line)
            if (!match) return `${line}\n`
            const [, indent, key, equals, value] = match
            return (
              <span key={index}>
                {indent}
                <span className="text-accent">{key}</span>
                {equals}
                {value}
                {"\n"}
              </span>
            )
          })}
        </code>
      </pre>
    </div>
  )
}
