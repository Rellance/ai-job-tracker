import { defineConfig } from "@playwright/test";

/**
 * Smoke E2E suite (Implementation Plan M5). Runs against an already-running
 * dev server (`npm run dev`) with the seeded demo user. Not part of CI's
 * default `npm test` — run locally / pre-release with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 1,
  workers: 1, // flows share the demo account — keep them sequential
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
  },
  reporter: [["list"]],
});
