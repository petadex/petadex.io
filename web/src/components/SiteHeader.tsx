import Link from "next/link"
import { SITE_NAME } from "@/lib/seo"

/**
 * Placeholder navigation.
 *
 * `web/src/app/` is the URL contract, and Phase 1 has not settled the enzyme
 * key, the substrate schema or the `/sequence/*` namespace split. Links get
 * added as each route is built in Phase 3, so the header never advertises a
 * route that does not exist yet.
 */
export function SiteHeader() {
  return (
    <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-foreground text-base font-semibold tracking-tight"
        >
          {SITE_NAME}
          <span className="text-muted-foreground ml-1.5 text-xs font-normal">
            rebuild
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-6">
          <Link
            href="/activity"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Activity
          </Link>
          <a
            href="https://github.com/petadex/petadex.io"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
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
