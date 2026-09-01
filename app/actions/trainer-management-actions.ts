"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/services/workflow.service";

export async function deleteTrainerAction(trainerId: string): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to a tenant." };

  const supabase = await createClient();
  let query = supabase
    .from("trainers")
    .select("id, tenant_id, branch_id, user_id, staff_id, status, users(full_name), staff(employee_code, designation)")
    .eq("id", trainerId)
    .eq("tenant_id", profile.tenant_id);

  if (profile.branch_id) {
    query = query.eq("branch_id", profile.branch_id);
  }

  const { data: trainer, error: trainerError } = await query.maybeSingle();
  if (trainerError || !trainer) {
    return { error: "Trainer not found or you do not have access to delete this trainer." };
  }

  const archivedAt = new Date().toISOString();
  const trainerName = ((trainer.users as { full_name?: string | null } | null)?.full_name ?? "Trainer").trim() || "Trainer";

  const { error: trainerUpdateError } = await supabase
    .from("trainers")
    .update({
      status: "inactive",
      deleted_at: archivedAt,
      deleted_by: profile.id,
    })
    .eq("id", trainer.id)
    .eq("tenant_id", profile.tenant_id);

  if (trainerUpdateError) {
    return { error: "Unable to delete this trainer right now." };
  }

  const { data: assignedMembers, error: memberLookupError } = await supabase
    .from("members")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .eq("assigned_trainer_id", trainer.id);

  if (memberLookupError) {
    return { error: "Trainer was archived, but assigned members could not be verified." };
  }

  const assignedMemberIds = (assignedMembers ?? []).map((member) => member.id);

  if (assignedMemberIds.length) {
    const { error: clearMemberError } = await supabase
      .from("members")
      .update({ assigned_trainer_id: null })
      .eq("tenant_id", profile.tenant_id)
      .eq("assigned_trainer_id", trainer.id);

    if (clearMemberError) {
      return { error: "Trainer was archived, but member assignments could not be cleared." };
    }

    const { error: assignmentError } = await supabase
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
    const { error: staffError } = await supabase
      .from("staff")
      .update({
        status: "inactive",
        deleted_at: archivedAt,
        deleted_by: profile.id,
      })
      .eq("id", trainer.staff_id)
      .eq("tenant_id", profile.tenant_id);

    if (staffError) {
      return { error: "Trainer was archived, but the linked staff profile could not be updated." };
    }
  }

  if (trainer.user_id) {
    const { error: userError } = await supabase
      .from("users")
      .update({ status: "inactive" })
      .eq("id", trainer.user_id)
      .eq("tenant_id", profile.tenant_id);

    if (userError) {
      return { error: "Trainer was archived, but the linked user account could not be updated." };
    }
  }

  const staffInfo = trainer.staff as { employee_code?: string | null; designation?: string | null } | null;

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
      employee_code: staffInfo?.employee_code ?? null,
      designation: staffInfo?.designation ?? null,
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


