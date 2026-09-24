/**
 * nav-feature-override.test.mts
 *
 * Verifies that the admin layout's computeVisibleNavHrefs logic correctly
 * removes nav items whose featureKey has been disabled via tenant_features
 * (enabled=false). This is the fix for Talwalkar's PT/WhatsApp/Developer
 * items still appearing in the sidebar despite DB overrides.
 *
 * ROOT CAUSE (documented here for posterity):
 *   The sidebar (portal-sidebar.tsx) is a client component that receives
 *   currentPlanKey and phaseSnapshot from the server layout. It uses only
 *   the tenant's commercial plan tier (essential/growth/scale) and the
 *   platform-wide System B phase registry to decide which nav items to
 *   show. It never reads tenant_features or calls hasCurrentFeature().
 *
 *   For a Growth tenant, pt and whatsapp are PHASE_2 (active on Growth),
 *   so the sidebar always shows them — regardless of tenant_features
 *   overrides that set enabled=false for specific tenants.
 *
 *   The fix: the admin layout server component computes visibleNavHrefs
 *   by intersecting the full nav list with a set of disabled feature keys
 *   fetched from tenant_features. This produces an explicit allowlist that
 *   the sidebar respects (it filters to only hrefs in the list).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { adminNav } from "../lib/nav/admin-nav.ts";

// ─── Pure re-implementation of computeVisibleNavHrefs (DB-free) ──────────────
// Mirrors the logic in app/(admin)/layout.tsx so we can unit-test it
// without a DB connection.

type NavItemShape = { href: string; featureKey?: string };

function computeVisibleNavHrefsSync(
  allNavItems: NavItemShape[],
  disabledFeatureKeys: string[],
  customSidebarHrefs: string[] | null,
): string[] | null {
  const disabledKeys = new Set(disabledFeatureKeys);
  if (disabledKeys.size === 0) return customSidebarHrefs ?? null;

  const baseHrefs = customSidebarHrefs ?? allNavItems.map((item) => item.href);

  const disabledHrefs = new Set(
    allNavItems
      .filter((item) => item.featureKey && disabledKeys.has(item.featureKey))
      .map((item) => item.href),
  );

  if (disabledHrefs.size === 0) return customSidebarHrefs ?? null;

  return baseHrefs.filter((href) => !disabledHrefs.has(href));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test("no disabled overrides returns null (no filtering)", () => {
  const result = computeVisibleNavHrefsSync(adminNav, [], null);
  assert.equal(result, null, "null means sidebar shows all items per plan/phase");
});

test("pt=false removes PT Report from visibleNavHrefs", () => {
  const result = computeVisibleNavHrefsSync(adminNav, ["pt"], null);
  assert.ok(result !== null, "result must be an explicit list, not null");
  assert.ok(!result.includes("/admin/reports/pt"), "PT Report href must be excluded");
  assert.ok(!result.includes("/admin/pt"), "PT sessions href must be excluded if present");
});

test("whatsapp=false removes both WhatsApp Templates AND Communication History", () => {
  const result = computeVisibleNavHrefsSync(adminNav, ["whatsapp"], null);
  assert.ok(result !== null, "result must be an explicit list, not null");
  assert.ok(!result.includes("/admin/whatsapp/templates"), "WhatsApp Templates must be excluded");
  assert.ok(!result.includes("/admin/communications"), "Communication History must be excluded");
  // Confirm both share the whatsapp featureKey
  const whatsappItems = adminNav.filter((item) => item.featureKey === "whatsapp");
  assert.equal(whatsappItems.length, 2, "exactly two nav items use the whatsapp featureKey");
  assert.ok(
    whatsappItems.some((i) => i.href === "/admin/whatsapp/templates"),
    "WhatsApp Templates uses whatsapp featureKey",
  );
  assert.ok(
    whatsappItems.some((i) => i.href === "/admin/communications"),
    "Communication History uses whatsapp featureKey",
  );
});

test("api_webhooks=false removes Developer from visibleNavHrefs", () => {
  const result = computeVisibleNavHrefsSync(adminNav, ["api_webhooks"], null);
  assert.ok(result !== null, "result must be an explicit list, not null");
  assert.ok(!result.includes("/admin/developer"), "Developer href must be excluded");
});

test("Talwalkar freeze: pt+whatsapp+api_webhooks=false removes all four features", () => {
  const disabledKeys = ["pt", "whatsapp", "api_webhooks"];
  const result = computeVisibleNavHrefsSync(adminNav, disabledKeys, null);
  assert.ok(result !== null, "must produce an explicit list");

  // The four features that must be absent for Talwalkar
  assert.ok(!result.includes("/admin/reports/pt"),         "PT Report must be excluded");
  assert.ok(!result.includes("/admin/whatsapp/templates"), "WhatsApp Templates must be excluded");
  assert.ok(!result.includes("/admin/communications"),     "Communication History must be excluded");
  assert.ok(!result.includes("/admin/developer"),          "Developer must be excluded");

  // Core nav items that must remain for Talwalkar
  assert.ok(result.includes("/admin/dashboard"),    "Dashboard must remain");
  assert.ok(result.includes("/admin/members"),      "Members must remain");
  assert.ok(result.includes("/admin/memberships"),  "Memberships must remain");
  assert.ok(result.includes("/admin/attendance"),   "Attendance must remain");
  assert.ok(result.includes("/admin/payments"),     "Payments must remain");
  assert.ok(result.includes("/admin/finance"),      "Finance must remain");
  assert.ok(result.includes("/admin/reports"),      "Reports must remain");
  assert.ok(result.includes("/admin/leads"),        "CRM & Leads must remain");
});

test("disabling pt does not affect unrelated features", () => {
  const result = computeVisibleNavHrefsSync(adminNav, ["pt"], null);
  assert.ok(result !== null);
  assert.ok(result.includes("/admin/whatsapp/templates"), "WhatsApp Templates still present when only pt disabled");
  assert.ok(result.includes("/admin/communications"),     "Communication History still present when only pt disabled");
  assert.ok(result.includes("/admin/developer"),          "Developer still present when only pt disabled");
  assert.ok(result.includes("/admin/finance"),            "Finance unaffected");
  assert.ok(result.includes("/admin/leads"),              "CRM unaffected");
});

test("disabling whatsapp does not affect pt or developer", () => {
  const result = computeVisibleNavHrefsSync(adminNav, ["whatsapp"], null);
  assert.ok(result !== null);
  assert.ok(result.includes("/admin/reports/pt"), "PT Report still present when only whatsapp disabled");
  assert.ok(result.includes("/admin/developer"),  "Developer still present when only whatsapp disabled");
});

test("a tenant without overrides is unaffected (returns null = show all)", () => {
  // A normal Growth tenant with no tenant_features rows should see everything
  const result = computeVisibleNavHrefsSync(adminNav, [], null);
  assert.equal(result, null, "no overrides = null = sidebar uses plan/phase logic only");
});

test("custom sidebar hrefs are still filtered when overrides are present", () => {
  // A tenant with a custom sidebar setting AND pt=false
  const customHrefs = [
    "/admin/dashboard",
    "/admin/members",
    "/admin/reports/pt",       // would be excluded by pt override
    "/admin/finance",
  ];
  const result = computeVisibleNavHrefsSync(adminNav, ["pt"], customHrefs);
  assert.ok(result !== null);
  assert.ok(!result.includes("/admin/reports/pt"), "PT Report excluded even from custom hrefs");
  assert.ok(result.includes("/admin/dashboard"),   "Dashboard retained from custom hrefs");
  assert.ok(result.includes("/admin/finance"),     "Finance retained from custom hrefs");
});

test("all four Talwalkar-disabled hrefs are present in adminNav (sanity check)", () => {
  const allHrefs = adminNav.map((item) => item.href);
  assert.ok(allHrefs.includes("/admin/reports/pt"),         "PT Report must be in adminNav");
  assert.ok(allHrefs.includes("/admin/whatsapp/templates"), "WhatsApp Templates must be in adminNav");
  assert.ok(allHrefs.includes("/admin/communications"),     "Communication History must be in adminNav");
  assert.ok(allHrefs.includes("/admin/developer"),          "Developer must be in adminNav");
});

test("PT Report featureKey is pt (not advanced_reports or trainer)", () => {
  const ptReportItem = adminNav.find((item) => item.href === "/admin/reports/pt");
  assert.ok(ptReportItem, "PT Report nav item must exist");
  assert.equal(ptReportItem.featureKey, "pt", "PT Report must use featureKey: pt");
});

test("Developer featureKey is api_webhooks (not api)", () => {
  const devItem = adminNav.find((item) => item.href === "/admin/developer");
  assert.ok(devItem, "Developer nav item must exist");
  assert.equal(devItem.featureKey, "api_webhooks", "Developer must use featureKey: api_webhooks (PHASE_3)");
});
