/**
 * Upgrade UX — focused tests
 *
 * Verifies:
 *  1. Plan config correctness (no duplicate plan definitions)
 *  2. Feature-to-plan mapping is consistent with the canonical entitlement registry
 *  3. next URL sanitization logic
 *  4. Plan key derivation from stored plan values
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  COMMERCIAL_PLANS,
  COMMERCIAL_PLAN_ORDER,
  getPlanConfig,
  getPlanForFeature,
  getFeatureDisplay,
  getNextPlan,
  type CommercialPlanKey,
} from "../lib/plans/config.ts";
import { evaluateFeature } from "../lib/entitlements/evaluate.ts";
import { normalizePlan } from "../lib/entitlements/evaluate.ts";

// ─── Plan config structure ──────────────────────────────────────────────────

test("all three commercial plans are defined with correct planIds", () => {
  assert.equal(COMMERCIAL_PLANS.essential.planId, "plan_1");
  assert.equal(COMMERCIAL_PLANS.growth.planId, "plan_2");
  assert.equal(COMMERCIAL_PLANS.scale.planId, "plan_3");
});

test("plan order is essential → growth → scale", () => {
  assert.deepEqual(COMMERCIAL_PLAN_ORDER, ["essential", "growth", "scale"]);
});

test("each plan has a non-empty price, features, and deltaFeatures", () => {
  for (const key of COMMERCIAL_PLAN_ORDER) {
    const plan = COMMERCIAL_PLANS[key];
    assert.ok(plan.price.startsWith("₹"), `${key}: price must start with ₹`);
    assert.ok(plan.features.length > 0, `${key}: must have at least one feature`);
    assert.ok(plan.deltaFeatures.length > 0, `${key}: must have at least one delta feature`);
  }
});

test("getNextPlan returns the correct next plan and null for scale", () => {
  assert.equal(getNextPlan("essential")?.key, "growth");
  assert.equal(getNextPlan("growth")?.key, "scale");
  assert.equal(getNextPlan("scale"), null);
});

test("getPlanConfig maps plan_1/plan_2/plan_3 to correct plan configs", () => {
  assert.equal(getPlanConfig("plan_1").key, "essential");
  assert.equal(getPlanConfig("plan_2").key, "growth");
  assert.equal(getPlanConfig("plan_3").key, "scale");
  // null / unknown defaults to essential
  assert.equal(getPlanConfig(null).key, "essential");
  assert.equal(getPlanConfig("trial").key, "essential");
});

// ─── Feature-to-plan mapping ────────────────────────────────────────────────

test("growth delta features all map to the growth plan", () => {
  for (const feature of COMMERCIAL_PLANS.growth.deltaFeatures) {
    const plan = getPlanForFeature(feature.featureKey);
    assert.equal(
      plan?.key,
      "growth",
      `${feature.featureKey} should map to growth plan`,
    );
  }
});

test("scale delta features all map to the scale plan", () => {
  for (const feature of COMMERCIAL_PLANS.scale.deltaFeatures) {
    const plan = getPlanForFeature(feature.featureKey);
    assert.equal(
      plan?.key,
      "scale",
      `${feature.featureKey} should map to scale plan`,
    );
  }
});

test("getFeatureDisplay returns a display object for known growth features", () => {
  const growthFeatureKeys = COMMERCIAL_PLANS.growth.deltaFeatures.map((f) => f.featureKey);
  for (const key of growthFeatureKeys) {
    const display = getFeatureDisplay(key);
    assert.ok(display, `getFeatureDisplay must return a result for ${key}`);
    assert.ok(display.label, `${key}: display must have a label`);
  }
});

// ─── Plan config consistency with canonical entitlement evaluator ────────────

test("growth delta features are locked on Essential and available on Growth per entitlement evaluator", () => {
  for (const feature of COMMERCIAL_PLANS.growth.deltaFeatures) {
    const key = feature.featureKey;
    const lockedOnEssential = evaluateFeature({ plan: "plan_1", status: "active", featureKey: key });
    const availableOnGrowth = evaluateFeature({ plan: "plan_2", status: "active", featureKey: key });
    assert.equal(
      lockedOnEssential.allowed,
      false,
      `${key}: must be locked on Essential (plan_1)`,
    );
    assert.equal(
      availableOnGrowth.allowed,
      true,
      `${key}: must be available on Growth (plan_2)`,
    );
  }
});

test("scale delta features are locked on Essential and Growth, available on Scale", () => {
  for (const feature of COMMERCIAL_PLANS.scale.deltaFeatures) {
    const key = feature.featureKey;
    assert.equal(
      evaluateFeature({ plan: "plan_1", status: "active", featureKey: key }).allowed,
      false,
      `${key}: must be locked on Essential`,
    );
    assert.equal(
      evaluateFeature({ plan: "plan_2", status: "active", featureKey: key }).allowed,
      false,
      `${key}: must be locked on Growth`,
    );
    assert.equal(
      evaluateFeature({ plan: "plan_3", status: "active", featureKey: key }).allowed,
      true,
      `${key}: must be available on Scale`,
    );
  }
});

test("essential features are available on all plans", () => {
  for (const feature of COMMERCIAL_PLANS.essential.deltaFeatures) {
    const key = feature.featureKey;
    for (const plan of ["plan_1", "plan_2", "plan_3"] as const) {
      assert.equal(
        evaluateFeature({ plan, status: "active", featureKey: key }).allowed,
        true,
        `${key}: must be available on ${plan}`,
      );
    }
  }
});

// ─── next URL sanitization ───────────────────────────────────────────────────

/**
 * Mirrors the sanitizeNext() function in app/(admin)/admin/upgrade/page.tsx.
 * Tested here as a pure function to avoid import complexity.
 */
function sanitizeNext(next: string | undefined): string {
  const raw = (next ?? "").trim();
  if (!raw) return "/admin/dashboard";
  if (raw.startsWith("/admin/") || raw === "/admin") return raw;
  return "/admin/dashboard";
}

test("sanitizeNext preserves valid /admin paths", () => {
  assert.equal(sanitizeNext("/admin/leads"), "/admin/leads");
  assert.equal(sanitizeNext("/admin/finance/accounting"), "/admin/finance/accounting");
  assert.equal(sanitizeNext("/admin"), "/admin");
});

test("sanitizeNext rejects non-admin and external URLs", () => {
  assert.equal(sanitizeNext("https://evil.com"), "/admin/dashboard");
  assert.equal(sanitizeNext("//evil.com"), "/admin/dashboard");
  assert.equal(sanitizeNext("/reception/members"), "/admin/dashboard");
  assert.equal(sanitizeNext("javascript:alert(1)"), "/admin/dashboard");
});

test("sanitizeNext returns dashboard for empty/undefined input", () => {
  assert.equal(sanitizeNext(undefined), "/admin/dashboard");
  assert.equal(sanitizeNext(""), "/admin/dashboard");
  assert.equal(sanitizeNext("   "), "/admin/dashboard");
});

// ─── Plan key derivation ─────────────────────────────────────────────────────

function planKeyFromTenantPlan(tenantPlan: string | null | undefined): CommercialPlanKey {
  const normalized = normalizePlan(tenantPlan as Parameters<typeof normalizePlan>[0]);
  if (normalized === "plan_2") return "growth";
  if (normalized === "plan_3") return "scale";
  return "essential";
}

test("planKeyFromTenantPlan maps stored values to commercial plan keys correctly", () => {
  // plan_1 / trial / standard → essential
  assert.equal(planKeyFromTenantPlan("plan_1"), "essential");
  assert.equal(planKeyFromTenantPlan("trial"), "essential");
  assert.equal(planKeyFromTenantPlan("standard"), "essential");
  assert.equal(planKeyFromTenantPlan(null), "essential");
  // plan_2 / professional → growth
  assert.equal(planKeyFromTenantPlan("plan_2"), "growth");
  assert.equal(planKeyFromTenantPlan("professional"), "growth");
  // plan_3 / enterprise → scale
  assert.equal(planKeyFromTenantPlan("plan_3"), "scale");
  assert.equal(planKeyFromTenantPlan("enterprise"), "scale");
});

test("no duplicate plan definitions — plan config does not re-define the entitlement system", () => {
  // Verify we are just READING from the entitlement evaluator, not defining new plans
  // The plan config must not export planIds that differ from plan_1/plan_2/plan_3
  const planIds = COMMERCIAL_PLAN_ORDER.map((key) => COMMERCIAL_PLANS[key].planId);
  assert.deepEqual(planIds, ["plan_1", "plan_2", "plan_3"]);
});
