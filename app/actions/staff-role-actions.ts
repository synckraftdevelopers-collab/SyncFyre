"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type StaffRoleState = { error?: string; success?: string };

export async function assignStaffRoleAction(
  _: StaffRoleState,
  formData: FormData,
): Promise<StaffRoleState> {
  await requireUser(["admin"]);
  const userId = String(formData.get("user_id") ?? "");
  const roleId = String(formData.get("role_id") ?? "");
  const branchId = String(formData.get("branch_id") ?? "");
  if (!userId || !roleId || !branchId) return { error: "Select a user, role, and branch." };

  const supabase = await createClient();
  const [{ data: role }, { data: branch }] = await Promise.all([
    supabase.from("roles").select("id, slug").eq("id", roleId).maybeSingle(),
    supabase.from("branches").select("id").eq("id", branchId).eq("status", "active").maybeSingle(),
  ]);
  if (!role || !branch || role.slug === "admin") return { error: "Choose a valid non-admin role and active branch." };

  const { error } = await supabase.from("users").update({ role_id: roleId, branch_id: branchId, status: "active" }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/staff");
  return { success: "Role and branch assignment saved. The user must sign out and sign in again." };
}
