import React from "react"

/**
 * @param {{ references: import("../../data/catDomainCatalog.js").CatDomainReference[] }} props
 */
const CatDomainReferences = ({ references }) => (
  <div className="mt-10 md:mt-12">
    <section
      id="cat-refs-heading"
      aria-labelledby="cat-refs-heading-title"
      className="rounded-2xl border border-border bg-card/40 p-5 md:p-6 scroll-mt-28"
    >
      <h2 id="cat-refs-heading-title" className="text-xl md:text-2xl font-semibold text-primary mb-4">
        Literature
      </h2>
      {!references?.length ? (
        <p className="text-muted-foreground text-sm m-0">No CATH-domain-level literature curated yet.</p>
      ) : (
        <ul className="list-disc pl-5 space-y-2.5 text-sm text-muted-foreground leading-relaxed m-0">
          {references.map((ref, i) => (
            <li key={`${ref.label}-${i}`}>
              {ref.url ? (
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover underline underline-offset-2 break-words"
                >
                  {ref.label}
                </a>
              ) : (
                <span>{ref.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
)

export default CatDomainReferences
