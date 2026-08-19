import type { Metadata } from "next"
import { AtlasMap } from "@/components/atlas/AtlasMap"
import { parseAtlasQuery } from "@/lib/atlasFocus"
import { buildMetadata } from "@/lib/seo"

/**
 * Ported from frontend/src/pages/atlas.js: a fixed fullscreen container
 * below the site header, with `?component=` / `?cath=` narrowing the atlas
 * to one structural component or CATH domain.
 */

type SearchParams = Record<string, string | string[] | undefined>

function toURLSearchParams(searchParams: SearchParams): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) continue
    params.set(key, Array.isArray(value) ? (value[0] ?? "") : value)
  }
  return params
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const { focusComponent, focusCathDomain } = parseAtlasQuery(
    toURLSearchParams(await searchParams)
  )
  const focused =
    focusComponent != null
      ? `component ${focusComponent}`
      : focusCathDomain
        ? `CATH ${focusCathDomain}`
        : null

  return buildMetadata({
    title: focused ? `Family Atlas — ${focused}` : "Family Atlas",
    description: "UMAP embedding of plastic-degrading enzyme families",
    path: "/atlas",
  })
}

export default async function AtlasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { focusComponent, focusCathDomain } = parseAtlasQuery(
    toURLSearchParams(await searchParams)
  )

  return (
    <div
      style={{
        position: "fixed",
        top: 72,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
      }}
    >
      <AtlasMap
        fullscreen
        focusComponent={focusComponent}
        focusCathDomain={focusCathDomain}
      />
    </div>
  )
}
