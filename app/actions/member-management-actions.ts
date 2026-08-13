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

export async function sendRenewalNotificationAction(
  memberId: string,
): Promise<{ error?: string }> {
  const profile = await requireUser(["admin", "manager", "reception"]);

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Fetch member + latest subscription info
  const { data: member, error: mErr } = await supabase
    .from("members")
    .select("id, full_name, branch_id, user_id")
    .eq("id", memberId)
    .single();

  if (mErr || !member) return { error: "Member not found." };

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("end_date, status, membership_plans(name)")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const planName = (sub?.membership_plans as { name: string }[] | null)?.[0]?.name ?? "membership";
  const endDate  = sub?.end_date
    ? new Date(sub.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "soon";
  const isExpired = sub?.status === "expired";

  const title   = isExpired
    ? `⚠️ Membership Expired — ${member.full_name}`
    : `🔔 Membership Expiring Soon — ${member.full_name}`;
  const message = isExpired
    ? `Dear ${member.full_name}, your ${planName} has expired. Please renew to continue your fitness journey at SyncFyre Gym.`
    : `Dear ${member.full_name}, your ${planName} expires on ${endDate}. Renew now to avoid interruption. Visit us or call the gym.`;

  // Insert notification (dashboard channel — will appear in notifications list)
  const { error: nErr } = await supabase.from("notifications").insert({
    member_id:  member.id,
    user_id:    member.user_id ?? null,
    branch_id:  member.branch_id,
    type:       "membership_renewal_reminder",
    title,
    message,
    channels:   ["dashboard"],
    metadata:   {
      sent_by:    profile.id,
      sent_by_name: profile.full_name,
      plan_name:  planName,
      end_date:   sub?.end_date ?? null,
      status:     sub?.status ?? null,
    },
  });

  if (nErr) return { error: nErr.message };

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/notifications");
  return {};
}
