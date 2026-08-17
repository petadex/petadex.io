import { SITE_NAME } from "@/lib/seo"

export function SiteFooter() {
  return (
    <footer className="border-border mt-auto border-t">
      <div className="text-muted mx-auto flex max-w-6xl flex-col gap-1 px-6 py-8 text-sm">
        <p>
          {SITE_NAME} — an open database of plastic-degrading enzymes. Read-only
          and public.
        </p>
        <p className="text-xs">
          Data served by the PETadex API. No account required.
        </p>
      </div>
    </footer>
  )
}
