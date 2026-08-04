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
