import React from "react"
import { renderTextWithCitations } from "./citationLinks"
import ProteinViewer from "../protein/ProteinViewer"

function renderInlineBold(paragraph, paraKey, references) {
  const parts = paragraph.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${paraKey}-${i}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return (
      <React.Fragment key={`${paraKey}-${i}`}>
        {renderTextWithCitations(part, references, `${paraKey}-${i}`)}
      </React.Fragment>
    )
  })
}

/**
 * @param {{ id: string, title: string, text: string|undefined, references?: import("../../data/cathDomainCatalog.js").CathDomainReference[] }} props
 */
const ProseSection = ({ id, title, text, references }) => {
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
          {renderInlineBold(para, i, references)}
        </p>
      ))}
    </section>
  )
}

/**
 * @param {{ overview?: string, references?: import("../../data/cathDomainCatalog.js").CathDomainReference[] }} props
 */
export const CathDomainIntroduction = ({ overview, references }) => (
  <ProseSection id="cat-section-introduction" title="Introduction" text={overview} references={references} />
)

/**
 * @param {{ structuralArchitecture?: string, references?: import("../../data/cathDomainCatalog.js").CathDomainReference[] }} props
 */
export const CathDomainStructuralArchitecture = ({ structuralArchitecture, references }) => (
  <ProseSection
    id="cat-section-structuralArchitecture"
    title="Structural architecture"
    text={structuralArchitecture}
    references={references}
  />
)

/**
 * Catalytic triad - used in place of `CathDomainStructuralArchitecture` for folds where a residue
 * callout beats fold-level prose. Reuses the freed-up `structuralArchitecture` anchor slot.
 * @param {{ catalyticResidues?: import("../../data/cathDomainCatalog.js").CathDomainCatalogEntry["catalyticResidues"] }} props
 */
export const CathDomainCatalyticResidues = ({ catalyticResidues }) => {
  if (!catalyticResidues) return null
  return (
    <section id="cat-section-structuralArchitecture" className="scroll-mt-28">
      <h3 className="text-lg font-semibold text-foreground mb-3">Catalytic Residues</h3>
      <p className="text-sm text-muted-foreground font-mono m-0">{catalyticResidues.catalyticTriad}</p>
    </section>
  )
}

/**
 * Secondary (non-triad) catalytic residues, its own section, not nested under
 * `CathDomainCatalyticResidues`. Reuses the freed-up `representativeStructures` anchor slot.
 * @param {{ catalyticResidues?: import("../../data/cathDomainCatalog.js").CathDomainCatalogEntry["catalyticResidues"] }} props
 */
export const CathDomainSecondaryResidues = ({ catalyticResidues }) => {
  const secondary = catalyticResidues?.secondary
  if (!Array.isArray(secondary) || secondary.length === 0) return null
  return (
    <section id="cat-section-representativeStructures" className="scroll-mt-28 mt-6">
      <h3 className="text-lg font-semibold text-foreground mb-3">Secondary Residues</h3>
      <div className="space-y-1">
        {secondary.map(s => (
          <p key={s.label} className="text-sm text-muted-foreground font-mono m-0">
            {s.label} ({s.residues})
          </p>
        ))}
      </div>
    </section>
  )
}

/**
 * Short prose comment, used in place of the full `CathDomainMechanismPanel` where that's overkill.
 * @param {{ mechanismComment?: string }} props
 */
export const CathDomainMechanismComment = ({ mechanismComment }) => {
  if (!mechanismComment || !mechanismComment.trim()) return null
  return (
    <section id="cat-section-mechanism" className="scroll-mt-28">
      <h3 className="text-lg font-semibold text-foreground mb-3">Comment</h3>
      <p className="text-sm text-muted-foreground leading-relaxed m-0">{mechanismComment}</p>
    </section>
  )
}

/**
 * Standalone "Structure" section - a 3D Mol* embed of a representative PDB structure, present on
 * every CAT-domain page. `structureEmbedPdbId` is normally the domain's curated
 * `pageStructurePdbId`, but can be overridden by clicking a `representativeStructures` row.
 * @param {{ structureEmbedPdbId?: string|null }} props
 */
export const CathDomainStructureEmbed = ({ structureEmbedPdbId }) => {
  const embedPdbId =
    structureEmbedPdbId && /^[0-9][A-Za-z0-9]{3}$/.test(structureEmbedPdbId)
      ? structureEmbedPdbId.toUpperCase()
      : null
  const embedUrl = embedPdbId ? `https://molstar.org/viewer/?pdb=${embedPdbId}` : null

  return (
    <section id="cat-section-structure" className="scroll-mt-28">
      <h3 className="text-lg font-semibold text-foreground mb-3">Structure</h3>
      {embedUrl ? (
        <div className="rounded-xl border border-border bg-muted/10 overflow-hidden">
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
      ) : (
        <p className="text-sm text-muted-foreground italic">Curation pending.</p>
      )}
    </section>
  )
}

/**
 * Annotated variant of "Structure", used when a domain has `structureAnnotations` curated -
 * renders the in-house `ProteinViewer` with highlighted, hoverable residues instead of the plain
 * Mol* iframe, toolbar hidden for a simplified view.
 * @param {{ pdbId?: string|null, structureAnnotations?: import("../../data/cathDomainCatalog.js").CathDomainCatalogEntry["structureAnnotations"] }} props
 */
export const CathDomainAnnotatedStructure = ({ pdbId, structureAnnotations }) => {
  const embedPdbId = pdbId && /^[0-9][A-Za-z0-9]{3}$/.test(pdbId) ? pdbId.toUpperCase() : null
  if (!embedPdbId || !structureAnnotations) return null

  return (
    <section id="cat-section-structure" className="scroll-mt-28">
      <h3 className="text-lg font-semibold text-foreground mb-3">Structure</h3>
      <div className="rounded-xl border border-border bg-muted/10 overflow-hidden" style={{ height: 420 }}>
        <ProteinViewer
          accession={`https://files.rcsb.org/download/${embedPdbId}.pdb`}
          width="100%"
          height="100%"
          showControls={false}
          enableMeasurement={false}
          enableSelection={false}
          annotations={structureAnnotations.residues}
          annotationGroups={structureAnnotations.groups}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2 mb-0">
        {embedPdbId} - hover or click a highlighted residue for details.
      </p>
    </section>
  )
}

/**
 * @param {{ functionalDiversity?: string, interactingDomains?: string, references?: import("../../data/cathDomainCatalog.js").CathDomainReference[] }} props
 */
const CathDomainProseSections = ({ functionalDiversity, petRelevance, interactingDomains, references }) => (
  <>
    <ProseSection
      id="cat-section-functionalDiversity"
      title="Functional diversity"
      text={functionalDiversity}
      references={references}
    />
    <ProseSection
      id="cat-section-interactingDomains"
      title="Lids and intradomain structures"
      text={interactingDomains}
      references={references}
    />
  </>
)

export default CathDomainProseSections
