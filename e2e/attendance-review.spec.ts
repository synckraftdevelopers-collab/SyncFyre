import { test, expect } from "@playwright/test";
import { loginAs } from "./support/auth";

/**
 * dev-task-split.md Phase 6 (#35): e2e coverage for the admin attendance /
 * biometric review screen. Runs against a LOCAL dev server + seed.sql data
 * only (see playwright.config.ts).
 */

test.describe("Admin attendance review", () => {
  test("admin can open the attendance page and see the biometric review UI", async ({ page }) => {
    await loginAs(page, "admin");

    await page.goto("/admin/attendance");
    await expect(page).toHaveTitle(/Attendance/);
    await expect(page.getByRole("heading", { level: 1, name: "Biometric Attendance Management" })).toBeVisible();

    // Search/filter controls are present and don't error when used.
    const search = page.getByPlaceholder("Search name, code, machine user ID");
    await expect(search).toBeVisible();
    await search.fill("test");
    await expect(page.getByRole("heading", { name: "Search and Filters" })).toBeVisible();

    // The biometric member-mapping panel is reachable from this page.
    await expect(page.getByRole("heading", { name: "Biometric Member Mapping" })).toBeVisible();

    // The attendance list/table section renders without an error boundary.
    await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });

  test("reception can also reach the attendance page", async ({ page }) => {
    await loginAs(page, "reception");
    await page.goto("/admin/attendance");
    await expect(page.getByRole("heading", { level: 1, name: "Biometric Attendance Management" })).toBeVisible();
  });

  test("trainer is redirected away from the admin attendance page", async ({ page }) => {
    await loginAs(page, "trainer");
    await page.goto("/admin/attendance");
    // middleware.ts: role "trainer" is not in PORTAL_ROLES["/admin"], so it
    // bounces to the trainer's own dashboard before the page ever renders.
    await page.waitForURL(/\/trainer\/dashboard/);
    await expect(page.getByRole("heading", { level: 1, name: "Biometric Attendance Management" })).toHaveCount(0);
  });
});
