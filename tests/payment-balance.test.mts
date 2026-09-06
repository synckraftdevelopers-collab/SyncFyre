import test from "node:test";
import assert from "node:assert/strict";
import { calculatePaymentBalance } from "../lib/finance/payment-balance.ts";

test("pending payment keeps the entire invoice balance", () => {
  assert.deepEqual(calculatePaymentBalance(3000, 0), { totalAmount: 3000, amountPaid: 0, pendingAmount: 3000, status: "pending", isOverpaid: false });
});

test("partial payment preserves Total = Paid + Pending", () => {
  const result = calculatePaymentBalance(3000, 1250);
  assert.equal(result.status, "partial");
  assert.equal(result.pendingAmount, 1750);
  assert.equal(result.totalAmount, result.amountPaid + result.pendingAmount);
});

test("full payment has no pending balance", () => {
  assert.deepEqual(calculatePaymentBalance(3000, 3000), { totalAmount: 3000, amountPaid: 3000, pendingAmount: 0, status: "completed", isOverpaid: false });
});

test("overpayment is explicit and never produces a negative pending balance", () => {
  const result = calculatePaymentBalance(3000, 3000.01);
  assert.equal(result.status, "overpaid");
  assert.equal(result.isOverpaid, true);
  assert.equal(result.pendingAmount, 0);
});

test("money values are rounded to two decimal places", () => {
  const result = calculatePaymentBalance(100.005, 33.335);
  assert.equal(result.totalAmount, 100.01);
  assert.equal(result.amountPaid, 33.34);
  assert.equal(result.pendingAmount, 66.67);
});