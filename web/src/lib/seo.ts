import type { Metadata } from "next"
import { env } from "@/lib/env"

export const SITE_NAME = "PETadex"
export const SITE_TAGLINE = "An open database of plastic-degrading enzymes"

interface BuildMetadataInput {
  /** Page title, without the site name. The template appends that. */
  title: string
  description: string
  /** Root-relative path for the canonical URL, e.g. `/enzymes`. */
  path: string
  /** Set on pages that should not be indexed (previews, diagnostics). */
  noIndex?: boolean
  /** Root-relative or absolute URL of the social preview image. */
  image?: string
}

/**
 * Builds a page's `metadata` export.
 *
 * Every route gets one. On the old site `/substrates` and `/tree/:familyId`
 * shipped with no SEO block at all, so they had no title, description or
 * canonical URL; routing all metadata through one function makes that omission
 * impossible to repeat silently.
 */
export function buildMetadata({
  title,
  description,
  path,
  noIndex = false,
  image,
}: BuildMetadataInput): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} · ${SITE_NAME}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}

/** Root metadata. `metadataBase` resolves every relative URL above. */
export const rootMetadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  formatDetection: { telephone: false, address: false, email: false },
}
