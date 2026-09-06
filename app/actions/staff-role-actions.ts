"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type StaffRoleState = { error?: string; success?: string };

export async function assignStaffRoleAction(
  _: StaffRoleState,
  formData: FormData,
): Promise<StaffRoleState> {
  const profile = await requireUser(["admin"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };
  const userId = String(formData.get("user_id") ?? "");
  const roleId = String(formData.get("role_id") ?? "");
  const branchId = String(formData.get("branch_id") ?? "");
  if (!userId || !roleId || !branchId) return { error: "Select a user, role, and branch." };

  const supabase = await createClient();
  const [{ data: role }, { data: branch }, { data: user }] = await Promise.all([
    supabase.from("roles").select("id, slug").eq("id", roleId).maybeSingle(),
    supabase.from("branches").select("id").eq("id", branchId).eq("tenant_id", profile.tenant_id).eq("status", "active").maybeSingle(),
    supabase.from("users").select("id").eq("id", userId).eq("tenant_id", profile.tenant_id).maybeSingle(),
  ]);
  if (!role || !branch || !user || role.slug === "admin") return { error: "Choose a valid user, non-admin role, and active branch in your organization." };

  const { error } = await supabase.from("users").update({ role_id: roleId, branch_id: branchId, status: "active" }).eq("id", userId).eq("tenant_id", profile.tenant_id);
  if (error) return { error: error.message };
  revalidatePath("/admin/staff");
  return { success: "Role and branch assignment saved. The user must sign out and sign in again." };
}
