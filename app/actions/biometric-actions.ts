"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { assignMachineUserIdToMember, reprocessUnmatchedAttendanceForMember } from "@/services/biometric-mapping.service";
import { logActivity } from "@/services/workflow.service";

function redirectWithMessage(path: string, type: "success" | "error", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}bio_${type}=${encodeURIComponent(message)}`);
}

export async function saveBiometricMappingAction(formData: FormData) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const memberId = String(formData.get("member_id") ?? "").trim();
  const machineUserId = String(formData.get("machine_user_id") ?? "").trim();
  const machineName = String(formData.get("machine_name") ?? "").trim() || null;
  const returnTo = String(formData.get("return_to") ?? "/admin/attendance");
  const reprocess = String(formData.get("reprocess") ?? "") === "true";

  if (!memberId) redirectWithMessage(returnTo, "error", "Member ID is required.");
  if (!machineUserId) redirectWithMessage(returnTo, "error", "Machine User ID is required.");

  try {
    await assignMachineUserIdToMember({
      memberId,
      machineUserId,
      machineName,
      matchStatus: reprocess ? "unidentified_resolved" : "manual_mapping",
      verified: true,
    });

    let reprocessed = 0;
    if (reprocess) {
      const result = await reprocessUnmatchedAttendanceForMember({
        memberId,
        machineUserId,
        performedBy: profile.id,
        notes: "Resolved from biometric mapping dashboard.",
      });
      reprocessed = result.reprocessed;
    }

    await logActivity({
      performedBy: profile.id,
      branchId: profile.branch_id,
      action: "biometric_mapping_saved",
      entityType: "member",
      entityId: memberId,
      description: "Biometric mapping updated",
      metadata: {
        machine_user_id: machineUserId,
        machine_name: machineName,
        reprocessed_logs: reprocessed,
      },
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Unable to save biometric mapping.");
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/settings");
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath(`/reception/members/${memberId}`);
  redirectWithMessage(returnTo, "success", reprocess ? "Mapping saved and unresolved attendance reprocessed." : "Biometric mapping saved.");
}
