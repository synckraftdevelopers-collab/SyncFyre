"use server";

import { requireUser } from "@/lib/auth";
import { classifyTenant, type TenantClassificationInput } from "@/services/tenant-governance.service";

export type ClassificationActionState = { error?: string; success?: string };

export async function updateTenantClassificationAction(_: ClassificationActionState, formData: FormData): Promise<ClassificationActionState> {
  const actor = await requireUser(["super_admin"]);
  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const tenantType = String(formData.get("tenant_type") ?? "").trim().toLowerCase();
  const isDemoRaw = String(formData.get("is_demo") ?? "").trim().toLowerCase();
  const protectedRaw = formData.get("is_protected");
  if (!tenantId || !["customer", "demo"].includes(tenantType) || !["true", "false"].includes(isDemoRaw)) return { error: "Tenant ID, tenant type, and explicit demo state are required." };
  const input: TenantClassificationInput & { actorUserId: string } = { tenantId, tenantType: tenantType as TenantClassificationInput["tenantType"], isDemo: isDemoRaw === "true", actorUserId: actor.id };
  if (protectedRaw !== null) {
    const value = String(protectedRaw).trim().toLowerCase();
    if (!["true", "false"].includes(value)) return { error: "Protected state must be true or false." };
    input.isProtected = value === "true";
  }
  try {
    await classifyTenant(input);
    return { success: "Tenant classification updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to classify tenant." };
  }
}