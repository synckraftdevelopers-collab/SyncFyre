"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffAccountState = { error?: string; success?: string };

export async function createStaffAccountAction(
  _: StaffAccountState,
  formData: FormData,
): Promise<StaffAccountState> {
  await requireUser(["admin", "manager"]);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const branchId = String(formData.get("branch_id") ?? "");
  const designation = String(formData.get("designation") ?? "Receptionist").trim();
  const role = String(formData.get("role") ?? "reception");
  if (!fullName || !email || !branchId || password.length < 8) return { error: "Name, email, branch, and a password of at least 8 characters are required." };
  if (!['reception', 'trainer', 'dietician', 'manager'].includes(role)) return { error: "Select a valid staff role." };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it in .env.local to create staff accounts." };

  const admin = createAdminClient();
  const [{ data: roleRow }, { data: branch }] = await Promise.all([
    admin.from("roles").select("id").eq("slug", role).maybeSingle(),
    admin.from("branches").select("id").eq("id", branchId).eq("status", "active").maybeSingle(),
  ]);
  if (!roleRow || !branch) return { error: "Choose a valid branch and role." };

  const { data: authResult, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: fullName },
  });
  if (authError || !authResult.user) return { error: authError?.message ?? "Unable to create the login account." };

  const userId = authResult.user.id;
  const { error: profileError } = await admin.from("users").update({
    full_name: fullName,
    email,
    role_id: roleRow.id,
    branch_id: branchId,
    status: "active",
  }).eq("id", userId);
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  const employeeCode = `STF-${Date.now().toString().slice(-8)}`;
  const { data: staffRecord, error: staffError } = await admin
    .from("staff")
    .insert({
      user_id: userId,
      branch_id: branchId,
      employee_code: employeeCode,
      designation,
      status: "active",
    })
    .select("id")
    .single();
  if (staffError || !staffRecord) {
    await admin.auth.admin.deleteUser(userId);
    return { error: `Staff setup failed: ${staffError?.message ?? "Unable to create staff profile."}` };
  }

  if (role === "trainer" || role === "dietician") {
    const { error: trainerError } = await admin.from("trainers").insert({
      user_id: userId,
      staff_id: staffRecord.id,
      branch_id: branchId,
      status: "active",
    });
    if (trainerError) {
      await admin.from("staff").delete().eq("id", staffRecord.id);
      await admin.auth.admin.deleteUser(userId);
      return { error: `Staff setup failed: ${trainerError.message}` };
    }
  }
  revalidatePath("/admin/staff");
  return { success: `${fullName} can now log in as ${role}.` };
}
