import React from "react"

/**
 * @param {{ logos: import("../../data/catDomainCatalog.js").CatDomainLogo[], sectionId: string, title: string, emptyNote: string }} props
 */
const LogoGrid = ({ logos, sectionId, title, emptyNote }) => (
  <section id={sectionId} className="scroll-mt-28 mt-8">
    <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
    {!logos?.length ? (
      <p className="text-sm text-muted-foreground">{emptyNote}</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {logos.map((logo, i) => (
          <figure key={`${logo.imageSrc}-${i}`} className="m-0">
            <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
              <img
                src={logo.imageSrc}
                alt={logo.alt || logo.caption}
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {logo.pfamAccession && (
                <span className="font-mono text-accent">{logo.pfamAccession}</span>
              )}
              {logo.pfamAccession && logo.caption ? " — " : ""}
              {logo.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    )}
  </section>
)

/**
 * @param {object} props
 * @param {import("../../data/catDomainCatalog.js").CatDomainLogo[]} props.hmmLogos
 * @param {import("../../data/catDomainCatalog.js").CatDomainLogo[]} props.sequenceLogos
 */
const CatDomainLogoGallery = ({ hmmLogos, sequenceLogos }) => (
  <>
    <LogoGrid
      logos={hmmLogos}
      sectionId="cat-section-hmmLogos"
      title="HMM logos"
      emptyNote="[Dennis/Sara]"
    />
    <LogoGrid
      logos={sequenceLogos}
      sectionId="cat-section-sequenceLogos"
      title="Sequence logos"
      emptyNote="[Dennis/Sara]"
    />
  </>
)

export default CatDomainLogoGallery
