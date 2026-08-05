"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  deactivateMember,
  renewMembership,
  assignTrainer,
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
  try {
    await assignTrainer(memberId, trainerId, profile.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Assignment failed." };
  }
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  return { success: "Trainer assigned." };
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
