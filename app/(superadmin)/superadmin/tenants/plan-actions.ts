"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { PLAN_IDS, type PlanId } from "@/lib/entitlements/registry";
import { assignTenantPlan } from "@/services/tenant-plan.service";

export type PlanActionState = { error?: string; success?: string };

export async function assignTenantPlanAction(_: PlanActionState, formData: FormData): Promise<PlanActionState> {
  const actor = await requireUser(["super_admin"]);
  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const planId = String(formData.get("plan_id") ?? "").trim() as PlanId;
  if (!tenantId || !PLAN_IDS.includes(planId)) return { error: "Tenant and product plan are required." };
  try {
    await assignTenantPlan({ tenantId, planId, actorUserId: actor.id });
    return { success: "Tenant plan updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update tenant plan." };
  }
}