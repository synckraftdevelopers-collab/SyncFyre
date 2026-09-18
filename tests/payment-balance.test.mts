import test from "node:test";
import assert from "node:assert/strict";
import { calculatePaymentBalance, computeReceivableDisplayStatus } from "../lib/finance/payment-balance.ts";

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

// ─── computeReceivableDisplayStatus ─────────────────────────────────────────
// Test cases A-E from the Outstanding Dues real-time implementation spec
// (docs/OUTSTANDING_DUES_REALTIME_IMPLEMENTATION.md). "today" is fixed at
// 2026-09-18 for every case; due dates are expressed relative to it so the
// tests never go stale.

const TODAY = "2026-09-18";
const YESTERDAY = "2026-09-17";
const TOMORROW = "2026-09-19";

test("A. partial payment + future due date -> pending", () => {
  // Original 10,000, Paid 5,000, Balance 5,000, due tomorrow.
  const status = computeReceivableDisplayStatus(5000, TOMORROW, "partial", TODAY);
  assert.equal(status, "pending");
});

test("B. partial payment + past due date -> overdue", () => {
  // Original 10,000, Paid 5,000, Balance 5,000, due yesterday. The stored
  // status is still "partial" (never rewritten by the passage of time) but
  // the computed status must be "overdue" regardless.
  const status = computeReceivableDisplayStatus(5000, YESTERDAY, "partial", TODAY);
  assert.equal(status, "overdue");
});

test("C. unpaid + past due date -> overdue", () => {
  // Original 10,000, Paid 0, Balance 10,000, due yesterday.
  const status = computeReceivableDisplayStatus(10000, YESTERDAY, "pending", TODAY);
  assert.equal(status, "overdue");
});

test("D. fully paid -> paid, never outstanding, regardless of due date or stored status", () => {
  assert.equal(computeReceivableDisplayStatus(0, YESTERDAY, "partial", TODAY), "paid");
  assert.equal(computeReceivableDisplayStatus(0, TOMORROW, "pending", TODAY), "paid");
});

test("E. a stored status of 'overdue' that has since been paid off is still 'paid' (balance is authoritative, not the stored status)", () => {
  const status = computeReceivableDisplayStatus(0, YESTERDAY, "overdue", TODAY);
  assert.equal(status, "paid");
});

test("a stale stored 'pending' snapshot whose due date has since passed becomes overdue purely from the date, with no write event", () => {
  // This is the exact bug being fixed: sync_receivable_from_invoice() only
  // sets status='overdue' at INSERT/UPDATE time. A row inserted as 'pending'
  // (due date in the future back then) must still be classified 'overdue'
  // once due_date < today, even though its stored column never changed.
  const status = computeReceivableDisplayStatus(4700, "2026-09-06", "pending", TODAY);
  assert.equal(status, "overdue");
});

test("due today is not yet overdue", () => {
  const status = computeReceivableDisplayStatus(1000, TODAY, "pending", TODAY);
  assert.equal(status, "pending");
});

test("no due date never counts as overdue", () => {
  const status = computeReceivableDisplayStatus(1000, null, "pending", TODAY);
  assert.equal(status, "pending");
});

test("written_off is a manual terminal state and is never re-derived, even with a balance owed and a past due date", () => {
  const status = computeReceivableDisplayStatus(5000, YESTERDAY, "written_off", TODAY);
  assert.equal(status, "written_off");
});

test("payment update walks a receivable from overdue through partial payments to paid", () => {
  // Original 16,000, Paid 10,000 -> Due 6,000, due date in the past -> overdue.
  assert.equal(computeReceivableDisplayStatus(6000, YESTERDAY, "partial", TODAY), "overdue");
  // +2,000 payment -> Due 4,000, still overdue (date hasn't changed).
  assert.equal(computeReceivableDisplayStatus(4000, YESTERDAY, "partial", TODAY), "overdue");
  // Final +4,000 payment -> Due 0 -> paid, drops out of Outstanding entirely.
  assert.equal(computeReceivableDisplayStatus(0, YESTERDAY, "partial", TODAY), "paid");
});