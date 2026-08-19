import { defineConfig, devices } from "@playwright/test"

/**
 * E2E layer (Homepage Test Plan, layers 4-5).
 *
 * The same spec runs against two different targets, selected by
 * PLAYWRIGHT_BASE_URL:
 *
 *  - Unset (PR-time, in web-ci.yml): points at a local `next build` +
 *    `next start`, started below via `webServer`. Fast, hermetic, no
 *    deployment required to exist yet.
 *  - Set to a live target_url (post-deploy, in web-deploy-check.yml, fired
 *    by the `deployment_status` event): points at the real Vercel
 *    deployment. `webServer` is skipped in this mode — Playwright must not
 *    try to boot a local server when the thing under test is already
 *    running on Vercel. This is the only path that catches a deployment
 *    with a missing/wrong env var, since a local build always uses CI's
 *    dummy NEXT_PUBLIC_* values.
 */
const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "dot" : "list",

  use: {
    baseURL: remoteBaseUrl ?? "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: remoteBaseUrl
    ? undefined
    : [
        // page.tsx fetches the corpus summary server-side, so this has to be
        // a real listening port -- Playwright's route interception only sees
        // requests the browser itself makes, not the Next server's own SSR
        // fetches. See e2e/mock-api-server.mjs. Port 3011, not the
        // conventional 3001, deliberately: a contributor running this
        // suite while their real `cd backend && npm run dev` is also up
        // (the README's normal local workflow, on 3001) must not have the
        // mock silently reuse that real, non-deterministic server.
        {
          command: "node e2e/mock-api-server.mjs",
          url: "http://localhost:3011/api/resolve/summary",
          reuseExistingServer: !process.env.CI,
          timeout: 20_000,
          env: { MOCK_API_PORT: "3011" },
        },
        {
          command: "npm run build && npm run start",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: {
            NEXT_PUBLIC_API_URL: "http://localhost:3011/api",
            NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
          },
        },
      ],
})
