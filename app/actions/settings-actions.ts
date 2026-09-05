"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import { createClient } from "@/lib/supabase/server";

async function refresh() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/gst");
  revalidatePath("/admin/finance/gst/summary");
  revalidatePath("/admin/finance/gst/ca-export");
  revalidatePath("/admin/finance/invoices");
  revalidatePath("/admin/finance/settings");
  revalidatePath("/admin/finance/income/new");
  revalidatePath("/admin/finance/expenses/new");
  revalidatePath("/admin/members/new");
  revalidatePath("/admin/members");
  revalidatePath("/admin/staff/new");
  revalidatePath("/reception/members/new");
  revalidatePath("/reception/members");
  revalidatePath("/admin/dashboard");
}

export type SettingsActionState = { error?: string; success?: string };

function omitKeys<T extends Record<string, unknown>>(payload: T, keys: readonly string[]) {
  const next = {} as T;
  for (const [key, value] of Object.entries(payload)) {
    if (!keys.includes(key)) {
      next[key as keyof T] = value as T[keyof T];
    }
  }
  return next;
}

export async function updateBranchAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (!profile.branch_id) return { error: "Your account is not linked to a branch." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Branch name is required." };

  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const fiscalYearStartMonth = Number(formData.get("fiscal_year_start_month") ?? 4);
  const defaultGstRate = Number(formData.get("default_gst_rate") ?? 18);
  const gstPricingModeValue = String(formData.get("gst_pricing_mode") ?? "exclusive").trim();
  const gstPricingMode = gstPricingModeValue === "inclusive" ? "inclusive" : "exclusive";
  const gstRegistered = String(formData.get("gst_registered") ?? "false") === "true";

  const sb = await createClient();
  const { error: branchError } = await sb
    .from("branches")
    .update({ name, city, state, address, phone })
    .eq("id", profile.branch_id)
    .eq("tenant_id", profile.tenant_id);
  if (branchError) return { error: branchError.message };

  const financePayload = {
    branch_id: profile.branch_id,
    tenant_id: profile.tenant_id,
    gst_registered: gstRegistered,
    gstin: String(formData.get("gstin") ?? "").trim() || null,
    legal_business_name: String(formData.get("legal_business_name") ?? "").trim() || null,
    business_address: String(formData.get("business_address") ?? "").trim() || null,
    business_city: String(formData.get("business_city") ?? "").trim() || null,
    business_state: String(formData.get("business_state") ?? "").trim() || state,
    business_state_code: String(formData.get("business_state_code") ?? "").trim() || null,
    business_pincode: String(formData.get("business_pincode") ?? "").trim() || null,
    default_gst_rate: Number.isFinite(defaultGstRate) ? defaultGstRate : 18,
    gst_pricing_mode: gstPricingMode,
    fiscal_year_start_month: Number.isFinite(fiscalYearStartMonth) ? fiscalYearStartMonth : 4,
    updated_by: profile.id,
  };

  const { error: financeError } = await sb
    .from("finance_settings")
    .upsert(financePayload, { onConflict: "branch_id" });
  if (financeError && isMissingSchemaError(financeError)) {
    const fallbackPayload = omitKeys(financePayload, [
      "tenant_id",
      "legal_business_name",
      "business_address",
      "business_city",
      "business_state",
      "business_state_code",
      "business_pincode",
      "default_gst_rate",
      "gst_pricing_mode",
    ]);
    const { error: fallbackError } = await sb
      .from("finance_settings")
      .upsert(fallbackPayload, { onConflict: "branch_id" });
    if (fallbackError) return { error: fallbackError.message };
  } else if (financeError) {
    return { error: financeError.message };
  }

  await refresh();
  return { success: "Branch settings saved." };
}

export async function createBranchAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const profile = await requireUser(["owner", "admin"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!name) return { error: "Branch name is required." };
  if (!code) return { error: "Branch code is required." };
  if (!/^[A-Z0-9_-]{2,20}$/.test(code)) return { error: "Code must be 2-20 uppercase letters, numbers, hyphens, or underscores." };

  const sb = await createClient();
  const { data: existing } = await sb.from("branches").select("id").eq("code", code).maybeSingle();
  if (existing) return { error: `Branch code "${code}" is already in use.` };

  const branchPayload = {
    name,
    code,
    city: String(formData.get("city") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    status: "active",
    tenant_id: profile.tenant_id,
  };

  const { data: branch, error } = await sb.from("branches").insert(branchPayload).select("id").single();
  if (error || !branch) return { error: error?.message ?? "Unable to create branch." };

  const branchState = String(formData.get("state") ?? "").trim() || null;
  const branchAddress = String(formData.get("address") ?? "").trim() || null;
  const branchCity = String(formData.get("city") ?? "").trim() || null;

  const financeInsert = {
    branch_id: branch.id,
    tenant_id: profile.tenant_id,
    gst_registered: Boolean(String(formData.get("gstin") ?? "").trim()),
    gstin: String(formData.get("gstin") ?? "").trim() || null,
    legal_business_name: String(formData.get("legal_business_name") ?? "").trim() || name,
    business_address: String(formData.get("business_address") ?? "").trim() || branchAddress,
    business_city: String(formData.get("business_city") ?? "").trim() || branchCity,
    business_state: String(formData.get("business_state") ?? "").trim() || branchState,
    business_state_code: String(formData.get("business_state_code") ?? "").trim() || null,
    business_pincode: String(formData.get("business_pincode") ?? "").trim() || null,
    default_gst_rate: Number(formData.get("default_gst_rate") ?? 18) || 18,
    fiscal_year_start_month: Number(formData.get("fiscal_year_start_month") ?? 4) || 4,
    created_by: profile.id,
    updated_by: profile.id,
  };

  const { error: financeError } = await sb.from("finance_settings").insert(financeInsert);
  if (financeError && isMissingSchemaError(financeError)) {
    const fallbackInsert = omitKeys(financeInsert, [
      "tenant_id",
      "legal_business_name",
      "business_address",
      "business_city",
      "business_state",
      "business_state_code",
      "business_pincode",
      "default_gst_rate",
      "gst_pricing_mode",
    ]);
    const { error: fallbackError } = await sb.from("finance_settings").insert(fallbackInsert);
    if (fallbackError) return { error: fallbackError.message };
  } else if (financeError) {
    return { error: financeError.message };
  }

  await refresh();
  return { success: `Branch "${name}" created successfully.` };
}

export async function deleteBranchAction(formData: FormData): Promise<void> {
  const profile = await requireUser(["owner", "admin"]);
  if (!profile.tenant_id) return;

  const branchId = String(formData.get("branch_id") ?? "").trim();
  if (!branchId || branchId === profile.branch_id) return;

  const sb = await createClient();
  const { count } = await sb
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active");

  if ((count ?? 0) <= 1) return;

  await sb
    .from("branches")
    .update({ status: "inactive" })
    .eq("id", branchId)
    .eq("tenant_id", profile.tenant_id)
    .neq("id", profile.branch_id);

  await refresh();
}

export async function addCategoryAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (!profile.branch_id) return { error: "Your account is not linked to a branch." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Category name is required." };

  const kind = String(formData.get("kind"));
  const table = kind === "expense" ? "expense_categories" : "income_categories";
  const sb = await createClient();
  const { error } = await sb.from(table).insert({ branch_id: profile.branch_id, tenant_id: profile.tenant_id, name, code: String(formData.get("code") ?? "").trim() || null, status: "active", is_system: false, created_by: profile.id, updated_by: profile.id });
  if (error) return { error: error.message };

  await refresh();
  return { success: `Category "${name}" added.` };
}

export async function deactivateCategoryAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  await requireUser(["owner", "admin", "manager"]);
  const kind = String(formData.get("kind"));
  const table = kind === "expense" ? "expense_categories" : "income_categories";
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Category ID is missing." };

  const sb = await createClient();
  const { error } = await sb.from(table).update({ status: "inactive" }).eq("id", id);
  if (error) return { error: error.message };

  await refresh();
  return { success: "Category deactivated." };
}
