import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import enriched from "./fixtures/search/v260701-ispetase-1.5.0.json"
import partial from "./fixtures/search/v260701-synthetic-partial.json"
import realSamples from "./fixtures/search/samples-LG58706675.json"

/**
 * /results E2E. Mocked mode reads fixtures from e2e/mock-api-server.mjs by
 * job id; live mode (PLAYWRIGHT_BASE_URL) runs no searches and only renders
 * a stored example result. The main fixture is the real search_version 1.5.0
 * IsPETase result, as the backend's transformResults()/resultMetadata() emit it.
 */
const isLive = Boolean(process.env.PLAYWRIGHT_BASE_URL)

const JOBS = {
  enriched: "regen_example_ispetase_v260701",
  partial: "f".repeat(32),
  failed: "a".repeat(32),
  unavailable: "b".repeat(32),
  processing: "c".repeat(32),
  searchFailed: "d".repeat(32),
  missing: "e".repeat(32),
}

const relativesCount = enriched.results.filter(
  h => h.origin === "ncbi_nr" || h.origin === "logan"
).length

test.describe("mocked", () => {
  test.skip(isLive, "fixture-backed")

  test("renders relatives with metadata columns, in search rank order", async ({
    page,
  }) => {
    const errors: string[] = []
    page.on("console", m => m.type() === "error" && errors.push(m.text()))

    const response = await page.goto(`/results?job=${JOBS.enriched}`)
    expect(response?.status()).toBe(200)
    await expect(page.locator("h1")).toContainText("IsPETase")
    await expect(page.getByText("Release v260701")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /Uncharacterized relatives/ })
    ).toContainText(String(relativesCount))
    await expect(
      page.getByRole("columnheader", { name: /Samples/ })
    ).toBeVisible()

    const ranks = await page
      .locator("tbody tr td:first-child")
      .allTextContents()
    const numeric = ranks.map(Number)
    expect(numeric).toEqual([...numeric].sort((a, b) => a - b))
    expect(errors).toEqual([])
  })

  test("no hit links to a sequence page", async ({ page }) => {
    await page.goto(`/results?job=${JOBS.enriched}`)
    await expect(page.getByRole("tab", { name: /Relatives/ })).toBeVisible()
    await expect(
      page.locator(
        'a[href^="/sequence/LG"], a[href^="/sequence/NR"], a[href^="/sequence/PL"]'
      )
    ).toHaveCount(0)
  })

  test("one-per-cluster toggle is off by default and collapses rows", async ({
    page,
  }) => {
    await page.goto(`/results?job=${JOBS.enriched}`)
    const toggle = page.getByLabel("One per 90 % cluster")
    await expect(toggle).not.toBeChecked()
    const before = await page.locator("tbody tr").count()
    await toggle.check()
    expect(await page.locator("tbody tr").count()).toBeLessThan(before)
  })

  test("environments chart labels each profile with N× expected", async ({
    page,
  }) => {
    await page.goto(`/results?job=${JOBS.enriched}`)
    await page.getByRole("tab", { name: /Environments/ }).click()
    const rows = page.getByRole("img", { name: /expected/ })
    await expect(rows).toHaveCount(
      enriched.metadata.summary.environments.profiles.length
    )
    await rows.first().hover()
    // Visual only (aria-hidden): each row's accessible name carries the values.
    const tooltip = page.locator('[role="tooltip"]')
    await expect(tooltip).toContainText("Hits from this search:")
    await expect(tooltip).toContainText("Random PETadex sequence:")
    // Top five environments, closed by default.
    const details = page.locator("details")
    await expect(details).toHaveCount(5)
    for (const d of await details.all())
      expect(await d.getAttribute("open")).toBeNull()
  })

  test("sequence record: overview, characterized relatives open, samples closed", async ({
    page,
  }) => {
    await page.goto(`/results?job=${JOBS.enriched}`)
    const hit = enriched.results.find(h => h.target_id === realSamples.id)!
    const plMembers =
      enriched.metadata.clusters.c60[
        hit.metadata!.c60 as keyof typeof enriched.metadata.clusters.c60
      ].pl_members
    await page.getByRole("button", { name: hit.target_id }).click()
    await expect(page.locator("#record-title")).toHaveText(hit.target_id)
    await expect(page.getByText("Catalytic core")).toBeVisible()
    await expect(page.getByText("inferred").first()).toBeVisible()

    const relatives = page.locator("details", {
      hasText: "Characterized relatives",
    })
    await expect(relatives).toHaveAttribute("open", "")
    await expect(relatives.locator("tbody tr")).toHaveCount(plMembers.length)

    const samples = page.locator("details", { hasText: "Found in Samples" })
    expect(await samples.getAttribute("open")).toBeNull()

    // Fetched on first open, from the real orchestrator body.
    await samples.locator("summary").click()
    await expect(samples.locator("tbody tr")).toHaveCount(
      realSamples.samples.length
    )
    await expect(samples.locator("summary")).toContainText(
      String(realSamples.n_biosamples)
    )
    await expect(samples).toContainText(realSamples.samples[0].biosample)
    // "none" evidence never renders as a badge.
    await expect(samples.getByText("none", { exact: true })).toHaveCount(0)
  })

  test("found in samples: an unavailable lookup stays inside its section", async ({
    page,
  }) => {
    await page.goto(`/results?job=${JOBS.enriched}`)
    // The mock answers 503 for the first Logan hit other than LG58706675.
    const hit = enriched.results.find(
      h => h.origin === "logan" && h.target_id !== realSamples.id
    )!
    await page.getByRole("button", { name: hit.target_id }).click()
    const samples = page.locator("details", { hasText: "Found in Samples" })
    await samples.locator("summary").click()
    await expect(samples).toContainText("Sample lookup unavailable.")
    await expect(page.locator("#record-title")).toHaveText(hit.target_id)
  })

  test("partial enrichment: hits without a record render dashes", async ({
    page,
  }) => {
    await page.goto(`/results?job=${JOBS.partial}`)
    const missing = partial.results.find(
      h => h.metadata === null && h.origin !== "plasticome"
    )!
    const row = page.locator("tbody tr", { hasText: missing.target_id })
    await expect(row).toBeVisible()
    await expect(row.locator("td").nth(6)).toHaveText("—")
    await expect(page.getByText("Metadata lookup failed.")).toHaveCount(0)
  })

  test("failed enrichment shows hits with a note and no metadata columns", async ({
    page,
  }) => {
    await page.goto(`/results?job=${JOBS.failed}`)
    await expect(page.getByText("Metadata lookup failed.")).toBeVisible()
    await expect(page.locator("tbody tr")).toHaveCount(relativesCount)
    await expect(
      page.getByRole("columnheader", { name: /Samples/ })
    ).toHaveCount(0)
    await expect(page.getByRole("tab", { name: /Environments/ })).toHaveCount(0)
  })

  test("unavailable enrichment hides metadata silently", async ({ page }) => {
    await page.goto(`/results?job=${JOBS.unavailable}`)
    await expect(page.locator("tbody tr")).toHaveCount(relativesCount)
    await expect(page.getByText("Metadata lookup failed.")).toHaveCount(0)
    await expect(
      page.getByRole("columnheader", { name: /Samples/ })
    ).toHaveCount(0)
  })

  test("a processing job completes by polling", async ({ page }) => {
    await page.goto(`/results?job=${JOBS.processing}`)
    await expect(page.getByRole("tab", { name: /Relatives/ })).toBeVisible({
      timeout: 15_000,
    })
  })

  test("terminal states", async ({ page }) => {
    await page.goto(`/results?job=${JOBS.searchFailed}`)
    await expect(page.getByRole("status")).toContainText("Search failed")
    await page.goto(`/results?job=${JOBS.missing}`)
    await expect(page.getByRole("status")).toContainText("not found")
    await page.goto("/results")
    await expect(page.getByRole("status")).toContainText("No search job")
  })

  test("has no detectable accessibility violations", async ({ page }) => {
    await page.goto(`/results?job=${JOBS.enriched}`)
    await expect(page.getByRole("tab", { name: /Relatives/ })).toBeVisible()
    const relatives = await new AxeBuilder({ page }).analyze()
    expect(relatives.violations).toEqual([])
    await page.getByRole("tab", { name: /Environments/ }).click()
    const env = await new AxeBuilder({ page }).analyze()
    expect(env.violations).toEqual([])
  })
})

test("is noindex", async ({ page }) => {
  await page.goto("/results")
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/
  )
})
