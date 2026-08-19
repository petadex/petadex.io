import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { formatCount, parseCount } from "../src/lib/api/corpus"
import corpusSummaryFixture from "./fixtures/corpus-summary.json"
import atlasFixture from "./fixtures/atlas-points.json"

/** Same funnel order as HomePage: catalytic ORFs, 90%-id clusters, families, characterized. */
const expectedCompactCounts = [
  corpusSummaryFixture.catalytic_core_total,
  corpusSummaryFixture.clusters_90pid,
  corpusSummaryFixture.total_families,
  corpusSummaryFixture.pazy_total,
].map(value => formatCount(parseCount(value), "compact"))

/**
 * Homepage E2E smoke (Homepage Test Plan, layers 4-5). Scope: `/` only.
 *
 * Two targets, selected the same way playwright.config.ts picks baseURL:
 *
 *  - No PLAYWRIGHT_BASE_URL ("mocked", PR-time): the atlas hero's S3 fetch
 *    (the one call this suite can actually intercept -- see
 *    mock-api-server.mjs's own comment for why the corpus summary can't be)
 *    is routed to a fixture, so headline counts and the atlas payload are
 *    both deterministic and asserted exactly.
 *  - PLAYWRIGHT_BASE_URL set ("live", post-deploy): nothing is mocked. This
 *    is the only way to exercise the deployment's real env vars, so counts
 *    are asserted loosely -- present, numeric, non-zero -- per the plan's
 *    "Live" mode guidance, not against fixture values.
 */
const isLive = Boolean(process.env.PLAYWRIGHT_BASE_URL)

async function mockAtlasFetch(page: Page) {
  await page.route("https://petadex.s3.amazonaws.com/**", route =>
    route.fulfill({ json: atlasFixture })
  )
}

test.beforeEach(async ({ page }) => {
  if (!isLive) await mockAtlasFetch(page)
})

test("returns 200 and renders the hero heading", async ({ page }) => {
  const response = await page.goto("/")
  expect(response?.status()).toBe(200)
  await expect(page.locator("h1")).toContainText("plastic-degrading enzymes")
})

test("headline counts render as real numbers, never placeholders", async ({
  page,
}) => {
  await page.goto("/")
  // Both the headline figure and its "exact value" sub-line are <dd>
  // elements sharing the "tabular" class (dl content model forbids a bare
  // <p> here) -- "leading-none" is unique to the large headline one.
  const counts = page.locator("dd.tabular.leading-none")
  await expect(counts).toHaveCount(4)

  const texts = await counts.allTextContents()
  for (const text of texts) {
    expect(text).toMatch(/^\d[\d,.]*[KMB]?$/)
    expect(text).not.toMatch(/NaN|undefined|null/i)
  }

  if (!isLive) {
    expect(texts).toEqual(expectedCompactCounts)
  }
})

test("atlas hero mounts a sized canvas", async ({ page }) => {
  await page.goto("/")
  const canvas = page.locator("canvas").first()
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box?.width).toBeGreaterThan(0)
  expect(box?.height).toBeGreaterThan(0)
})

test("#start and #cite anchors resolve to elements on the page", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page.locator("#start")).toHaveCount(1)
  await expect(page.locator("#cite")).toHaveCount(1)
})

test("every same-origin link on the page resolves (no 404/410)", async ({
  page,
  request,
}) => {
  // /search, /enzymes and /substrate are EntryBand destinations that don't
  // exist yet -- Phase 3 of the Rebuild Plan builds pages one at a time, and
  // these three haven't landed. test.fail() (rather than skip/deleting the
  // check) keeps this honest: it flips to an unexpected pass, and CI goes
  // red, the moment those routes exist and someone forgets to remove this
  // line -- which is exactly the "stop advertising links that don't
  // resolve" signal this test exists to give.
  test.fail(
    true,
    "search/enzymes/substrate pages not built yet -- remove once Phase 3 ships them"
  )

  await page.goto("/")
  const origin = new URL(page.url()).origin

  const hrefs = await page.$$eval("a[href]", anchors =>
    anchors.map(a => a.getAttribute("href")).filter((h): h is string => !!h)
  )

  const sameOriginPaths = new Set(
    hrefs
      .filter(h => !h.startsWith("#") && !h.startsWith("mailto:"))
      .map(h => (h.startsWith("/") ? h : new URL(h, origin).href))
      .filter(h => h.startsWith("/") || h.startsWith(origin))
  )

  expect(sameOriginPaths.size).toBeGreaterThan(0)

  for (const href of sameOriginPaths) {
    const url = href.startsWith("/") ? `${origin}${href}` : href
    const res = await request.get(url)
    expect(res.status(), `${href} -> ${res.status()}`).toBeLessThan(400)
  }
})

test("SEO tags are present and non-empty", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle(/.+/)

  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content")
  expect(description?.length).toBeGreaterThan(0)

  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href")
  expect(canonical?.length).toBeGreaterThan(0)

  const ogTitle = await page
    .locator('meta[property="og:title"]')
    .getAttribute("content")
  expect(ogTitle?.length).toBeGreaterThan(0)

  const ogDescription = await page
    .locator('meta[property="og:description"]')
    .getAttribute("content")
  expect(ogDescription?.length).toBeGreaterThan(0)

  const twitterCard = await page
    .locator('meta[name="twitter:card"]')
    .getAttribute("content")
  expect(twitterCard?.length).toBeGreaterThan(0)
})

test("produces no uncaught console errors on load", async ({ page }) => {
  const errors: string[] = []
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text())
  })
  page.on("pageerror", err => errors.push(err.message))

  await page.goto("/", { waitUntil: "networkidle" })

  expect(errors).toEqual([])
})

test("passes an automated accessibility check", async ({ page }) => {
  await page.goto("/")
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
