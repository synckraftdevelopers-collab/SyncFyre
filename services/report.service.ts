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

// ─── 12. CRM Sales Report (Growth+) ────────────────────────────────────────────

export type CrmStaffSalesRow = {
  staffId: string;
  staffName: string;
  roleSlug: string | null;
  salesCount: number;
  totalRevenue: number;
  totalDiscount: number;
  leadsAssigned: number;
  leadsWon: number;
  leadConversionRate: number; // %, 0 when leadsAssigned is 0
};

export type CrmSalesReportTotals = {
  salesCount: number;
  totalRevenue: number;
  totalDiscount: number;
  leadsAssigned: number;
  leadsWon: number;
};

export type CrmSalesReportResult = {
  rows: CrmStaffSalesRow[];
  totals: CrmSalesReportTotals;
  dateFrom: string;
  dateTo: string;
};

/**
 * Growth+ CRM Sales Report — per-staff sales performance for a date range.
 *
 * "Sales" = every subscriptions row (new sale, renewal, or plan change; all
 * represent revenue collected under that staff member's name) with
 * created_by set, created within [dateFrom, dateTo]. Attribution matches the
 * discount-authorization feature (Prompt 6), which also keys off
 * subscriptions.created_by as "the staff member who completed this sale".
 *
 * Lead figures come from the existing leads table and are reported as two
 * separate "activity in period" counts rather than a matched cohort:
 *  - leadsAssigned: leads CREATED in range and currently assigned to that
 *    staff member (leads they received this period).
 *  - leadsWon: leads that reached stage 'won' with converted_at in range,
 *    for that staff member's assignment (leads they actually closed this
 *    period, regardless of when originally assigned).
 * A lead assigned near the end of one period and won early in the next will
 * count toward "assigned" in the first and "won" in the second — the same
 * simplification the Advanced CRM Analytics funnel already makes elsewhere
 * in this file, not a specially-introduced inaccuracy.
 *
 * Uses existing subscriptions, leads, and users tables — no new DB tables,
 * no migration.
 */
export async function getCrmSalesStaffReport(params: {
  branchId?: string | null;
  tenantId?: string | null;
  dateFrom: string; // YYYY-MM-DD, inclusive
  dateTo: string;   // YYYY-MM-DD, inclusive
}): Promise<CrmSalesReportResult> {
  const { branchId, tenantId, dateFrom, dateTo } = params;
  const supabase = await createClient();

  const fromTs = `${dateFrom}T00:00:00.000Z`;
  const toTs = `${dateTo}T23:59:59.999Z`;

  let subsQuery = supabase
    .from("subscriptions")
    .select("created_by, total_amount, discount_amount")
    .not("created_by", "is", null)
    .gte("created_at", fromTs)
    .lte("created_at", toTs);
  if (branchId) subsQuery = subsQuery.eq("branch_id", branchId);
  else if (tenantId) subsQuery = subsQuery.eq("tenant_id", tenantId);
  const { data: subs, error: subsError } = await subsQuery;
  assertNoError(subsError, "getCrmSalesStaffReport (subscriptions)");

  let assignedLeadsQuery = supabase
    .from("leads")
    .select("assigned_to")
    .not("assigned_to", "is", null)
    .gte("created_at", fromTs)
    .lte("created_at", toTs);
  if (branchId) assignedLeadsQuery = assignedLeadsQuery.eq("branch_id", branchId);
  else if (tenantId) assignedLeadsQuery = assignedLeadsQuery.eq("tenant_id", tenantId);
  const { data: assignedLeads, error: assignedError } = await assignedLeadsQuery;
  assertNoError(assignedError, "getCrmSalesStaffReport (assigned leads)");

  let wonLeadsQuery = supabase
    .from("leads")
    .select("assigned_to")
    .not("assigned_to", "is", null)
    .eq("stage", "won")
    .gte("converted_at", fromTs)
    .lte("converted_at", toTs);
  if (branchId) wonLeadsQuery = wonLeadsQuery.eq("branch_id", branchId);
  else if (tenantId) wonLeadsQuery = wonLeadsQuery.eq("tenant_id", tenantId);
  const { data: wonLeads, error: wonError } = await wonLeadsQuery;
  assertNoError(wonError, "getCrmSalesStaffReport (won leads)");

  const staffIds = new Set<string>();
  for (const s of subs ?? []) if (s.created_by) staffIds.add(s.created_by as string);
  for (const l of assignedLeads ?? []) if (l.assigned_to) staffIds.add(l.assigned_to as string);
  for (const l of wonLeads ?? []) if (l.assigned_to) staffIds.add(l.assigned_to as string);

  let staffMap = new Map<string, { full_name: string; roleSlug: string | null }>();
  if (staffIds.size > 0) {
    const { data: staffRows, error: staffError } = await supabase
      .from("users")
      .select("id, full_name, role:roles(slug)")
      .in("id", Array.from(staffIds));
    assertNoError(staffError, "getCrmSalesStaffReport (staff directory)");
    for (const u of staffRows ?? []) {
      const role = Array.isArray((u as { role: unknown }).role)
        ? (u as { role: { slug: string }[] }).role[0]
        : (u as unknown as { role: { slug: string } | null }).role;
      staffMap.set(u.id as string, {
        full_name: (u.full_name as string) ?? "Unknown staff",
        roleSlug: role?.slug ?? null,
      });
    }
  }

  const salesByStaff = new Map<string, { salesCount: number; totalRevenue: number; totalDiscount: number }>();
  for (const s of subs ?? []) {
    const staffId = s.created_by as string;
    const entry = salesByStaff.get(staffId) ?? { salesCount: 0, totalRevenue: 0, totalDiscount: 0 };
    entry.salesCount += 1;
    entry.totalRevenue += Number(s.total_amount ?? 0);
    entry.totalDiscount += Number(s.discount_amount ?? 0);
    salesByStaff.set(staffId, entry);
  }

  const leadsByStaff = new Map<string, { assigned: number; won: number }>();
  for (const l of assignedLeads ?? []) {
    const staffId = l.assigned_to as string;
    const entry = leadsByStaff.get(staffId) ?? { assigned: 0, won: 0 };
    entry.assigned += 1;
    leadsByStaff.set(staffId, entry);
  }
  for (const l of wonLeads ?? []) {
    const staffId = l.assigned_to as string;
    const entry = leadsByStaff.get(staffId) ?? { assigned: 0, won: 0 };
    entry.won += 1;
    leadsByStaff.set(staffId, entry);
  }

  const rows: CrmStaffSalesRow[] = Array.from(staffIds).map((staffId) => {
    const sales = salesByStaff.get(staffId) ?? { salesCount: 0, totalRevenue: 0, totalDiscount: 0 };
    const leadStats = leadsByStaff.get(staffId) ?? { assigned: 0, won: 0 };
    const info = staffMap.get(staffId);
    return {
      staffId,
      staffName: info?.full_name ?? "Unknown staff",
      roleSlug: info?.roleSlug ?? null,
      salesCount: sales.salesCount,
      totalRevenue: sales.totalRevenue,
      totalDiscount: sales.totalDiscount,
      leadsAssigned: leadStats.assigned,
      leadsWon: leadStats.won,
      leadConversionRate: leadStats.assigned > 0 ? Math.round((leadStats.won / leadStats.assigned) * 100) : 0,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const totals: CrmSalesReportTotals = rows.reduce(
    (acc, r) => ({
      salesCount: acc.salesCount + r.salesCount,
      totalRevenue: acc.totalRevenue + r.totalRevenue,
      totalDiscount: acc.totalDiscount + r.totalDiscount,
      leadsAssigned: acc.leadsAssigned + r.leadsAssigned,
      leadsWon: acc.leadsWon + r.leadsWon,
    }),
    { salesCount: 0, totalRevenue: 0, totalDiscount: 0, leadsAssigned: 0, leadsWon: 0 },
  );

  return { rows, totals, dateFrom, dateTo };
}

// ─── 13. PT Revenue & Trainer Performance Report (Growth+) ────────────────────

export type PtTrainerReportRow = {
  trainerId: string;
  trainerName: string;
  packagesSold: number;
  totalRevenue: number;
  sessionsCompleted: number;
  sessionsScheduled: number;
  sessionsCancelled: number;
  sessionsNoShow: number;
  /** % of resolved sessions (completed+cancelled+no_show) that were completed. 0 when none resolved. */
  completionRate: number;
  /** % of resolved sessions that were a no-show. 0 when none resolved. */
  noShowRate: number;
  /** Distinct members currently holding an active PT package with this trainer — a point-in-time count, not date-ranged. */
  activeClients: number;
};

export type PtTrainerReportTotals = {
  packagesSold: number;
  totalRevenue: number;
  sessionsCompleted: number;
  sessionsScheduled: number;
  sessionsCancelled: number;
  sessionsNoShow: number;
};

export type PtTrainerReportResult = {
  rows: PtTrainerReportRow[];
  totals: PtTrainerReportTotals;
  dateFrom: string;
  dateTo: string;
};

/**
 * Growth+ PT Revenue Report + Trainer Performance Report, combined into one
 * per-trainer dataset since both draw on the same pt_member_packages/
 * pt_sessions rows — a single page renders a revenue section and a
 * performance section from this one result rather than running the same
 * aggregation twice on two separate routes.
 *
 * Revenue side: pt_member_packages rows (PT credit-bundle sales) with
 * purchased_at in range, summed per assigned trainer.
 * Performance side: pt_sessions rows with session_at in range, per trainer,
 * split by status — completed/scheduled/cancelled/no_show — with completion
 * and no-show rates computed over "resolved" sessions (completed + cancelled
 * + no_show; a still-`scheduled` session hasn't resolved either way yet, so
 * it's excluded from both rate denominators).
 * activeClients is a current-snapshot count (distinct members with a
 * `status = 'active'` pt_member_packages row for that trainer), not
 * date-ranged — "how many PT clients does this trainer have right now."
 *
 * Uses existing pt_packages/pt_member_packages/pt_sessions/trainers/users
 * tables — no new DB tables, no migration.
 */
export async function getPtTrainerReport(params: {
  branchId?: string | null;
  tenantId?: string | null;
  dateFrom: string; // YYYY-MM-DD, inclusive
  dateTo: string;   // YYYY-MM-DD, inclusive
}): Promise<PtTrainerReportResult> {
  const { branchId, tenantId, dateFrom, dateTo } = params;
  const supabase = await createClient();

  const fromTs = `${dateFrom}T00:00:00.000Z`;
  const toTs = `${dateTo}T23:59:59.999Z`;

  let pkgQuery = supabase
    .from("pt_member_packages")
    .select("trainer_id, amount, purchased_at")
    .gte("purchased_at", fromTs)
    .lte("purchased_at", toTs);
  if (branchId) pkgQuery = pkgQuery.eq("branch_id", branchId);
  else if (tenantId) pkgQuery = pkgQuery.eq("tenant_id", tenantId);
  const { data: packages, error: pkgError } = await pkgQuery;
  assertNoError(pkgError, "getPtTrainerReport (packages)");

  let sessionsQuery = supabase
    .from("pt_sessions")
    .select("trainer_id, status")
    .gte("session_at", fromTs)
    .lte("session_at", toTs);
  if (branchId) sessionsQuery = sessionsQuery.eq("branch_id", branchId);
  else if (tenantId) sessionsQuery = sessionsQuery.eq("tenant_id", tenantId);
  const { data: sessions, error: sessionsError } = await sessionsQuery;
  assertNoError(sessionsError, "getPtTrainerReport (sessions)");

  let activeQuery = supabase
    .from("pt_member_packages")
    .select("trainer_id, member_id")
    .eq("status", "active");
  if (branchId) activeQuery = activeQuery.eq("branch_id", branchId);
  else if (tenantId) activeQuery = activeQuery.eq("tenant_id", tenantId);
  const { data: activePackages, error: activeError } = await activeQuery;
  assertNoError(activeError, "getPtTrainerReport (active clients)");

  const trainerIds = new Set<string>();
  for (const p of packages ?? []) if (p.trainer_id) trainerIds.add(p.trainer_id as string);
  for (const s of sessions ?? []) if (s.trainer_id) trainerIds.add(s.trainer_id as string);
  for (const a of activePackages ?? []) if (a.trainer_id) trainerIds.add(a.trainer_id as string);

  const trainerNames = new Map<string, string>();
  if (trainerIds.size > 0) {
    const { data: trainerRows, error: trainerError } = await supabase
      .from("trainers")
      .select("id, users(full_name)")
      .in("id", Array.from(trainerIds));
    assertNoError(trainerError, "getPtTrainerReport (trainer directory)");
    for (const t of trainerRows ?? []) {
      const usersRaw = (t as { users: unknown }).users;
      const userRel = Array.isArray(usersRaw)
        ? (usersRaw[0] as { full_name?: string | null } | undefined) ?? null
        : (usersRaw as { full_name?: string | null } | null);
      trainerNames.set(t.id as string, userRel?.full_name ?? "Unknown trainer");
    }
  }

  type Accum = {
    packagesSold: number;
    totalRevenue: number;
    sessionsCompleted: number;
    sessionsScheduled: number;
    sessionsCancelled: number;
    sessionsNoShow: number;
    activeClientIds: Set<string>;
  };
  const byTrainer = new Map<string, Accum>();
  function ensure(id: string): Accum {
    let e = byTrainer.get(id);
    if (!e) {
      e = { packagesSold: 0, totalRevenue: 0, sessionsCompleted: 0, sessionsScheduled: 0, sessionsCancelled: 0, sessionsNoShow: 0, activeClientIds: new Set() };
      byTrainer.set(id, e);
    }
    return e;
  }

  for (const p of packages ?? []) {
    if (!p.trainer_id) continue;
    const e = ensure(p.trainer_id as string);
    e.packagesSold += 1;
    e.totalRevenue += Number(p.amount ?? 0);
  }
  for (const s of sessions ?? []) {
    if (!s.trainer_id) continue;
    const e = ensure(s.trainer_id as string);
    if (s.status === "completed") e.sessionsCompleted += 1;
    else if (s.status === "scheduled") e.sessionsScheduled += 1;
    else if (s.status === "cancelled") e.sessionsCancelled += 1;
    else if (s.status === "no_show") e.sessionsNoShow += 1;
  }
  for (const a of activePackages ?? []) {
    if (!a.trainer_id) continue;
    const e = ensure(a.trainer_id as string);
    e.activeClientIds.add(a.member_id as string);
  }

  const rows: PtTrainerReportRow[] = Array.from(trainerIds)
    .map((trainerId) => {
      const e = byTrainer.get(trainerId) ?? {
        packagesSold: 0, totalRevenue: 0, sessionsCompleted: 0, sessionsScheduled: 0,
        sessionsCancelled: 0, sessionsNoShow: 0, activeClientIds: new Set<string>(),
      };
      const resolved = e.sessionsCompleted + e.sessionsCancelled + e.sessionsNoShow;
      return {
        trainerId,
        trainerName: trainerNames.get(trainerId) ?? "Unknown trainer",
        packagesSold: e.packagesSold,
        totalRevenue: e.totalRevenue,
        sessionsCompleted: e.sessionsCompleted,
        sessionsScheduled: e.sessionsScheduled,
        sessionsCancelled: e.sessionsCancelled,
        sessionsNoShow: e.sessionsNoShow,
        completionRate: resolved > 0 ? Math.round((e.sessionsCompleted / resolved) * 100) : 0,
        noShowRate: resolved > 0 ? Math.round((e.sessionsNoShow / resolved) * 100) : 0,
        activeClients: e.activeClientIds.size,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const totals: PtTrainerReportTotals = rows.reduce(
    (acc, r) => ({
      packagesSold: acc.packagesSold + r.packagesSold,
      totalRevenue: acc.totalRevenue + r.totalRevenue,
      sessionsCompleted: acc.sessionsCompleted + r.sessionsCompleted,
      sessionsScheduled: acc.sessionsScheduled + r.sessionsScheduled,
      sessionsCancelled: acc.sessionsCancelled + r.sessionsCancelled,
      sessionsNoShow: acc.sessionsNoShow + r.sessionsNoShow,
    }),
    { packagesSold: 0, totalRevenue: 0, sessionsCompleted: 0, sessionsScheduled: 0, sessionsCancelled: 0, sessionsNoShow: 0 },
  );

  return { rows, totals, dateFrom, dateTo };
}
