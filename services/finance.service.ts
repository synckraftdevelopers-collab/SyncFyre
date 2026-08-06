/**
 * finance.service.ts
 *
 * Repository layer for the Finance & Accounting module.
 * Uses the SSR Supabase client so RLS is enforced automatically.
 * All functions accept optional branchId — null means admin sees all.
 */

import { createClient } from "@/lib/supabase/server";
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

function pageRange(page: number, size: number): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1];
}

// ─── Finance Dashboard ────────────────────────────────────────────────────────

export async function getFinanceDashboardMetrics(
  branchId?: string | null
): Promise<FinanceDashboardMetrics> {
  const supabase = await createClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const inThirtyDays = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const applyBranch = <T extends object>(q: T): T => {
    if (!branchId) return q;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (q as any).eq("branch_id", branchId) as T;
  };

  const [
    todayIncome,
    monthIncome,
    totalIncome,
    totalExpenses,
    cashBalance,
    bankRows,
    pendingReceivables,
    activeMembers,
    renewalsDue,
  ] = await Promise.all([
    applyBranch(
      supabase
        .from("income")
        .select("total_amount")
        .eq("income_date", todayStr)
        .eq("status", "posted")
    ),
    applyBranch(
      supabase
        .from("income")
        .select("total_amount")
        .gte("income_date", monthStartStr)
        .eq("status", "posted")
    ),
    applyBranch(
      supabase.from("income").select("total_amount").eq("status", "posted")
    ),
    applyBranch(
      supabase
        .from("expenses")
        .select("total_amount")
        .eq("status", "posted")
        .eq("approval_status", "approved")
    ),
    applyBranch(
      supabase
        .from("cash_book")
        .select("balance_after")
        .eq("status", "posted")
        .order("created_at", { ascending: false })
        .limit(1)
    ),
    applyBranch(
      supabase
        .from("bank_accounts")
        .select("current_balance")
        .eq("status", "active")
    ),
    applyBranch(
      supabase
        .from("receivables")
        .select("balance_amount")
        .in("status", ["pending", "partial", "overdue"])
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

  const todayCol = sum(todayIncome.data);
  const monthCol = sum(monthIncome.data);
  const totalRev = sum(totalIncome.data);
  const totalExp = sum(totalExpenses.data);
  const netProfit = totalRev - totalExp;
  const cashInHand =
    (cashBalance.data ?? []).length > 0
      ? Number((cashBalance.data as { balance_after: number }[])[0].balance_after)
      : 0;
  const bankBal = (bankRows.data ?? []).reduce(
    (acc: number, r: { current_balance: number }) =>
      acc + Number(r.current_balance),
    0
  );
  const outstanding = (pendingReceivables.data ?? []).reduce(
    (acc: number, r: { balance_amount: number }) =>
      acc + Number(r.balance_amount),
    0
  );
  const active = (activeMembers as { count?: number | null }).count ?? 0;
  const efficiency =
    monthCol + outstanding > 0
      ? Math.round((monthCol / (monthCol + outstanding)) * 100)
      : 100;
  const avgRev = active > 0 ? Math.round(monthCol / active) : 0;

  return {
    todayCollection: todayCol,
    monthlyCollection: monthCol,
    totalRevenue: totalRev,
    totalExpenses: totalExp,
    netProfit,
    cashInHand,
    bankBalance: bankBal,
    outstandingReceivables: outstanding,
    activeMembers: active,
    membershipsRenewingDue:
      (renewalsDue as { count?: number | null }).count ?? 0,
    collectionEfficiency: efficiency,
    avgRevenuePerMember: avgRev,
  };
}

export async function getFinanceRevenueTrend(
  branchId?: string | null,
  months = 6
): Promise<FinanceRevenuePoint[]> {
  const supabase = await createClient();
  const results: FinanceRevenuePoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const from = d.toISOString().slice(0, 10);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });

    let iq = supabase
      .from("income")
      .select("total_amount")
      .gte("income_date", from)
      .lte("income_date", to)
      .eq("status", "posted");
    let eq = supabase
      .from("expenses")
      .select("total_amount")
      .gte("expense_date", from)
      .lte("expense_date", to)
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
  let q = supabase
    .from("receivables")
    .select("balance_amount, due_date")
    .in("status", ["pending", "partial", "overdue"]);
  if (branchId) q = q.eq("branch_id", branchId);

  const { data } = await q;
  const buckets: Record<string, { amount: number; count: number }> = {
    "0-30": { amount: 0, count: 0 },
    "31-60": { amount: 0, count: 0 },
    "61-90": { amount: 0, count: 0 },
    "90+": { amount: 0, count: 0 },
  };
  const today = new Date();
  for (const row of data ?? []) {
    if (!row.due_date) continue;
    const days = Math.floor(
      (today.getTime() - new Date(row.due_date as string).getTime()) /
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
  params: FinanceParams & { bankAccountId?: string } = {}
): Promise<PaginatedResult<BankTransaction>> {
  const { branchId, page = 1, pageSize = 50, dateFrom, dateTo, bankAccountId } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);
  let q = supabase
    .from("bank_transactions")
    .select("*, bank_accounts(id,account_name,bank_name)", { count: "exact" });
  if (branchId) q = q.eq("branch_id", branchId);
  if (bankAccountId) q = q.eq("bank_account_id", bankAccountId);
  if (dateFrom) q = q.gte("txn_date", dateFrom);
  if (dateTo) q = q.lte("txn_date", dateTo);
  const { data, count, error } = await q
    .order("txn_date", { ascending: false })
    .range(from, to);
  assertNoError(error, "listBankTransactions");
  const total = count ?? 0;
  return { data: (data ?? []) as BankTransaction[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
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
  const total = count ?? 0;
  return { data: (data ?? []) as GstTransaction[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
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
  return { sales, purchases, netGst: sales.total - purchases.total };
}

// ─── Receivables ──────────────────────────────────────────────────────────────

export async function listReceivables(
  params: ReceivableParams = {}
): Promise<PaginatedResult<Receivable>> {
  const { branchId, page = 1, pageSize = 30, status, receivableType, memberId } = params;
  const supabase = await createClient();
  const [from, to] = pageRange(page, pageSize);
  let q = supabase
    .from("receivables")
    .select("*, members(full_name,member_code,phone)", { count: "exact" });
  if (branchId) q = q.eq("branch_id", branchId);
  if (status && status !== "all") q = q.eq("status", status);
  if (receivableType && receivableType !== "all") q = q.eq("receivable_type", receivableType);
  if (memberId) q = q.eq("member_id", memberId);
  const { data, count, error } = await q
    .order("due_date", { ascending: true, nullsFirst: false })
    .range(from, to);
  assertNoError(error, "listReceivables");
  const total = count ?? 0;
  return { data: (data ?? []) as Receivable[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
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
