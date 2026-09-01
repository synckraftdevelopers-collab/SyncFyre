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

function pageRange(page: number, size: number): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1];
}

export async function getOutstandingReceivablesSummary(
  branchId?: string | null
): Promise<OutstandingReceivablesSummary> {
  const supabase = await createClient();
  let query = supabase
    .from("receivables")
    .select("status, balance_amount")
    .gt("balance_amount", 0)
    .in("status", ["pending", "partial", "overdue"]);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  assertNoError(error, "getOutstandingReceivablesSummary");

  return (data ?? []).reduce<OutstandingReceivablesSummary>(
    (summary, row) => {
      const balance = Number(row.balance_amount ?? 0);
      if (balance <= 0) return summary;

      summary.totalOutstanding += balance;
      if (row.status === "overdue") {
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
