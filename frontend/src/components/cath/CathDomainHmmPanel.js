import React, { useState } from "react"
import {
  hmmDownloadUrl,
  hmmDownloadFilename,
  hmmEntryUrl,
  resolveHmmLogoImage,
} from "../../utils/hmmAssets"
import HmmLogoViewer from "./HmmLogoViewer"

/**
 * Profile HMM block for a CATH domain profile: HMM name/accession, downloadable HMM file, and
 * logo. HMM file + logo are sourced live from EBI/InterPro; the external link always works, and an
 * inline logo image renders only when available (local override), falling back gracefully.
 *
 * @param {{ domain: {
 *   profileHmm?: string,
 *   pfamAccession?: string,
 *   hmmLogoImage?: string|null,
 * } }} props
 */
const CathDomainHmmPanel = ({ domain }) => {
  const [logoFailed, setLogoFailed] = useState(false)
  const [showLogo, setShowLogo] = useState(false)
  const pfam = domain?.pfamAccession
  if (!pfam) return null

  const downloadUrl = hmmDownloadUrl(pfam)
  const entryUrl = hmmEntryUrl(pfam)
  const logoImage = resolveHmmLogoImage(domain)
  const showInlineLogo = logoImage && !logoFailed

  return (
    <div className="mt-4 max-w-4xl rounded-lg border border-border bg-background/50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 m-0">
        Profile HMM
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-foreground font-medium m-0">
            {domain.profileHmm || "Profile HMM"}
            <span className="text-muted-foreground/70"> · </span>
            <a
              href={entryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover underline underline-offset-2"
            >
              Link to InterPro
            </a>
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-0 leading-relaxed">
            Hidden Markov Model for this Pfam family, served by EBI/InterPro.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={hmmDownloadFilename(pfam, domain.profileHmm)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-accent hover:bg-muted/50 hover:text-accent-hover transition-colors"
            >
              Download HMM (.hmm.gz)
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowLogo(v => !v)}
            aria-expanded={showLogo}
            className="inline-flex items-center rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-accent hover:bg-muted/50 hover:text-accent-hover transition-colors"
          >
            {showLogo ? "Hide interactive logo" : "Show interactive logo"}
          </button>
        </div>
      </div>

      {showLogo && (
        <HmmLogoViewer pfamAccession={pfam} profileHmm={domain.profileHmm} />
      )}

      {showInlineLogo && (
        <figure className="mt-4 m-0">
          <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
            <img
              src={logoImage}
              alt={`Profile HMM logo for ${domain.profileHmm || pfam}`}
              className="w-full h-auto object-contain"
              loading="lazy"
              onError={() => setLogoFailed(true)}
            />
          </div>
          <figcaption className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Profile HMM logo for {pfam}.
          </figcaption>
        </figure>
      )}
    </div>
  )
}

export default CathDomainHmmPanel
