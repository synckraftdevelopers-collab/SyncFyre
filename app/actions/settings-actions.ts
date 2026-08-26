"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

export async function updateBranchAction(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (!profile.branch_id) return { error: "Your account is not linked to a branch." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Branch name is required." };

  const sb = await createClient();
  const { error } = await sb.from("branches").update({ name, city: String(formData.get("city") ?? "").trim() || null, address: String(formData.get("address") ?? "").trim() || null, phone: String(formData.get("phone") ?? "").trim() || null }).eq("id", profile.branch_id).eq("tenant_id", profile.tenant_id);
  if (error) return { error: error.message };

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
  if (existing) return { error: `Branch code \"${code}\" is already in use.` };

  const { error } = await sb.from("branches").insert({ name, code, city: String(formData.get("city") ?? "").trim() || null, address: String(formData.get("address") ?? "").trim() || null, phone: String(formData.get("phone") ?? "").trim() || null, status: "active", tenant_id: profile.tenant_id });
  if (error) return { error: error.message };

  await refresh();
  return { success: `Branch \"${name}\" created successfully.` };
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
  return { success: `Category \"${name}\" added.` };
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
