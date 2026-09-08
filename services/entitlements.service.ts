import { createClient } from "@/lib/supabase/server";
import { getCommercialPlanTier, type CommercialPlanTier } from "@/lib/entitlements";

export async function getTenantCommercialPlanTier(tenantId: string | null | undefined): Promise<CommercialPlanTier> {
  if (!tenantId) return "free";
  const supabase = await createClient();
  const { data, error } = await supabase.from("tenants").select("plan").eq("id", tenantId).maybeSingle();
  if (error) throw new Error(error.message);
  return getCommercialPlanTier(data?.plan ?? null);
}

export async function getBranchCommercialPlanTier(branchId: string | null | undefined): Promise<CommercialPlanTier> {
  if (!branchId) return "free";
  const supabase = await createClient();
  const { data, error } = await supabase.from("branches").select("tenant_id").eq("id", branchId).maybeSingle();
  if (error) throw new Error(error.message);
  return getTenantCommercialPlanTier(data?.tenant_id ?? null);
}

export async function ensurePaidCommercialPlan(tenantId: string | null | undefined, featureLabel: string) {
  const tier = await getTenantCommercialPlanTier(tenantId);
  if (tier === "free") return { allowed: false as const, error: `${featureLabel} is available on the Paid Plan.` };
  return { allowed: true as const };
}

export async function ensurePaidCommercialPlanForBranch(branchId: string | null | undefined, featureLabel: string) {
  const tier = await getBranchCommercialPlanTier(branchId);
  if (tier === "free") return { allowed: false as const, error: `${featureLabel} is available on the Paid Plan.` };
  return { allowed: true as const };
}
