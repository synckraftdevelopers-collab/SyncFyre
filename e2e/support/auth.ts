import type { Page } from "@playwright/test";

/**
 * dev-task-split.md Phase 6 (#35): shared login helper for the Playwright
 * e2e suite.
 *
 * These accounts only exist when `supabase/seed.sql` has been applied to a
 * LOCAL Supabase instance (`npx supabase db reset`). Never point this suite
 * at a hosted project — these credentials are synthetic and intentionally
 * documented in plain text in seed.sql, which is safe only because it is
 * local-only.
 */
export const DEV_ACCOUNTS = {
  admin: {
    email: "admin@devgym.local",
    password: "DevPassword123!",
    dashboard: /\/admin\/dashboard/,
  },
  reception: {
    email: "reception@devgym.local",
    password: "DevPassword123!",
    dashboard: /\/reception\/dashboard/,
  },
  trainer: {
    email: "trainer@devgym.local",
    password: "DevPassword123!",
    dashboard: /\/trainer\/dashboard/,
  },
} as const;

export type DevRole = keyof typeof DEV_ACCOUNTS;

/** Logs in as the given seeded dev account and waits for its dashboard to load. */
export async function loginAs(page: Page, role: DevRole) {
  const account = DEV_ACCOUNTS[role];
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(account.dashboard);
}
