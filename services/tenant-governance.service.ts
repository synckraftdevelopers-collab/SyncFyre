import { createAdminClient } from "@/lib/supabase/admin";
import { buildClassificationPatch, isDemoTenant, normalizeTenantGovernance, type TenantType } from "@/lib/tenants/governance";

export type TenantClassificationInput = {
  tenantId: string;
  tenantType: TenantType;
  isDemo: boolean;
  isProtected?: boolean;
};

export async function classifyTenant(input: TenantClassificationInput & { actorUserId: string }) {
  const patch = buildClassificationPatch(input);
  const admin = createAdminClient();
  const { data: actor, error: actorError } = await admin.from("users").select("id,role:roles(slug)").eq("id", input.actorUserId).maybeSingle();
  const role = Array.isArray(actor?.role) ? actor.role[0]?.slug : (actor?.role as unknown as { slug?: string } | null)?.slug;
  if (actorError || !actor || role !== "super_admin") throw new Error("Only a SuperAdmin may classify tenants.");

  const { data: before, error: beforeError } = await admin.from("tenants").select("id,tenant_type,is_demo,is_protected,purpose").eq("id", input.tenantId).maybeSingle();
  if (beforeError) throw new Error(beforeError.message);
  if (!before) throw new Error("Tenant not found.");

  const { data: after, error: updateError } = await admin.from("tenants").update(patch).eq("id", input.tenantId).select("id,tenant_type,is_demo,is_protected,purpose").single();
  if (updateError || !after) throw new Error(updateError?.message ?? "Unable to classify tenant.");

  const { error: auditError } = await admin.from("activity_logs").insert({
    user_id: input.actorUserId,
    branch_id: null,
    action: "tenant_classification_changed",
    entity_type: "tenant",
    entity_id: input.tenantId,
    description: "Tenant classification changed by SuperAdmin",
    changes: { previous: normalizeTenantGovernance(before), next: normalizeTenantGovernance(after) },
  });
  if (auditError) throw new Error(auditError.message);
  return { before, after, demoEligible: isDemoTenant(after) && after.is_protected === true };
}