import { createClient } from "@/lib/supabase/server";

export interface MembershipPlanSummary {
  id: string;
  branch_id: string | null;
  name: string;
  price: number;
  gst_percent: number;
  discount_percent: number;
  duration_months: number;
  features: string[];
  status: "active" | "inactive";
}

function parseFeatures(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

export { calculateMembershipPlanTotals } from "@/lib/membership-plan-calculations";

export async function listMembershipPlans(params: {
  branchId?: string | null;
  status?: "active" | "inactive" | "all";
} = {}): Promise<MembershipPlanSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("membership_plans")
    .select("id, branch_id, name, price, gst_percent, discount_percent, duration_months, features, status")
    .order("created_at", { ascending: false });

  if (params.branchId) query = query.eq("branch_id", params.branchId);
  if (params.status && params.status !== "all") query = query.eq("status", params.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((plan) => ({
    id: plan.id,
    branch_id: plan.branch_id ?? null,
    name: plan.name,
    price: Number(plan.price ?? 0),
    gst_percent: Number(plan.gst_percent ?? 0),
    discount_percent: Number(plan.discount_percent ?? 0),
    duration_months: Number(plan.duration_months ?? 0),
    features: parseFeatures(plan.features),
    status: plan.status === "inactive" ? "inactive" : "active",
  }));
}

export async function getMembershipPlanById(id: string, branchId?: string | null): Promise<MembershipPlanSummary | null> {
  const supabase = await createClient();
  let query = supabase
    .from("membership_plans")
    .select("id, branch_id, name, price, gst_percent, discount_percent, duration_months, features, status")
    .eq("id", id);
  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    branch_id: data.branch_id ?? null,
    name: data.name,
    price: Number(data.price ?? 0),
    gst_percent: Number(data.gst_percent ?? 0),
    discount_percent: Number(data.discount_percent ?? 0),
    duration_months: Number(data.duration_months ?? 0),
    features: parseFeatures(data.features),
    status: data.status === "inactive" ? "inactive" : "active",
  };
}
