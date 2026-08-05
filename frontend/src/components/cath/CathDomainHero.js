import React from "react"

const CathDomainHero = () => (
  <header className="mb-10 md:mb-14 max-w-3xl">
    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
      Structural reference
    </p>
    <h1 className="text-4xl font-semibold text-primary mb-4">CATH domains</h1>
    <p className="text-secondary-foreground text-lg leading-relaxed mb-4">
      Summaries of common structural domains represented in PETadex, including how they are classified,
      visualized, and interpreted for modeling and experiment design.
    </p>
    <p className="text-muted-foreground text-sm leading-relaxed m-0">
      Choose a CATH domain to see its structural architecture, mechanism, representative structures,
      and the member Pfam HMMs assigned to it. When those HMMs map to a PETadex atlas component,
      live family counts are shown alongside them.
    </p>
  </header>
)

export default CathDomainHero
