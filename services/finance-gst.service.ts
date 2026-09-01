import { createClient } from "@/lib/supabase/server";
import type { GstTransaction } from "@/types";

export interface FinancialYearRange {
  from: string;
  to: string;
  label: string;
  slug: string;
}

export interface GstFilters {
  branchId?: string | null;
  tenantId?: string | null;
  dateFrom?: string;
  dateTo?: string;
  financialYear?: string;
  search?: string;
  packageName?: string;
  paymentStatus?: string;
  gstApplicable?: "all" | "yes" | "no";
  page?: number;
  pageSize?: number;
  sortBy?: "member_name" | "payment_date" | "payment_amount" | "invoice_date";
  sortDir?: "asc" | "desc";
}

export interface GstDetailRow extends GstTransaction {
  memberName: string | null;
  memberCode: string | null;
  memberPhone: string | null;
  branchName: string | null;
  description: string | null;
  packageName: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  paymentAmount: number;
  totalInvoiceAmount: number;
}

export interface GstCaExportRow {
  date: string;
  invoiceNumber: string | null;
  memberId: string | null;
  memberName: string | null;
  branch: string | null;
  description: string | null;
  packageName: string | null;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  grandTotal: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  paymentAmount: number;
}

export interface GstRegisterRow {
  rowId: string;
  memberId: string;
  memberCode: string | null;
  memberName: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  branchId: string | null;
  branchName: string | null;
  packageName: string | null;
  paymentId: string | null;
  paymentDate: string | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  paymentAmount: number;
  paymentMode: string | null;
  gstApplicable: boolean;
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  grandTotal: number;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  paymentStatus: string | null;
  hasTransaction: boolean;
}

export interface GstRegisterTotals {
  totalMembers: number;
  totalTransactions: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  grandTotal: number;
}

export interface GstRegisterResult {
  data: GstRegisterRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totals: GstRegisterTotals;
}

type BranchOption = { id: string; name: string | null };
type MemberRecord = {
  id: string;
  tenant_id: string | null;
  branch_id: string | null;
  member_code: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  status: string | null;
  created_at: string;
};

type SubscriptionRecord = {
  id: string;
  member_id: string;
  plan_id: string | null;
  branch_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  total_amount: number | string | null;
  created_at: string;
  membership_plans?: { name: string | null; duration_months?: number | null } | { name: string | null; duration_months?: number | null }[] | null;
};

type PaymentRecord = {
  id: string;
  tenant_id: string | null;
  branch_id: string | null;
  member_id: string;
  invoice_id: string | null;
  subscription_id: string | null;
  amount: number | string | null;
  taxable_amount?: number | string | null;
  gst_rate?: number | string | null;
  gst_type?: "none" | "intra" | "inter" | null;
  gst_amount?: number | string | null;
  cgst_amount?: number | string | null;
  sgst_amount?: number | string | null;
  igst_amount?: number | string | null;
  method: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string;
};

type InvoiceRecord = {
  id: string;
  tenant_id: string | null;
  branch_id: string | null;
  member_id: string;
  subscription_id: string | null;
  invoice_number: string | null;
  taxable_amount?: number | string | null;
  subtotal: number | string | null;
  gst_rate?: number | string | null;
  gst_type?: "none" | "intra" | "inter" | null;
  cgst_amount?: number | string | null;
  sgst_amount?: number | string | null;
  igst_amount?: number | string | null;
  gst_amount?: number | string | null;
  total_amount: number | string | null;
  amount_paid: number | string | null;
  payment_status: string | null;
  status: string | null;
  created_at: string;
  line_items?: Array<Record<string, unknown>> | null;
  notes?: string | null;
};

type GstTransactionRecord = GstTransaction;

const paymentSelectExtended = "id, tenant_id, branch_id, member_id, invoice_id, subscription_id, amount, taxable_amount, gst_rate, gst_type, gst_amount, cgst_amount, sgst_amount, igst_amount, method, status, paid_at, created_at";
const paymentSelectFallback = "id, tenant_id, branch_id, member_id, invoice_id, subscription_id, amount, method, status, paid_at, created_at";
const invoiceSelectExtended = "id, tenant_id, branch_id, member_id, subscription_id, invoice_number, taxable_amount, subtotal, gst_rate, gst_type, cgst_amount, sgst_amount, igst_amount, gst_amount, total_amount, amount_paid, payment_status, status, created_at, line_items, notes";
const invoiceSelectFallback = "id, tenant_id, branch_id, member_id, subscription_id, invoice_number, subtotal, total_amount, amount_paid, payment_status, status, created_at, line_items, notes";
const gstSelectExtended = "id, branch_id, tenant_id, payment_id, invoice_id, member_id, txn_type, reference_type, reference_id, invoice_number, party_name, party_gstin, taxable_amount, gst_rate, gst_type, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, total_tax, hsn_sac, txn_date, status, created_by, created_at, updated_at";
const gstSelectFallback = "id, branch_id, txn_type, reference_type, reference_id, invoice_number, party_name, party_gstin, taxable_amount, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, total_tax, txn_date, status, created_by, created_at, updated_at";

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseFinancialYearStart(financialYear: string): number | null {
  const match = financialYear.trim().match(/^(\d{4})(?:-(\d{2}|\d{4}))?$/);
  return match ? Number(match[1]) : null;
}

function normalizeSearch(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function numeric(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function compareNullable(a: string | null, b: string | null, dir: "asc" | "desc") {
  const av = (a ?? "").toLowerCase();
  const bv = (b ?? "").toLowerCase();
  if (av < bv) return dir === "asc" ? -1 : 1;
  if (av > bv) return dir === "asc" ? 1 : -1;
  return 0;
}

function paymentSortValue(row: GstRegisterRow, sortBy: NonNullable<GstFilters["sortBy"]>) {
  switch (sortBy) {
    case "member_name":
      return row.memberName?.toLowerCase() ?? "";
    case "payment_amount":
      return row.paymentAmount;
    case "invoice_date":
      return row.invoiceDate ?? "";
    case "payment_date":
    default:
      return row.paymentDate ?? "";
  }
}

function extractPlanName(subscription: SubscriptionRecord | undefined, invoice: InvoiceRecord | undefined): string | null {
  const plan = Array.isArray(subscription?.membership_plans)
    ? subscription.membership_plans[0]
    : subscription?.membership_plans;
  if (plan?.name?.trim()) return plan.name.trim();
  if (Array.isArray(invoice?.line_items)) {
    const description = invoice.line_items
      .map((item) => (typeof item.description === "string" ? item.description.trim() : ""))
      .find(Boolean);
    if (description) return description;
  }
  return invoice?.notes?.trim() || null;
}

function buildFallbackGst(payment: PaymentRecord, invoice?: InvoiceRecord, gstRow?: GstTransactionRecord) {
  const paymentAmount = numeric(payment.amount);
  const invoiceTotal = numeric(invoice?.total_amount);
  const invoiceTaxable = numeric(invoice?.taxable_amount) || numeric(invoice?.subtotal);
  const invoiceGst = numeric(invoice?.gst_amount);
  const ratio = invoiceTotal > 0 ? Math.min(1, paymentAmount / invoiceTotal) : 1;

  const taxableAmount = numeric(gstRow?.taxable_amount) || numeric(payment.taxable_amount) || (invoiceTaxable > 0 ? Number((invoiceTaxable * ratio).toFixed(2)) : paymentAmount);
  const cgst = numeric(gstRow?.cgst_amount) || numeric(payment.cgst_amount) || (numeric(invoice?.cgst_amount) > 0 ? Number((numeric(invoice?.cgst_amount) * ratio).toFixed(2)) : 0);
  const sgst = numeric(gstRow?.sgst_amount) || numeric(payment.sgst_amount) || (numeric(invoice?.sgst_amount) > 0 ? Number((numeric(invoice?.sgst_amount) * ratio).toFixed(2)) : 0);
  const igst = numeric(gstRow?.igst_amount) || numeric(payment.igst_amount) || (numeric(invoice?.igst_amount) > 0 ? Number((numeric(invoice?.igst_amount) * ratio).toFixed(2)) : 0);
  const gstRate = numeric(gstRow?.gst_rate) || numeric(payment.gst_rate) || numeric(invoice?.gst_rate);
  const totalGst = numeric(gstRow?.total_tax) || numeric(payment.gst_amount) || (invoiceGst > 0 ? Number((invoiceGst * ratio).toFixed(2)) : cgst + sgst + igst);
  const grandTotal = paymentAmount || Number((taxableAmount + totalGst).toFixed(2));

  return {
    gstRate,
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalGst,
    grandTotal,
    gstApplicable: gstRate > 0 || totalGst > 0,
  };
}

function matchesSearch(row: GstRegisterRow, search: string): boolean {
  if (!search) return true;
  return [row.memberCode, row.memberName, row.phone, row.invoiceNumber, row.packageName, row.email, row.branchName]
    .some((value) => value?.toLowerCase().includes(search));
}

function matchesFilter(row: GstRegisterRow, filters: GstFilters, search: string): boolean {
  if (filters.packageName && filters.packageName !== "all" && row.packageName !== filters.packageName) return false;
  if (filters.paymentStatus && filters.paymentStatus !== "all" && (row.paymentStatus ?? "no_payment") !== filters.paymentStatus) return false;
  if (filters.gstApplicable && filters.gstApplicable !== "all") {
    if (filters.gstApplicable === "yes" && !row.gstApplicable) return false;
    if (filters.gstApplicable === "no" && row.gstApplicable) return false;
  }
  return matchesSearch(row, search);
}

export function getFinancialYearRange(referenceDate: Date): FinancialYearRange {
  const startYear = referenceDate.getMonth() >= 3 ? referenceDate.getFullYear() : referenceDate.getFullYear() - 1;
  return {
    from: formatDate(new Date(startYear, 3, 1)),
    to: formatDate(new Date(startYear + 1, 2, 31)),
    label: `FY ${startYear}-${String(startYear + 1).slice(-2)}`,
    slug: `${startYear}-${startYear + 1}`,
  };
}

export function getFinancialYearOptions(referenceDate: Date, totalYears = 5): FinancialYearRange[] {
  const current = getFinancialYearRange(referenceDate);
  const currentStartYear = parseFinancialYearStart(current.slug) ?? referenceDate.getFullYear();
  const years: FinancialYearRange[] = [];
  for (let offset = totalYears - 1; offset >= 0; offset -= 1) {
    years.push(getFinancialYearRange(new Date(currentStartYear - offset, 3, 1)));
  }
  return years;
}

export function resolveGstDateRange(filters: GstFilters, now = new Date()) {
  if (filters.dateFrom || filters.dateTo) {
    return { dateFrom: filters.dateFrom ?? "", dateTo: filters.dateTo ?? "", financialYear: filters.financialYear ?? "all" };
  }

  const financialYear = filters.financialYear ?? "all";
  const startYear = financialYear === "all" ? null : parseFinancialYearStart(financialYear);
  if (startYear !== null) {
    return { dateFrom: formatDate(new Date(startYear, 3, 1)), dateTo: formatDate(new Date(startYear + 1, 2, 31)), financialYear };
  }

  return { dateFrom: "", dateTo: "", financialYear: "all" };
}

export async function listFinanceBranches(tenantId?: string | null, branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase.from("branches").select("id, name").eq("status", "active").order("name");
  if (tenantId) query = query.eq("tenant_id", tenantId);
  if (!tenantId && branchId) query = query.eq("id", branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as BranchOption[];
}

async function loadPaymentsForRegister(supabase: Awaited<ReturnType<typeof createClient>>, filters: GstFilters, branchIds: string[], range: { dateFrom: string; dateTo: string; financialYear: string }) {
  let paymentQuery = supabase.from("payments").select(paymentSelectExtended).order("paid_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (filters.tenantId) paymentQuery = paymentQuery.eq("tenant_id", filters.tenantId);
  if (filters.branchId && branchIds.includes(filters.branchId)) paymentQuery = paymentQuery.eq("branch_id", filters.branchId);
  else if (branchIds.length > 0) paymentQuery = paymentQuery.in("branch_id", branchIds);
  if (range.dateFrom) paymentQuery = paymentQuery.gte("paid_at", `${range.dateFrom}T00:00:00.000Z`);
  if (range.dateTo) paymentQuery = paymentQuery.lte("paid_at", `${range.dateTo}T23:59:59.999Z`);

  const extended = await paymentQuery;
  if (!extended.error) return (extended.data ?? []) as PaymentRecord[];
  if (extended.error.code !== "42703") throw new Error(extended.error.message);

  let fallbackQuery = supabase.from("payments").select(paymentSelectFallback).order("paid_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (filters.tenantId) fallbackQuery = fallbackQuery.eq("tenant_id", filters.tenantId);
  if (filters.branchId && branchIds.includes(filters.branchId)) fallbackQuery = fallbackQuery.eq("branch_id", filters.branchId);
  else if (branchIds.length > 0) fallbackQuery = fallbackQuery.in("branch_id", branchIds);
  if (range.dateFrom) fallbackQuery = fallbackQuery.gte("paid_at", `${range.dateFrom}T00:00:00.000Z`);
  if (range.dateTo) fallbackQuery = fallbackQuery.lte("paid_at", `${range.dateTo}T23:59:59.999Z`);

  const fallback = await fallbackQuery;
  if (fallback.error) throw new Error(fallback.error.message);
  return (fallback.data ?? []) as PaymentRecord[];
}

async function loadInvoicesForRegister(supabase: Awaited<ReturnType<typeof createClient>>, filters: GstFilters, branchIds: string[]) {
  let invoiceQuery = supabase.from("invoices").select(invoiceSelectExtended).order("created_at", { ascending: false });
  if (filters.tenantId) invoiceQuery = invoiceQuery.eq("tenant_id", filters.tenantId);
  if (filters.branchId && branchIds.includes(filters.branchId)) invoiceQuery = invoiceQuery.eq("branch_id", filters.branchId);
  else if (branchIds.length > 0) invoiceQuery = invoiceQuery.in("branch_id", branchIds);

  const extended = await invoiceQuery;
  if (!extended.error) return (extended.data ?? []) as InvoiceRecord[];
  if (extended.error.code !== "42703") throw new Error(extended.error.message);

  let fallbackQuery = supabase.from("invoices").select(invoiceSelectFallback).order("created_at", { ascending: false });
  if (filters.tenantId) fallbackQuery = fallbackQuery.eq("tenant_id", filters.tenantId);
  if (filters.branchId && branchIds.includes(filters.branchId)) fallbackQuery = fallbackQuery.eq("branch_id", filters.branchId);
  else if (branchIds.length > 0) fallbackQuery = fallbackQuery.in("branch_id", branchIds);

  const fallback = await fallbackQuery;
  if (fallback.error) throw new Error(fallback.error.message);
  return (fallback.data ?? []) as InvoiceRecord[];
}


async function loadGstTransactionsForRegister(supabase: Awaited<ReturnType<typeof createClient>>, filters: GstFilters, branchIds: string[], range: { dateFrom: string; dateTo: string; financialYear: string }) {
  let gstQuery = supabase.from("gst_transactions").select(gstSelectExtended).eq("txn_type", "sales").eq("status", "posted");
  if (filters.tenantId) gstQuery = gstQuery.eq("tenant_id", filters.tenantId);
  if (filters.branchId && branchIds.includes(filters.branchId)) gstQuery = gstQuery.eq("branch_id", filters.branchId);
  else if (branchIds.length > 0) gstQuery = gstQuery.in("branch_id", branchIds);
  if (range.dateFrom) gstQuery = gstQuery.gte("txn_date", range.dateFrom);
  if (range.dateTo) gstQuery = gstQuery.lte("txn_date", range.dateTo);

  const extended = await gstQuery;
  if (!extended.error) return (extended.data ?? []) as GstTransactionRecord[];
  if (extended.error.code !== "42703") throw new Error(extended.error.message);

  let fallbackQuery = supabase.from("gst_transactions").select(gstSelectFallback).eq("txn_type", "sales").eq("status", "posted");
  if (filters.branchId && branchIds.includes(filters.branchId)) fallbackQuery = fallbackQuery.eq("branch_id", filters.branchId);
  else if (branchIds.length > 0) fallbackQuery = fallbackQuery.in("branch_id", branchIds);
  if (range.dateFrom) fallbackQuery = fallbackQuery.gte("txn_date", range.dateFrom);
  if (range.dateTo) fallbackQuery = fallbackQuery.lte("txn_date", range.dateTo);

  const fallback = await fallbackQuery;
  if (fallback.error) throw new Error(fallback.error.message);
  return (fallback.data ?? []) as GstTransactionRecord[];
}
export function getGstRegisterTotals(rows: GstRegisterRow[]): GstRegisterTotals {
  const memberIds = new Set<string>();
  return rows.reduce<GstRegisterTotals>((totals, row) => {
    memberIds.add(row.memberId);
    return {
      totalMembers: memberIds.size,
      totalTransactions: totals.totalTransactions + (row.hasTransaction ? 1 : 0),
      taxableAmount: totals.taxableAmount + row.taxableAmount,
      cgst: totals.cgst + row.cgst,
      sgst: totals.sgst + row.sgst,
      igst: totals.igst + row.igst,
      totalGst: totals.totalGst + row.totalGst,
      grandTotal: totals.grandTotal + row.grandTotal,
    };
  }, { totalMembers: 0, totalTransactions: 0, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, grandTotal: 0 });
}

export async function listDetailedGstTransactions(filters: GstFilters & { page?: number; pageSize?: number }) {
  const result = await getGstRegisterRows({ ...filters, gstApplicable: "yes" });
  const detailedRows: GstDetailRow[] = result.data.filter((row) => row.hasTransaction).map((row) => ({
    id: row.rowId,
    branch_id: row.branchId ?? "",
    tenant_id: filters.tenantId ?? null,
    payment_id: row.paymentId,
    invoice_id: row.invoiceId,
    member_id: row.memberId,
    txn_type: "sales",
    reference_type: "payment",
    reference_id: row.paymentId ?? row.memberId,
    invoice_number: row.invoiceNumber,
    party_name: row.memberName,
    party_gstin: null,
    taxable_amount: row.taxableAmount,
    gst_rate: row.gstRate,
    gst_type: row.totalGst > 0 ? (row.igst > 0 ? "inter" : row.cgst > 0 || row.sgst > 0 ? "intra" : "none") : "none",
    cgst_rate: row.cgst > 0 && row.gstRate > 0 ? Number((row.gstRate / 2).toFixed(2)) : 0,
    sgst_rate: row.sgst > 0 && row.gstRate > 0 ? Number((row.gstRate / 2).toFixed(2)) : 0,
    igst_rate: row.igst > 0 ? row.gstRate : 0,
    cgst_amount: row.cgst,
    sgst_amount: row.sgst,
    igst_amount: row.igst,
    total_tax: row.totalGst,
    hsn_sac: null,
    txn_date: row.paymentDate ?? row.invoiceDate ?? "",
    status: "posted",
    created_by: null,
    created_at: row.paymentDate ?? row.invoiceDate ?? new Date().toISOString(),
    updated_at: row.paymentDate ?? row.invoiceDate ?? new Date().toISOString(),
    members: row.memberName || row.memberCode ? { full_name: row.memberName ?? "", member_code: row.memberCode ?? "" } : null,
    branches: row.branchName ? { name: row.branchName } : null,
    payments: row.paymentId ? { amount: row.paymentAmount, method: row.paymentMode ?? "cash", status: row.paymentStatus ?? "completed" } : null,
    memberName: row.memberName,
    memberCode: row.memberCode,
    memberPhone: row.phone,
    branchName: row.branchName,
    description: row.packageName,
    packageName: row.packageName,
    paymentMethod: row.paymentMode,
    paymentStatus: row.paymentStatus,
    paymentAmount: row.paymentAmount,
    totalInvoiceAmount: row.grandTotal,
  }));

  return { data: detailedRows, page: result.page, pageSize: result.pageSize, total: detailedRows.length, totalPages: Math.max(1, Math.ceil(detailedRows.length / result.pageSize)) };
}

export async function getGstRegisterRows(filters: GstFilters): Promise<GstRegisterResult> {
  const supabase = await createClient();
  const allowedBranches = await listFinanceBranches(filters.tenantId, filters.branchId);
  const allowedBranchIds = allowedBranches.map((branch) => branch.id);
  const allowedBranchSet = new Set(allowedBranchIds);
  const effectiveBranchId = filters.branchId && allowedBranchSet.has(filters.branchId) ? filters.branchId : undefined;
  const range = resolveGstDateRange(filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 50;

  let memberQuery = supabase.from("members").select("id, tenant_id, branch_id, member_code, full_name, phone, email, gender, status, created_at").order("full_name");
  if (filters.tenantId) memberQuery = memberQuery.eq("tenant_id", filters.tenantId);
  if (effectiveBranchId) memberQuery = memberQuery.eq("branch_id", effectiveBranchId);
  else if (allowedBranchIds.length > 0) memberQuery = memberQuery.in("branch_id", allowedBranchIds);

  let subscriptionQuery = supabase.from("subscriptions").select("id, member_id, plan_id, branch_id, start_date, end_date, status, total_amount, created_at, membership_plans(name, duration_months)").order("created_at", { ascending: false });
  if (effectiveBranchId) subscriptionQuery = subscriptionQuery.eq("branch_id", effectiveBranchId);
  else if (allowedBranchIds.length > 0) subscriptionQuery = subscriptionQuery.in("branch_id", allowedBranchIds);

  const [membersResult, subscriptionsResult, payments, invoices, gstRows] = await Promise.all([
    memberQuery,
    subscriptionQuery,
    loadPaymentsForRegister(supabase, { ...filters, branchId: effectiveBranchId }, allowedBranchIds, range),
    loadInvoicesForRegister(supabase, { ...filters, branchId: effectiveBranchId }, allowedBranchIds),
    loadGstTransactionsForRegister(supabase, { ...filters, branchId: effectiveBranchId }, allowedBranchIds, range),
  ]);

  if (membersResult.error) throw new Error(membersResult.error.message);
  if (subscriptionsResult.error) throw new Error(subscriptionsResult.error.message);

  const members = (membersResult.data ?? []) as MemberRecord[];
  const memberById = new Map(members.map((member) => [member.id, member]));
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRecord[];

  const branchNameById = new Map(allowedBranches.map((branch) => [branch.id, branch.name]));
  const subscriptionsById = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const latestSubscriptionByMember = new Map<string, SubscriptionRecord>();
  subscriptions.forEach((subscription) => {
    if (!latestSubscriptionByMember.has(subscription.member_id)) latestSubscriptionByMember.set(subscription.member_id, subscription);
  });
  const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const latestInvoiceByMember = new Map<string, InvoiceRecord>();
  invoices.forEach((invoice) => {
    if (!latestInvoiceByMember.has(invoice.member_id)) latestInvoiceByMember.set(invoice.member_id, invoice);
  });
  const gstByPaymentId = new Map<string, GstTransactionRecord>();
  gstRows.forEach((row) => {
    const paymentKey = row.payment_id ?? (row.reference_type === "payment" ? row.reference_id : null);
    if (paymentKey && !gstByPaymentId.has(paymentKey)) gstByPaymentId.set(paymentKey, row);
  });

  const rows: GstRegisterRow[] = [];
  const paymentMemberIds = new Set<string>();

  payments.forEach((payment) => {
    paymentMemberIds.add(payment.member_id);
    const member = memberById.get(payment.member_id);
    if (!member) return;
    const invoice = payment.invoice_id ? invoicesById.get(payment.invoice_id) : undefined;
    const subscription = payment.subscription_id ? subscriptionsById.get(payment.subscription_id) : latestSubscriptionByMember.get(payment.member_id);
    const gstRow = gstByPaymentId.get(payment.id);
    const gst = buildFallbackGst(payment, invoice, gstRow);
    rows.push({
      rowId: payment.id,
      memberId: member.id,
      memberCode: member.member_code,
      memberName: member.full_name,
      phone: member.phone,
      email: member.email,
      gender: member.gender,
      branchId: payment.branch_id ?? member.branch_id,
      branchName: branchNameById.get(payment.branch_id ?? member.branch_id ?? "") ?? null,
      packageName: extractPlanName(subscription, invoice),
      paymentId: payment.id,
      paymentDate: dateOnly(payment.paid_at ?? payment.created_at),
      membershipStartDate: subscription?.start_date ?? null,
      membershipEndDate: subscription?.end_date ?? null,
      paymentAmount: numeric(payment.amount),
      paymentMode: payment.method,
      gstApplicable: gst.gstApplicable,
      gstRate: gst.gstRate,
      taxableAmount: gst.taxableAmount,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      totalGst: gst.totalGst,
      grandTotal: gst.grandTotal,
      invoiceId: invoice?.id ?? payment.invoice_id,
      invoiceNumber: gstRow?.invoice_number ?? invoice?.invoice_number ?? null,
      invoiceDate: dateOnly(invoice?.created_at ?? null),
      paymentStatus: payment.status ?? invoice?.payment_status ?? null,
      hasTransaction: true,
    });
  });

  members.forEach((member) => {
    if (paymentMemberIds.has(member.id)) return;
    const subscription = latestSubscriptionByMember.get(member.id);
    const invoice = latestInvoiceByMember.get(member.id);
    rows.push({
      rowId: `member-${member.id}`,
      memberId: member.id,
      memberCode: member.member_code,
      memberName: member.full_name,
      phone: member.phone,
      email: member.email,
      gender: member.gender,
      branchId: member.branch_id,
      branchName: branchNameById.get(member.branch_id ?? "") ?? null,
      packageName: extractPlanName(subscription, invoice),
      paymentId: null,
      paymentDate: null,
      membershipStartDate: subscription?.start_date ?? null,
      membershipEndDate: subscription?.end_date ?? null,
      paymentAmount: 0,
      paymentMode: null,
      gstApplicable: false,
      gstRate: 0,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalGst: 0,
      grandTotal: 0,
      invoiceId: invoice?.id ?? null,
      invoiceNumber: invoice?.invoice_number ?? null,
      invoiceDate: dateOnly(invoice?.created_at ?? null),
      paymentStatus: invoice?.payment_status ?? "no_payment",
      hasTransaction: false,
    });
  });

  const search = normalizeSearch(filters.search);
  const filtered = rows.filter((row) => matchesFilter(row, filters, search));
  const sortBy = filters.sortBy ?? "payment_date";
  const sortDir = filters.sortDir ?? "desc";
  filtered.sort((left, right) => {
    const a = paymentSortValue(left, sortBy);
    const b = paymentSortValue(right, sortBy);
    if (typeof a === "number" && typeof b === "number") {
      if (a < b) return sortDir === "asc" ? -1 : 1;
      if (a > b) return sortDir === "asc" ? 1 : -1;
    } else {
      const compared = compareNullable(String(a), String(b), sortDir);
      if (compared !== 0) return compared;
    }
    return compareNullable(left.memberName, right.memberName, "asc");
  });

  const totals = getGstRegisterTotals(filtered);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return { data: paginated, page, pageSize, total, totalPages, totals };
}

export async function getGstDashboardSnapshot(filters: GstFilters) {
  const now = new Date();
  const selectedRange = resolveGstDateRange(filters, now);
  const currentMonthFrom = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const currentQuarterFrom = formatDate(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1));
  const financialYearRange = getFinancialYearRange(now);

  const [register, currentMonth, currentQuarter, currentFinancialYear] = await Promise.all([
    getGstRegisterRows(filters),
    getGstRegisterRows({ ...filters, dateFrom: currentMonthFrom, dateTo: formatDate(now), financialYear: undefined, gstApplicable: "yes", page: 1, pageSize: 100 }),
    getGstRegisterRows({ ...filters, dateFrom: currentQuarterFrom, dateTo: formatDate(now), financialYear: undefined, gstApplicable: "yes", page: 1, pageSize: 100 }),
    getGstRegisterRows({ ...filters, dateFrom: financialYearRange.from, dateTo: financialYearRange.to, financialYear: undefined, gstApplicable: "yes", page: 1, pageSize: 100 }),
  ]);

  return {
    selected: register.totals,
    currentMonth: { sales: { taxable: currentMonth.totals.taxableAmount, cgst: currentMonth.totals.cgst, sgst: currentMonth.totals.sgst, igst: currentMonth.totals.igst, total: currentMonth.totals.totalGst }, grossRevenue: currentMonth.totals.grandTotal, transactions: currentMonth.totals.totalTransactions },
    currentQuarter: { sales: { taxable: currentQuarter.totals.taxableAmount, cgst: currentQuarter.totals.cgst, sgst: currentQuarter.totals.sgst, igst: currentQuarter.totals.igst, total: currentQuarter.totals.totalGst }, grossRevenue: currentQuarter.totals.grandTotal, transactions: currentQuarter.totals.totalTransactions },
    currentFinancialYear: { sales: { taxable: currentFinancialYear.totals.taxableAmount, cgst: currentFinancialYear.totals.cgst, sgst: currentFinancialYear.totals.sgst, igst: currentFinancialYear.totals.igst, total: currentFinancialYear.totals.totalGst }, grossRevenue: currentFinancialYear.totals.grandTotal, transactions: currentFinancialYear.totals.totalTransactions },
    transactions: register.data,
    totals: register.totals,
    pagination: { page: register.page, pageSize: register.pageSize, total: register.total, totalPages: register.totalPages },
    range: selectedRange,
    financialYearRange,
  };
}

export async function getGstCaExportRows(filters: GstFilters): Promise<GstCaExportRow[]> {
  const result = await getGstRegisterRows({ ...filters, page: 1, pageSize: 100000 });
  return result.data.filter((row) => row.hasTransaction).map((row) => ({
    date: row.paymentDate ?? row.invoiceDate ?? "",
    invoiceNumber: row.invoiceNumber,
    memberId: row.memberCode,
    memberName: row.memberName,
    branch: row.branchName,
    description: row.packageName,
    packageName: row.packageName,
    taxableAmount: row.taxableAmount,
    gstRate: row.gstRate,
    cgst: row.cgst,
    sgst: row.sgst,
    igst: row.igst,
    totalGst: row.totalGst,
    grandTotal: row.grandTotal,
    paymentMethod: row.paymentMode,
    paymentStatus: row.paymentStatus,
    paymentAmount: row.paymentAmount,
  }));
}


