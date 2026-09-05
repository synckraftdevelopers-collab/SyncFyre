"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/membership-dates";
import { createClient } from "@/lib/supabase/server";
import { createSubscriptionWithHistory } from "@/services/workflow.service";

export type ReceptionMembershipState = { error?: string; memberId?: string };

export async function createReceptionMembershipAction(
  _: ReceptionMembershipState,
  formData: FormData,
): Promise<ReceptionMembershipState> {
  const profile = await requireUser(["reception"]);
  if (!profile.branch_id) return { error: "Your reception account is not assigned to a branch." };

  const memberId = String(formData.get("member_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  if (!memberId || !planId || !startDate) return { error: "Member, plan, and start date are required." };

  try {
    parseDateOnly(startDate);
  } catch {
    return { error: "Enter a valid start date." };
  }

  const supabase = await createClient();
  const [{ data: member }, { data: plan }] = await Promise.all([
    supabase.from("members").select("id").eq("id", memberId).eq("branch_id", profile.branch_id).maybeSingle(),
    supabase.from("membership_plans").select("id, price, gst_percent, discount_percent, duration_months").eq("id", planId).eq("branch_id", profile.branch_id).eq("status", "active").maybeSingle(),
  ]);
  if (!member) return { error: "That member is unavailable for this branch." };
  if (!plan) return { error: "Select an active membership plan for this branch." };

  const price = Number(plan.price);
  const discount = Math.round(price * Number(plan.discount_percent) * 100) / 10000;
  const taxable = price - discount;
  const gst = Math.round(taxable * Number(plan.gst_percent) * 100) / 10000;
  const total = taxable + gst;

  try {
    await createSubscriptionWithHistory({
      memberId,
      planId,
      branchId: profile.branch_id,
      tenantId: profile.tenant_id,
      startDate,
      status: "active",
      price,
      discountAmount: discount,
      gstAmount: gst,
      totalAmount: total,
      performedBy: profile.id,
      action: "created",
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create the subscription." };
  }

  revalidatePath("/reception/memberships");
  revalidatePath("/reception/members");
  revalidatePath(`/reception/members/${memberId}`);
  return { memberId };
}
