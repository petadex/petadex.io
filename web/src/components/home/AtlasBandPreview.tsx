import { LazyMount } from "@/components/common/LazyMount"
import { AtlasHeroMap } from "@/components/home/AtlasHeroMap"

/**
 * "Product shot" for the homepage Atlas band.
 *
 * Unlike the other three bands, `/atlas` is a real, shipped page, so this
 * reuses the same canvas the hero renders (real UMAP embedding when the S3
 * export loads, seeded synthetic cloud otherwise) rather than a static mock.
 * `pointer-events-none` keeps it a flat image within the band — hover/zoom
 * belongs to the hero and to the real `/atlas` page, not to a decorative
 * inline preview.
 *
 * The content spec's mock drew rings around a sample of "characterized"
 * points; the real hero canvas has no such flag on its points (`AtlasPoint`
 * carries no PAZy-characterized field), so that legend is left off here
 * rather than promising a visual the component doesn't draw.
 *
 * This band sits at the bottom of a long homepage, and mounting `AtlasHeroMap`
 * fires its own fetch of the same (multi-MB, gzipped) atlas dataset the hero
 * canvas above already loads. `LazyMount` defers that fetch and the canvas
 * render loop until the card is about to scroll into view instead of paying
 * for both on initial load.
 */
export function AtlasBandPreview({
  familyCountLabel,
}: {
  familyCountLabel: string
}) {
  return (
    <div className="relative aspect-16/10 max-h-105 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0e0e0e]">
      <LazyMount className="h-full w-full">
        <AtlasHeroMap interactive={false} className="pointer-events-none" />
      </LazyMount>

      <div className="pointer-events-none absolute top-3 left-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2 py-0.75 font-mono text-[10px] text-white/80">
          <span className="h-1.75 w-1.75 rounded-full bg-[#4F8FE8]" />
          {familyCountLabel} family centroids
        </span>
      </div>
    </div>
  )
}
