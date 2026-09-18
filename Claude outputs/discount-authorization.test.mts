import test from "node:test";
import assert from "node:assert/strict";
import { checkDiscountAuthorization, DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT } from "../lib/finance/discount-authorization.ts";

test("threshold constant is 20%, matching the confirmed product decision", () => {
  assert.equal(DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT, 20);
});

test("reception applying a discount at or below the threshold is always allowed", () => {
  const atThreshold = checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: 2000, performedByRole: "reception" });
  assert.equal(atThreshold.allowed, true);
  assert.equal(atThreshold.manualDiscountPercent, 20);

  const belowThreshold = checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: 500, performedByRole: "reception" });
  assert.equal(belowThreshold.allowed, true);
});

test("reception applying a discount above the threshold is blocked with a clear reason", () => {
  const result = checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: 2500, performedByRole: "reception" });
  assert.equal(result.allowed, false);
  assert.equal(result.manualDiscountPercent, 25);
  assert.match(result.reason ?? "", /20%/);
  assert.match(result.reason ?? "", /owner, admin, or manager/);
});

test("an admin/manager/owner performing the sale themselves is never blocked, any amount", () => {
  for (const role of ["admin", "manager", "owner", "super_admin"]) {
    const result = checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: 9000, performedByRole: role });
    assert.equal(result.allowed, true, `role ${role} should self-authorize`);
  }
});

test("trainer/dietician/other non-authorizing roles are blocked above the threshold, same as reception", () => {
  const result = checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: 3000, performedByRole: "trainer" });
  assert.equal(result.allowed, false);
});

test("a null/undefined performer role above the threshold is blocked, not silently allowed", () => {
  assert.equal(checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: 3000, performedByRole: null }).allowed, false);
  assert.equal(checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: 3000, performedByRole: undefined }).allowed, false);
});

test("zero or negative manual discount never requires authorization", () => {
  assert.equal(checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: 0, performedByRole: "reception" }).allowed, true);
  assert.equal(checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: -50, performedByRole: "reception" }).allowed, true);
});

test("zero list price never divides by zero and never requires authorization", () => {
  const result = checkDiscountAuthorization({ listPrice: 0, manualDiscountAmount: 500, performedByRole: "reception" });
  assert.equal(result.allowed, true);
  assert.equal(result.manualDiscountPercent, 0);
});

test("exactly at the boundary (20.00%) is allowed; a hair over it is not", () => {
  assert.equal(checkDiscountAuthorization({ listPrice: 1000, manualDiscountAmount: 200, performedByRole: "reception" }).allowed, true);
  assert.equal(checkDiscountAuthorization({ listPrice: 1000, manualDiscountAmount: 200.01, performedByRole: "reception" }).allowed, false);
});
