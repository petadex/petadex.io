import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "./client"
import { getSearchResult, isJobId } from "./search"

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("isJobId", () => {
  it("accepts the three backend job-id shapes", () => {
    expect(isJobId("a1b2c3d4e5f60718293a4b5c6d7e8f90")).toBe(true)
    expect(isJobId("67f51ed3-1a2b-4c3d-8e4f-0123456789ab")).toBe(true)
    expect(isJobId("regen_example_ispetase")).toBe(true)
  })

  it("rejects anything else, including a missing job", () => {
    expect(isJobId(null)).toBe(false)
    expect(isJobId("")).toBe(false)
    expect(isJobId("../etc/passwd")).toBe(false)
    expect(isJobId("abc")).toBe(false)
  })
})

describe("getSearchResult", () => {
  it("reads the stored job with max_results", async () => {
    const fetch = respond(200, { status: "processing", session_id: "x" })
    vi.stubGlobal("fetch", fetch)
    await expect(
      getSearchResult("regen_example_ispetase", { maxResults: 500 })
    ).resolves.toEqual({ status: "processing", session_id: "x" })
    expect(String(fetch.mock.calls[0][0])).toMatch(
      /\/search\/results\/regen_example_ispetase\?max_results=500$/
    )
  })

  it("resolves null for an unknown or expired job", async () => {
    vi.stubGlobal("fetch", respond(404, { status: "not_found" }))
    await expect(getSearchResult("regen_example_x")).resolves.toBeNull()
  })

  it("propagates a 500 uncaught", async () => {
    vi.stubGlobal("fetch", respond(500, { error: "boom" }))
    await expect(getSearchResult("regen_example_x")).rejects.toBeInstanceOf(
      ApiError
    )
  })
})
