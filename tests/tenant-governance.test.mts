import test from "node:test";
import assert from "node:assert/strict";
import { assertDemoOperationAllowed, buildClassificationPatch, canManageTenantClassification, canRunDemoOperation, isDemoTenant, isProtectedTenant, normalizeTenantGovernance } from "../lib/tenants/governance.ts";


const demo = { tenant_type: "demo", is_demo: true, is_protected: true, purpose: "CLIENT DEMONSTRATION" };
const protectedCustomer = { tenant_type: "customer", is_demo: false, is_protected: true };
const customer = { tenant_type: "customer", is_demo: false, is_protected: false };

test("only an explicitly protected demo is eligible for demo operations", () => {
  assert.equal(isDemoTenant(demo), true);
  assert.equal(isProtectedTenant(demo), true);
  assert.equal(canRunDemoOperation(demo), true);
  assert.equal(canRunDemoOperation(protectedCustomer), false);
  assert.equal(canRunDemoOperation(customer), false);
});

test("demo operations reject normal and protected customer tenants", () => {
  assert.doesNotThrow(() => assertDemoOperationAllowed(demo, "reset"));
  assert.throws(() => assertDemoOperationAllowed(customer, "reset"), /not a protected Demo tenant/);
  assert.throws(() => assertDemoOperationAllowed(protectedCustomer, "reset"), /not a protected Demo tenant/);
});

test("tenant admins cannot manage SaaS classification", () => {
  assert.equal(canManageTenantClassification("super_admin"), true);
  for (const role of ["owner", "admin", "manager", "reception", "member", null]) assert.equal(canManageTenantClassification(role), false);
});

test("normalization never infers privileged status from a name or purpose", () => {
  assert.deepEqual(normalizeTenantGovernance({ tenant_type: "customer", is_demo: false, is_protected: true, purpose: "Demo Gym" }), { tenant_type: "customer", is_demo: false, is_protected: true, purpose: "Demo Gym" });
  assert.equal(normalizeTenantGovernance({ tenant_type: "demo", is_demo: true, is_protected: false }).is_protected, false);
});
test("classification patch is narrow and coherent", () => {
  assert.deepEqual(buildClassificationPatch({ tenantType: "demo", isDemo: true, isProtected: true }), { tenant_type: "demo", is_demo: true, is_protected: true });
  assert.deepEqual(buildClassificationPatch({ tenantType: "customer", isDemo: false }), { tenant_type: "customer", is_demo: false });
  assert.throws(() => buildClassificationPatch({ tenantType: "demo", isDemo: false }), /is_demo=true/);
  assert.throws(() => buildClassificationPatch({ tenantType: "customer", isDemo: true }), /is_demo=false/);
  const keys = Object.keys(buildClassificationPatch({ tenantType: "demo", isDemo: true, isProtected: true }));
  assert.deepEqual(keys.sort(), ["is_demo", "is_protected", "tenant_type"]);
});