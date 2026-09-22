"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  deactivateMember,
  renewMembership,
  assignTrainer,
  assignDietician,
} from "@/services/member-extended.service";
import { updateMember } from "@/services/member.service";
import { memberSchema } from "@/lib/validations/member";

export async function deactivateMemberAction(
  memberId: string,
): Promise<{ error?: string }> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  try {
    await deactivateMember(memberId, profile.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not deactivate member." };
  }
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/reception/members");
  return {};
}

export type RenewState = { error?: string; success?: string };

export async function renewMembershipAction(
  _: RenewState,
  formData: FormData,
): Promise<RenewState> {
  const profile = await requireUser(["admin", "manager", "reception"]);

  const memberId = formData.get("member_id") as string;
  const branchId = formData.get("branch_id") as string;
  const planId = formData.get("plan_id") as string;
  const startDate = formData.get("start_date") as string;
  const price = Number(formData.get("price") ?? 0);
  const discount = Number(formData.get("discount_amount") ?? 0);
  const gst = Number(formData.get("gst_amount") ?? 0);
  const total = Number(formData.get("total_amount") ?? 0);
  const remarks = (formData.get("remarks") as string | null) ?? null;

  if (!memberId || !branchId || !planId || !startDate)
    return { error: "All fields are required." };
  if (total <= 0) return { error: "Total amount must be greater than zero." };

  try {
    await renewMembership({
        memberId,
        branchId,
        tenantId: profile.tenant_id,
        planId,
      startDate,
      price,
      discountAmount: discount,
      gstAmount: gst,
      totalAmount: total,
      createdBy: profile.id,
      remarks,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Renewal failed." };
  }

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  return { success: "Membership renewed successfully." };
}

export type AssignTrainerState = { error?: string; success?: string };

export async function assignTrainerAction(
  memberId: string,
  trainerId: string | null,
): Promise<AssignTrainerState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };
  if (!memberId) return { error: "Member ID is required." };

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, branch_id, tenant_id")
    .eq("id", memberId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();
  if (memberError || !member) return { error: "Member not found in your organization." };
  if (profile.role?.slug === "reception" && member.branch_id !== profile.branch_id) {
    return { error: "Reception staff can assign trainers only in their assigned branch." };
  }

  if (trainerId) {
    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id, branch_id, status")
      .eq("id", trainerId)
      .eq("status", "active")
      .maybeSingle();
    if (trainerError || !trainer) return { error: "Selected trainer is not active or available." };
    if (trainer.branch_id !== member.branch_id) return { error: "Selected trainer does not belong to this member's branch." };
    const { data: trainerBranch } = await supabase
      .from("branches")
      .select("id")
      .eq("id", trainer.branch_id)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "active")
      .maybeSingle();
    if (!trainerBranch) return { error: "Selected trainer is outside your organization." };
  }

  try {
    await assignTrainer(member.id, trainerId, profile.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Assignment failed." };
  }
  const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
  revalidatePath(`${base}/members/${member.id}`);
  revalidatePath(`${base}/members`);
  return { success: trainerId ? "Trainer assigned." : "Trainer assignment removed." };
}
export async function assignDieticianAction(memberId: string, dieticianId: string | null): Promise<AssignTrainerState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  try {
    await assignDietician(memberId, dieticianId, profile.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Assignment failed." };
  }
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath(`/reception/members/${memberId}`);
  revalidatePath("/admin/members");
  revalidatePath("/reception/members");
  return { success: "Dietician assigned." };
}

export type UpdateState = { error?: string; fields?: Record<string, string[]> };

export async function updateMemberFullAction(
  _: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const id = formData.get("id") as string;
  if (!id) return { error: "Member ID is missing." };

  const raw = Object.fromEntries(formData);
  const { id: _id, ...rest } = raw;
  void _id;

  const parsed = memberSchema.partial().safeParse({
    ...rest,
    height_cm: rest.height_cm || null,
    weight_kg: rest.weight_kg || null,
    date_of_birth: rest.date_of_birth || null,
    email: rest.email || null,
    assigned_trainer_id: rest.assigned_trainer_id || null,
  });

  if (!parsed.success)
    return {
      error: "Review the highlighted fields.",
      fields: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };

  try {
    await updateMember(id, parsed.data, profile.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed." };
  }

  revalidatePath(`/admin/members/${id}`);
  revalidatePath("/admin/members");
  return {};
}

// ─── Send Renewal Notification ────────────────────────────────────────────────

/** Renewal reminders are generated by the protected expiry job, never manually. */
export async function sendRenewalNotificationAction(): Promise<{ error?: string }> {
  await requireUser(["admin", "manager", "reception"]);
  return { error: "Renewal notifications are generated from real membership expiry events." };
}
export async function checkInMemberAction(memberId: string): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, branch_id")
    .eq("id", memberId)
    .maybeSingle();

  if (memberError || !member) return { error: "Member not found." };
  if (profile.branch_id && member.branch_id !== profile.branch_id) return { error: "This member belongs to another branch." };

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("attendance").insert({
    member_id: member.id,
    branch_id: member.branch_id,
    device_id: "manual-dashboard",
    machine_user_id: profile.id,
    attendance_date: today,
    entry_time: new Date().toISOString(),
    source: "manual_dashboard",
  });

  if (error?.code === "23505") return { error: "This member is already checked in today." };
  if (error) return { error: error.message };

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/reception/members");
  return { success: "Member checked in." };
}

// ─── Member Transfer (Scale / multi_branch only) ──────────────────────────────

export type TransferMemberState = { error?: string; success?: string };

export async function transferMemberAction(
  _: TransferMemberState,
  formData: FormData,
): Promise<TransferMemberState> {
  const profile = await requireUser(["owner", "admin", "manager"]);

  if (!profile.tenant_id) {
    return { error: "Your account is not linked to an organization." };
  }

  // Enforce Scale plan
  const { hasCurrentFeature } = await import("@/lib/entitlements/server");
  if (!(await hasCurrentFeature("multi_branch"))) {
    return { error: "Member transfers require the Scale plan." };
  }

  const memberId = formData.get("member_id") as string;
  const toBranchId = formData.get("to_branch_id") as string;
  const reason = (formData.get("reason") as string | null) ?? null;

  if (!memberId || !toBranchId) {
    return { error: "Member and destination branch are required." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();

  // Load the member — validates it belongs to this tenant
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, branch_id, tenant_id, full_name")
    .eq("id", memberId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  if (memberError || !member) {
    return { error: "Member not found in your organization." };
  }

  if (member.branch_id === toBranchId) {
    return { error: "Member is already in that branch." };
  }

  // Validate the destination branch belongs to the same tenant
  const { data: toBranch, error: toBranchError } = await supabase
    .from("branches")
    .select("id, name, status")
    .eq("id", toBranchId)
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active")
    .maybeSingle();

  if (toBranchError || !toBranch) {
    return { error: "Destination branch not found or inactive." };
  }

  const fromBranchId = member.branch_id as string;

  // 1. Update member's branch
  const { error: updateMemberError } = await supabase
    .from("members")
    .update({ branch_id: toBranchId })
    .eq("id", memberId)
    .eq("tenant_id", profile.tenant_id);

  if (updateMemberError) {
    return { error: updateMemberError.message };
  }

  // 2. Update active subscription's branch (if any)
  await supabase
    .from("subscriptions")
    .update({ branch_id: toBranchId })
    .eq("member_id", memberId)
    .eq("branch_id", fromBranchId)
    .in("status", ["active", "paused"]);

  // 3. Log the transfer
  await supabase.from("member_transfer_log").insert({
    tenant_id: profile.tenant_id,
    member_id: memberId,
    from_branch_id: fromBranchId,
    to_branch_id: toBranchId,
    transferred_by: profile.id,
    reason: reason || null,
  });

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  revalidatePath("/admin/branches");

  return { success: `${member.full_name} transferred to ${toBranch.name}.` };
}
