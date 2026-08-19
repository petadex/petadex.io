import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ApiError,
  ApiUnreachableError,
  apiFetch,
  apiFetchOrNull,
} from "./client"

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("apiFetch", () => {
  it("parses a well-formed 2xx JSON payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ total_families: "64730" }))
    )

    await expect(apiFetch("/resolve/summary")).resolves.toEqual({
      total_families: "64730",
    })
  })

  it("throws ApiError with the status on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('relation "aa_seq_features" does not exist', {
          status: 500,
        })
      )
    )

    const error = await apiFetch("/aa-seq-features").catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(500)
    expect((error as ApiError).isNotFound).toBe(false)
  })

  it("resolves isNotFound for a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 404 }))
    )

    const error = await apiFetch("/enzymes/999999999").catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isNotFound).toBe(true)
  })

  it("throws ApiUnreachableError on a network-level failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    )

    await expect(apiFetch("/resolve/summary")).rejects.toBeInstanceOf(
      ApiUnreachableError
    )
  })

  it("rejects rather than passing through a malformed (non-JSON) body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>not json</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        })
      )
    )

    // response.json() throws a SyntaxError here, and apiFetch has no
    // try/catch around it — the point of this test is that nothing
    // upstream swallows that and resolves with `undefined` instead.
    await expect(apiFetch("/resolve/summary")).rejects.toThrow()
  })
})

describe("apiFetchOrNull", () => {
  it("resolves null on a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 404 }))
    )

    await expect(apiFetchOrNull("/fastaa/NOPE")).resolves.toBeNull()
  })

  it("still throws on a non-404 error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 }))
    )

    await expect(
      apiFetchOrNull("/fastaa/WP_054022242.1")
    ).rejects.toBeInstanceOf(ApiError)
  })
})
