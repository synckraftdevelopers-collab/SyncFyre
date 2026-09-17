/**
 * report.service.ts
 *
 * Reusable server-side service for all 9 report views created in
 * migration 0002_report_views.sql.
 *
 * Every function:
 *  - Uses the SSR Supabase client so RLS is enforced automatically.
 *  - Accepts a branchId filter (null = admin sees all branches).
 *  - Returns { data, total, page, pageSize, totalPages } for list
 *    functions, or the raw array / summary for aggregate helpers.
 *  - Throws a plain Error on Supabase errors so callers can try/catch.
 *
 * REST equivalents are documented in each function's JSDoc.
 */

import { createClient } from "@/lib/supabase/server";
import type { PaginatedResult } from "@/types";
import type {
  MemberRegisterRow,
  AttendanceReportRow,
  PaymentReportRow,
  MembershipReportRow,
  TrainerReportRow,
  SubscriptionReportRow,
  RevenueReportRow,
  PendingPaymentRow,
  MonthlyJoiningRow,
  MonthlyJoiningSummary,
  MonthlyRevenueSummary,
  AttendanceReportParams,
  PaymentReportParams,
  RevenueReportParams,
  MembershipReportParams,
  PendingPaymentParams,
  MonthlyJoiningParams,
  ReportParams,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Throw if Supabase returns an error object. */
function assertNoError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`[report.service] ${context}: ${error.message}`);
}

/** Compute pagination slice. */
function pageRange(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

// ─── 1. Members Report ────────────────────────────────────────────────────────

/**
 * Full member roster with branch, trainer, and latest subscription.
 *
 * REST equivalent:
 *   const { data } = await supabase
 *     .from("member_register_view")
 *     .select("*")
 *     .eq("branch_id", branchId)         // optional
 *     .eq("member_status", "active")     // optional
 *     .ilike("full_name", "%search%")    // optional
 *     .order("joined_date", { ascending: false })
 *     .range(0, 19);
 */
export async function getMembersReport(
  params: ReportParams & {
    status?: "active" | "inactive" | "all";
    search?: string;
  } = {}
): Promise<PaginatedResult<MemberRegisterRow>> {
  const { branchId, page = 1, pageSize = 50, status, search } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);

  let query = supabase
    .from("member_register_view")
    .select("*", { count: "exact" });

  if (branchId)                     query = query.eq("branch_id", branchId);
  if (status && status !== "all")   query = query.eq("member_status", status);
  if (search) {
    const s = search.replace(/[%_]/g, "");
    query = query.or(
      `full_name.ilike.%${s}%,member_code.ilike.%${s}%,phone.ilike.%${s}%`
    );
  }

  const { data, count, error } = await query
    .order("joined_date", { ascending: false })
    .range(from, to);

  assertNoError(error, "getMembersReport");
  const total = count ?? 0;
  return {
    data: (data ?? []) as MemberRegisterRow[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── 2. Attendance Report ────────────────────────────────────────────────────

/**
 * Daily attendance log filtered by date range (defaults to current month).
 *
 * REST equivalent:
 *   const { data } = await supabase
 *     .from("attendance_report_view")
 *     .select("*")
 *     .eq("branch_id", branchId)
 *     .gte("attendance_date", dateFrom)
 *     .lte("attendance_date", dateTo)
 *     .order("attendance_date", { ascending: false });
 */
export async function getAttendanceReport(
  params: AttendanceReportParams = {}
): Promise<PaginatedResult<AttendanceReportRow>> {
  const {
    branchId,
    page = 1,
    pageSize = 100,
    memberId,
    dateFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    dateTo = new Date().toISOString().slice(0, 10),
  } = params;

  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);

  let query = supabase
    .from("attendance_report_view")
    .select("*", { count: "exact" })
    .gte("attendance_date", dateFrom)
    .lte("attendance_date", dateTo);

  if (branchId)  query = query.eq("branch_id", branchId);
  if (memberId)  query = query.eq("member_id", memberId);

  const { data, count, error } = await query
    .order("attendance_date", { ascending: false })
    .order("full_name",        { ascending: true })
    .range(from, to);

  assertNoError(error, "getAttendanceReport");
  const total = count ?? 0;
  return {
    data: (data ?? []) as AttendanceReportRow[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── 3. Payments Report ───────────────────────────────────────────────────────

/**
 * All payment transactions with member, invoice, plan, and collector details.
 *
 * REST equivalent:
 *   const { data } = await supabase
 *     .from("payment_report_view")
 *     .select("*")
 *     .eq("branch_id", branchId)
 *     .eq("payment_status", "completed")
 *     .gte("payment_date", dateFrom)
 *     .lte("payment_date", dateTo)
 *     .order("payment_date", { ascending: false });
 */
export async function getPaymentsReport(
  params: PaymentReportParams = {}
): Promise<PaginatedResult<PaymentReportRow>> {
  const {
    branchId,
    page = 1,
    pageSize = 50,
    status,
    method,
    dateFrom,
    dateTo,
  } = params;

  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);

  let query = supabase
    .from("payment_report_view")
    .select("*", { count: "exact" });

  if (branchId)                   query = query.eq("branch_id", branchId);
  if (status && status !== "all") query = query.eq("payment_status", status);
  if (method && method !== "all") query = query.eq("payment_method", method);
  if (dateFrom)                   query = query.gte("payment_date", dateFrom);
  if (dateTo)                     query = query.lte("payment_date", dateTo);

  const { data, count, error } = await query
    .order("payment_date", { ascending: false })
    .range(from, to);

  assertNoError(error, "getPaymentsReport");
  const total = count ?? 0;
  return {
    data: (data ?? []) as PaymentReportRow[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── 4. Membership Report ────────────────────────────────────────────────────

/**
 * Every subscription with financials, plan details, and renewal history.
 *
 * REST equivalent:
 *   const { data } = await supabase
 *     .from("membership_report_view")
 *     .select("*")
 *     .eq("branch_id", branchId)
 *     .eq("subscription_status", "active")
 *     .order("end_date", { ascending: true });
 */
export async function getMembershipReport(
  params: MembershipReportParams = {}
): Promise<PaginatedResult<MembershipReportRow>> {
  const { branchId, page = 1, pageSize = 50, status } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);

  let query = supabase
    .from("membership_report_view")
    .select("*", { count: "exact" });

  if (branchId)                   query = query.eq("branch_id", branchId);
  if (status && status !== "all") query = query.eq("subscription_status", status);

  const { data, count, error } = await query
    .order("end_date",   { ascending: true })
    .order("full_name",  { ascending: true })
    .range(from, to);

  assertNoError(error, "getMembershipReport");
  const total = count ?? 0;
  return {
    data: (data ?? []) as MembershipReportRow[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── 5. Trainer Report ────────────────────────────────────────────────────────

/**
 * Trainer roster with assigned member counts, workouts, and appointments.
 *
 * REST equivalent:
 *   const { data } = await supabase
 *     .from("trainer_report_view")
 *     .select("*")
 *     .eq("branch_id", branchId)
 *     .eq("trainer_status", "active")
 *     .order("trainer_name");
 */
export async function getTrainerReport(
  params: ReportParams & { status?: "active" | "inactive" | "all" } = {}
): Promise<TrainerReportRow[]> {
  const { branchId, status } = params;
  const supabase = await createClient();

  let query = supabase
    .from("trainer_report_view")
    .select("*");

  if (branchId)                   query = query.eq("branch_id", branchId);
  if (status && status !== "all") query = query.eq("trainer_status", status);

  const { data, error } = await query.order("trainer_name", { ascending: true });

  assertNoError(error, "getTrainerReport");
  return (data ?? []) as TrainerReportRow[];
}

// ─── 6. Subscription Report ───────────────────────────────────────────────────

/**
 * Per-plan subscription summary with counts and revenue aggregates.
 *
 * REST equivalent:
 *   const { data } = await supabase
 *     .from("subscription_report_view")
 *     .select("*")
 *     .eq("branch_id", branchId)
 *     .order("plan_name");
 */
export async function getSubscriptionReport(
  params: ReportParams & { planStatus?: "active" | "inactive" | "all" } = {}
): Promise<SubscriptionReportRow[]> {
  const { branchId, planStatus } = params;
  const supabase = await createClient();

  let query = supabase
    .from("subscription_report_view")
    .select("*");

  if (branchId)                       query = query.eq("branch_id", branchId);
  if (planStatus && planStatus !== "all")
    query = query.eq("plan_status", planStatus);

  const { data, error } = await query
    .order("branch_name", { ascending: true })
    .order("plan_name",   { ascending: true });

  assertNoError(error, "getSubscriptionReport");
  return (data ?? []) as SubscriptionReportRow[];
}

// ─── 7. Revenue Report ────────────────────────────────────────────────────────

/**
 * Flat completed-payment ledger for custom aggregation.
 *
 * REST equivalent:
 *   const { data } = await supabase
 *     .from("revenue_report_view")
 *     .select("*")
 *     .eq("branch_id", branchId)
 *     .gte("revenue_month", monthFrom)
 *     .lte("revenue_month", monthTo)
 *     .order("paid_at", { ascending: false });
 */
export async function getRevenueReport(
  params: RevenueReportParams = {}
): Promise<PaginatedResult<RevenueReportRow>> {
  const { branchId, page = 1, pageSize = 200, monthFrom, monthTo } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);

  let query = supabase
    .from("revenue_report_view")
    .select("*", { count: "exact" });

  if (branchId)   query = query.eq("branch_id", branchId);
  if (monthFrom)  query = query.gte("revenue_month", monthFrom);
  if (monthTo)    query = query.lte("revenue_month", monthTo);

  const { data, count, error } = await query
    .order("paid_at", { ascending: false })
    .range(from, to);

  assertNoError(error, "getRevenueReport");
  const total = count ?? 0;
  return {
    data: (data ?? []) as RevenueReportRow[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Aggregated monthly revenue summary computed from revenue_report_view rows.
 * Groups by revenue_month + branch_name.
 */
export async function getMonthlyRevenueSummary(
  params: RevenueReportParams = {}
): Promise<MonthlyRevenueSummary[]> {
  const rows = (
    await getRevenueReport({ ...params, page: 1, pageSize: 10_000 })
  ).data;

  const map = new Map<string, MonthlyRevenueSummary>();

  for (const r of rows) {
    const key = `${r.revenue_month}::${r.branch_name}`;
    const existing = map.get(key);
    if (existing) {
      existing.transaction_count += 1;
      existing.gross_amount      += Number(r.amount);
      existing.total_refunds     += Number(r.refund_amount);
      existing.net_revenue       += Number(r.net_amount);
    } else {
      map.set(key, {
        revenue_month:       r.revenue_month,
        revenue_month_label: r.revenue_month_label,
        branch_name:         r.branch_name,
        transaction_count:   1,
        gross_amount:        Number(r.amount),
        total_refunds:       Number(r.refund_amount),
        net_revenue:         Number(r.net_amount),
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.revenue_month.localeCompare(a.revenue_month)
  );
}

// ─── 8. Pending Payments Report ───────────────────────────────────────────────

/**
 * All outstanding balances – unpaid/partial invoices and pending/failed payments.
 *
 * REST equivalent:
 *   const { data } = await supabase
 *     .from("pending_payment_report_view")
 *     .select("*")
 *     .eq("branch_id", branchId)
 *     .order("days_overdue", { ascending: false, nullsFirst: false });
 */
export async function getPendingPayments(
  params: PendingPaymentParams = {}
): Promise<PaginatedResult<PendingPaymentRow>> {
  const { branchId, page = 1, pageSize = 50, recordType } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);

  let query = supabase
    .from("pending_payment_report_view")
    .select("*", { count: "exact" });

  if (branchId)                         query = query.eq("branch_id", branchId);
  if (recordType && recordType !== "all")
    query = query.eq("record_type", recordType);

  const { data, count, error } = await query
    .order("days_overdue", { ascending: false, nullsFirst: false })
    .order("full_name",    { ascending: true })
    .range(from, to);

  assertNoError(error, "getPendingPayments");
  const total = count ?? 0;
  return {
    data: (data ?? []) as PendingPaymentRow[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── 9. Monthly Joining Report ────────────────────────────────────────────────

/**
 * New member detail list with first plan and first payment.
 *
 * REST equivalent:
 *   const { data } = await supabase
 *     .from("monthly_joining_report_view")
 *     .select("*")
 *     .eq("branch_id", branchId)
 *     .gte("join_month", monthFrom)
 *     .lte("join_month", monthTo)
 *     .order("join_date", { ascending: false });
 */
export async function getMonthlyJoiningReport(
  params: MonthlyJoiningParams = {}
): Promise<PaginatedResult<MonthlyJoiningRow>> {
  const { branchId, page = 1, pageSize = 100, monthFrom, monthTo } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);

  let query = supabase
    .from("monthly_joining_report_view")
    .select("*", { count: "exact" });

  if (branchId)  query = query.eq("branch_id", branchId);
  if (monthFrom) query = query.gte("join_month", monthFrom);
  if (monthTo)   query = query.lte("join_month", monthTo);

  const { data, count, error } = await query
    .order("join_date", { ascending: false })
    .range(from, to);

  assertNoError(error, "getMonthlyJoiningReport");
  const total = count ?? 0;
  return {
    data: (data ?? []) as MonthlyJoiningRow[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Aggregated monthly joining summary computed from monthly_joining_report_view.
 * Groups by join_month + branch_name.
 */
export async function getMonthlyJoiningSummary(
  params: MonthlyJoiningParams = {}
): Promise<MonthlyJoiningSummary[]> {
  const rows = (
    await getMonthlyJoiningReport({ ...params, page: 1, pageSize: 10_000 })
  ).data;

  const map = new Map<string, MonthlyJoiningSummary>();

  for (const r of rows) {
    const key = `${r.join_month}::${r.branch_name}`;
    const existing = map.get(key);
    if (existing) {
      existing.new_members  += 1;
      existing.still_active += r.current_status === "active" ? 1 : 0;
      existing.now_inactive += r.current_status === "inactive" ? 1 : 0;
      existing.male_count   += r.gender === "male" ? 1 : 0;
      existing.female_count += r.gender === "female" ? 1 : 0;
      existing.other_count  +=
        r.gender !== "male" && r.gender !== "female" ? 1 : 0;
    } else {
      map.set(key, {
        join_month:       r.join_month,
        join_month_label: r.join_month_label,
        branch_name:      r.branch_name,
        new_members:      1,
        still_active:     r.current_status === "active" ? 1 : 0,
        now_inactive:     r.current_status === "inactive" ? 1 : 0,
        male_count:       r.gender === "male" ? 1 : 0,
        female_count:     r.gender === "female" ? 1 : 0,
        other_count:      r.gender !== "male" && r.gender !== "female" ? 1 : 0,
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.join_month.localeCompare(a.join_month)
  );
}

// ─── 10. Revenue Intelligence (Phase 3 / Scale) ───────────────────────────────

export type MoMEntry = {
  month: string;       // "YYYY-MM"
  label: string;       // e.g. "Aug 2026"
  revenue: number;
};

export type ForecastEntry = {
  month: string;
  label: string;
  forecast: number;
};

export type RevenueIntelligenceResult = {
  monthlyTrend: MoMEntry[];
  forecast: ForecastEntry[];
  collectionEfficiency: number; // 0-100 percentage
  revenuePerMember: number;     // average INR per active member
};

/**
 * Scale-exclusive revenue intelligence analytics.
 *
 * Computes:
 *  - Month-over-month revenue trend (last 6 months)
 *  - 3-month linear forecast
 *  - Collection efficiency (collected / invoiced × 100)
 *  - Revenue per active member
 *
 * Uses existing payments, invoices, and members tables — no new DB tables needed.
 */
export async function getRevenueIntelligence(params: {
  branchId?: string | null;
  tenantId?: string | null;
}): Promise<RevenueIntelligenceResult> {
  const { branchId, tenantId } = params;
  const supabase = await createClient();

  // ── last 6 full months ────────────────────────────────────────────────────
  const now = new Date();
  const months: { month: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
    months.push({ month, label });
  }
  const startDate = months[0].month + "-01";
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  // ── fetch completed payments ──────────────────────────────────────────────
  let payQuery = supabase
    .from("payments")
    .select("amount,payment_date")
    .eq("payment_status", "completed")
    .gte("payment_date", startDate)
    .lte("payment_date", endDate);

  if (branchId) payQuery = payQuery.eq("branch_id", branchId);
  else if (tenantId) payQuery = payQuery.eq("tenant_id", tenantId);

  const { data: payments } = await payQuery;

  // aggregate by month
  const revenueByMonth = new Map<string, number>();
  for (const { month } of months) revenueByMonth.set(month, 0);
  for (const p of payments ?? []) {
    const m = (p.payment_date as string).slice(0, 7);
    if (revenueByMonth.has(m)) {
      revenueByMonth.set(m, (revenueByMonth.get(m) ?? 0) + Number(p.amount));
    }
  }

  const monthlyTrend: MoMEntry[] = months.map(({ month, label }) => ({
    month,
    label,
    revenue: revenueByMonth.get(month) ?? 0,
  }));

  // ── linear forecast (3 months ahead) ─────────────────────────────────────
  const xs = monthlyTrend.map((_, i) => i);
  const ys = monthlyTrend.map((r) => r.revenue);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const forecast: ForecastEntry[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
    forecast.push({
      month,
      label,
      forecast: Math.max(0, Math.round(intercept + slope * (n + i - 1))),
    });
  }

  // ── collection efficiency ─────────────────────────────────────────────────
  let invoiceQuery = supabase
    .from("invoices")
    .select("total_amount,paid_amount")
    .gte("created_at", startDate + "T00:00:00Z")
    .lte("created_at", endDate + "T23:59:59Z");

  if (branchId) invoiceQuery = invoiceQuery.eq("branch_id", branchId);
  else if (tenantId) invoiceQuery = invoiceQuery.eq("tenant_id", tenantId);

  const { data: invoices } = await invoiceQuery;

  let totalInvoiced = 0;
  let totalPaid = 0;
  for (const inv of invoices ?? []) {
    totalInvoiced += Number(inv.total_amount ?? 0);
    totalPaid += Number(inv.paid_amount ?? 0);
  }
  const collectionEfficiency =
    totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

  // ── revenue per active member ─────────────────────────────────────────────
  let memberQuery = supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if (branchId) memberQuery = memberQuery.eq("branch_id", branchId);
  else if (tenantId) memberQuery = memberQuery.eq("tenant_id", tenantId);

  const { count: activeMemberCount } = await memberQuery;

  const totalRevenue = monthlyTrend.reduce((s, r) => s + r.revenue, 0);
  const revenuePerMember =
    (activeMemberCount ?? 0) > 0
      ? Math.round(totalRevenue / (activeMemberCount ?? 1))
      : 0;

  return { monthlyTrend, forecast, collectionEfficiency, revenuePerMember };
}

// ─── 11. Retention Intelligence (Phase 3 / Scale) ─────────────────────────────

export type ChurnRiskLevel = "high" | "medium" | "low";

export type AtRiskMember = {
  member_id: string;
  member_code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  risk_level: ChurnRiskLevel;
  risk_score: number;        // 0-100 (higher = more at risk)
  days_until_expiry: number | null;
  last_attendance_days_ago: number | null;
  subscription_status: string | null;
  plan_name: string | null;
};

export type RetentionSummary = {
  totalActiveMembers: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  renewalRate30d: number;    // % of expiring members who renewed in last 30 days
  avgMembershipDays: number; // avg tenure of active members
};

export type RetentionIntelligenceResult = {
  summary: RetentionSummary;
  atRiskMembers: AtRiskMember[];
};

/**
 * Scale-exclusive Retention Intelligence.
 *
 * Computes churn risk scores for active members using:
 *  - Days until subscription expiry
 *  - Days since last attendance
 *  - Subscription status (active/expired/cancelled)
 *
 * Risk scoring (0-100):
 *  - Expiry in ≤7 days:      +40 points
 *  - Expiry in 8-30 days:    +20 points
 *  - No attendance in 30d:   +30 points
 *  - No attendance in 14d:   +15 points
 *  - Subscription lapsed:    +30 points
 *
 *  Score ≥ 60 → high risk
 *  Score 30-59 → medium risk
 *  Score < 30 → low risk
 *
 * Uses existing members, subscriptions, and attendance tables — no new DB tables.
 */
export async function getRetentionIntelligence(params: {
  branchId?: string | null;
  tenantId?: string | null;
  limit?: number;
}): Promise<RetentionIntelligenceResult> {
  const { branchId, tenantId, limit = 100 } = params;
  const supabase = await createClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // ── Fetch active members ──────────────────────────────────────────────────
  let memberQuery = supabase
    .from("members")
    .select("id,member_code,full_name,phone,email")
    .eq("status", "active");

  if (branchId) memberQuery = memberQuery.eq("branch_id", branchId);
  else if (tenantId) memberQuery = memberQuery.eq("tenant_id", tenantId);

  const { data: members } = await memberQuery;
  const allMembers = members ?? [];
  const totalActiveMembers = allMembers.length;

  if (totalActiveMembers === 0) {
    return {
      summary: {
        totalActiveMembers: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        renewalRate30d: 0,
        avgMembershipDays: 0,
      },
      atRiskMembers: [],
    };
  }

  const memberIds = allMembers.map((m) => m.id);

  // ── Fetch latest subscription per member ─────────────────────────────────
  let subQuery = supabase
    .from("subscriptions")
    .select("member_id,status,end_date,plan_id,created_at")
    .in("member_id", memberIds)
    .order("end_date", { ascending: false });

  if (branchId) subQuery = subQuery.eq("branch_id", branchId);
  else if (tenantId) subQuery = subQuery.eq("tenant_id", tenantId);

  const { data: subscriptions } = await subQuery;

  // Latest subscription per member
  const latestSub = new Map<
    string,
    { status: string; end_date: string | null; created_at: string | null }
  >();
  for (const sub of subscriptions ?? []) {
    if (!latestSub.has(sub.member_id)) {
      latestSub.set(sub.member_id, {
        status: sub.status as string,
        end_date: sub.end_date as string | null,
        created_at: sub.created_at as string | null,
      });
    }
  }

  // ── Fetch last attendance per member ────────────────────────────────────
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let attQuery = supabase
    .from("attendance")
    .select("member_id,entry_time")
    .in("member_id", memberIds)
    .gte("entry_time", thirtyDaysAgo.toISOString())
    .order("entry_time", { ascending: false });

  if (branchId) attQuery = attQuery.eq("branch_id", branchId);
  else if (tenantId) attQuery = attQuery.eq("tenant_id", tenantId);

  const { data: attendance } = await attQuery;

  const lastAttendance = new Map<string, Date>();
  for (const att of attendance ?? []) {
    if (!lastAttendance.has(att.member_id)) {
      lastAttendance.set(att.member_id, new Date(att.entry_time as string));
    }
  }

  // ── Compute risk scores ──────────────────────────────────────────────────
  const scored: AtRiskMember[] = [];

  for (const member of allMembers) {
    const sub = latestSub.get(member.id);
    const lastAtt = lastAttendance.get(member.id);

    let score = 0;

    // Expiry scoring
    let daysUntilExpiry: number | null = null;
    if (sub?.end_date) {
      const expiry = new Date(sub.end_date);
      daysUntilExpiry = Math.ceil(
        (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilExpiry <= 0) score += 30;       // already expired
      else if (daysUntilExpiry <= 7) score += 40;  // expiring very soon
      else if (daysUntilExpiry <= 30) score += 20; // expiring this month
    } else {
      score += 20; // no subscription found
    }

    // Subscription status scoring
    if (sub?.status && !["active", "trial"].includes(sub.status)) {
      score += 30; // lapsed / cancelled / expired
    }

    // Attendance scoring
    let lastAttDaysAgo: number | null = null;
    if (lastAtt) {
      lastAttDaysAgo = Math.floor(
        (today.getTime() - lastAtt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (lastAttDaysAgo >= 30) score += 30;
      else if (lastAttDaysAgo >= 14) score += 15;
    } else {
      score += 30; // no attendance in last 30 days at all
    }

    score = Math.min(100, score);

    const riskLevel: ChurnRiskLevel =
      score >= 60 ? "high" : score >= 30 ? "medium" : "low";

    scored.push({
      member_id: member.id,
      member_code: member.member_code as string,
      full_name: member.full_name as string,
      phone: member.phone as string | null,
      email: member.email as string | null,
      risk_level: riskLevel,
      risk_score: score,
      days_until_expiry: daysUntilExpiry,
      last_attendance_days_ago: lastAttDaysAgo,
      subscription_status: sub?.status ?? null,
      plan_name: null,
    });
  }

  // Sort by risk score descending
  scored.sort((a, b) => b.risk_score - a.risk_score);

  const highRiskCount = scored.filter((m) => m.risk_level === "high").length;
  const mediumRiskCount = scored.filter((m) => m.risk_level === "medium").length;
  const lowRiskCount = scored.filter((m) => m.risk_level === "low").length;

  // ── Renewal rate (last 30 days) ───────────────────────────────────────────
  // Members whose subscription was created/renewed in last 30 days
  const renewedRecently = (subscriptions ?? []).filter((s) => {
    if (!s.created_at) return false;
    const created = new Date(s.created_at as string);
    return created >= thirtyDaysAgo;
  });
  const renewedMemberIds = new Set(renewedRecently.map((s) => s.member_id));
  const renewalRate30d =
    totalActiveMembers > 0
      ? Math.round((renewedMemberIds.size / totalActiveMembers) * 100)
      : 0;

  // ── Avg membership tenure ─────────────────────────────────────────────────
  const tenureDays: number[] = [];
  for (const sub of subscriptions ?? []) {
    if (sub.created_at) {
      const days = Math.floor(
        (today.getTime() - new Date(sub.created_at as string).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (days >= 0) tenureDays.push(days);
    }
  }
  const avgMembershipDays =
    tenureDays.length > 0
      ? Math.round(tenureDays.reduce((a, b) => a + b, 0) / tenureDays.length)
      : 0;

  return {
    summary: {
      totalActiveMembers,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      renewalRate30d,
      avgMembershipDays,
    },
    atRiskMembers: scored.slice(0, limit),
  };
}
