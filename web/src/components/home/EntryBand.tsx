import type { ReactNode } from "react"
import Link from "next/link"

export interface EntryBandChip {
  label: string
  /** `false` renders a dashed placeholder pill for a stat not yet available. */
  known?: boolean
}

export interface EntryBandLink {
  label: string
  href: string
}

export interface EntryBandProps {
  index: string
  question: string
  title: string
  lead: string
  description: ReactNode
  chips: readonly EntryBandChip[]
  cta: EntryBandLink
  secondary: EntryBandLink
  visual: ReactNode
  /** Puts the visual in the wider (1.15fr) column on the left instead of the right. */
  visualFirst?: boolean
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-3.5"
    >
      <path
        fillRule="evenodd"
        d="M3 10a1 1 0 011-1h10.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * One row in the homepage's entry-points list — four tools stacked on a
 * single page panel (see the wrapping section in `page.tsx`), not one
 * full-viewport screen per tool.
 */
export function EntryBand({
  index,
  question,
  title,
  lead,
  description,
  chips,
  cta,
  secondary,
  visual,
  visualFirst = false,
}: EntryBandProps) {
  return (
    <div className="border-border border-b py-14 last:border-b-0 md:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-[1fr_1.15fr] md:gap-16">
        <div className={visualFirst ? "md:order-2" : "md:order-1"}>
          <p className="flex items-baseline gap-2.5 font-mono text-[11px] tracking-[0.08em]">
            <span className="text-accent">{index}</span>
            <span className="text-muted-foreground">“{question}”</span>
          </p>
          <h3 className="text-foreground mt-3.5 text-[34px] leading-[1.1] font-semibold tracking-tight">
            {title}
          </h3>
          <p className="text-foreground/80 mt-4 max-w-lg text-lg leading-relaxed">
            {lead}
          </p>
          <p className="text-muted-foreground mt-3.5 max-w-lg text-[15px] leading-relaxed text-pretty">
            {description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map(chip => (
              <span
                key={chip.label}
                className={
                  chip.known === false
                    ? "text-muted-foreground rounded-full border border-dashed border-white/25 px-2.5 py-1 font-mono text-[11px]"
                    : "rounded-full border border-white/18 px-2.5 py-1 font-mono text-[11px] text-white/80"
                }
              >
                {chip.label}
              </span>
            ))}
          </div>
          <div className="mt-7 flex items-center gap-4">
            <Link
              href={cta.href}
              className="bg-accent text-accent-contrast hover:bg-accent-hover inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {cta.label}
              <ArrowIcon />
            </Link>
            <Link
              href={secondary.href}
              className="text-muted-foreground hover:text-foreground border-b border-white/18 pb-0.5 text-sm transition-colors"
            >
              {secondary.label}
            </Link>
          </div>
        </div>
        <div className={visualFirst ? "md:order-1" : "md:order-2"}>
          {visual}
        </div>
      </div>
    </div>
  )
}
