import test from "node:test";
import assert from "node:assert/strict";
import { checkDiscountAuthorization, DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT, AUTHORIZING_ROLES } from "../lib/finance/discount-authorization.ts";

test("a discretionary discount at or below the threshold is always allowed, any role", () => {
  const result = checkDiscountAuthorization({ listPrice: 1000, manualDiscountAmount: 200, performedByRole: "reception" });
  assert.equal(result.manualDiscountPercent, 20);
  assert.equal(result.allowed, true);
  assert.equal(result.reason, null);
});

test("exactly at the 20.00% boundary is allowed for an unauthorized role", () => {
  const result = checkDiscountAuthorization({ listPrice: 2000, manualDiscountAmount: 400, performedByRole: "trainer" });
  assert.equal(result.manualDiscountPercent, 20);
  assert.equal(result.allowed, true);
});

test("just above the boundary (20.01%) is blocked for an unauthorized role", () => {
  const result = checkDiscountAuthorization({ listPrice: 10000, manualDiscountAmount: 2001, performedByRole: "reception" });
  assert.equal(Math.round(result.manualDiscountPercent * 100) / 100, 20.01);
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /20\.01%/);
});

test("above the threshold, each authorizing role is allowed", () => {
  for (const role of AUTHORIZING_ROLES) {
    const result = checkDiscountAuthorization({ listPrice: 1000, manualDiscountAmount: 500, performedByRole: role });
    assert.equal(result.allowed, true, `expected role "${role}" to be authorized`);
  }
});

test("above the threshold, a non-authorizing role is blocked", () => {
  for (const role of ["reception", "trainer", "dietician", "member"]) {
    const result = checkDiscountAuthorization({ listPrice: 1000, manualDiscountAmount: 500, performedByRole: role });
    assert.equal(result.allowed, false, `expected role "${role}" to be blocked`);
  }
});

test("a null or undefined role above the threshold is blocked, not authorized by default", () => {
  assert.equal(checkDiscountAuthorization({ listPrice: 1000, manualDiscountAmount: 500, performedByRole: null }).allowed, false);
  assert.equal(checkDiscountAuthorization({ listPrice: 1000, manualDiscountAmount: 500, performedByRole: undefined }).allowed, false);
});

test("zero or negative manual discount never blocks, regardless of role", () => {
  assert.equal(checkDiscountAuthorization({ listPrice: 1000, manualDiscountAmount: 0, performedByRole: "reception" }).allowed, true);
  assert.equal(checkDiscountAuthorization({ listPrice: 1000, manualDiscountAmount: -50, performedByRole: "reception" }).allowed, true);
});

test("zero or negative list price never blocks (never divides by zero)", () => {
  const zero = checkDiscountAuthorization({ listPrice: 0, manualDiscountAmount: 500, performedByRole: "reception" });
  assert.equal(zero.manualDiscountPercent, 0);
  assert.equal(zero.allowed, true);

  const negative = checkDiscountAuthorization({ listPrice: -100, manualDiscountAmount: 500, performedByRole: "reception" });
  assert.equal(negative.manualDiscountPercent, 0);
  assert.equal(negative.allowed, true);
});

test("DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT is the documented 20", () => {
  assert.equal(DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT, 20);
});
