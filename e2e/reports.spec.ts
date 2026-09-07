import { test, expect } from "@playwright/test";
import { loginAs } from "./support/auth";

/**
 * dev-task-split.md Phase 6 (#35): e2e coverage for the reports overview
 * page. Runs against a LOCAL dev server + seed.sql data only (see
 * playwright.config.ts).
 *
 * Note: all three seeded dev roles (admin, reception, trainer) are allowed
 * on /admin/reports (see requireUser(["admin","manager","reception",
 * "trainer","dietician"]) in app/(admin)/admin/reports/page.tsx), so there
 * is no seeded role left to exercise an access-control redirect here the
 * way attendance-review.spec.ts does. Instead this covers that the page
 * renders correctly for both a tenant-wide role (admin) and a
 * branch-scoped role (trainer).
 */

test.describe("Admin reports overview", () => {
  test("admin can open the reports page", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/reports");
    await expect(page).toHaveTitle(/Reports/);
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });

  test("branch-scoped trainer can also open the reports page without erroring", async ({ page }) => {
    await loginAs(page, "trainer");
    await page.goto("/admin/reports");
    await expect(page).toHaveTitle(/Reports/);
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });
});
