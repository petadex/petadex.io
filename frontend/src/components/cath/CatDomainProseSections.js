import React from "react"

/**
 * Renders one paragraph's text, turning **bold** markers into real <strong> elements.
 */
function renderInlineBold(paragraph, paraKey) {
  const parts = paragraph.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${paraKey}-${i}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <React.Fragment key={`${paraKey}-${i}`}>{part}</React.Fragment>
  })
}

/**
 * @param {{ id: string, title: string, text: string|undefined }} props
 */
const ProseSection = ({ id, title, text }) => {
  if (!text || !text.trim() || text.trim() === "Curation pending.") {
    return (
      <section id={id} className="scroll-mt-28">
        <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground italic">Curation pending.</p>
      </section>
    )
  }

  return (
    <section id={id} className="scroll-mt-28">
      <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
      {text.split("\n\n").map((para, i) => (
        <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3 last:mb-0">
          {renderInlineBold(para, i)}
        </p>
      ))}
    </section>
  )
}

/**
 * @param {{ structuralArchitecture?: string }} props
 */
export const CatDomainStructuralArchitecture = ({ structuralArchitecture }) => (
  <ProseSection
    id="cat-section-structuralArchitecture"
    title="Structural architecture"
    text={structuralArchitecture}
  />
)

/**
 * @param {{ structureEmbedPdbId?: string }} props
 */
export const CatDomainStructureEmbed = ({ structureEmbedPdbId }) => {
  const embedPdbId =
    structureEmbedPdbId && /^[0-9][A-Za-z0-9]{3}$/.test(structureEmbedPdbId)
      ? structureEmbedPdbId.toUpperCase()
      : null
  const embedUrl = embedPdbId ? `https://molstar.org/viewer/?pdb=${embedPdbId}` : null

  if (!embedUrl) return null

  return (
    <div className="rounded-xl border border-border bg-muted/10 overflow-hidden mt-6">
      <div className="px-4 py-2 border-b border-border bg-muted/20">
        <p className="text-sm font-medium text-foreground m-0">
          In-page 3D embed (Mol*): {embedPdbId}
        </p>
      </div>
      <iframe
        title={`Molstar viewer ${embedPdbId}`}
        src={embedUrl}
        className="w-full h-[420px] border-0"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}

/**
 * @param {{ functionalDiversity?: string, interactingDomains?: string }} props
 */
const CatDomainProseSections = ({ functionalDiversity, petRelevance, interactingDomains }) => (
  <>
    <ProseSection
      id="cat-section-functionalDiversity"
      title="Functional diversity"
      text={functionalDiversity}
    />
    <ProseSection
      id="cat-section-interactingDomains"
      title="Interacting domains"
      text={interactingDomains}
    />
  </>
)

export default CatDomainProseSections
