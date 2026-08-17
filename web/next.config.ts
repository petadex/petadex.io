import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Node server runtime on Vercel, not a static export. Leaving `output` unset
  // is what enables on-demand rendering for the 307M-row ORF pages that cannot
  // be prebuilt. Setting `output: "export"` here would silently undo that.

  reactStrictMode: true,
  poweredByHeader: false,

  // Log every server-side fetch with its full URL during development. The API is
  // the only data source, so this doubles as a request log for the backend.
  logging: {
    fetches: { fullUrl: true },
  },

  // Redirects for the Gatsby → Next cutover are assembled in Phase 4, from the
  // "Replaces" field on each rebuilt page. Moved paths get 301, removed paths
  // get 410. Nothing is added here until a page's replacement actually ships.
}

export default nextConfig
