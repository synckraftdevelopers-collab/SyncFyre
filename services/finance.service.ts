/**
 * finance.service.ts
 *
 * Repository layer for the Finance & Accounting module.
 * Uses the SSR Supabase client so RLS is enforced automatically.
 * All functions accept optional branchId — null means admin sees all.
 */

import { createClient } from "@/lib/supabase/server";
import { getLocalDateKey } from "@/lib/time";
import {
  calculatePaymentBalance,
  computeReceivableDisplayStatus,
  type ReceivableDisplayStatus,
} from "@/lib/finance/payment-balance";
import type { PaginatedResult } from "@/types";
import type {
  IncomeCategory,
  ExpenseCategory,
  Vendor,
  ChartOfAccount,
  Income,
  Expense,
  BankAccount,
  BankTransaction,
  CashBookEntry,
  JournalEntry,
  LedgerEntry,
  GstTransaction,
  Receivable,
  FinanceDashboardMetrics,
  FinanceRevenuePoint,
  FinancePaymentModePoint,
  FinanceReceivableAgingPoint,
  OutstandingReceivablesSummary,
  FinanceParams,
  ExpenseParams,
  IncomeParams,
  ReceivableParams,
  LedgerParams,
  GstParams,
} from "@/types";

function assertNoError(
  error: { message: string } | null,
  ctx: string
): void {
  if (error) throw new Error(`[finance.service] ${ctx}: ${error.message}`);
}

/**
 * True when a Postgres/PostgREST error is specifically "column does not
 * exist" for one of the two lightweight-installment columns (migration
 * `0054_lightweight_installments.sql` — adds `is_installment` /
 * `next_installment_due_date` to `invoices` and `receivables`) not having
 * reached this database yet. Postgres surfaces this as code `42703`
 * (undefined_column); PostgREST's message names the specific column, e.g.
 * "column receivables.is_installment does not exist".
 *
 * Narrowly scoped to those two columns on purpose: any *other* schema
 * problem (a typo'd column, a dropped table, an RLS issue masquerading as
 * a column error) should still throw and surface loudly rather than be
 * silently swallowed here.
 */
function isMissingInstallmentColumnsError(
  error: { message?: string; code?: string } | null
): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  // Match both PostgreSQL error 42703 (undefined_column) however
  // the Supabase/PostgREST client surfaces it — by code or by message text.
  // Checking the message is the most reliable signal across all environments.
  return (
    msg.includes("is_installment") ||
    msg.includes("next_installment_due_date")
  );
}

/**
 * Runs a receivables-table query that asks for the installment columns and,
 * if this database hasn't had migration 0054 applied yet, transparently
 * retries without them instead of throwing. This is what keeps a single
 * missing-migration environment from crashing Outstanding Dues / the
 * Finance dashboard outright (see getOutstandingReceivablesSummary and
 * getReceivableAging, both called inside a page-level Promise.all where an
 * unhandled rejection takes the whole page down).
 *
 * `withColumns` must include `is_installment, next_installment_due_date`;
 * `withoutColumns` is the same select minus those two. On fallback, rows
 * come back without either field — callers already read them via
 * `row.is_installment` / `row.next_installment_due_date`, which are simply
 * `undefined` in that case and coerce to `false` / `null`/no-effective-date,
 * i.e. installment-aware behavior degrades gracefully instead of erroring.
 */
async function selectReceivablesResilient<T>(
  buildQuery: (columns: string) => PromiseLike<{ data: T[] | null; error: { message?: string; code?: string } | null }>,
  withColumns: string,
  withoutColumns: string,
  ctx: string
): Promise<T[]> {
  let { data, error } = await buildQuery(withColumns);

  if (isMissingInstallmentColumnsError(error)) {
    console.warn(
      `[finance.service] ${ctx}: is_installment/next_installment_due_date not found on receivables — falling back to a query without them. Push migration 0054_lightweight_installments.sql to restore installment-aware Outstanding Dues.`
    );
    ({ data, error } = await buildQuery(withoutColumns));
  }

  if (error) throw new Error(`[finance.service] ${ctx}: ${error.message ?? String(error)}`);
  return data ?? [];
}

function pageRange(page: number, size: number): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1];
}

// Canonical timezone for every date-aware receivable/dues calculation in
// this file — matches the convention already used elsewhere in the app
// (services/dashboard.service.ts, lib/member-expiry.ts) rather than the
// browser's local date or a bare UTC slice. See lib/time.ts#getLocalDateKey
// and docs/OUTSTANDING_DUES_REALTIME_IMPLEMENTATION.md.
const FINANCE_TIME_ZONE = "Asia/Kolkata";

/** Fresh "today" (YYYY-MM-DD) in the canonical finance timezone — never cached. */
function financeTodayKey(): string {
  return getLocalDateKey(new Date(), FINANCE_TIME_ZONE);
}

export async function getOutstandingReceivablesSummary(
  branchId?: string | null
): Promise<OutstandingReceivablesSummary> {
  const supabase = await createClient();
  const todayKey = financeTodayKey();

  // Only `balance_amount > 0` and "not manually written off" are filtered at
  // the DB — those two facts are always trustworthy (balance_amount is kept
  // exactly in sync with original_amount - paid_amount by the invoice/payment
  // triggers, and written_off is a real, deliberate, manually-set terminal
  // state). The pending/overdue split is NOT filtered here because the
  // stored `status` column is a stale snapshot (see computeReceivableDisplayStatus
  // in lib/finance/payment-balance.ts) — it is recomputed below from
  // balance + due_date on every request instead.
  const buildQuery = (columns: string) => {
    let q = supabase
      .from("receivables")
      .select(columns)
      .gt("balance_amount", 0)
      .neq("status", "written_off");
    if (branchId) q = q.eq("branch_id", branchId);
    return q as unknown as PromiseLike<{ data: { status: string; balance_amount: number | string; due_date: string | null; is_installment?: boolean | null; next_installment_due_date?: string | null }[] | null; error: { message?: string; code?: string } | null }>;
  };

  const data = await selectReceivablesResilient<{
    status: string;
    balance_amount: number | string;
    due_date: string | null;
    is_installment?: boolean | null;
    next_installment_due_date?: string | null;
  }>(
    buildQuery,
    "status, balance_amount, due_date, is_installment, next_installment_due_date",
    "status, balance_amount, due_date",
    "getOutstandingReceivablesSummary"
  );

  return data.reduce<OutstandingReceivablesSummary>(
    (summary, row) => {
      const balance = Number(row.balance_amount ?? 0);
      if (balance <= 0) return summary;

      const displayStatus = computeReceivableDisplayStatus(
        balance,
        row.due_date as string | null,
        row.status as string,
        todayKey,
        { isInstallment: Boolean(row.is_installment), nextInstallmentDueDate: row.next_installment_due_date ?? null }
      );
      // Fully paid or written off despite balance drift — never counts as outstanding.
      if (displayStatus === "paid" || displayStatus === "written_off") return summary;

      summary.totalOutstanding += balance;
      if (displayStatus === "overdue") {
        summary.overdueCount += 1;
        summary.overdueAmount += balance;
      } else {
        summary.pendingCount += 1;
        summary.pendingAmount += balance;
      }

      return summary;
    },
    {
      overdueCount: 0,
      overdueAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      totalOutstanding: 0,
    }
  );
}

// ─── Finance Dashboard ────────────────────────────────────────────────────────

export async function getFinanceDashboardMetrics(
  branchId?: string | null,
  dateFrom?: string,
  dateTo?: string
): Promise<FinanceDashboardMetrics> {
  const supabase = await createClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const rangeStart = dateFrom ?? monthStartStr;
  const rangeEnd = dateTo ?? todayStr;
  const inThirtyDays = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const applyBranch = <T extends object>(q: T): T => {
    if (!branchId) return q;
    return (q as any).eq("branch_id", branchId) as T;
  };

  const [
    periodIncome,
    totalExpenses,
    totalGst,
    membershipIncome,
    cashBalance,
    bankAccounts,
    latestBankTransactions,
    receivableRows,
    activeMembers,
    renewalsDue,
  ] = await Promise.all([
    applyBranch(
      supabase
        .from("income")
        .select("total_amount")
        .gte("income_date", rangeStart)
        .lte("income_date", rangeEnd)
        .eq("status", "posted")
    ),
    applyBranch(
      supabase
        .from("expenses")
        .select("total_amount")
        .gte("expense_date", rangeStart)
        .lte("expense_date", rangeEnd)
        .eq("status", "posted")
        .eq("approval_status", "approved")
    ),
    applyBranch(
      supabase
        .from("gst_transactions")
        .select("cgst_amount, sgst_amount, igst_amount, total_tax")
        .eq("status", "posted")
        .eq("txn_type", "sales")
        .gte("txn_date", rangeStart)
        .lte("txn_date", rangeEnd)
    ),
    applyBranch(
      supabase
        .from("income")
        .select("total_amount")
        .gte("income_date", rangeStart)
        .lte("income_date", rangeEnd)
        .eq("status", "posted")
        .eq("is_membership_income", true)
    ),
    applyBranch(
      supabase
        .from("cash_book")
        .select("balance_after")
        .eq("status", "posted")
        .lte("entry_date", rangeEnd)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
    ),
    applyBranch(
      supabase
        .from("bank_accounts")
        .select("id, opening_balance, current_balance")
        .eq("status", "active")
    ),
    applyBranch(
      supabase
        .from("bank_transactions")
        .select("bank_account_id, balance_after, txn_date, created_at")
        .eq("status", "posted")
        .lte("txn_date", rangeEnd)
        .order("txn_date", { ascending: false })
        .order("created_at", { ascending: false })
    ),
    applyBranch(
      supabase
        .from("receivables")
        .select("balance_amount, status, due_date, created_at")
        .gt("balance_amount", 0)
        .in("status", ["pending", "partial", "overdue"])
        .lte("created_at", `${rangeEnd}T23:59:59.999Z`)
    ),
    applyBranch(
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
    ),
    applyBranch(
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .lte("end_date", inThirtyDays)
        .gte("end_date", todayStr)
    ),
  ]);

  const sum = (rows: { total_amount?: number | string }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.total_amount ?? 0), 0);

  const sumGst = (rows: { cgst_amount?: number | string; sgst_amount?: number | string; igst_amount?: number | string; total_tax?: number | string }[] | null) =>
    (rows ?? []).reduce((acc, row) => ({
      cgst: acc.cgst + Number(row.cgst_amount ?? 0),
      sgst: acc.sgst + Number(row.sgst_amount ?? 0),
      igst: acc.igst + Number(row.igst_amount ?? 0),
      total: acc.total + Number(row.total_tax ?? 0),
    }), { cgst: 0, sgst: 0, igst: 0, total: 0 });

  const selectedCollection = sum(periodIncome.data);
  const periodExpenses = sum(totalExpenses.data);
  const totalMembershipRevenue = sum(membershipIncome.data);
  const gstTotals = sumGst(totalGst.data);
  const netProfit = selectedCollection - periodExpenses;
  const cashInHand =
    (cashBalance.data ?? []).length > 0
      ? Number((cashBalance.data as { balance_after: number }[])[0].balance_after)
      : 0;

  const bankAccountRows = (bankAccounts.data ?? []) as { id: string; opening_balance?: number | string | null; current_balance?: number | string | null }[];
  const bankTxnRows = (latestBankTransactions.data ?? []) as { bank_account_id: string; balance_after?: number | string | null }[];
  const latestBankBalances = new Map<string, number>();
  for (const row of bankTxnRows) {
    if (!latestBankBalances.has(row.bank_account_id)) {
      latestBankBalances.set(row.bank_account_id, Number(row.balance_after ?? 0));
    }
  }
  const bankBal = bankAccountRows.reduce((acc, account) => {
    const latestBalance = latestBankBalances.get(account.id);
    if (latestBalance !== undefined) return acc + latestBalance;
    return acc + Number(account.opening_balance ?? account.current_balance ?? 0);
  }, 0);

  const outstanding = ((receivableRows.data ?? []) as { balance_amount?: number | string | null; due_date?: string | null }[])
    .filter((row) => !row.due_date || row.due_date <= rangeEnd)
    .reduce((acc, row) => acc + Number(row.balance_amount ?? 0), 0);
  const active = (activeMembers as { count?: number | null }).count ?? 0;
  const efficiency =
    selectedCollection + outstanding > 0
      ? Math.round((selectedCollection / (selectedCollection + outstanding)) * 100)
      : 100;
  const avgRev = active > 0 ? Math.round(selectedCollection / active) : 0;

  return {
    selectedCollection,
    totalRevenue: selectedCollection,
    totalExpenses: periodExpenses,
    netProfit,
    cashInHand,
    bankBalance: bankBal,
    outstandingReceivables: outstanding,
    gstCollected: gstTotals.total,
    cgstCollected: gstTotals.cgst,
    sgstCollected: gstTotals.sgst,
    igstCollected: gstTotals.igst,
    membershipRevenue: totalMembershipRevenue,
    activeMembers: active,
    membershipsRenewingDue:
      (renewalsDue as { count?: number | null }).count ?? 0,
    collectionEfficiency: efficiency,
    avgRevenuePerMember: avgRev,
    periodStart: rangeStart,
    periodEnd: rangeEnd,
  };
}

export async function getFinanceRevenueTrend(
  branchId?: string | null,
  months = 6,
  dateFrom?: string,
  dateTo?: string
): Promise<FinanceRevenuePoint[]> {
  const supabase = await createClient();
  const results: FinanceRevenuePoint[] = [];
  const endBase = dateTo ? new Date(dateTo) : new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(endBase.getFullYear(), endBase.getMonth(), 1);
    d.setMonth(d.getMonth() - i);
    const from = d.toISOString().slice(0, 10);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    if (dateFrom && to < dateFrom) continue;
    if (dateTo && from > dateTo) continue;
    const effectiveFrom = dateFrom && from < dateFrom ? dateFrom : from;
    const effectiveTo = dateTo && to > dateTo ? dateTo : to;
    const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });

    let iq = supabase
      .from("income")
      .select("total_amount")
       .gte("income_date", effectiveFrom)
      .lte("income_date", effectiveTo)
      .eq("status", "posted");
    let eq = supabase
      .from("expenses")
      .select("total_amount")
       .gte("expense_date", effectiveFrom)
      .lte("expense_date", effectiveTo)
      .eq("status", "posted")
      .eq("approval_status", "approved");

    if (branchId) {
      iq = iq.eq("branch_id", branchId);
      eq = eq.eq("branch_id", branchId);
    }

    const [{ data: inc }, { data: exp }] = await Promise.all([iq, eq]);
    const income = (inc ?? []).reduce(
      (a: number, r: { total_amount: number | string }) =>
        a + Number(r.total_amount),
      0
    );
    const expense = (exp ?? []).reduce(
      (a: number, r: { total_amount: number | string }) =>
        a + Number(r.total_amount),
      0
    );
    results.push({ date: label, income, expense, profit: income - expense });
  }
  return results;
}

export async function getPaymentModeBreakdown(
  branchId?: string | null,
  dateFrom?: string,
  dateTo?: string
): Promise<FinancePaymentModePoint[]> {
  const supabase = await createClient();
  let q = supabase
    .from("income")
    .select("payment_method, total_amount")
    .eq("status", "posted");
  if (branchId) q = q.eq("branch_id", branchId);
  if (dateFrom) q = q.gte("income_date", dateFrom);
  if (dateTo) q = q.lte("income_date", dateTo);

  const { data } = await q;
  const map = new Map<string, { amount: number; count: number }>();
  for (const row of data ?? []) {
    const m = row.payment_method as string;
    const e = map.get(m) ?? { amount: 0, count: 0 };
    map.set(m, { amount: e.amount + Number(row.total_amount), count: e.count + 1 });
  }
  return Array.from(map.entries()).map(([mode, v]) => ({
    mode,
    amount: v.amount,
    count: v.count,
  }));
}

export async function getReceivableAging(
  branchId?: string | null
): Promise<FinanceReceivableAgingPoint[]> {
  const supabase = await createClient();
  // Same rule as getOutstandingReceivablesSummary: balance_amount > 0 and
  // "not written off" are the only trustworthy stored facts; a row still
  // belongs in the aging table regardless of what its stale `status`
  // snapshot says.
  const buildQuery = (columns: string) => {
    let q = supabase
      .from("receivables")
      .select(columns)
      .gt("balance_amount", 0)
      .neq("status", "written_off");
    if (branchId) q = q.eq("branch_id", branchId);
    return q as unknown as PromiseLike<{ data: { balance_amount: number | string; due_date: string | null; is_installment?: boolean | null; next_installment_due_date?: string | null }[] | null; error: { message?: string; code?: string } | null }>;
  };

  const data = await selectReceivablesResilient<{
    balance_amount: number | string;
    due_date: string | null;
    is_installment?: boolean | null;
    next_installment_due_date?: string | null;
  }>(
    buildQuery,
    "balance_amount, due_date, is_installment, next_installment_due_date",
    "balance_amount, due_date",
    "getReceivableAging"
  );

  const buckets: Record<string, { amount: number; count: number }> = {
    "0-30": { amount: 0, count: 0 },
    "31-60": { amount: 0, count: 0 },
    "61-90": { amount: 0, count: 0 },
    "90+": { amount: 0, count: 0 },
  };
  const today = new Date();
  for (const row of data ?? []) {
    // An installment plan's next_installment_due_date is what "aging"
    // should count from, not the invoice's original due_date — same
    // effective-due-date rule as computeReceivableDisplayStatus. A row
    // with no due date at all (and no installment date) still has
    // nothing to age from and is skipped, as before.
    const effectiveDueDate =
      row.is_installment && row.next_installment_due_date ? row.next_installment_due_date : row.due_date;
    if (!effectiveDueDate) continue;
    const days = Math.floor(
      (today.getTime() - new Date(effectiveDueDate as string).getTime()) /
        86400000
    );
    const key =
      days <= 30
        ? "0-30"
        : days <= 60
        ? "31-60"
        : days <= 90
        ? "61-90"
        : "90+";
    buckets[key].amount += Number(row.balance_amount);
    buckets[key].count += 1;
  }
  return Object.entries(buckets).map(([bucket, v]) => ({
    bucket,
    amount: v.amount,
    count: v.count,
  }));
}

// ─── Income Categories ────────────────────────────────────────────────────────

export async function listIncomeCategories(
  branchId?: string | null
): Promise<IncomeCategory[]> {
  const supabase = await createClient();
  let q = supabase
    .from("income_categories")
    .select("*")
    .eq("status", "active")
    .order("name");
  if (branchId) q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);
  const { data, error } = await q;
  assertNoError(error, "listIncomeCategories");
  return (data ?? []) as IncomeCategory[];
}

export async function upsertIncomeCategory(
  input: Partial<IncomeCategory> & { name: string; branch_id?: string | null }
): Promise<IncomeCategory> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("income_categories")
    .upsert(input, { onConflict: "branch_id,name" })
    .select()
    .single();
  assertNoError(error, "upsertIncomeCategory");
  return data as IncomeCategory;
}

// ─── Expense Categories ───────────────────────────────────────────────────────

export async function listExpenseCategories(
  branchId?: string | null
): Promise<ExpenseCategory[]> {
  const supabase = await createClient();
  let q = supabase
    .from("expense_categories")
    .select("*")
    .eq("status", "active")
    .order("name");
  if (branchId) q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);
  const { data, error } = await q;
  assertNoError(error, "listExpenseCategories");
  return (data ?? []) as ExpenseCategory[];
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

export async function listVendors(
  params: FinanceParams = {}
): Promise<PaginatedResult<Vendor>> {
  const { branchId, page = 1, pageSize = 20 } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);
  let q = supabase.from("vendors").select("*", { count: "exact" });
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, count, error } = await q
    .order("name")
    .range(from, to);
  assertNoError(error, "listVendors");
  const total = count ?? 0;
  return { data: (data ?? []) as Vendor[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function upsertVendor(
  input: Partial<Vendor> & { branch_id: string; name: string }
): Promise<Vendor> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .upsert(input)
    .select()
    .single();
  assertNoError(error, "upsertVendor");
  return data as Vendor;
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────

export async function listChartOfAccounts(
  branchId?: string | null
): Promise<ChartOfAccount[]> {
  const supabase = await createClient();
  let q = supabase.from("chart_of_accounts").select("*").eq("status", "active").order("account_code");
  if (branchId) q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);
  const { data, error } = await q;
  assertNoError(error, "listChartOfAccounts");
  return (data ?? []) as ChartOfAccount[];
}

// ─── Income ───────────────────────────────────────────────────────────────────

export async function listIncome(
  params: IncomeParams = {}
): Promise<PaginatedResult<Income>> {
  const { branchId, page = 1, pageSize = 30, dateFrom, dateTo, categoryId, memberId, status, isMembershipIncome } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);

  let q = supabase
    .from("income")
    .select(
      "*, income_categories(id,name,code), members(full_name,member_code)",
      { count: "exact" }
    );

  if (branchId) q = q.eq("branch_id", branchId);
  if (dateFrom) q = q.gte("income_date", dateFrom);
  if (dateTo) q = q.lte("income_date", dateTo);
  if (categoryId) q = q.eq("category_id", categoryId);
  if (memberId) q = q.eq("member_id", memberId);
  if (status && status !== "all") q = q.eq("status", status);
  if (isMembershipIncome !== undefined)
    q = q.eq("is_membership_income", isMembershipIncome);

  const { data, count, error } = await q
    .order("income_date", { ascending: false })
    .range(from, to);
  assertNoError(error, "listIncome");
  const total = count ?? 0;
  return { data: (data ?? []) as Income[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function createIncome(
  input: Omit<Income, "id" | "income_number" | "created_at" | "updated_at" | "income_categories" | "members">
): Promise<Income> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("income")
    .insert(input)
    .select("*, income_categories(id,name,code), members(full_name,member_code)")
    .single();
  assertNoError(error, "createIncome");
  return data as Income;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function listExpenses(
  params: ExpenseParams = {}
): Promise<PaginatedResult<Expense>> {
  const { branchId, page = 1, pageSize = 30, dateFrom, dateTo, categoryId, vendorId, approvalStatus, status } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);

  let q = supabase
    .from("expenses")
    .select(
      "*, expense_categories(id,name,code), vendors(id,name)",
      { count: "exact" }
    );

  if (branchId) q = q.eq("branch_id", branchId);
  if (dateFrom) q = q.gte("expense_date", dateFrom);
  if (dateTo) q = q.lte("expense_date", dateTo);
  if (categoryId) q = q.eq("category_id", categoryId);
  if (vendorId) q = q.eq("vendor_id", vendorId);
  if (approvalStatus && approvalStatus !== "all")
    q = q.eq("approval_status", approvalStatus);
  if (status && status !== "all") q = q.eq("status", status);

  const { data, count, error } = await q
    .order("expense_date", { ascending: false })
    .range(from, to);
  assertNoError(error, "listExpenses");
  const total = count ?? 0;
  return { data: (data ?? []) as Expense[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function createExpense(
  input: Omit<Expense, "id" | "expense_number" | "created_at" | "updated_at" | "expense_categories" | "vendors">
): Promise<Expense> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert(input)
    .select("*, expense_categories(id,name,code), vendors(id,name)")
    .single();
  assertNoError(error, "createExpense");
  return data as Expense;
}

export async function approveExpense(
  id: string,
  approvedBy: string
): Promise<Expense> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({
      approval_status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      status: "posted",
    })
    .eq("id", id)
    .select()
    .single();
  assertNoError(error, "approveExpense");
  return data as Expense;
}

export async function rejectExpense(
  id: string,
  rejectedBy: string,
  reason: string
): Promise<Expense> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({
      approval_status: "rejected",
      rejection_reason: reason,
      updated_by: rejectedBy,
    })
    .eq("id", id)
    .select()
    .single();
  assertNoError(error, "rejectExpense");
  return data as Expense;
}

// ─── Cash Book ────────────────────────────────────────────────────────────────

export async function listCashBook(
  params: FinanceParams = {}
): Promise<PaginatedResult<CashBookEntry>> {
  const { branchId, page = 1, pageSize = 50, dateFrom, dateTo } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);
  let q = supabase.from("cash_book").select("*", { count: "exact" });
  if (branchId) q = q.eq("branch_id", branchId);
  if (dateFrom) q = q.gte("entry_date", dateFrom);
  if (dateTo) q = q.lte("entry_date", dateTo);
  const { data, count, error } = await q
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  assertNoError(error, "listCashBook");
  const total = count ?? 0;
  return { data: (data ?? []) as CashBookEntry[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function getCashBalance(branchId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_book")
    .select("balance_after")
    .eq("branch_id", branchId)
    .eq("status", "posted")
    .order("created_at", { ascending: false })
    .limit(1);
  return data && data.length > 0 ? Number((data[0] as { balance_after: number }).balance_after) : 0;
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export async function listBankAccounts(
  branchId?: string | null
): Promise<BankAccount[]> {
  const supabase = await createClient();
  let q = supabase.from("bank_accounts").select("*").eq("status", "active").order("account_name");
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, error } = await q;
  assertNoError(error, "listBankAccounts");
  return (data ?? []) as BankAccount[];
}

export async function createBankAccount(
  input: Omit<BankAccount, "id" | "created_at" | "updated_at">
): Promise<BankAccount> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert(input)
    .select()
    .single();
  assertNoError(error, "createBankAccount");
  return data as BankAccount;
}

export async function listBankTransactions(
  params: FinanceParams & { bankAccountId?: string; reconciled?: boolean } = {}
): Promise<PaginatedResult<BankTransaction>> {
  const { branchId, page = 1, pageSize = 50, dateFrom, dateTo, bankAccountId, reconciled } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);
  let q = supabase
    .from("bank_transactions")
    .select("*, bank_accounts(id,account_name,bank_name)", { count: "exact" });
  if (branchId) q = q.eq("branch_id", branchId);
  if (bankAccountId) q = q.eq("bank_account_id", bankAccountId);
  if (dateFrom) q = q.gte("txn_date", dateFrom);
  if (dateTo) q = q.lte("txn_date", dateTo);
  if (typeof reconciled === "boolean") q = q.eq("is_reconciled", reconciled);
  const { data, count, error } = await q
    .order("txn_date", { ascending: false })
    .range(from, to);
  assertNoError(error, "listBankTransactions");
  const total = count ?? 0;
  return { data: (data ?? []) as BankTransaction[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function setBankTransactionReconciled(
  transactionId: string,
  reconciled: boolean,
  userId: string | null
): Promise<BankTransaction> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_transactions")
    .update({
      is_reconciled: reconciled,
      reconciled_at: reconciled ? new Date().toISOString() : null,
      reconciled_by: reconciled ? userId : null,
    })
    .eq("id", transactionId)
    .select("*, bank_accounts(id,account_name,bank_name)")
    .single();
  assertNoError(error, "setBankTransactionReconciled");
  return data as BankTransaction;
}

// ─── Journal Entries ─────────────────────────────────────────────────────────

export async function listJournalEntries(
  params: FinanceParams = {}
): Promise<PaginatedResult<JournalEntry>> {
  const { branchId, page = 1, pageSize = 30, dateFrom, dateTo, status } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);
  let q = supabase
    .from("journal_entries")
    .select("*, journal_lines(*, chart_of_accounts(id,account_code,account_name,account_type))", { count: "exact" });
  if (branchId) q = q.eq("branch_id", branchId);
  if (dateFrom) q = q.gte("entry_date", dateFrom);
  if (dateTo) q = q.lte("entry_date", dateTo);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, count, error } = await q
    .order("entry_date", { ascending: false })
    .range(from, to);
  assertNoError(error, "listJournalEntries");
  const total = count ?? 0;
  return { data: (data ?? []) as JournalEntry[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function postJournalEntry(
  id: string,
  postedBy: string
): Promise<JournalEntry> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .update({ status: "posted", posted_by: postedBy, posted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft")
    .select()
    .single();
  assertNoError(error, "postJournalEntry");
  return data as JournalEntry;
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

export async function getLedger(
  params: LedgerParams = {}
): Promise<PaginatedResult<LedgerEntry>> {
  const { branchId, page = 1, pageSize = 100, accountId, dateFrom, dateTo } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);
  let q = supabase.from("ledger").select("*", { count: "exact" });
  if (branchId) q = q.eq("branch_id", branchId);
  if (accountId) q = q.eq("account_id", accountId);
  if (dateFrom) q = q.gte("entry_date", dateFrom);
  if (dateTo) q = q.lte("entry_date", dateTo);
  const { data, count, error } = await q
    .order("entry_date", { ascending: false })
    .range(from, to);
  assertNoError(error, "getLedger");
  const total = count ?? 0;
  return { data: (data ?? []) as LedgerEntry[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

// ─── GST ──────────────────────────────────────────────────────────────────────

export async function listGstTransactions(
  params: GstParams = {}
): Promise<PaginatedResult<GstTransaction>> {
  const { branchId, page = 1, pageSize = 50, dateFrom, dateTo, txnType, status } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);
  let q = supabase.from("gst_transactions").select("*", { count: "exact" });
  if (branchId) q = q.eq("branch_id", branchId);
  if (dateFrom) q = q.gte("txn_date", dateFrom);
  if (dateTo) q = q.lte("txn_date", dateTo);
  if (txnType && txnType !== "all") q = q.eq("txn_type", txnType);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, count, error } = await q
    .order("txn_date", { ascending: false })
    .range(from, to);
  assertNoError(error, "listGstTransactions");

  const rows = (data ?? []) as GstTransaction[];
  const memberIds = Array.from(
    new Set(rows.map((row) => row.member_id).filter((value): value is string => Boolean(value)))
  );
  const branchIds = Array.from(
    new Set(rows.map((row) => row.branch_id).filter((value): value is string => Boolean(value)))
  );
  const paymentIds = Array.from(
    new Set(rows.map((row) => row.payment_id).filter((value): value is string => Boolean(value)))
  );

  const [membersResult, branchesResult, paymentsResult] = await Promise.all([
    memberIds.length > 0
      ? supabase.from("members").select("id, full_name, member_code").in("id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    branchIds.length > 0
      ? supabase.from("branches").select("id, name").in("id", branchIds)
      : Promise.resolve({ data: [], error: null }),
    paymentIds.length > 0
      ? supabase.from("payments").select("id, amount, method, status").in("id", paymentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  assertNoError(membersResult.error, "listGstTransactions members");
  assertNoError(branchesResult.error, "listGstTransactions branches");
  assertNoError(paymentsResult.error, "listGstTransactions payments");

  const membersById = new Map((membersResult.data ?? []).map((member) => [member.id as string, member]));
  const branchesById = new Map((branchesResult.data ?? []).map((branch) => [branch.id as string, branch]));
  const paymentsById = new Map((paymentsResult.data ?? []).map((payment) => [payment.id as string, payment]));

  const hydratedRows = rows.map((row) => ({
    ...row,
    members: row.member_id ? membersById.get(row.member_id) ?? null : null,
    branches: row.branch_id ? branchesById.get(row.branch_id) ?? null : null,
    payments: row.payment_id ? paymentsById.get(row.payment_id) ?? null : null,
  })) as GstTransaction[];

  const total = count ?? 0;
  return { data: hydratedRows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function getGstSummary(
  branchId?: string | null,
  dateFrom?: string,
  dateTo?: string
) {
  const supabase = await createClient();
  let q = supabase
    .from("gst_transactions")
    .select("txn_type, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax")
    .eq("status", "posted");
  if (branchId) q = q.eq("branch_id", branchId);
  if (dateFrom) q = q.gte("txn_date", dateFrom);
  if (dateTo) q = q.lte("txn_date", dateTo);
  const { data, error } = await q;
  assertNoError(error, "getGstSummary");

  const sales = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
  const purchases = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
  for (const r of data ?? []) {
    const target = r.txn_type === "sales" ? sales : purchases;
    target.taxable += Number(r.taxable_amount);
    target.cgst += Number(r.cgst_amount);
    target.sgst += Number(r.sgst_amount);
    target.igst += Number(r.igst_amount);
    target.total += Number(r.total_tax);
  }
  return { sales, purchases, netGst: sales.total - purchases.total, grossRevenue: sales.taxable + sales.total };
}

// ─── Receivables ──────────────────────────────────────────────────────────────

export type ReceivableWithDisplayStatus = Receivable & {
  display_status: ReceivableDisplayStatus;
};

/**
 * Lists receivables with a fresh, date-aware `display_status` computed on
 * every call (see computeReceivableDisplayStatus). `status` in `params`
 * filters on that computed status ("overdue" | "pending" | "paid" |
 * "written_off"), not on the stale stored column — except "written_off"
 * itself, which IS a reliable, manually-set DB value and can be pushed down
 * to the query.
 *
 * Filtering/pagination happen after the status is derived (in memory) rather
 * than in the SQL query, since the stored `status` column can't be trusted
 * for "overdue" vs "pending". This is a single, non-paginated fetch of a
 * branch's open receivables (no per-row extra queries), which stays cheap
 * for the realistic size of this table; if that ever changes, the aggregate
 * counts (getOutstandingReceivablesSummary) already do the same balance/date
 * math directly in Postgres-fetched rows without loading full payment
 * history, so this can be swapped for a DB view without touching callers.
 */
export async function listReceivables(
  params: ReceivableParams = {}
): Promise<PaginatedResult<ReceivableWithDisplayStatus>> {
  const { branchId, page = 1, pageSize = 30, status, receivableType, memberId } = params;
  const supabase = await createClient();
  const todayKey = financeTodayKey();

  let q = supabase
    .from("receivables")
    .select("*, members(full_name,member_code,phone)");
  if (branchId) q = q.eq("branch_id", branchId);
  if (receivableType && receivableType !== "all") q = q.eq("receivable_type", receivableType);
  if (memberId) q = q.eq("member_id", memberId);
  // written_off is the one status value that's actually trustworthy in the
  // DB (a deliberate manual action, never a time-based snapshot) — safe to
  // filter at the query level.
  if (status === "written_off") q = q.eq("status", "written_off");

  const { data, error } = await q.order("due_date", { ascending: true, nullsFirst: false });
  assertNoError(error, "listReceivables");

  const withStatus: ReceivableWithDisplayStatus[] = ((data ?? []) as Receivable[]).map((row) => ({
    ...row,
    display_status: computeReceivableDisplayStatus(
      Number(row.balance_amount ?? 0),
      row.due_date,
      row.status,
      todayKey,
      { isInstallment: Boolean(row.is_installment), nextInstallmentDueDate: row.next_installment_due_date }
    ),
  }));

  const filtered =
    !status || status === "all"
      ? // Default / "all" = the Outstanding Dues view: everything actually
        // owed right now, regardless of what its stored status says.
        withStatus.filter((row) => row.display_status === "overdue" || row.display_status === "pending")
      : status === "written_off"
      ? withStatus // already narrowed by the DB query above
      : withStatus.filter((row) => row.display_status === status);

  const total = filtered.length;
  const [from, to] = pageRange(page, pageSize);
  const paged = filtered.slice(from, to + 1);

  return {
    data: paged,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ─── Lightweight installments (migration 0054) ───────────────────────────────
//
// Two writes, both scoped to a single invoice by id (and, when given, by
// branch — matching the same manual branch-scoping convention already used
// by app/actions/subscription-actions.ts rather than a second RLS layer):
//   - setInvoiceInstallmentPlan: mark (or clear) the plan without moving
//     any money. Used when staff decide upfront that a partially-paid
//     invoice's balance is expected on a later date, not right now.
//   - recordReceivablePayment: the missing capability this feature also
//     had to add — there was previously no way at all to collect a later,
//     additional payment against an invoice that already exists. Inserts a
//     payments row and updates invoices.amount_paid; the 0047/0054 DB
//     trigger (sync_receivable_from_invoice) then re-syncs the matching
//     receivables row automatically, so nothing here writes to
//     `receivables` directly.
//
// Both are plain amount/date operations — no proration, no schedule table,
// no partial-installment breakdown. See migration 0054's header for the
// full scope note.

/**
 * Marks (or clears, by passing `nextInstallmentDueDate: null`) an
 * invoice's lightweight installment plan. Does not move money — see
 * recordReceivablePayment for collecting a payment. Throws if the invoice
 * has no remaining balance (an installment plan only makes sense while
 * something is still owed).
 */
export async function setInvoiceInstallmentPlan(input: {
  invoiceId: string;
  branchId?: string | null;
  nextInstallmentDueDate: string | null;
}): Promise<void> {
  const supabase = await createClient();

  let invoiceQuery = supabase
    .from("invoices")
    .select("id, total_amount, amount_paid, status")
    .eq("id", input.invoiceId);
  if (input.branchId) invoiceQuery = invoiceQuery.eq("branch_id", input.branchId);
  const { data: invoice, error } = await invoiceQuery.maybeSingle();
  if (error) throw new Error(`[finance.service] setInvoiceInstallmentPlan: ${error.message}`);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "void") throw new Error("Cannot set an installment plan on a voided invoice.");

  const balance = calculatePaymentBalance(Number(invoice.total_amount ?? 0), Number(invoice.amount_paid ?? 0)).pendingAmount;
  if (balance <= 0) throw new Error("This invoice has no remaining balance to put on an installment plan.");

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      is_installment: Boolean(input.nextInstallmentDueDate),
      next_installment_due_date: input.nextInstallmentDueDate,
    })
    .eq("id", invoice.id);
  if (updateError) throw new Error(`[finance.service] setInvoiceInstallmentPlan: ${updateError.message}`);
}

export interface RecordReceivablePaymentInput {
  invoiceId: string;
  branchId?: string | null;
  amount: number;
  method: "cash" | "upi" | "card" | "online" | "check";
  transactionRef?: string | null;
  collectedBy: string;
  /**
   * Undefined = leave the invoice's existing installment plan untouched.
   * A date string = set/replace the next installment due date (also
   * implies is_installment = true). Explicit null = clear the plan (this
   * was the last expected installment, or staff no longer want it tracked
   * as one). Ignored entirely when this payment fully clears the balance —
   * a fully paid invoice is never left flagged as an installment.
   */
  nextInstallmentDueDate?: string | null;
}

export interface RecordReceivablePaymentResult {
  invoiceId: string;
  paymentId: string;
  remainingBalance: number;
  isInstallment: boolean;
  nextInstallmentDueDate: string | null;
}

/**
 * Records a payment against an invoice that already exists — the
 * "partial-payment continuation" half of the installments feature. Inserts
 * a `payments` row and updates `invoices.amount_paid`/`status`; the DB
 * trigger from 0047/0054 re-syncs the matching `receivables` row.
 */
export async function recordReceivablePayment(
  input: RecordReceivablePaymentInput
): Promise<RecordReceivablePaymentResult> {
  const supabase = await createClient();

  let invoiceQuery = supabase
    .from("invoices")
    .select("id, member_id, subscription_id, branch_id, tenant_id, total_amount, amount_paid, status, is_installment, next_installment_due_date")
    .eq("id", input.invoiceId);
  if (input.branchId) invoiceQuery = invoiceQuery.eq("branch_id", input.branchId);
  const { data: invoice, error: invoiceError } = await invoiceQuery.maybeSingle();
  if (invoiceError) throw new Error(`[finance.service] recordReceivablePayment: ${invoiceError.message}`);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "void") throw new Error("Cannot record a payment against a voided invoice.");

  if (!(input.amount > 0)) throw new Error("Payment amount must be greater than zero.");

  const currentPaid = Number(invoice.amount_paid ?? 0);
  const total = Number(invoice.total_amount ?? 0);
  const balanceBefore = calculatePaymentBalance(total, currentPaid).pendingAmount;
  if (input.amount > balanceBefore) {
    throw new Error(`Payment of ${input.amount.toFixed(2)} exceeds the remaining balance of ${balanceBefore.toFixed(2)}.`);
  }

  const afterBalance = calculatePaymentBalance(total, currentPaid + input.amount);
  const fullyPaid = afterBalance.pendingAmount <= 0;

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      invoice_id: invoice.id,
      member_id: invoice.member_id,
      subscription_id: invoice.subscription_id,
      branch_id: invoice.branch_id,
      tenant_id: invoice.tenant_id,
      amount: input.amount,
      method: input.method,
      status: "completed",
      transaction_reference: input.transactionRef ?? null,
      paid_at: new Date().toISOString(),
      collected_by: input.collectedBy,
    })
    .select("id")
    .single();
  if (paymentError || !payment) throw new Error(paymentError?.message ?? "Unable to record payment.");

  // Resolve what the invoice's installment plan should be after this
  // payment: cleared if fully paid; otherwise whatever the caller asked
  // for, or left exactly as it was if the caller didn't touch it.
  const nextIsInstallment = fullyPaid
    ? false
    : input.nextInstallmentDueDate !== undefined
      ? Boolean(input.nextInstallmentDueDate)
      : Boolean(invoice.is_installment);
  const nextInstallmentDueDate = fullyPaid
    ? null
    : input.nextInstallmentDueDate !== undefined
      ? input.nextInstallmentDueDate
      : (invoice.next_installment_due_date as string | null);

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      amount_paid: afterBalance.amountPaid,
      status: fullyPaid ? "paid" : "partial",
      is_installment: nextIsInstallment,
      next_installment_due_date: nextInstallmentDueDate,
    })
    .eq("id", invoice.id);
  if (updateError) throw new Error(`[finance.service] recordReceivablePayment: ${updateError.message}`);

  return {
    invoiceId: invoice.id,
    paymentId: payment.id,
    remainingBalance: afterBalance.pendingAmount,
    isInstallment: nextIsInstallment,
    nextInstallmentDueDate,
  };
}

// ─── P&L Summary ──────────────────────────────────────────────────────────────

export async function getProfitAndLoss(
  branchId?: string | null,
  dateFrom?: string,
  dateTo?: string
) {
  const supabase = await createClient();

  let incQuery = supabase
    .from("income")
    .select("total_amount, income_categories(name)")
    .eq("status", "posted");
  if (branchId) incQuery = incQuery.eq("branch_id", branchId);
  if (dateFrom) incQuery = incQuery.gte("income_date", dateFrom);
  if (dateTo)   incQuery = incQuery.lte("income_date", dateTo);

  let expQuery = supabase
    .from("expenses")
    .select("total_amount, expense_categories(name)")
    .eq("status", "posted")
    .eq("approval_status", "approved");
  if (branchId) expQuery = expQuery.eq("branch_id", branchId);
  if (dateFrom) expQuery = expQuery.gte("expense_date", dateFrom);
  if (dateTo)   expQuery = expQuery.lte("expense_date", dateTo);

  const [incResult, expResult] = await Promise.all([incQuery, expQuery]);

  // Group income by category
  const incByCategory: Record<string, number> = {};
  let totalIncome = 0;
  for (const r of incResult.data ?? []) {
    const cat = (r.income_categories as unknown as { name: string } | null)?.name ?? "Other";
    incByCategory[cat] = (incByCategory[cat] ?? 0) + Number(r.total_amount);
    totalIncome += Number(r.total_amount);
  }

  // Group expenses by category
  const expByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  for (const r of expResult.data ?? []) {
    const cat = (r.expense_categories as unknown as { name: string } | null)?.name ?? "Other";
    expByCategory[cat] = (expByCategory[cat] ?? 0) + Number(r.total_amount);
    totalExpenses += Number(r.total_amount);
  }

  return {
    incomeByCategory: incByCategory,
    expenseByCategory: expByCategory,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
  };
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

export async function getTrialBalance(branchId?: string | null) {
  const supabase = await createClient();
  let q = supabase
    .from("ledger")
    .select("account_id, entry_type, amount");
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, error } = await q;
  assertNoError(error, "getTrialBalance");

  const map = new Map<string, { debit: number; credit: number }>();
  for (const r of data ?? []) {
    const e = map.get(r.account_id as string) ?? { debit: 0, credit: 0 };
    if ((r.entry_type as string) === "debit") e.debit += Number(r.amount);
    else e.credit += Number(r.amount);
    map.set(r.account_id as string, e);
  }

  // Fetch account names
  const ids = Array.from(map.keys());
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, account_code, account_name, account_type")
    .in("id", ids);

  return (accounts ?? []).map((a) => {
    const b = map.get(a.id as string) ?? { debit: 0, credit: 0 };
    return { ...a, debit: b.debit, credit: b.credit, net: b.debit - b.credit };
  });
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

/**
 * Balance Sheet as of a given date: Assets = Liabilities + Equity.
 * Built on the same ledger aggregation as getTrialBalance, but (a) restricted
 * to entries on or before asOfDate, and (b) converted from raw debit/credit
 * balances to the standard accounting-equation sign convention — assets carry
 * a normal debit balance (balance = debit - credit), while liabilities and
 * equity carry a normal credit balance (balance = credit - debit).
 */
export async function getBalanceSheet(params: { branchId?: string | null; asOfDate?: string } = {}) {
  const { branchId, asOfDate } = params;
  const supabase = await createClient();
  let q = supabase.from("ledger").select("account_id, entry_type, amount, entry_date");
  if (branchId) q = q.eq("branch_id", branchId);
  if (asOfDate) q = q.lte("entry_date", asOfDate);
  const { data, error } = await q;
  assertNoError(error, "getBalanceSheet");

  const totals = new Map<string, { debit: number; credit: number }>();
  for (const r of data ?? []) {
    const e = totals.get(r.account_id as string) ?? { debit: 0, credit: 0 };
    if ((r.entry_type as string) === "debit") e.debit += Number(r.amount);
    else e.credit += Number(r.amount);
    totals.set(r.account_id as string, e);
  }

  const ids = Array.from(totals.keys());
  const emptyResult = {
    assets: [] as { id: string; account_code: string; account_name: string; account_type: string; balance: number }[],
    liabilities: [] as { id: string; account_code: string; account_name: string; account_type: string; balance: number }[],
    equity: [] as { id: string; account_code: string; account_name: string; account_type: string; balance: number }[],
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    balanced: true,
    asOfDate: asOfDate ?? null,
  };
  if (ids.length === 0) return emptyResult;

  const { data: accounts, error: accountsError } = await supabase
    .from("chart_of_accounts")
    .select("id, account_code, account_name, account_type")
    .in("id", ids);
  assertNoError(accountsError, "getBalanceSheet:accounts");

  const rows = (accounts ?? []).map((a) => {
    const b = totals.get(a.id as string) ?? { debit: 0, credit: 0 };
    return { id: a.id as string, account_code: a.account_code as string, account_name: a.account_name as string, account_type: a.account_type as string, debit: b.debit, credit: b.credit };
  });

  const assets = rows.filter((r) => r.account_type === "asset").map((r) => ({ ...r, balance: r.debit - r.credit }));
  const liabilities = rows.filter((r) => r.account_type === "liability").map((r) => ({ ...r, balance: r.credit - r.debit }));
  const equity = rows.filter((r) => r.account_type === "equity").map((r) => ({ ...r, balance: r.credit - r.debit }));

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);
  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced, asOfDate: asOfDate ?? null };
}
