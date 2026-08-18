import Link from "next/link"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Page not found",
  description: "That page does not exist on PETadex.",
  path: "/404",
  noIndex: true,
})

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-muted-foreground tabular font-mono text-sm">404</p>
      <h1 className="text-foreground mt-2 text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
        This route does not exist. If you followed a link from the old site, it
        may not have been rebuilt yet — moved pages redirect and removed pages
        return 410, so a 404 here means the path was never published.
      </p>
      <Link
        href="/"
        className="text-accent mt-6 inline-block text-sm font-medium hover:underline"
      >
        Back to the home page
      </Link>
    </div>
  )
}
