import Link from "next/link"
import { SITE_NAME } from "@/lib/seo"

/**
 * Placeholder navigation.
 *
 * Deliberately empty of route links: `web/src/app/` is the URL contract, and
 * Phase 1 has not settled the enzyme key, the substrate schema or the
 * `/sequence/*` namespace split. Links get added as each route is built in
 * Phase 3, so the header can never advertise a route that does not exist.
 */
export function SiteHeader() {
  return (
    <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-foreground text-base font-semibold tracking-tight"
        >
          {SITE_NAME}
          <span className="text-muted ml-1.5 text-xs font-normal">rebuild</span>
        </Link>

        <nav aria-label="Main">
          <a
            href="https://github.com/petadex/petadex.io"
            className="text-muted hover:text-foreground text-sm transition-colors"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}
