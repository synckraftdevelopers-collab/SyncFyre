"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCommercialPlanTier } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateTenantState = { error?: string; success?: string };

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizePlanValue(value: string | null | undefined, fallback?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (!normalized) return fallback ?? null;
  if (["free", "phase1", "phase_1", "phase-1", "trial"].includes(normalized)) return "trial";
  if (["paid", "phase2", "phase_2", "phase-2", "standard", "professional", "enterprise"].includes(normalized)) return "standard";
  return fallback ?? normalized;
}

function describePlan(plan: string | null | undefined) {
  return getCommercialPlanTier(plan) === "free" ? "Phase 1 / Free" : "Phase 2 / Paid";
}

export async function updateTenantAction(stateOrFormData: UpdateTenantState | FormData, maybeFormData?: FormData): Promise<UpdateTenantState> {
  await requireUser(["super_admin"]);

  const formData = stateOrFormData instanceof FormData ? stateOrFormData : maybeFormData;
  if (!formData) return { error: "Invalid submission." };

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  if (!tenantId) return { error: "Gym identifier is required." };

  const admin = createAdminClient();

  const { data: currentTenant, error: tenantLookupError } = await admin
    .from("tenants")
    .select("id,name,slug,owner_email,phone,city,state,tenant_type,purpose,plan,status,trial_starts_at,trial_ends_at")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenantLookupError) return { error: tenantLookupError.message };
  if (!currentTenant) return { error: "Gym not found." };
  if (currentTenant.slug === "talwalkar") return { error: "Talwalkar Gym plan cannot be changed." };

  const ownerUserId = String(formData.get("owner_user_id") ?? "").trim();
  const branchId = String(formData.get("branch_id") ?? "").trim();
  const gymNameInput = String(formData.get("gym_name") ?? "").trim();
  const gymSlugInput = String(formData.get("gym_slug") ?? "").trim();
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const ownerEmailInput = String(formData.get("owner_email") ?? "").trim().toLowerCase();
  const ownerPhone = String(formData.get("owner_phone") ?? "").trim() || null;
  const branchName = String(formData.get("branch_name") ?? "").trim();
  const cityInput = String(formData.get("city") ?? "").trim();
  const stateInput = String(formData.get("state") ?? "").trim();
  const tenantTypeInput = String(formData.get("tenant_type") ?? "").trim().toLowerCase();
  const purposeInput = String(formData.get("purpose") ?? "").trim();
  const planInput = String(formData.get("plan") ?? "").trim();
  const statusInput = String(formData.get("status") ?? "").trim();
  const trialStartsAtInput = String(formData.get("trial_starts_at") ?? "").trim();
  const trialEndsAtInput = String(formData.get("trial_ends_at") ?? "").trim();

  const gymName = gymNameInput || currentTenant.name;
  const gymSlug = normalizeSlug(gymSlugInput || currentTenant.slug);
  const ownerEmail = ownerEmailInput || currentTenant.owner_email?.toString().trim().toLowerCase() || "";
  const city = cityInput || currentTenant.city || null;
  const state = stateInput || currentTenant.state || null;
  const tenantType = ["customer", "demo"].includes(tenantTypeInput) ? tenantTypeInput : (currentTenant.tenant_type ?? "customer");
  const purpose = purposeInput || currentTenant.purpose || null;
  const plan = normalizePlanValue(planInput, currentTenant.plan) ?? currentTenant.plan;
  const status = ["active", "trial", "suspended", "cancelled"].includes(statusInput) ? statusInput : currentTenant.status;
  const trialStartsAt = trialStartsAtInput || currentTenant.trial_starts_at || null;
  const trialEndsAt = trialEndsAtInput || currentTenant.trial_ends_at || null;

  if (!gymName || !gymSlug) return { error: "Gym and gym slug are required." };
  if (ownerEmail && !/^\S+@\S+\.\S+$/.test(ownerEmail)) return { error: "Enter a valid owner email address." };
  if (!/^[a-z0-9-]{3,60}$/.test(gymSlug)) return { error: "Gym slug must use lowercase letters, numbers, or hyphens." };

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

  if (branchId) {
    const { error: branchError } = await admin
      .from("branches")
      .update({
        name: branchName || "Main Branch",
        city,
        state,
        phone: ownerPhone,
        email: ownerEmail || null,
      })
      .eq("id", branchId)
      .eq("tenant_id", tenantId);
    if (branchError) return { error: branchError.message };
  }

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
    branch_id: branchId || null,
    action: "tenant_updated",
    entity_type: "tenant",
    entity_id: tenantId,
    description: plan !== currentTenant.plan
      ? `Tenant ${gymName} plan changed from ${describePlan(currentTenant.plan)} to ${describePlan(plan)}`
      : `Tenant ${gymName} updated from SuperAdmin`,
    changes: {
      gym_name: gymName,
      owner_email: ownerEmail || null,
      owner_phone: ownerPhone,
      tenant_type: tenantType,
      purpose,
      previous_plan: currentTenant.plan,
      plan,
      status,
      trial_starts_at: trialStartsAt,
      trial_ends_at: trialEndsAt,
    },
  });

  revalidatePath("/superadmin/tenants");
  revalidatePath("/superadmin/dashboard");
  revalidatePath("/superadmin/audit-logs");
  revalidatePath("/admin", "layout");
  revalidatePath("/reception", "layout");
  revalidatePath("/trainer", "layout");
  revalidatePath("/member", "layout");
  return { success: plan !== currentTenant.plan ? `Plan updated to ${describePlan(plan)}.` : "Gym details updated." };
}

export async function updateTenantPlanAction(formData: FormData) {
  await updateTenantAction(formData);
}
