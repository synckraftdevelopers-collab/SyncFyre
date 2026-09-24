import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFeature, storedPlanForProduct } from "../lib/entitlements/evaluate.ts";
import { FEATURE_REGISTRY as PHASE_REGISTRY, SYSTEM_PHASE_KEYS, SYSTEM_PHASE_NUMBERS } from "../lib/phases/registry.ts";

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
  // All 8 canonical phase_3 registry keys must be explicitly covered here.
  const scaleKeys = [
    "multi_branch",
    "enterprise_rbac",
    "advanced_automation",
    "retention_intelligence",
    "revenue_intelligence",
    "advanced_crm",
    "ai_insights",
    "api_webhooks",
  ] as const;
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

// ─── System B Phase 3 ────────────────────────────────────────────────────────

test("System B: multi_branch is PHASE_3 with correct admin pathname", () => {
  const def = PHASE_REGISTRY["multi_branch"];
  assert.ok(def, "multi_branch must exist in System B registry");
  assert.equal(def.phase, "PHASE_3", "multi_branch must be PHASE_3 (not PHASE_2) in System B");
  assert.ok(def.pathnames?.includes("/admin/branches"), "multi_branch pathnames must include /admin/branches");
});

test("System B: PHASE_3 exists as a valid system phase key", () => {
  assert.ok((SYSTEM_PHASE_KEYS as readonly string[]).includes("PHASE_3"), "PHASE_3 must be in SYSTEM_PHASE_KEYS");
  assert.equal(SYSTEM_PHASE_NUMBERS["PHASE_3"], 3, "PHASE_3 must have phase_number 3");
  const allPhases = new Set(Object.values(PHASE_REGISTRY).map((def) => def.phase));
  assert.ok(allPhases.has("PHASE_3"), "PHASE_3 must appear in at least one feature entry");
});

// ─── tenant_features override (Talwalkar-style feature freeze) ───────────────
//
// These tests verify that override=false in tenant_features correctly blocks
// a Growth-plan tenant from accessing pt, whatsapp, and api_webhooks regardless
// of their commercial plan. This is the mechanism used for Talwalkar.

test("tenant_features override=false blocks pt for a Growth tenant", () => {
  // Without override: Growth (plan_2) can access pt
  assert.equal(
    evaluateFeature({ plan: "plan_2", status: "active", featureKey: "pt" }).allowed,
    true,
    "pt must be allowed on Growth without override",
  );
  // With override=false: blocked even on Growth
  assert.equal(
    evaluateFeature({ plan: "plan_2", status: "active", featureKey: "pt", override: false }).allowed,
    false,
    "pt must be blocked on Growth when tenant_features override=false",
  );
  assert.equal(
    evaluateFeature({ plan: "plan_2", status: "active", featureKey: "pt", override: false }).reason,
    "Disabled by a SuperAdmin override.",
    "reason must indicate SuperAdmin override",
  );
  // override=false also blocks on professional (legacy Growth alias)
  assert.equal(
    evaluateFeature({ plan: "professional", status: "active", featureKey: "pt", override: false }).allowed,
    false,
    "pt must be blocked for professional/Growth when override=false",
  );
});

test("tenant_features override=false blocks whatsapp for a Growth tenant", () => {
  // Without override: Growth can access whatsapp
  assert.equal(
    evaluateFeature({ plan: "plan_2", status: "active", featureKey: "whatsapp" }).allowed,
    true,
    "whatsapp must be allowed on Growth without override",
  );
  // With override=false: blocked — covers both WhatsApp Templates and
  // Communication History since they share the same feature key
  assert.equal(
    evaluateFeature({ plan: "plan_2", status: "active", featureKey: "whatsapp", override: false }).allowed,
    false,
    "whatsapp must be blocked on Growth when tenant_features override=false",
  );
  assert.equal(
    evaluateFeature({ plan: "professional", status: "active", featureKey: "whatsapp", override: false }).allowed,
    false,
    "whatsapp must be blocked for professional/Growth when override=false",
  );
});

test("tenant_features override=false blocks api_webhooks (already Scale-only)", () => {
  // api_webhooks is already locked on Growth by plan; override=false adds an
  // explicit DB record that makes the block visible in audit logs
  assert.equal(
    evaluateFeature({ plan: "plan_2", status: "active", featureKey: "api_webhooks" }).allowed,
    false,
    "api_webhooks must already be locked on Growth by plan",
  );
  assert.equal(
    evaluateFeature({ plan: "plan_2", status: "active", featureKey: "api_webhooks", override: false }).allowed,
    false,
    "api_webhooks must remain blocked on Growth when override=false",
  );
  // Confirm it IS allowed on Scale without override
  assert.equal(
    evaluateFeature({ plan: "plan_3", status: "active", featureKey: "api_webhooks" }).allowed,
    true,
    "api_webhooks must be allowed on Scale without override",
  );
  // And blocked again when overridden even on Scale
  assert.equal(
    evaluateFeature({ plan: "plan_3", status: "active", featureKey: "api_webhooks", override: false }).allowed,
    false,
    "api_webhooks must be blocked even on Scale when override=false",
  );
});

test("override=true cannot unlock a feature that the plan does not include", () => {
  // Verified by the existing test suite, but restated here for the freeze
  // scenario: a Growth tenant cannot be given api_webhooks via override=true
  assert.equal(
    evaluateFeature({ plan: "plan_2", status: "active", featureKey: "api_webhooks", override: true }).allowed,
    false,
    "override=true cannot grant api_webhooks to a Growth plan tenant",
  );
});

// ─── System B: api_webhooks is PHASE_3 (Developer hidden for Growth) ─────────

test("System B: api_webhooks is PHASE_3 so Developer nav is hidden for Growth tenants", () => {
  const def = PHASE_REGISTRY["api_webhooks"];
  assert.ok(def, "api_webhooks must exist in System B registry");
  assert.equal(
    def.phase,
    "PHASE_3",
    "api_webhooks must be PHASE_3 in System B so the Developer sidebar item is hidden (not just locked) for Growth tenants",
  );
  assert.ok(
    def.pathnames?.includes("/admin/developer"),
    "api_webhooks System B entry must include /admin/developer pathname",
  );
});
