"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/services/workflow.service";

export async function deleteTrainerAction(trainerId: string): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to a tenant." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  // Step 1: Look up trainer directly by ID using service role — no RLS, no tenant_id filter
  // (tenant_id can be null on legacy trainer rows). Tenant isolation enforced in step 2.
  const { data: trainer, error: trainerError } = await adminClient
    .from("trainers")
    .select("id, tenant_id, branch_id, user_id, staff_id, status")
    .eq("id", trainerId)
    .maybeSingle();

  if (trainerError || !trainer) {
    return { error: "Trainer not found." };
  }

  // Step 2: Verify the trainer's branch belongs to the caller's tenant
  const { data: branch } = await adminClient
    .from("branches")
    .select("id, tenant_id")
    .eq("id", trainer.branch_id)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  if (!branch) {
    return { error: "You do not have access to delete this trainer." };
  }

  // Step 3: Managers can only delete trainers in their own branch
  if (profile.role?.slug === "manager" && profile.branch_id && trainer.branch_id !== profile.branch_id) {
    return { error: "Managers can only delete trainers in their own branch." };
  }

  // Fetch name separately for the activity log
  let trainerName = "Trainer";
  let employeeCode: string | null = null;
  let designation: string | null = null;

  if (trainer.user_id) {
    const { data: user } = await adminClient
      .from("users")
      .select("full_name")
      .eq("id", trainer.user_id)
      .maybeSingle();
    trainerName = user?.full_name?.trim() || "Trainer";
  }

  if (trainer.staff_id) {
    const { data: staff } = await adminClient
      .from("staff")
      .select("employee_code, designation")
      .eq("id", trainer.staff_id)
      .maybeSingle();
    employeeCode = staff?.employee_code ?? null;
    designation = staff?.designation ?? null;
  }

  const archivedAt = new Date().toISOString();

  const { error: trainerUpdateError } = await adminClient
    .from("trainers")
    .update({ status: "inactive", deleted_at: archivedAt, deleted_by: profile.id })
    .eq("id", trainer.id);

  if (trainerUpdateError) {
    return { error: "Unable to delete this trainer right now." };
  }

  const { data: assignedMembers, error: memberLookupError } = await adminClient
    .from("members")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .eq("assigned_trainer_id", trainer.id);

  if (memberLookupError) {
    return { error: "Trainer was archived, but assigned members could not be verified." };
  }

  const assignedMemberIds = (assignedMembers ?? []).map((member) => member.id);

  if (assignedMemberIds.length) {
    const { error: clearMemberError } = await adminClient
      .from("members")
      .update({ assigned_trainer_id: null })
      .eq("tenant_id", profile.tenant_id)
      .eq("assigned_trainer_id", trainer.id);

    if (clearMemberError) {
      return { error: "Trainer was archived, but member assignments could not be cleared." };
    }

    const { error: assignmentError } = await adminClient
      .from("trainer_assignments")
      .update({ status: "inactive", assigned_until: new Date().toISOString().slice(0, 10) })
      .eq("trainer_id", trainer.id)
      .eq("status", "active")
      .in("member_id", assignedMemberIds);

    if (assignmentError) {
      return { error: "Trainer was archived, but assignment history could not be updated." };
    }
  }

  if (trainer.staff_id) {
    await adminClient
      .from("staff")
      .update({ status: "inactive", deleted_at: archivedAt, deleted_by: profile.id })
      .eq("id", trainer.staff_id);
  }

  if (trainer.user_id) {
    await adminClient
      .from("users")
      .update({ status: "inactive" })
      .eq("id", trainer.user_id);
  }

  await logActivity({
    performedBy: profile.id,
    branchId: trainer.branch_id,
    action: "trainer_deleted",
    entityType: "trainer",
    entityId: trainer.id,
    description: `Archived trainer ${trainerName}`,
    metadata: {
      user_id: trainer.user_id,
      staff_id: trainer.staff_id,
      employee_code: employeeCode,
      designation: designation,
      previous_status: trainer.status,
      archived_status: "inactive",
      cleared_member_assignments: assignedMemberIds.length,
    },
  });

  revalidatePath("/admin/trainers");
  revalidatePath(`/admin/trainers/${trainer.id}`);
  revalidatePath("/admin/members");
  revalidatePath("/reception/members");
  revalidatePath("/admin/staff");

  return { success: "Trainer deleted successfully." };
}


