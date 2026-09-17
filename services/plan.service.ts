import { createClient } from "@/lib/supabase/server";
import { selectWithSchemaFallback } from "@/lib/supabase/select-fallback";
import { inferPlanType } from "@/lib/membership-plan-type";

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
  plan_type: "individual" | "couple";
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

const PLAN_COLUMNS_BASE = "id, branch_id, name, price, gst_percent, discount_percent, duration_months, features, status";
const PLAN_COLUMNS_WITH_TYPE = `${PLAN_COLUMNS_BASE}, plan_type`;

/**
 * plan_type ships in migration 0046. Until that migration has actually run
 * against this database, selecting it errors out the whole query — so this
 * tries the full column list first and falls back to the base columns
 * (defaulting plan_type to "individual") rather than showing no plans at
 * all. See lib/supabase/select-fallback.ts.
 */
export async function listMembershipPlans(params: {
  branchId?: string | null;
  status?: "active" | "inactive" | "all";
} = {}): Promise<MembershipPlanSummary[]> {
  const supabase = await createClient();

  async function run(columns: string) {
    let query = supabase
      .from("membership_plans")
      .select(columns)
      .order("created_at", { ascending: false });
    if (params.branchId) query = query.eq("branch_id", params.branchId);
    if (params.status && params.status !== "all") query = query.eq("status", params.status);
    return query;
  }

  const { data, error } = await selectWithSchemaFallback(run, [PLAN_COLUMNS_WITH_TYPE, PLAN_COLUMNS_BASE]);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Record<string, unknown>[]).map((plan) => ({
    id: String(plan.id),
    branch_id: (plan.branch_id as string | null) ?? null,
    name: String(plan.name ?? ""),
    price: Number(plan.price ?? 0),
    gst_percent: Number(plan.gst_percent ?? 0),
    discount_percent: Number(plan.discount_percent ?? 0),
    duration_months: Number(plan.duration_months ?? 0),
    features: parseFeatures(plan.features),
    status: plan.status === "inactive" ? "inactive" : "active",
    plan_type: inferPlanType(plan.plan_type, plan.name as string | null),
  }));
}

export async function getMembershipPlanById(id: string, branchId?: string | null): Promise<MembershipPlanSummary | null> {
  const supabase = await createClient();

  async function run(columns: string) {
    let query = supabase.from("membership_plans").select(columns).eq("id", id);
    if (branchId) query = query.eq("branch_id", branchId);
    return query.maybeSingle();
  }

  const { data, error } = await selectWithSchemaFallback(run, [PLAN_COLUMNS_WITH_TYPE, PLAN_COLUMNS_BASE]);
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;

  return {
    id: String(row.id),
    branch_id: (row.branch_id as string | null) ?? null,
    name: String(row.name ?? ""),
    price: Number(row.price ?? 0),
    gst_percent: Number(row.gst_percent ?? 0),
    discount_percent: Number(row.discount_percent ?? 0),
    duration_months: Number(row.duration_months ?? 0),
    features: parseFeatures(row.features),
    status: row.status === "inactive" ? "inactive" : "active",
    plan_type: inferPlanType(row.plan_type, row.name as string | null),
  };
}

export type PlanForSale = {
  id: string;
  name: string;
  branch_id: string | null;
  price: number;
  gst_percent: number;
  discount_percent: number;
  duration_months: number;
  plan_type: "individual" | "couple";
};

/**
 * The narrow plan lookup used by the sale flows (reception's new-subscription
 * action and the member-registration action) to price a sale and decide
 * whether it's a couple plan. Same schema-fallback treatment as above.
 */
export async function getPlanForSale(planId: string, branchId?: string | null): Promise<PlanForSale | null> {
  const supabase = await createClient();
  const baseColumns = "id, name, branch_id, price, gst_percent, discount_percent, duration_months";
  const withPlanType = `${baseColumns}, plan_type`;

  async function run(columns: string) {
    let query = supabase.from("membership_plans").select(columns).eq("id", planId).eq("status", "active");
    if (branchId) query = query.eq("branch_id", branchId);
    return query.maybeSingle();
  }

  const { data, error } = await selectWithSchemaFallback(run, [withPlanType, baseColumns]);
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;

  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    branch_id: (row.branch_id as string | null) ?? null,
    price: Number(row.price ?? 0),
    gst_percent: Number(row.gst_percent ?? 0),
    discount_percent: Number(row.discount_percent ?? 0),
    duration_months: Number(row.duration_months ?? 0),
    plan_type: inferPlanType(row.plan_type, row.name as string | null),
  };
}
