import path from "node:path"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

/**
 * Unit + component layer (Vitest + React Testing Library).
 *
 * Env values mirror the dummy ones web-ci.yml already exports for the
 * typecheck/lint/build job — src/lib/env.ts throws at import time without
 * them, and nothing under test should depend on a real backend being up.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3001/api",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
  },
})
