import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlan, storedPlanForProduct, type ProductPlanId } from "@/lib/entitlements/evaluate";

export async function assignTenantPlan(input: { tenantId: string; planId: ProductPlanId; actorUserId: string }) {
  const admin = createAdminClient();
  const { data: actor, error: actorError } = await admin.from("users").select("id,role:roles(slug)").eq("id", input.actorUserId).maybeSingle();
  const role = Array.isArray(actor?.role) ? actor.role[0]?.slug : (actor?.role as unknown as { slug?: string } | null)?.slug;
  if (actorError || !actor || role !== "super_admin") throw new Error("Only a SuperAdmin may assign tenant plans.");

  const { data: before, error: beforeError } = await admin.from("tenants").select("id,plan,status,tenant_type,is_demo,is_protected").eq("id", input.tenantId).maybeSingle();
  if (beforeError) throw new Error(beforeError.message);
  if (!before) throw new Error("Tenant not found.");

  const storedPlan = storedPlanForProduct(input.planId);
  const { data: after, error: updateError } = await admin.from("tenants").update({ plan: storedPlan }).eq("id", input.tenantId).select("id,plan,status,tenant_type,is_demo,is_protected").single();
  if (updateError || !after) throw new Error(updateError?.message ?? "Unable to assign tenant plan.");

  const { error: auditError } = await admin.from("activity_logs").insert({
    user_id: input.actorUserId,
    branch_id: null,
    action: "tenant_plan_changed",
    entity_type: "tenant",
    entity_id: input.tenantId,
    description: "Tenant SaaS plan changed by SuperAdmin",
    changes: { previous_plan: normalizePlan(before.plan), new_plan: input.planId, stored_plan: storedPlan },
  });
  if (auditError) throw new Error(auditError.message);
  return { before, after, productPlan: input.planId };
}