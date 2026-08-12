"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Revalidate all pages that reference branches or categories
async function refresh() {
  revalidatePath("/admin/settings");
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

// ─── Update existing branch ───────────────────────────────────────────────────

export async function updateBranchAction(
  _: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const profile = await requireUser(["admin", "manager"]);
  if (!profile.branch_id) return { error: "Your account is not linked to a branch." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Branch name is required." };

  const sb = await createClient();
  const { error } = await sb.from("branches").update({
    name,
    city:    String(formData.get("city")    ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    phone:   String(formData.get("phone")   ?? "").trim() || null,
  }).eq("id", profile.branch_id);

  if (error) return { error: error.message };

  const { error: settingsError } = await sb.from("finance_settings").upsert({
    branch_id: profile.branch_id,
    gstin: String(formData.get("gstin") ?? "").trim() || null,
    fiscal_year_start_month: Number(formData.get("fiscal_year_start_month") ?? 4),
    updated_by: profile.id,
  }, { onConflict: "branch_id" });

  if (settingsError) return { error: settingsError.message };

  await refresh();
  return { success: "Branch settings saved." };
}

// ─── Create new branch ────────────────────────────────────────────────────────

export async function createBranchAction(
  _: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const profile = await requireUser(["admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!name) return { error: "Branch name is required." };
  if (!code)  return { error: "Branch code is required." };
  if (!/^[A-Z0-9_-]{2,20}$/.test(code))
    return { error: "Code must be 2–20 uppercase letters, numbers, hyphens, or underscores." };

  const sb = await createClient();

  // Check code uniqueness
  const { data: existing } = await sb.from("branches").select("id").eq("code", code).maybeSingle();
  if (existing) return { error: `Branch code "${code}" is already in use. Choose a different code.` };

  const { data, error } = await sb.from("branches").insert({
    name,
    code,
    city:    String(formData.get("city")    ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    phone:   String(formData.get("phone")   ?? "").trim() || null,
    status:  "active",
  }).select("id").single();

  if (error) return { error: error.message };

  // Create finance_settings row for the new branch
  const gstin = String(formData.get("gstin") ?? "").trim() || null;
  const fiscalMonth = Number(formData.get("fiscal_year_start_month") ?? 4);
  const { error: settingsError } = await sb.from("finance_settings").insert({
    branch_id: data.id,
    gstin,
    fiscal_year_start_month: fiscalMonth,
    updated_by: profile.id,
  });

  if (settingsError) return { error: settingsError.message };

  await refresh();
  return { success: `Branch "${name}" (${code}) created successfully. It will appear in branch selectors across the app.` };
}

// ─── Add income / expense category ───────────────────────────────────────────

export async function addCategoryAction(
  _: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const profile = await requireUser(["admin", "manager"]);
  if (!profile.branch_id) return { error: "Your account is not linked to a branch." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Category name is required." };

  const kind = String(formData.get("kind"));
  const table = kind === "expense" ? "expense_categories" : "income_categories";
  const sb = await createClient();

  const { error } = await sb.from(table).insert({
    branch_id:  profile.branch_id,
    name,
    code:       String(formData.get("code") ?? "").trim() || null,
    status:     "active",
    is_system:  false,
    created_by: profile.id,
    updated_by: profile.id,
  });

  if (error) return { error: error.message };

  await refresh();
  return { success: `Category "${name}" added.` };
}

// ─── Deactivate category ──────────────────────────────────────────────────────

export async function deactivateCategoryAction(
  _: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireUser(["admin", "manager"]);

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
