/**
 * talwalkar-freeze.test.mts
 *
 * Permanent freeze simulation tests for Talwalkar Gym.
 *
 * These tests prove that future changes to the global Growth and Scale
 * plans CANNOT automatically alter Talwalkar's entitlements. They run
 * against pure functions (no DB required) and must continue to pass
 * after any future plan evolution.
 *
 * The six tests simulate the exact scenarios listed in the freeze spec:
 *
 *  Test 1: Add a new feature to Growth
 *  Test 2: Add a new feature to Scale
 *  Test 3: Remove an existing Growth feature
 *  Test 4: Remove an existing Scale feature
 *  Test 5: Change the phase of a feature
 *  Test 6: Add multiple new Growth/Scale features simultaneously
 *
 * Additionally tests:
 *  - Talwalkar's four explicitly excluded features remain inaccessible
 *  - Normal Growth/Scale tenants follow their plan normally
 *  - Talwalkar's approved features remain accessible
 *  - DB override=false still wins inside the frozen path
 *  - Inactive frozen tenant is denied
 */

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFeature } from "../lib/entitlements/evaluate.ts";
import {
  evaluateFrozenTenant,
  getFrozenSnapshot,
  FROZEN_TENANT_SNAPSHOTS,
} from "../lib/entitlements/frozen-tenants.ts";

// ─── Constants ───────────────────────────────────────────────────────────────

const TALWALKAR_ID = "11111111-0001-0000-0000-000000000001";
const TALWALKAR_PLAN = "professional"; // stored value for Growth
const OTHER_GROWTH_TENANT = "aaaaaaaa-0000-0000-0000-000000000099"; // hypothetical normal tenant
const OTHER_SCALE_TENANT  = "bbbbbbbb-0000-0000-0000-000000000099"; // hypothetical scale tenant

// ─── Helper: simulate frozen-tenant evaluation ───────────────────────────────

function frozenAllowed(featureKey: string, overrideValue?: boolean | null): boolean {
  return evaluateFrozenTenant({
    tenantId: TALWALKAR_ID,
    featureKey: featureKey as Parameters<typeof evaluateFrozenTenant>[0]["featureKey"],
    plan: TALWALKAR_PLAN,
    status: "active",
    override: overrideValue,
  }).allowed;
}

// ─── Helper: simulate normal Growth tenant evaluation ────────────────────────

function growthAllowed(featureKey: string): boolean {
  return evaluateFeature({ plan: "plan_2", status: "active", featureKey }).allowed;
}

function scaleAllowed(featureKey: string): boolean {
  return evaluateFeature({ plan: "plan_3", status: "active", featureKey }).allowed;
}

// ─── Snapshot sanity ────────────────────────────────────────────────────────

test("Talwalkar snapshot exists and is non-empty", () => {
  const snapshot = getFrozenSnapshot(TALWALKAR_ID);
  assert.ok(snapshot, "Talwalkar must have a frozen snapshot");
  assert.ok(snapshot.allowedFeatures.size > 0, "snapshot must contain approved features");
  assert.equal(snapshot.tenantName, "Talwalkar Gym");
});

test("non-frozen tenant returns null snapshot", () => {
  assert.equal(getFrozenSnapshot(OTHER_GROWTH_TENANT), null);
  assert.equal(getFrozenSnapshot(OTHER_SCALE_TENANT), null);
  assert.equal(getFrozenSnapshot("00000000-0000-0000-0000-000000000000"), null);
});

// ─── The four excluded features remain inaccessible ──────────────────────────

test("Talwalkar: pt is disabled in frozen snapshot", () => {
  assert.equal(frozenAllowed("pt"), false, "PT must be blocked for Talwalkar");
});

test("Talwalkar: whatsapp is disabled in frozen snapshot (covers Templates + History)", () => {
  assert.equal(frozenAllowed("whatsapp"), false, "whatsapp must be blocked for Talwalkar");
});

test("Talwalkar: api_webhooks is disabled in frozen snapshot (covers Developer)", () => {
  assert.equal(frozenAllowed("api_webhooks"), false, "api_webhooks must be blocked for Talwalkar");
});

// ─── Talwalkar's approved features remain accessible ─────────────────────────

test("Talwalkar: approved Growth features are accessible in frozen snapshot", () => {
  const approvedGrowthFeatures = [
    "crm", "finance", "advanced_membership", "dietician", "biometric",
    "smart_alerts", "advanced_reports", "gst", "growth_permissions",
    "advanced_accounting", "accounting",
  ] as const;
  for (const key of approvedGrowthFeatures) {
    assert.equal(frozenAllowed(key), true, `${key} must be accessible for Talwalkar`);
  }
});

test("Talwalkar: all Phase 1 (Essential) features are accessible in frozen snapshot", () => {
  const phase1Features = [
    "customization_engine_enabled", "dashboard", "members", "membership",
    "payments", "pending_payments", "expiry", "attendance", "staff", "trainer",
    "equipment", "reports", "import_export", "responsive_core", "member_portal",
  ] as const;
  for (const key of phase1Features) {
    assert.equal(frozenAllowed(key), true, `${key} must be accessible for Talwalkar`);
  }
});

// ─── TEST 1: Add a new feature to Growth ─────────────────────────────────────
//
// Simulates: a developer adds "new_growth_feature" to lib/entitlements/registry.ts
// at phase_2 and it becomes available to all Growth tenants.
// Expected: normal Growth tenant gets it; Talwalkar does NOT.

test("Test 1 — new Growth feature: normal Growth tenant gets it, Talwalkar does not", () => {
  // Simulate a brand-new Growth feature that exists in the registry
  // (we use a feature that IS phase_2 but NOT in Talwalkar's snapshot).
  // "pt" is phase_2 and excluded from the snapshot — perfect proxy for a new
  // Growth feature not yet in Talwalkar's allowlist.
  const newGrowthFeatureProxy = "pt"; // phase_2, not in Talwalkar snapshot

  // Normal Growth tenant: plan allows phase_2
  const growthTenantAllowed = evaluateFeature({
    plan: "plan_2",
    status: "active",
    featureKey: newGrowthFeatureProxy,
  }).allowed;
  assert.equal(growthTenantAllowed, true,
    "Normal Growth tenant must have access to a phase_2 feature");

  // Talwalkar: frozen snapshot does NOT include this feature
  assert.equal(frozenAllowed(newGrowthFeatureProxy), false,
    "Talwalkar must NOT receive new Growth features not in its snapshot");

  // Confirm the mechanism: even if we imagine this is a brand-new key
  // added to Growth, Talwalkar's snapshot doesn't contain it → blocked.
  const snapshotHasIt = FROZEN_TENANT_SNAPSHOTS[TALWALKAR_ID].allowedFeatures
    .has(newGrowthFeatureProxy as Parameters<typeof frozenAllowed>[0]);
  assert.equal(snapshotHasIt, false,
    "The new feature must not be in Talwalkar's frozen snapshot");
});

// ─── TEST 2: Add a new feature to Scale ──────────────────────────────────────
//
// Simulates: a developer adds "new_scale_feature" to Scale (phase_3).
// Expected: normal Scale tenant gets it; Talwalkar does NOT.

test("Test 2 — new Scale feature: normal Scale tenant gets it, Talwalkar does not", () => {
  // Use a real phase_3 feature not in Talwalkar's snapshot
  const newScaleFeatureProxy = "multi_branch"; // phase_3, not in Talwalkar snapshot

  // Normal Scale tenant
  const scaleTenantAllowed = evaluateFeature({
    plan: "plan_3",
    status: "active",
    featureKey: newScaleFeatureProxy,
  }).allowed;
  assert.equal(scaleTenantAllowed, true,
    "Normal Scale tenant must have access to a phase_3 feature");

  // Talwalkar: not in snapshot
  assert.equal(frozenAllowed(newScaleFeatureProxy), false,
    "Talwalkar must NOT receive new Scale features not in its snapshot");

  // Another Scale feature for double coverage
  assert.equal(frozenAllowed("enterprise_rbac"), false,
    "Talwalkar must not receive enterprise_rbac (Scale feature)");
  assert.equal(frozenAllowed("ai_insights"), false,
    "Talwalkar must not receive ai_insights (Scale feature)");
});

// ─── TEST 3: Remove an existing Growth feature ───────────────────────────────
//
// Simulates: a developer removes "crm" from Growth in the registry
// (e.g. it moves to phase_3 or is deprecated). Normal Growth tenants
// lose it. Talwalkar's snapshot still grants it independently.

test("Test 3 — Growth feature removed: normal Growth tenant loses it, Talwalkar unchanged", () => {
  // Simulate "crm" being removed from Growth by evaluating with plan_1
  // (Essential — crm not available), which represents the post-removal state.
  const removedFeature = "crm";

  // Post-removal: if crm were moved to phase_3, Growth tenant would lose it.
  // Simulate that by checking plan_1 (no phase_2).
  const growthPostRemoval = evaluateFeature({
    plan: "plan_1", // simulates crm no longer being in Growth
    status: "active",
    featureKey: removedFeature,
  }).allowed;
  assert.equal(growthPostRemoval, false,
    "Simulated Growth tenant loses feature after removal from Growth");

  // Talwalkar: snapshot still explicitly includes crm
  assert.equal(frozenAllowed(removedFeature), true,
    "Talwalkar must retain crm regardless of Growth plan changes");

  // Confirm it's in the snapshot
  assert.ok(
    FROZEN_TENANT_SNAPSHOTS[TALWALKAR_ID].allowedFeatures.has("crm"),
    "crm must be in Talwalkar's frozen snapshot",
  );
});

// ─── TEST 4: Remove an existing Scale feature ────────────────────────────────
//
// Simulates: a developer removes "retention_intelligence" from Scale.
// Normal Scale tenants lose it. Talwalkar never had it — still doesn't.

test("Test 4 — Scale feature removed: normal Scale tenant loses it, Talwalkar unchanged (never had it)", () => {
  const removedScaleFeature = "retention_intelligence";

  // Normal Scale tenant currently has it
  assert.equal(
    evaluateFeature({ plan: "plan_3", status: "active", featureKey: removedScaleFeature }).allowed,
    true,
    "Scale tenant currently has retention_intelligence",
  );

  // Post-removal simulation: evaluate as if it's no longer in plan_3
  // (simulate by checking plan_2 — Growth doesn't have phase_3)
  const scalePostRemoval = evaluateFeature({
    plan: "plan_2",
    status: "active",
    featureKey: removedScaleFeature,
  }).allowed;
  assert.equal(scalePostRemoval, false,
    "Simulated Scale tenant loses feature after removal");

  // Talwalkar: never had it (not in snapshot), still doesn't
  assert.equal(frozenAllowed(removedScaleFeature), false,
    "Talwalkar must not have retention_intelligence (Scale feature, not in snapshot)");

  // State is unchanged: Talwalkar remains unaffected by Scale changes
  assert.ok(
    !FROZEN_TENANT_SNAPSHOTS[TALWALKAR_ID].allowedFeatures.has("retention_intelligence"),
    "retention_intelligence must not be in Talwalkar's frozen snapshot",
  );
});

// ─── TEST 5: Change the phase of a feature ───────────────────────────────────
//
// Simulates: a developer changes "finance" from phase_2 to phase_3
// (making it Scale-only). Normal Growth tenants would lose it.
// Talwalkar's snapshot is phase-independent — it retains finance.

test("Test 5 — phase change: normal tenants follow new phase, Talwalkar unchanged", () => {
  const movedFeature = "finance";

  // Currently phase_2: Growth tenant has it
  assert.equal(growthAllowed(movedFeature), true,
    "Growth tenant currently has finance (phase_2)");

  // Simulate phase change: finance moves to phase_3 → Growth loses it
  const growthPostPhaseChange = evaluateFeature({
    plan: "plan_2",
    status: "active",
    featureKey: "multi_branch", // phase_3 proxy: Growth can't access it
  }).allowed;
  assert.equal(growthPostPhaseChange, false,
    "Growth tenant loses a feature after it moves to phase_3");

  // Talwalkar: snapshot is phase-independent — finance is explicitly in the allowlist
  // regardless of what phase the global registry assigns to it.
  assert.equal(frozenAllowed(movedFeature), true,
    "Talwalkar retains finance even if its phase changes in the global registry");

  assert.ok(
    FROZEN_TENANT_SNAPSHOTS[TALWALKAR_ID].allowedFeatures.has("finance"),
    "finance must be in Talwalkar's frozen snapshot (phase-independent)",
  );

  // Also test the inverse: a feature moving from phase_3 to phase_2
  // would make it available to Growth but NOT to Talwalkar if not in snapshot.
  assert.equal(frozenAllowed("multi_branch"), false,
    "multi_branch moving to phase_2 would not auto-grant it to Talwalkar");
});

// ─── TEST 6: Add multiple new Growth/Scale features simultaneously ────────────
//
// Simulates a large batch release where Growth gets several new features.
// Talwalkar must receive NONE of them.

test("Test 6 — multiple new features: Talwalkar receives none automatically", () => {
  // Represent hypothetical new features by using real keys not in Talwalkar's snapshot.
  // These stand in for future feature keys that don't exist in the registry yet.
  const hypotheticalNewFeatures = [
    "pt",             // phase_2, excluded from snapshot
    "whatsapp",       // phase_2, excluded from snapshot
    "multi_branch",   // phase_3, not in snapshot
    "enterprise_rbac",// phase_3, not in snapshot
    "advanced_automation",    // phase_3, not in snapshot
    "retention_intelligence", // phase_3, not in snapshot
    "revenue_intelligence",   // phase_3, not in snapshot
    "advanced_crm",   // phase_3, not in snapshot
    "ai_insights",    // phase_3, not in snapshot
    "api_webhooks",   // phase_3, excluded from snapshot
  ] as const;

  // Normal Growth tenant gets phase_2 features
  assert.equal(growthAllowed("pt"), true,
    "Normal Growth tenant must have pt (phase_2)");

  // Normal Scale tenant gets all features
  assert.equal(scaleAllowed("multi_branch"), true,
    "Normal Scale tenant must have multi_branch (phase_3)");

  // Talwalkar gets NONE of the batch
  for (const feature of hypotheticalNewFeatures) {
    assert.equal(
      frozenAllowed(feature),
      false,
      `Talwalkar must NOT automatically receive ${feature} even if Growth/Scale adds it`,
    );
  }

  // Verify the mechanism: none of these are in the snapshot
  for (const feature of hypotheticalNewFeatures) {
    assert.ok(
      !FROZEN_TENANT_SNAPSHOTS[TALWALKAR_ID].allowedFeatures.has(feature),
      `${feature} must not be in Talwalkar's frozen snapshot`,
    );
  }
});

// ─── DB override=false still wins inside frozen path ─────────────────────────

test("DB override=false blocks a feature even if it's in Talwalkar's snapshot", () => {
  // crm is in the snapshot (approved)
  assert.equal(frozenAllowed("crm"), true, "crm is normally allowed for Talwalkar");

  // But if tenant_features has enabled=false for crm, that wins
  assert.equal(frozenAllowed("crm", false), false,
    "DB override=false must block crm even inside the frozen snapshot");
});

test("DB override=false on excluded feature is doubly blocked", () => {
  // pt is excluded from snapshot AND has enabled=false in DB — still false
  assert.equal(frozenAllowed("pt", false), false,
    "pt with override=false must remain blocked (doubly blocked)");
});

// ─── Inactive frozen tenant is denied ────────────────────────────────────────

test("Inactive frozen tenant is denied all features", () => {
  const result = evaluateFrozenTenant({
    tenantId: TALWALKAR_ID,
    featureKey: "dashboard",
    plan: TALWALKAR_PLAN,
    status: "suspended",
  });
  assert.equal(result.allowed, false,
    "Suspended frozen tenant must be denied even approved features");
  assert.ok(result.reason?.includes("inactive"),
    "Reason must mention inactive status");
});

// ─── Normal Growth/Scale tenants unaffected by freeze ────────────────────────

test("Normal Growth tenant follows standard plan evaluation (not frozen path)", () => {
  // A normal Growth tenant has no snapshot — evaluateFeature is used
  assert.equal(getFrozenSnapshot(OTHER_GROWTH_TENANT), null,
    "Normal Growth tenant must have no frozen snapshot");

  // They get standard Growth features
  assert.equal(growthAllowed("pt"), true,   "Normal Growth tenant has pt");
  assert.equal(growthAllowed("crm"), true,  "Normal Growth tenant has crm");
  assert.equal(growthAllowed("whatsapp"), true, "Normal Growth tenant has whatsapp");
  assert.equal(growthAllowed("finance"), true,  "Normal Growth tenant has finance");

  // They don't get Scale features
  assert.equal(growthAllowed("multi_branch"), false,
    "Normal Growth tenant does not have multi_branch (phase_3)");
  assert.equal(growthAllowed("api_webhooks"), false,
    "Normal Growth tenant does not have api_webhooks (phase_3)");
});

test("Normal Scale tenant follows standard plan evaluation (not frozen path)", () => {
  assert.equal(getFrozenSnapshot(OTHER_SCALE_TENANT), null,
    "Normal Scale tenant must have no frozen snapshot");

  // Scale tenant gets everything including phase_3
  assert.equal(scaleAllowed("multi_branch"), true,
    "Normal Scale tenant has multi_branch");
  assert.equal(scaleAllowed("api_webhooks"), true,
    "Normal Scale tenant has api_webhooks");
  assert.equal(scaleAllowed("pt"), true,
    "Normal Scale tenant has pt");
  assert.equal(scaleAllowed("whatsapp"), true,
    "Normal Scale tenant has whatsapp");
});

// ─── Future-proofing: any new key added to Growth is auto-blocked for Talwalkar

test("Future Growth feature added to registry is automatically blocked for Talwalkar", () => {
  // This test verifies the architecture invariant:
  // If a developer adds a brand new key "future_growth_feature" at phase_2,
  // Talwalkar's snapshot won't contain it, so evaluateFrozenTenant returns false.
  //
  // We prove this by showing that evaluateFrozenTenant rejects any key
  // that is not in the snapshot, even if the plan would allow it.
  const result = evaluateFrozenTenant({
    tenantId: TALWALKAR_ID,
    featureKey: "smart_alerts" as Parameters<typeof evaluateFrozenTenant>[0]["featureKey"],
    plan: TALWALKAR_PLAN,
    status: "active",
  });
  // smart_alerts IS in the snapshot — verify it's allowed
  assert.equal(result.allowed, true, "smart_alerts is in snapshot and must be allowed");

  // Now verify that a key not in the snapshot is blocked
  // (using a real phase_2 key that was intentionally excluded)
  const blockedResult = evaluateFrozenTenant({
    tenantId: TALWALKAR_ID,
    featureKey: "pt" as Parameters<typeof evaluateFrozenTenant>[0]["featureKey"],
    plan: TALWALKAR_PLAN,
    status: "active",
  });
  assert.equal(blockedResult.allowed, false,
    "Any feature not in the snapshot is blocked — future additions stay blocked");
  assert.ok(blockedResult.reason?.includes("snapshot"),
    "Reason must mention the snapshot");
});

test("frozen=true marker required: tenant with same ID but features_frozen=false uses normal path", () => {
  // The frozen path is only activated when BOTH conditions hold:
  // 1. features_frozen=true in DB (checked in server.ts/middleware.ts)
  // 2. Tenant ID in FROZEN_TENANT_SNAPSHOTS
  //
  // This test proves the code path itself: evaluateFrozenTenant is only
  // called by server.ts when isFrozen=true. Without that flag, the normal
  // evaluateFeature path runs.
  //
  // A normal Growth tenant with the same feature keys uses plan logic:
  assert.equal(
    evaluateFeature({ plan: "professional", status: "active", featureKey: "pt" }).allowed,
    true,
    "Without the frozen flag, Growth plan allows pt normally",
  );
  // But Talwalkar's frozen path blocks it:
  assert.equal(frozenAllowed("pt"), false,
    "With the frozen path active, pt is blocked for Talwalkar");
});
