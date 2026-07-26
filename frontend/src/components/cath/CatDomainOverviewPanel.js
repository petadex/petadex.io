import React from "react"
import { isCatDomainStub } from "../../utils/catDomainSectionConfig"

/**
 * @param {{ catDomain: import("../../utils/buildCatDomainModels.js").CatDomainModel }} props
 */
const CatDomainOverviewPanel = ({ catDomain }) => {
  const stub = isCatDomainStub(catDomain)

  return (
    <div
      id="cat-overview"
      className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden mt-6 scroll-mt-28"
    >
      <div className="p-5 md:p-6 border-b border-border bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">
              CATH domain <span className="text-muted-foreground/70">·</span> {catDomain.cathId}
            </p>
            <h2 className="text-xl md:text-2xl font-semibold text-primary m-0">{catDomain.displayName}</h2>
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
          <p
            className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300/90"
            role="status"
          >
            This CATH domain is unconfirmed/auto-detected from HMM assignments — mechanism,
            literature, and logos haven&rsquo;t been curated yet.
          </p>
        )}

        <p className="text-muted-foreground text-sm mt-3 mb-0 leading-relaxed max-w-4xl">
          {catDomain.overview}
        </p>
      </div>
    </div>
  )
}

export default CatDomainOverviewPanel
