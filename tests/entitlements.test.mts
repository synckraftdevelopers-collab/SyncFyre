import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFeature, storedPlanForProduct } from "../lib/entitlements/evaluate.ts";
import { FEATURE_REGISTRY as PHASE_REGISTRY } from "../lib/phases/registry.ts";

// ─── System A (canonical backend) ──────────────────────────────────────────

test("plan matrix exposes cumulative phase entitlements", () => {
  for (const [plan, expected] of [["plan_1", [true, false, false]], ["plan_2", [true, true, false]], ["plan_3", [true, true, true]]] as const) {
    for (const [index, feature] of ["members", "crm", "ai_insights"].entries()) {
      assert.equal(evaluateFeature({ plan, status: "active", featureKey: feature }).allowed, expected[index]);
    }
  }
});

test("accounting is phase_2 — locked on Essential, available on Growth and Scale", () => {
  assert.equal(evaluateFeature({ plan: "plan_1", status: "active", featureKey: "accounting" }).allowed, false, "accounting locked on Essential");
  assert.equal(evaluateFeature({ plan: "plan_1", status: "active", featureKey: "advanced_accounting" }).allowed, false, "advanced_accounting locked on Essential");
  assert.equal(evaluateFeature({ plan: "plan_2", status: "active", featureKey: "accounting" }).allowed, true, "accounting available on Growth");
  assert.equal(evaluateFeature({ plan: "plan_2", status: "active", featureKey: "advanced_accounting" }).allowed, true, "advanced_accounting available on Growth");
  assert.equal(evaluateFeature({ plan: "plan_3", status: "active", featureKey: "accounting" }).allowed, true, "accounting available on Scale");
  assert.equal(evaluateFeature({ plan: "professional", status: "active", featureKey: "accounting" }).allowed, true, "professional (Growth) has accounting");
  assert.equal(evaluateFeature({ plan: "trial", status: "active", featureKey: "accounting" }).allowed, false, "trial (Essential) locked from accounting");
  assert.equal(evaluateFeature({ plan: "standard", status: "active", featureKey: "accounting" }).allowed, false, "standard (Essential) locked from accounting");
});

test("Essential phase_1 features are available on all plans", () => {
  const essentialKeys = ["members", "membership", "payments", "pending_payments", "expiry", "attendance", "staff", "reports", "equipment"] as const;
  for (const key of essentialKeys) {
    assert.equal(evaluateFeature({ plan: "plan_1", status: "active", featureKey: key }).allowed, true, `${key} must be available on Essential`);
    assert.equal(evaluateFeature({ plan: "plan_2", status: "active", featureKey: key }).allowed, true, `${key} must be available on Growth`);
    assert.equal(evaluateFeature({ plan: "plan_3", status: "active", featureKey: key }).allowed, true, `${key} must be available on Scale`);
  }
});

test("Growth phase_2 features are locked on Essential, available on Growth and Scale", () => {
  const growthKeys = ["crm", "finance", "pt", "biometric", "smart_alerts", "advanced_reports", "gst", "whatsapp"] as const;
  for (const key of growthKeys) {
    assert.equal(evaluateFeature({ plan: "plan_1", status: "active", featureKey: key }).allowed, false, `${key} must be locked on Essential`);
    assert.equal(evaluateFeature({ plan: "plan_2", status: "active", featureKey: key }).allowed, true, `${key} must be available on Growth`);
    assert.equal(evaluateFeature({ plan: "plan_3", status: "active", featureKey: key }).allowed, true, `${key} must be available on Scale`);
  }
});

test("Scale phase_3 features are locked on Essential and Growth, available on Scale", () => {
  const scaleKeys = ["multi_branch", "enterprise_rbac", "advanced_automation", "ai_insights", "api_webhooks"] as const;
  for (const key of scaleKeys) {
    assert.equal(evaluateFeature({ plan: "plan_1", status: "active", featureKey: key }).allowed, false, `${key} must be locked on Essential`);
    assert.equal(evaluateFeature({ plan: "plan_2", status: "active", featureKey: key }).allowed, false, `${key} must be locked on Growth`);
    assert.equal(evaluateFeature({ plan: "plan_3", status: "active", featureKey: key }).allowed, true, `${key} must be available on Scale`);
  }
});

test("finance features are phase_2 — locked on Essential, available on Growth", () => {
  assert.equal(evaluateFeature({ plan: "plan_1", status: "active", featureKey: "finance" }).allowed, false);
  assert.equal(evaluateFeature({ plan: "plan_2", status: "active", featureKey: "finance" }).allowed, true);
  assert.equal(evaluateFeature({ plan: "plan_1", status: "active", featureKey: "gst" }).allowed, false);
  assert.equal(evaluateFeature({ plan: "plan_2", status: "active", featureKey: "gst" }).allowed, true);
});

test("unknown, missing, inactive and role-restricted access is denied", () => {
  assert.equal(evaluateFeature({ plan: "plan_3", featureKey: "unknown" }).allowed, false);
  assert.equal(evaluateFeature({ plan: null, featureKey: "members" }).unavailable, true);
  assert.equal(evaluateFeature({ plan: "plan_3", status: "cancelled", featureKey: "members" }).allowed, false);
  assert.equal(evaluateFeature({ plan: "plan_3", featureKey: "members", roleAllowed: false }).allowed, false);
  assert.equal(evaluateFeature({ plan: "plan_1", featureKey: "crm", override: true }).allowed, false);
  assert.equal(evaluateFeature({ plan: "plan_2", featureKey: "crm", override: false }).allowed, false);
});

test("product plan assignment preserves the existing tenant.plan storage model", () => {
  assert.equal(storedPlanForProduct("plan_1"), "trial");
  assert.equal(storedPlanForProduct("plan_2"), "professional");
  assert.equal(storedPlanForProduct("plan_3"), "enterprise");
  assert.deepEqual(Object.keys({ plan: storedPlanForProduct("plan_2") }), ["plan"]);
});

// ─── System B (sidebar phase registry) ──────────────────────────────────────

test("System B: Essential nav features are PHASE_1 (sidebar will not lock them for Essential)", () => {
  const mustBePhase1 = ["attendance", "payments", "reports", "notifications", "equipment"] as const;
  for (const key of mustBePhase1) {
    const def = PHASE_REGISTRY[key];
    assert.ok(def, `${key} must exist in System B registry`);
    assert.equal(def.phase, "PHASE_1", `${key} must be PHASE_1 in System B (Essential sidebar nav)`);
  }
});

test("System B: Growth nav features are PHASE_2 (sidebar locks them for Essential)", () => {
  const mustBePhase2 = ["finance", "accounting", "crm", "pt", "biometric", "trainers", "workouts", "diet_plans", "progress", "advanced_reports"] as const;
  for (const key of mustBePhase2) {
    const def = PHASE_REGISTRY[key];
    assert.ok(def, `${key} must exist in System B registry`);
    assert.equal(def.phase, "PHASE_2", `${key} must be PHASE_2 in System B (Growth sidebar nav)`);
  }
});

test("System B: always-available base nav features are PHASE_1", () => {
  const mustBePhase1 = ["dashboard", "members", "memberships", "subscriptions", "member_portal"] as const;
  for (const key of mustBePhase1) {
    const def = PHASE_REGISTRY[key];
    assert.ok(def, `${key} must exist in System B registry`);
    assert.equal(def.phase, "PHASE_1", `${key} must be PHASE_1 in System B`);
  }
});
