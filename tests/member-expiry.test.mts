import test from "node:test";
import assert from "node:assert/strict";
import { isExpiredByDate, buildExpiredOrFilter } from "../lib/subscription-expiry.ts";

// ─── isExpiredByDate — canonical, date-aware expiry classification ─────────
//
// Test cases 1-5 from the Member Expiry real-time implementation request
// (docs/MEMBER_EXPIRY_REALTIME_IMPLEMENTATION.md). "today" is fixed at
// 2026-09-18 so the tests never go stale.

const TODAY = "2026-09-18";
const YESTERDAY = "2026-09-17";
const TOMORROW = "2026-09-19";
const THIRTY_DAYS_AGO = "2026-08-19";

test("Case 1: end_date = yesterday, status = active -> expired", () => {
  assert.equal(isExpiredByDate("active", YESTERDAY, TODAY), true);
});

test("Case 2: end_date = yesterday, status = expired -> expired", () => {
  assert.equal(isExpiredByDate("expired", YESTERDAY, TODAY), true);
});

test("Case 3: end_date = today, status = active -> NOT expired", () => {
  assert.equal(isExpiredByDate("active", TODAY, TODAY), false);
});

test("Case 4: end_date = tomorrow, status = active -> NOT expired", () => {
  assert.equal(isExpiredByDate("active", TOMORROW, TODAY), false);
});

test("Case 5: end_date = 30 days ago, status = active -> expired", () => {
  assert.equal(isExpiredByDate("active", THIRTY_DAYS_AGO, TODAY), true);
});

test("stored status = expired counts regardless of end_date (including future, e.g. a manual correction)", () => {
  assert.equal(isExpiredByDate("expired", TOMORROW, TODAY), true);
  assert.equal(isExpiredByDate("expired", null, TODAY), true);
});

test("paused/pending/cancelled with a past end_date are left exactly as before (not redefined as expired)", () => {
  // This task is scoped to the active-but-date-expired gap only, per the
  // request's "Preserve all existing functionality" constraint — it does not
  // redefine what "expired" means for every other status.
  assert.equal(isExpiredByDate("paused", YESTERDAY, TODAY), false);
  assert.equal(isExpiredByDate("pending", YESTERDAY, TODAY), false);
  assert.equal(isExpiredByDate("cancelled", YESTERDAY, TODAY), false);
});

test("active with no end_date is never expired", () => {
  assert.equal(isExpiredByDate("active", null, TODAY), false);
  assert.equal(isExpiredByDate("active", undefined, TODAY), false);
});

test("null/undefined status is never expired on its own", () => {
  assert.equal(isExpiredByDate(null, YESTERDAY, TODAY), false);
  assert.equal(isExpiredByDate(undefined, YESTERDAY, TODAY), false);
});

// ─── buildExpiredOrFilter — the exact PostgREST filter string ──────────────

test("buildExpiredOrFilter produces the exact PostgREST OR-group syntax used by every call site", () => {
  assert.equal(
    buildExpiredOrFilter("status", "end_date", TODAY),
    "status.eq.expired,and(status.eq.active,end_date.lt.2026-09-18)",
  );
});

test("buildExpiredOrFilter is parameterized by column names (subscriptions vs. member_register_view)", () => {
  assert.equal(
    buildExpiredOrFilter("subscription_status", "subscription_end", TODAY),
    "subscription_status.eq.expired,and(subscription_status.eq.active,subscription_end.lt.2026-09-18)",
  );
});

// ─── Case 6 / 7 — tenant and branch isolation preserved ─────────────────────
//
// The expired-filter fix only changes *which subscriptions count as expired*
// (the status/end_date dimension). It does not touch — and must not bypass —
// the existing branch_id/tenant scoping, which is applied as a completely
// separate .eq(branch_id, ...) filter ANDed alongside the new .or(...) clause
// in every call site (app/(admin)/admin/subscriptions/page.tsx,
// app/(admin)/admin/members/page.tsx, services/member-extended.service.ts,
// services/dashboard.service.ts). These tests simulate exactly that
// combination — "matches branch/tenant" AND isExpiredByDate() — over a small
// multi-tenant, multi-branch dataset, mirroring what
// `.eq("branch_id", x).or(buildExpiredOrFilter(...))` produces in Postgres.

type FakeSubscription = {
  id: string;
  tenant_id: string;
  branch_id: string;
  status: string;
  end_date: string;
};

const DATASET: FakeSubscription[] = [
  { id: "t1-b1-active-past",    tenant_id: "tenant-1", branch_id: "branch-1", status: "active",    end_date: YESTERDAY },
  { id: "t1-b1-expired-past",   tenant_id: "tenant-1", branch_id: "branch-1", status: "expired",   end_date: YESTERDAY },
  { id: "t1-b1-active-future",  tenant_id: "tenant-1", branch_id: "branch-1", status: "active",    end_date: TOMORROW },
  { id: "t1-b2-active-past",    tenant_id: "tenant-1", branch_id: "branch-2", status: "active",    end_date: YESTERDAY },
  { id: "t2-b3-active-past",    tenant_id: "tenant-2", branch_id: "branch-3", status: "active",    end_date: YESTERDAY },
  { id: "t2-b3-active-future",  tenant_id: "tenant-2", branch_id: "branch-3", status: "active",    end_date: TOMORROW },
];

function expiredForBranch(branchId: string, today: string) {
  return DATASET.filter(
    (row) => row.branch_id === branchId && isExpiredByDate(row.status, row.end_date, today),
  ).map((row) => row.id);
}

function expiredForTenant(tenantId: string, today: string) {
  return DATASET.filter(
    (row) => row.tenant_id === tenantId && isExpiredByDate(row.status, row.end_date, today),
  ).map((row) => row.id);
}

test("Case 7: branch isolation — branch-1's expired filter never leaks branch-2/branch-3 rows", () => {
  const result = expiredForBranch("branch-1", TODAY);
  assert.deepEqual(new Set(result), new Set(["t1-b1-active-past", "t1-b1-expired-past"]));
  assert.ok(!result.includes("t1-b2-active-past"), "branch-2's row must not appear under branch-1's filter");
  assert.ok(!result.includes("t2-b3-active-past"), "branch-3's row must not appear under branch-1's filter");
});

test("Case 6: tenant isolation — tenant-1's expired rows never leak into tenant-2's view", () => {
  const tenant1Result = expiredForTenant("tenant-1", TODAY);
  const tenant2Result = expiredForTenant("tenant-2", TODAY);
  assert.deepEqual(new Set(tenant1Result), new Set(["t1-b1-active-past", "t1-b1-expired-past", "t1-b2-active-past"]));
  assert.deepEqual(new Set(tenant2Result), new Set(["t2-b3-active-past"]));
  for (const id of tenant1Result) assert.ok(!tenant2Result.includes(id), `${id} leaked from tenant-1 into tenant-2`);
});

// ─── Dashboard expiredMemberships KPI — active-but-past-end_date counted ────

test("dashboard expired count: an active-but-past-end_date subscription is counted", () => {
  const expiredIds = DATASET.filter((row) => isExpiredByDate(row.status, row.end_date, TODAY)).map((r) => r.id);
  assert.ok(expiredIds.includes("t1-b1-active-past"), "active subscription with a past end_date must be counted as expired");
});

test("dashboard expired count: a future active subscription is not counted", () => {
  const expiredIds = DATASET.filter((row) => isExpiredByDate(row.status, row.end_date, TODAY)).map((r) => r.id);
  assert.ok(!expiredIds.includes("t1-b1-active-future"), "a future active subscription must not be counted as expired");
  assert.ok(!expiredIds.includes("t2-b3-active-future"), "a future active subscription must not be counted as expired");
});

// ─── /admin/members sub_status=expired filter ───────────────────────────────

test("member expired filter: an active member whose subscription_end is in the past appears", () => {
  assert.equal(isExpiredByDate("active", YESTERDAY, TODAY), true);
});

test("member expired filter: an active member with a future subscription_end does not appear", () => {
  assert.equal(isExpiredByDate("active", TOMORROW, TODAY), false);
});
