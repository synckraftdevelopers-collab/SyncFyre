import test from "node:test";
import assert from "node:assert/strict";
import { calculateGstBreakdown, resolveGstKind } from "../lib/finance/gst.ts";

test("GST is split equally for intra-state exclusive pricing", () => {
  const result = calculateGstBreakdown({ grossAmount: 3000, gstRate: 18, pricingMode: "exclusive", gymState: "Karnataka", customerState: "karnataka" });
  assert.deepEqual(result, {
    pricingMode: "exclusive", gstKind: "intra", gstApplicable: true, gstRate: 18,
    taxableAmount: 3000, cgstRate: 9, sgstRate: 9, igstRate: 0,
    cgstAmount: 270, sgstAmount: 270, igstAmount: 0, gstAmount: 540, grandTotal: 3540,
  });
});

test("GST uses IGST for inter-state pricing", () => {
  const result = calculateGstBreakdown({ grossAmount: 3000, gstRate: 18, pricingMode: "exclusive", gymState: "Karnataka", customerState: "Maharashtra" });
  assert.equal(result.gstKind, "inter");
  assert.equal(result.igstAmount, 540);
  assert.equal(result.cgstAmount, 0);
  assert.equal(result.grandTotal, 3540);
});

test("inclusive pricing preserves the grand total", () => {
  const result = calculateGstBreakdown({ grossAmount: 3540, gstRate: 18, pricingMode: "inclusive", gymState: "Karnataka", customerState: "Karnataka" });
  assert.equal(result.taxableAmount, 3000);
  assert.equal(result.gstAmount, 540);
  assert.equal(result.grandTotal, 3540);
});

test("zero GST produces a payment total with no tax components", () => {
  const result = calculateGstBreakdown({ grossAmount: 3000, gstRate: 0, pricingMode: "exclusive", gymState: null, customerState: null });
  assert.equal(result.gstApplicable, false);
  assert.equal(result.grandTotal, 3000);
  assert.equal(result.gstAmount, 0);
});

test("state comparison is case-insensitive and defaults missing states to intra-state", () => {
  assert.equal(resolveGstKind(" Karnataka ", "karnataka"), "intra");
  assert.equal(resolveGstKind(null, "Karnataka"), "intra");
});