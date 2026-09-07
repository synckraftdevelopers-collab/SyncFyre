import { defineConfig, devices } from "@playwright/test";

/**
 * dev-task-split.md Phase 6 (#35): Playwright e2e configuration.
 *
 * Targets a LOCAL dev server only (`npm run dev`), using the synthetic
 * accounts from `supabase/seed.sql`. Never point PLAYWRIGHT_BASE_URL at a
 * hosted/production URL, and never run these against a project containing
 * real gym data (Talwalkar or otherwise) — there is no safeguard in this
 * suite against that, so it is a manual discipline: local only.
 *
 * First-time setup (once per machine):
 *   npx playwright install --with-deps chromium
 *
 * Run:
 *   npx supabase start && npx supabase db reset   # local Supabase + seed data
 *   npx playwright test                            # starts `npm run dev` for you
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
