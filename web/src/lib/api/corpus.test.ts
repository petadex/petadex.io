import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchCorpusSummary, formatCount, parseCount } from "./corpus"

describe("parseCount", () => {
  it("returns null for an absent column, not zero", () => {
    expect(parseCount(undefined)).toBeNull()
  })

  it("returns null for an empty string", () => {
    expect(parseCount("")).toBeNull()
  })

  it("parses a bigint-as-string column to a number", () => {
    expect(parseCount("307155746")).toBe(307155746)
  })

  it("returns null rather than NaN for a non-numeric value", () => {
    expect(parseCount("not-a-number")).toBeNull()
    expect(Number.isNaN(parseCount("not-a-number"))).toBe(false)
  })
})

describe("formatCount", () => {
  it("renders the fallback em dash for null, not blank or NaN", () => {
    expect(formatCount(null)).toBe("—")
    expect(formatCount(null, "compact")).toBe("—")
  })

  it("renders zero as 0, not as a falsy blank string", () => {
    expect(formatCount(0)).toBe("0")
    expect(formatCount(0, "compact")).toBe("0")
  })

  it("formats full precision with thousands separators", () => {
    expect(formatCount(307155746)).toBe("307,155,746")
  })

  it("formats compact precision abbreviated", () => {
    expect(formatCount(216_700_000, "compact")).toBe("216.7M")
  })
})

describe("fetchCorpusSummary", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("parses a well-formed corpus_summary payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            total_families: "64730",
            catalytic_core_total: "307155746",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    )

    await expect(fetchCorpusSummary()).resolves.toMatchObject({
      total_families: "64730",
    })
  })

  /**
   * The single most important homepage test (per the Homepage Test Plan).
   * corpus.ts deliberately has no try/catch around this fetch — a build that
   * cannot reach the count endpoint must fail loudly rather than publish a
   * homepage with silently missing numbers. This asserts the throw actually
   * reaches the caller instead of being caught and logged somewhere in the
   * chain (fetchCorpusSummary -> apiFetch -> fetch).
   */
  it("propagates a fetch failure uncaught", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    )

    await expect(fetchCorpusSummary()).rejects.toThrow()
  })

  it("propagates a non-2xx response uncaught", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 503 }))
    )

    await expect(fetchCorpusSummary()).rejects.toThrow()
  })
})
