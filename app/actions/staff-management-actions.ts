"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/services/workflow.service";

export async function setStaffStatusAction(staffId: string, status: "active" | "inactive") {
  await requireUser(["admin"]);
  const supabase = await createClient();

  const { data: staff, error: staffLookupError } = await supabase
    .from("staff")
    .select("id, user_id")
    .eq("id", staffId)
    .maybeSingle();
  if (staffLookupError || !staff) throw new Error(staffLookupError?.message ?? "Staff member not found.");

  const { error: staffError } = await supabase.from("staff").update({ status }).eq("id", staffId);
  if (staffError) throw new Error(staffError.message);

  if (staff.user_id) {
    const { error: userError } = await supabase.from("users").update({ status }).eq("id", staff.user_id);
    if (userError) throw new Error(userError.message);
  }

  revalidatePath("/admin/staff");
}

export async function deleteStaffAction(
  staffId?: string | null,
  userId?: string | null,
): Promise<{ error?: string; success?: string }> {
  try {
    const profile = await requireUser(["owner", "admin", "manager"]);
    if (!profile.tenant_id) return { error: "Your account is not linked to a tenant." };

    const supabase = await createClient();
    const normalizedStaffId = staffId?.trim() || null;
    const normalizedUserId = userId?.trim() || null;

    if (!normalizedStaffId && !normalizedUserId) {
      return { error: "No staff record was selected." };
    }

    if (normalizedStaffId) {
      let query = supabase
        .from("staff")
        .select("id, tenant_id, branch_id, user_id, employee_code, designation, status, users(full_name)")
        .eq("id", normalizedStaffId)
        .eq("tenant_id", profile.tenant_id);

      if (profile.branch_id) {
        query = query.eq("branch_id", profile.branch_id);
      }

      const { data: staff, error: lookupError } = await query.maybeSingle();
      if (lookupError || !staff) {
        return { error: "Staff member not found or you do not have access to delete them." };
      }

      const name = ((staff.users as { full_name?: string | null } | null)?.full_name ?? "Staff member").trim() || "Staff member";
      const archivedAt = new Date().toISOString();

      const { error: staffError } = await supabase
        .from("staff")
        .update({
          status: "inactive",
          deleted_at: archivedAt,
          deleted_by: profile.id,
        })
        .eq("id", staff.id)
        .eq("tenant_id", profile.tenant_id);

      if (staffError) {
        return { error: "Unable to delete this staff member right now." };
      }

      if (staff.user_id) {
        const { error: userError } = await supabase
          .from("users")
          .update({ status: "inactive" })
          .eq("id", staff.user_id)
          .eq("tenant_id", profile.tenant_id);

        if (userError) {
          return { error: "Staff was archived, but the linked user account could not be updated." };
        }
      }

      try {
        await logActivity({
          performedBy: profile.id,
          branchId: staff.branch_id,
          action: "staff_deleted",
          entityType: "staff",
          entityId: staff.id,
          description: `Archived staff member ${name}`,
          metadata: {
            employee_code: staff.employee_code,
            designation: staff.designation,
            user_id: staff.user_id,
            previous_status: staff.status,
            archived_status: "inactive",
          },
        });
      } catch (error) {
        console.error("[deleteStaffAction] activity log failed", error);
      }
    } else {
      let query = supabase
        .from("users")
        .select("id, tenant_id, branch_id, status, full_name, email, roles(slug)")
        .eq("id", normalizedUserId)
        .eq("tenant_id", profile.tenant_id);

      if (profile.branch_id) {
        query = query.eq("branch_id", profile.branch_id);
      }

      const { data: user, error: userLookupError } = await query.maybeSingle();
      if (userLookupError || !user) {
        return { error: "Staff account not found or you do not have access to delete it." };
      }

      const roleSlug = Array.isArray(user.roles)
        ? (user.roles[0] as { slug?: string | null } | undefined)?.slug ?? null
        : (user.roles as { slug?: string | null } | null)?.slug ?? null;

      if (!roleSlug || !["manager", "reception", "trainer", "dietician"].includes(roleSlug)) {
        return { error: "This user is not a supported staff account." };
      }

      const archivedAt = new Date().toISOString();

      const { error: relatedTrainerError } = await supabase
        .from("trainers")
        .update({ status: "inactive", deleted_at: archivedAt, deleted_by: profile.id })
        .eq("user_id", user.id)
        .eq("tenant_id", profile.tenant_id);
      if (relatedTrainerError) {
        return { error: "Unable to archive linked trainer data for this staff account." };
      }

      const { error: relatedStaffError } = await supabase
        .from("staff")
        .update({ status: "inactive", deleted_at: archivedAt, deleted_by: profile.id })
        .eq("user_id", user.id)
        .eq("tenant_id", profile.tenant_id);
      if (relatedStaffError) {
        return { error: "Unable to archive linked staff data for this staff account." };
      }

      const { error: userError } = await supabase
        .from("users")
        .update({ status: "inactive" })
        .eq("id", user.id)
        .eq("tenant_id", profile.tenant_id);

      if (userError) {
        return { error: "Unable to delete this staff account right now." };
      }

      try {
        await logActivity({
          performedBy: profile.id,
          branchId: user.branch_id,
          action: "staff_account_deleted",
          entityType: "user",
          entityId: user.id,
          description: `Archived staff account ${user.full_name ?? user.email ?? user.id}`,
          metadata: {
            role: roleSlug,
            email: user.email,
            previous_status: user.status,
            archived_status: "inactive",
          },
        });
      } catch (error) {
        console.error("[deleteStaffAction] activity log failed", error);
      }
    }

    revalidatePath("/admin/staff");
    revalidatePath("/admin/trainers");

    return { success: "Staff deleted successfully." };
  } catch (error) {
    console.error("[deleteStaffAction] unexpected error", error);
    return { error: error instanceof Error ? error.message : "Unable to delete this staff account right now." };
  }
}
