import { createClient } from "@/lib/supabase/server";
import type { PaginatedResult, SubscriptionStatus } from "@/types";
import {
  createSubscriptionWithHistory,
  updateSubscriptionWithHistory,
} from "@/services/workflow.service";

export type Subscription = {
  id: string;
  member_id: string;
  plan_id: string;
  branch_id: string;
  tenant_id: string | null;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  auto_renew: boolean;
  price: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  created_by: string | null;
  created_at: string;
};

export type SubscriptionHistory = {
  id: string;
  subscription_id: string;
  member_id: string;
  previous_end_date: string | null;
  new_start_date: string;
  new_end_date: string;
  action: string;
  notes: string | null;
  performed_by: string | null;
  performed_at: string;
};

export async function listSubscriptions(params: {
  branchId?: string | null;
  memberId?: string;
  status?: SubscriptionStatus | "all";
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedResult<Subscription>> {
  const { branchId, memberId, status, page = 1, pageSize = 20 } = params;
  const supabase = await createClient();
  const from = (page - 1) * pageSize;

  let query = supabase.from("subscriptions").select("*", { count: "exact" });
  if (branchId) query = query.eq("branch_id", branchId);
  if (memberId) query = query.eq("member_id", memberId);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, count, error } = await query
    .order("end_date", { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    data: (data ?? []) as Subscription[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getSubscriptionById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, members(full_name, member_code), membership_plans(name, duration_months)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_history")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("performed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubscriptionHistory[];
}

export {
  createSubscriptionWithHistory,
  updateSubscriptionWithHistory,
};
