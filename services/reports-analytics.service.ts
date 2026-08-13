import { createClient } from "@/lib/supabase/server";
import type {
  ReportsFilterOption,
  ReportsFilterState,
  ReportsOverviewResponse,
  ReportOverviewTableRow,
  ReportOutstandingBucket,
  ReportPaymentModePoint,
  ReportTrendPoint,
} from "@/types";

const REALTIME_TABLES = ["payments", "income", "expenses", "receivables", "attendance", "subscriptions"] as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function toDateInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function sumAmounts(rows: Array<Record<string, unknown>> | null | undefined, key: string) {
  return (rows ?? []).reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function getDateRange(filters: ReportsFilterState) {
  const now = new Date();
  const preset = filters.datePreset ?? "this_month";

  if (preset === "custom" && filters.dateFrom && filters.dateTo) {
    return { datePreset: preset, dateFrom: filters.dateFrom, dateTo: filters.dateTo };
  }

  let from = startOfDay(now);
  let to = endOfDay(now);

  switch (preset) {
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      from = startOfDay(yesterday);
      to = endOfDay(yesterday);
      break;
    }
    case "this_week": {
      const offset = (now.getDay() + 6) % 7;
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset));
      break;
    }
    case "last_week": {
      const offset = (now.getDay() + 6) % 7;
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      from = startOfDay(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7));
      to = endOfDay(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 1));
      break;
    }
    case "last_month": {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    }
    case "this_year": {
      from = startOfDay(new Date(now.getFullYear(), 0, 1));
      break;
    }
    case "last_30_days": {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      break;
    }
    case "today":
      break;
    default:
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      break;
  }

  return { datePreset: preset, dateFrom: toDateInput(from), dateTo: toDateInput(to) };
}

function normalizeFilters(filters: ReportsFilterState, scopedBranchId?: string | null) {
  return {
    ...filters,
    ...getDateRange(filters),
    branchId: scopedBranchId ?? filters.branchId ?? null,
  };
}

function applyIncomeFilters(query: any, filters: ReturnType<typeof normalizeFilters>) {
  let next = query.eq("status", "posted").gte("income_date", filters.dateFrom).lte("income_date", filters.dateTo);
  if (filters.branchId) next = next.eq("branch_id", filters.branchId);
  if (filters.paymentMode && filters.paymentMode !== "all") next = next.eq("payment_method", filters.paymentMode);
  if (filters.incomeCategoryId && filters.incomeCategoryId !== "all") next = next.eq("category_id", filters.incomeCategoryId);
  if (filters.memberId && filters.memberId !== "all") next = next.eq("member_id", filters.memberId);
  return next;
}

function applyExpenseFilters(query: any, filters: ReturnType<typeof normalizeFilters>) {
  let next = query.eq("status", "posted").eq("approval_status", "approved").gte("expense_date", filters.dateFrom).lte("expense_date", filters.dateTo);
  if (filters.branchId) next = next.eq("branch_id", filters.branchId);
  if (filters.paymentMode && filters.paymentMode !== "all") next = next.eq("payment_method", filters.paymentMode);
  if (filters.expenseCategoryId && filters.expenseCategoryId !== "all") next = next.eq("category_id", filters.expenseCategoryId);
  return next;
}

function applyReceivableFilters(query: any, filters: ReturnType<typeof normalizeFilters>) {
  let next = query.in("status", ["pending", "partial", "overdue"]);
  if (filters.branchId) next = next.eq("branch_id", filters.branchId);
  if (filters.memberId && filters.memberId !== "all") next = next.eq("member_id", filters.memberId);
  if (filters.status && filters.status !== "all") next = next.eq("status", filters.status);
  return next;
}

function makeOptions(rows: Array<Record<string, unknown>> | null | undefined, labelKey: string, valueKey: string): ReportsFilterOption[] {
  const options = (rows ?? [])
    .map((row) => ({ label: String(row[labelKey] ?? ""), value: String(row[valueKey] ?? "") }))
    .filter((row) => row.label && row.value);
  return [{ label: "All", value: "all" }, ...options];
}

export async function getReportsOverview(filters: ReportsFilterState = {}, scopedBranchId?: string | null): Promise<ReportsOverviewResponse> {
  const supabase = await createClient();
  const applied = normalizeFilters(filters, scopedBranchId);
  const today = toDateInput(new Date());
  const monthStart = toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [branchesResult, paymentModesResult, plansResult, trainersResult, incomeCategoryResult, expenseCategoryResult, incomeResult, expenseResult, receivableResult, paymentResult, activeMembersResult, newMembersResult, renewalsResult, attendanceResult] = await Promise.all([
    supabase.from("branches").select("id, name").eq("status", "active").order("name"),
    supabase.from("payment_modes").select("code, name").eq("is_active", true).order("display_order"),
    supabase.from("membership_plans").select("id, name").eq("status", "active").order("name"),
    supabase.from("trainer_report_view").select("trainer_id, trainer_name").eq("trainer_status", "active").order("trainer_name"),
    supabase.from("income_categories").select("id, name").eq("status", "active").order("name"),
    supabase.from("expense_categories").select("id, name").eq("status", "active").order("name"),
    applyIncomeFilters(supabase.from("income").select("id, income_date, total_amount, payment_method, description, status, income_categories(name), members(full_name), branches(name)"), applied),
    applyExpenseFilters(supabase.from("expenses").select("id, expense_date, total_amount, description, status, expense_categories(name), branches(name)"), applied),
    applyReceivableFilters(supabase.from("receivables").select("id, due_date, balance_amount, status, members(full_name), branches(name), invoices(invoice_number)"), applied),
    (() => {
      let query: any = supabase.from("payments").select("id, amount, refund_amount, paid_at, status").eq("status", "completed").not("paid_at", "is", null).gte("paid_at", `${applied.dateFrom}T00:00:00.000Z`).lte("paid_at", `${applied.dateTo}T23:59:59.999Z`);
      if (applied.branchId) query = query.eq("branch_id", applied.branchId);
      if (applied.paymentMode && applied.paymentMode !== "all") query = query.eq("method", applied.paymentMode);
      return query;
    })(),
    (() => {
      let query: any = supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active");
      if (applied.branchId) query = query.eq("branch_id", applied.branchId);
      return query;
    })(),
    (() => {
      let query: any = supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", `${applied.dateFrom}T00:00:00.000Z`).lte("created_at", `${applied.dateTo}T23:59:59.999Z`);
      if (applied.branchId) query = query.eq("branch_id", applied.branchId);
      return query;
    })(),
    supabase.from("subscription_history").select("id", { count: "exact", head: true }).eq("action", "renewed").gte("created_at", `${applied.dateFrom}T00:00:00.000Z`).lte("created_at", `${applied.dateTo}T23:59:59.999Z`),
    (() => {
      let query: any = supabase.from("attendance").select("id", { count: "exact", head: true }).gte("attendance_date", applied.dateFrom).lte("attendance_date", applied.dateTo);
      if (applied.branchId) query = query.eq("branch_id", applied.branchId);
      return query;
    })(),
  ]);

  const incomeRows = (incomeResult.data ?? []) as Array<Record<string, any>>;
  const expenseRows = (expenseResult.data ?? []) as Array<Record<string, any>>;
  const receivableRows = (receivableResult.data ?? []) as Array<Record<string, any>>;
  const paymentRows = (paymentResult.data ?? []) as Array<Record<string, any>>;

  const totalRevenue = sumAmounts(incomeRows, "total_amount");
  const totalExpenses = sumAmounts(expenseRows, "total_amount");
  const outstanding = sumAmounts(receivableRows, "balance_amount");
  const netProfit = totalRevenue - totalExpenses;
  const activeMembers = activeMembersResult.count ?? 0;
  const newMembers = newMembersResult.count ?? 0;
  const renewals = renewalsResult.count ?? 0;
  const attendance = attendanceResult.count ?? 0;
  const averageRevenuePerMember = activeMembers > 0 ? totalRevenue / activeMembers : 0;
  const todayCollection = paymentRows.filter((row) => String(row.paid_at).slice(0, 10) === today).reduce((sum, row) => sum + Number(row.amount ?? 0) - Number(row.refund_amount ?? 0), 0);
  const monthlyCollection = paymentRows.filter((row) => String(row.paid_at).slice(0, 10) >= monthStart).reduce((sum, row) => sum + Number(row.amount ?? 0) - Number(row.refund_amount ?? 0), 0);
  const collectionEfficiency = totalRevenue + outstanding > 0 ? (totalRevenue / (totalRevenue + outstanding)) * 100 : 0;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const trendMap = new Map<string, ReportTrendPoint>();
  incomeRows.forEach((row) => {
    const key = String(row.income_date).slice(0, 7);
    const point = trendMap.get(key) ?? { label: formatMonthLabel(key), revenue: 0, expenses: 0, profit: 0 };
    point.revenue += Number(row.total_amount ?? 0);
    point.profit = point.revenue - point.expenses;
    trendMap.set(key, point);
  });
  expenseRows.forEach((row) => {
    const key = String(row.expense_date).slice(0, 7);
    const point = trendMap.get(key) ?? { label: formatMonthLabel(key), revenue: 0, expenses: 0, profit: 0 };
    point.expenses += Number(row.total_amount ?? 0);
    point.profit = point.revenue - point.expenses;
    trendMap.set(key, point);
  });
  const monthlyTrend = Array.from(trendMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, value]) => value);

  const paymentModeMap = new Map<string, ReportPaymentModePoint>();
  incomeRows.forEach((row) => {
    const mode = String(row.payment_method ?? "unknown");
    const point = paymentModeMap.get(mode) ?? { mode, amount: 0, count: 0 };
    point.amount += Number(row.total_amount ?? 0);
    point.count += 1;
    paymentModeMap.set(mode, point);
  });
  const paymentModes = Array.from(paymentModeMap.values()).sort((a, b) => b.amount - a.amount);

  const outstandingAgingMap = new Map<string, ReportOutstandingBucket>([
    ["0-30", { bucket: "0-30", amount: 0, count: 0 }],
    ["31-60", { bucket: "31-60", amount: 0, count: 0 }],
    ["61-90", { bucket: "61-90", amount: 0, count: 0 }],
    ["90+", { bucket: "90+", amount: 0, count: 0 }],
  ]);
  receivableRows.forEach((row) => {
    if (!row.due_date) return;
    const age = Math.floor((Date.now() - new Date(String(row.due_date)).getTime()) / 86400000);
    const bucket = age <= 30 ? "0-30" : age <= 60 ? "31-60" : age <= 90 ? "61-90" : "90+";
    const point = outstandingAgingMap.get(bucket)!;
    point.amount += Number(row.balance_amount ?? 0);
    point.count += 1;
  });
  const outstandingAging = Array.from(outstandingAgingMap.values());

  const tableData: ReportOverviewTableRow[] = [
    ...incomeRows.map((row) => ({
      id: `income-${row.id}`,
      date: String(row.income_date ?? ""),
      memberName: row.members?.full_name ?? null,
      branchName: row.branches?.name ?? null,
      category: row.income_categories?.name ?? row.description ?? "Income",
      type: "income" as const,
      amount: Number(row.total_amount ?? 0),
      status: String(row.status ?? "posted"),
      reference: null,
    })),
    ...expenseRows.map((row) => ({
      id: `expense-${row.id}`,
      date: String(row.expense_date ?? ""),
      memberName: null,
      branchName: row.branches?.name ?? null,
      category: row.expense_categories?.name ?? row.description ?? "Expense",
      type: "expense" as const,
      amount: Number(row.total_amount ?? 0),
      status: String(row.status ?? "posted"),
      reference: null,
    })),
    ...receivableRows.map((row) => ({
      id: `receivable-${row.id}`,
      date: String(row.due_date ?? ""),
      memberName: row.members?.full_name ?? null,
      branchName: row.branches?.name ?? null,
      category: "Outstanding",
      type: "receivable" as const,
      amount: Number(row.balance_amount ?? 0),
      status: String(row.status ?? "pending"),
      reference: row.invoices?.invoice_number ?? null,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return {
    filters: {
      applied,
      options: {
        branches: [{ label: "All Branches", value: "all" }, ...((branchesResult.data ?? []) as Array<Record<string, any>>).map((row) => ({ label: row.name, value: row.id }))],
        paymentModes: [{ label: "All Payment Modes", value: "all" }, ...((paymentModesResult.data ?? []) as Array<Record<string, any>>).map((row) => ({ label: row.name, value: row.code }))],
        membershipPlans: makeOptions(plansResult.data as Array<Record<string, unknown>>, "name", "id"),
        trainers: makeOptions(trainersResult.data as Array<Record<string, unknown>>, "trainer_name", "trainer_id"),
        incomeCategories: makeOptions(incomeCategoryResult.data as Array<Record<string, unknown>>, "name", "id"),
        expenseCategories: makeOptions(expenseCategoryResult.data as Array<Record<string, unknown>>, "name", "id"),
      },
    },
    generatedAt: new Date().toISOString(),
    realtime: {
      enabled: true,
      status: "live",
      subscribedTables: [...REALTIME_TABLES],
    },
    summary: {
      totalRevenue,
      totalExpenses,
      netProfit,
      outstanding,
      todayCollection,
      monthlyCollection,
      activeMembers,
      newMembers,
      renewals,
      attendance,
      averageRevenuePerMember,
      collectionEfficiency,
      profitMargin,
    },
    chartData: { monthlyTrend, paymentModes, outstandingAging },
    tableData,
  };
}
