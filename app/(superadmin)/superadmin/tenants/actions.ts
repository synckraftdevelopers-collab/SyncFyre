"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateTenantState = { error?: string; success?: string };

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function updateTenantAction(_: UpdateTenantState, formData: FormData): Promise<UpdateTenantState> {
  await requireUser(["super_admin"]);

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const ownerUserId = String(formData.get("owner_user_id") ?? "").trim();
  const branchId = String(formData.get("branch_id") ?? "").trim();
  const gymName = String(formData.get("gym_name") ?? "").trim();
  const gymSlug = normalizeSlug(String(formData.get("gym_slug") ?? "").trim());
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const ownerEmail = String(formData.get("owner_email") ?? "").trim().toLowerCase();
  const ownerPhone = String(formData.get("owner_phone") ?? "").trim() || null;
  const branchName = String(formData.get("branch_name") ?? "Main Branch").trim() || "Main Branch";
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;
  const tenantType = String(formData.get("tenant_type") ?? "customer").trim().toLowerCase();
  const purpose = String(formData.get("purpose") ?? "").trim() || null;
  const plan = String(formData.get("plan") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const trialStartsAt = String(formData.get("trial_starts_at") ?? "").trim() || null;
  const trialEndsAt = String(formData.get("trial_ends_at") ?? "").trim() || null;

  if (!tenantId || !branchId || !gymName || !gymSlug) return { error: "Gym, branch, and tenant identifiers are required." };
  if (ownerEmail && !/^\S+@\S+\.\S+$/.test(ownerEmail)) return { error: "Enter a valid owner email address." };
  if (!/^[a-z0-9-]{3,60}$/.test(gymSlug)) return { error: "Gym slug must use lowercase letters, numbers, or hyphens." };
  if (!["customer", "demo"].includes(tenantType)) return { error: "Tenant type must be customer or demo." };

  const admin = createAdminClient();

  const { data: existingTenant, error: lookupError } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", gymSlug)
    .neq("id", tenantId)
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (existingTenant) return { error: "That gym slug is already in use." };

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .update({
      name: gymName,
      slug: gymSlug,
      owner_email: ownerEmail || null,
      email: ownerEmail || null,
      phone: ownerPhone,
      city,
      state,
      tenant_type: tenantType,
      purpose,
      is_demo: tenantType === "demo",
      is_protected: tenantType === "demo",
      plan,
      status,
      trial_starts_at: trialStartsAt,
      trial_ends_at: trialEndsAt,
    })
    .eq("id", tenantId)
    .select("id")
    .single();
  if (tenantError || !tenant) return { error: tenantError?.message ?? "Unable to update the gym." };

  const { error: branchError } = await admin
    .from("branches")
    .update({ name: branchName, city, state, phone: ownerPhone, email: ownerEmail || null })
    .eq("id", branchId)
    .eq("tenant_id", tenantId);
  if (branchError) return { error: branchError.message };

  if (ownerUserId) {
    const { error: ownerError } = await admin
      .from("users")
      .update({ full_name: ownerName || null, email: ownerEmail || null, phone: ownerPhone })
      .eq("id", ownerUserId)
      .eq("tenant_id", tenantId);
    if (ownerError) return { error: ownerError.message };
  }

  await admin.from("activity_logs").insert({
    user_id: null,
    branch_id: branchId,
    action: "tenant_updated",
    entity_type: "tenant",
    entity_id: tenantId,
    description: `Tenant ${gymName} updated from SuperAdmin`,
    changes: { gym_name: gymName, owner_email: ownerEmail || null, owner_phone: ownerPhone, tenant_type: tenantType, purpose, plan, status, trial_starts_at: trialStartsAt, trial_ends_at: trialEndsAt },
  });

  revalidatePath("/superadmin/tenants");
  revalidatePath("/superadmin/dashboard");
  revalidatePath("/superadmin/audit-logs");
  return { success: "Gym details updated." };
}
