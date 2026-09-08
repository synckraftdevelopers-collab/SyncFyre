import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFeature, storedPlanForProduct } from "../lib/entitlements/evaluate.ts";

test("plan matrix exposes cumulative phase entitlements", () => {
  for (const [plan, expected] of [["plan_1", [true, false, false]], ["plan_2", [true, true, false]], ["plan_3", [true, true, true]]] as const) {
    for (const [index, feature] of ["members", "crm", "ai_insights"].entries()) {
      assert.equal(evaluateFeature({ plan, status: "active", featureKey: feature }).allowed, expected[index]);
    }
  }
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