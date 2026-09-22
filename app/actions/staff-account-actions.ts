"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffAccountState = { error?: string; success?: string };

export async function createStaffAccountAction(_: StaffAccountState, formData: FormData): Promise<StaffAccountState> {
  const requester = await requireUser(["owner", "admin", "manager"]);
  if (!requester.tenant_id) return { error: "Your account is not linked to an organization." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const branchId = String(formData.get("branch_id") ?? requester.branch_id ?? "");
  const designation = String(formData.get("designation") ?? "Receptionist").trim();
  const role = String(formData.get("role") ?? "reception");
  if (!fullName || !email || !branchId || password.length < 8) return { error: "Name, email, branch, and a password of at least 8 characters are required." };
  if (!["reception", "trainer", "dietician", "manager"].includes(role)) return { error: "Select a valid staff role." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it in .env.local to create staff accounts." };

  const admin = createAdminClient();
  const [{ data: roleRow }, { data: branch }] = await Promise.all([
    admin.from("roles").select("id").eq("slug", role).maybeSingle(),
    admin.from("branches").select("id, tenant_id").eq("id", branchId).eq("tenant_id", requester.tenant_id).eq("status", "active").maybeSingle(),
  ]);
  if (!roleRow || !branch) return { error: "Choose a valid branch and role." };

  // Check if a user with this email already exists (including soft-deleted staff).
  // If they do, reactivate them instead of creating a new auth account.
  const { data: existingUser } = await admin
    .from("users")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    // Reactivate the existing user account
    userId = existingUser.id;
    const { error: reactivateUserError } = await admin
      .from("users")
      .update({ full_name: fullName, role_id: roleRow.id, branch_id: branchId, tenant_id: requester.tenant_id, status: "active" })
      .eq("id", userId);
    if (reactivateUserError) return { error: reactivateUserError.message };

    // Also reset their auth password
    await admin.auth.admin.updateUserById(userId, { password });
  } else {
    const { data: authResult, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role }, user_metadata: { full_name: fullName } });
    if (authError || !authResult.user) return { error: authError?.message ?? "Unable to create the login account." };
    userId = authResult.user.id;
    const { error: profileError } = await admin.from("users").update({ full_name: fullName, email, role_id: roleRow.id, branch_id: branchId, tenant_id: requester.tenant_id, status: "active" }).eq("id", userId);
    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return { error: profileError.message };
    }
  }

  // Upsert staff record — reactivate if exists for this user, insert otherwise
  const { data: existingStaff } = await admin
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let staffId: string;

  if (existingStaff) {
    const { error: staffUpdateError } = await admin
      .from("staff")
      .update({ branch_id: branchId, tenant_id: requester.tenant_id, designation, status: "active", deleted_at: null, deleted_by: null })
      .eq("id", existingStaff.id);
    if (staffUpdateError) return { error: `Staff setup failed: ${staffUpdateError.message}` };
    staffId = existingStaff.id;
  } else {
    const employeeCode = `STF-${Date.now().toString().slice(-8)}`;
    const { data: staffRecord, error: staffError } = await admin
      .from("staff")
      .insert({ user_id: userId, branch_id: branchId, tenant_id: requester.tenant_id, employee_code: employeeCode, designation, status: "active" })
      .select("id")
      .single();
    if (staffError || !staffRecord) {
      if (!existingUser) await admin.auth.admin.deleteUser(userId);
      return { error: `Staff setup failed: ${staffError?.message ?? "Unable to create staff profile."}` };
    }
    staffId = staffRecord.id;
  }

  if (role === "trainer" || role === "dietician") {
    // Check for an existing (possibly soft-deleted) trainer record for this user
    // to avoid violating the trainers_user_id_key unique constraint.
    const { data: existingTrainer } = await admin
      .from("trainers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingTrainer) {
      // Reactivate the existing record instead of inserting a duplicate
      const { error: reactivateError } = await admin
        .from("trainers")
        .update({ status: "active", staff_id: staffRecord.id, branch_id: branchId, tenant_id: requester.tenant_id, deleted_at: null, deleted_by: null })
        .eq("id", existingTrainer.id);
      if (reactivateError) {
        await admin.from("staff").delete().eq("id", staffRecord.id);
        await admin.auth.admin.deleteUser(userId);
        return { error: `Staff setup failed: ${reactivateError.message}` };
      }
    } else {
      const { error: trainerError } = await admin.from("trainers").insert({ user_id: userId, staff_id: staffRecord.id, branch_id: branchId, tenant_id: requester.tenant_id, status: "active" });
      if (trainerError) {
        await admin.from("staff").delete().eq("id", staffRecord.id);
        await admin.auth.admin.deleteUser(userId);
        return { error: `Staff setup failed: ${trainerError.message}` };
      }
    }
  }

  revalidatePath("/admin/staff");
  return { success: `${fullName} can now log in as ${role}.` };
}
