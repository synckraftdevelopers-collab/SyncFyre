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
