import React, { useState } from "react"
import { mcsaEntryUrl } from "../../utils/catDomainSectionConfig"

/**
 * @param {{ steps: {title: string, description: string}[] }} props
 */
const MechanismSteps = ({ steps }) => (
  <div className="flex flex-col sm:flex-row gap-3 mb-4">
    {steps.map((step, i) => (
      <div key={step.title} className="flex-1 flex gap-3 sm:flex-col sm:gap-2">
        <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-2 shrink-0">
          <span className="w-7 h-7 rounded-full bg-accent/15 text-accent text-sm font-semibold flex items-center justify-center shrink-0">
            {i + 1}
          </span>
        </div>
        <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 flex-1">
          <p className="text-sm font-semibold text-foreground m-0 mb-1">{step.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed m-0">{step.description}</p>
        </div>
      </div>
    ))}
  </div>
)

const CatDomainMechanismPanel = ({ mechanism }) => {
  const mcsa = mechanism?.mcsa || null
  const hasMcsa = Boolean(mcsa?.entryId)
  const hasCustomDiagram = Boolean(mechanism?.customDiagram?.imageSrc)
  const hasCustomSummary = Boolean(mechanism?.customSummary?.trim())
  const hasSteps = Array.isArray(mechanism?.steps) && mechanism.steps.length > 0
  const [showMore, setShowMore] = useState(false)

  if (!hasMcsa && !hasCustomDiagram && !hasCustomSummary && !hasSteps) {
    return (
      <div
        id="cat-section-mechanism"
        className="scroll-mt-28 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 px-4 py-6 text-center"
      >
        <p className="text-sm font-medium text-foreground mb-1 m-0">Mechanism</p>
        <p className="text-sm text-muted-foreground m-0">
          No M-CSA match or custom diagram curated yet for this CATH domain.
        </p>
      </div>
    )
  }

  return (
    <section id="cat-section-mechanism" className="scroll-mt-28">
      <h3 className="text-lg font-semibold text-foreground mb-3">Mechanism</h3>

      {hasSteps && <MechanismSteps steps={mechanism.steps} />}

      {hasMcsa && (
        <p className="mb-4">
          <a
            href={mcsaEntryUrl(mcsa.entryId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent hover:text-accent-hover underline underline-offset-2"
          >
            Open in EBI M-CSA → {mcsa.enzymeName}
          </a>
          {mcsa.hasDetailedMechanism === false && (
            <span className="text-sm text-muted-foreground"> (catalytic site only, no step diagram)</span>
          )}
        </p>
      )}

      {hasCustomDiagram && (
        <figure className="m-0 mb-4">
          <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
            <img
              src={mechanism.customDiagram.imageSrc}
              alt={mechanism.customDiagram.alt || mechanism.customDiagram.caption}
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
          {mechanism.customDiagram.caption && (
            <figcaption className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {mechanism.customDiagram.caption}
            </figcaption>
          )}
        </figure>
      )}

      {hasCustomSummary && (
        <div>
          <button
            type="button"
            onClick={() => setShowMore(v => !v)}
            className="text-sm font-medium text-accent hover:text-accent-hover mb-3"
          >
            {showMore ? "Hide mechanism details −" : "Show mechanism details +"}
          </button>
          {showMore &&
            mechanism.customSummary.split("\n\n").map((para, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-4">
                {para}
              </p>
            ))}
        </div>
      )}
    </section>
  )
}

export default CatDomainMechanismPanel
