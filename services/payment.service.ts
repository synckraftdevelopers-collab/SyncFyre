import { createClient } from "@/lib/supabase/server";
import type { PaginatedResult } from "@/types";

export interface Payment {
  id: string;
  member_id: string;
  invoice_id: string | null;
  subscription_id: string | null;
  branch_id: string;
  amount: number;
  method: "cash" | "upi" | "card" | "online";
  status: "pending" | "completed" | "failed" | "refunded" | "partially_refunded";
  transaction_reference: string | null;
  paid_at: string | null;
  created_at: string;
  // joined
  members?: { full_name: string; member_code: string } | null;
}

export interface Invoice {
  id: string;
  member_id: string;
  subscription_id: string | null;
  branch_id: string;
  subtotal: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  amount_paid: number;
  due_date: string | null;
  status: "unpaid" | "partial" | "paid" | "void";
  line_items: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  // joined
  members?: { full_name: string; member_code: string } | null;
}

export async function listPayments(params: {
  page?: number;
  pageSize?: number;
  branchId?: string | null;
  status?: string;
  memberId?: string;
}): Promise<PaginatedResult<Payment>> {
  const { page = 1, pageSize = 15, branchId, status, memberId } = params;
  const supabase = await createClient();

  let query = supabase
    .from("payments")
    .select("*, members(full_name, member_code)", { count: "exact" });

  if (branchId) query = query.eq("branch_id", branchId);
  if (status && status !== "all") query = query.eq("status", status);
  if (memberId) query = query.eq("member_id", memberId);

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    data: (data ?? []) as Payment[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*, members(full_name, member_code)")
    .eq("id", id)
    .single();
  return data as Payment | null;
}

export async function listInvoices(params: {
  page?: number;
  pageSize?: number;
  branchId?: string | null;
  status?: string;
  memberId?: string;
}): Promise<PaginatedResult<Invoice>> {
  const { page = 1, pageSize = 15, branchId, status, memberId } = params;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select("*, members(full_name, member_code)", { count: "exact" });

  if (branchId) query = query.eq("branch_id", branchId);
  if (status && status !== "all") query = query.eq("status", status);
  if (memberId) query = query.eq("member_id", memberId);

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    data: (data ?? []) as Invoice[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*, members(full_name, member_code), payments(*)")
    .eq("id", id)
    .single();
  return data as (Invoice & { payments?: Payment[] }) | null;
}

export type PendingPaymentRow = {
  invoice_id: string;
  member_id: string;
  member_name: string;
  member_code: string | null;
  phone: string | null;
  plan_name: string | null;
  total_amount: number;
  amount_paid: number;
  pending_amount: number;
  payment_status: string;
  due_date: string | null;
  membership_expiry: string | null;
  branch_id: string;
  branch_name: string | null;
  created_at: string;
};

/** Outstanding invoices are the single source of truth for pending payments. */
export async function listPendingPayments(params: {
  branchId?: string | null;
  planId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
} = {}): Promise<PendingPaymentRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select("id, member_id, branch_id, total_amount, amount_paid, balance_amount, payment_status, due_date, created_at, members(full_name, member_code, phone), branches(name), subscriptions(end_date, membership_plans(name))")
    .gt("balance_amount", 0)
    .neq("status", "void");

  if (params.branchId) query = query.eq("branch_id", params.branchId);
  if (params.dateFrom) query = query.gte("created_at", `${params.dateFrom}T00:00:00.000Z`);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59.999Z`);

  const { data, error } = await query.order("balance_amount", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((invoice: any) => {
    const subscription = Array.isArray(invoice.subscriptions) ? invoice.subscriptions[0] : invoice.subscriptions;
    const plan = Array.isArray(subscription?.membership_plans) ? subscription.membership_plans[0] : subscription?.membership_plans;
    return {
      invoice_id: invoice.id,
      member_id: invoice.member_id,
      member_name: invoice.members?.full_name ?? "Unknown member",
      member_code: invoice.members?.member_code ?? null,
      phone: invoice.members?.phone ?? null,
      plan_name: plan?.name ?? null,
      total_amount: Number(invoice.total_amount ?? 0),
      amount_paid: Number(invoice.amount_paid ?? 0),
      pending_amount: Number(invoice.balance_amount ?? 0),
      payment_status: invoice.payment_status === "partial" ? "Partially Paid" : "Pending",
      due_date: invoice.due_date ?? null,
      membership_expiry: subscription?.end_date ?? null,
      branch_id: invoice.branch_id,
      branch_name: invoice.branches?.name ?? null,
      created_at: invoice.created_at,
    } satisfies PendingPaymentRow;
  }).filter((row) => !params.planId || row.plan_name === params.planId);
}
