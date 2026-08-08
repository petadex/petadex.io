import React from "react"
import { isCatDomainStub } from "../../utils/catDomainSectionConfig"

/** @param {{ catDomain: object, compact?: boolean }} props */
const CatDomainOverviewPanel = ({ catDomain, compact = false }) => {
  const stub = isCatDomainStub(catDomain)
  const overviewText = compact
    ? catDomain.shortIntro || catDomain.overview || null
    : catDomain.overview || catDomain.shortIntro || null
  const pending =
    !overviewText ||
    overviewText === "[PENDING INFORMATION]" ||
    overviewText === "Curation pending."

  return (
    <div
      id="cat-overview"
      className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden mt-6 scroll-mt-28"
    >
      <div className="p-5 md:p-6 border-b border-border bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">
              CATH domain <span className="text-muted-foreground/70">·</span>{" "}
              {catDomain.cathId}
            </p>
            <h2 className="text-xl md:text-2xl font-semibold text-primary m-0">
              {catDomain.displayName}
            </h2>
          </div>
          <div className="text-sm text-muted-foreground shrink-0 sm:text-right">
            <div>
              {catDomain.memberCount} member HMM{catDomain.memberCount === 1 ? "" : "s"}
            </div>
            {catDomain.totalFamilyCount != null && (
              <div className="mt-0.5">
                {Number(catDomain.totalFamilyCount).toLocaleString()} families in atlas
              </div>
            )}
            <div className="mt-1">Updated {catDomain.lastUpdated}</div>
          </div>
        </div>

        {stub && (
          <p className="mt-3 text-xs text-muted-foreground m-0" role="status">
            This CATH domain is unconfirmed. It was auto-detected from HMM assignments.
            Mechanism, literature, and logos have not been curated yet.
          </p>
        )}

        <p className="text-muted-foreground text-sm mt-3 mb-0 leading-relaxed max-w-4xl">
          {pending ? "[PENDING INFORMATION]" : overviewText}
        </p>

        {catDomain.contentCredit && !pending && (
          <p className="text-xs text-muted-foreground mt-3 mb-0 leading-relaxed max-w-4xl">
            {catDomain.contentCredit}
          </p>
        )}
      </div>
    </div>
  )
}

export default CatDomainOverviewPanel
