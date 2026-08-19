import { render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AtlasHeroMap } from "./AtlasHeroMap"

/**
 * Beyond the Homepage Test Plan's explicit Layer 2 list (which names only
 * count formatting and the citation block) — added because "Atlas render"
 * is the plan's other High-priority risk row ("can mount empty or fail to
 * paint"), and this is the only layer, short of full E2E, that can exercise
 * the component's documented "must never show an empty canvas" fallback
 * directly against both a successful and a failing fetch.
 */

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("AtlasHeroMap", () => {
  it("mounts a canvas immediately, before the atlas fetch resolves", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    )

    const { container } = render(<AtlasHeroMap />)
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("keeps rendering the fallback point cloud when the atlas fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    vi.stubGlobal("fetch", fetchMock)

    const { container } = render(<AtlasHeroMap />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    // The component's own contract is "never show an empty canvas" — a
    // rejected fetch must not unmount or throw past the canvas.
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("keeps rendering when the atlas response is not valid JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("<html>not json</html>", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const { container } = render(<AtlasHeroMap />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(container.querySelector("canvas")).toBeInTheDocument()
  })
})
