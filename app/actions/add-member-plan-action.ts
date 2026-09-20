"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { sellMembershipPlanToMember } from "@/services/membership-plan.service";
import { getMemberById } from "@/services/member-extended.service";
import { getLocalDateInputValue } from "@/lib/membership-dates";
import { hasCurrentFeature } from "@/lib/entitlements/server";

export type AddMemberPlanState = { error?: string; success?: string };

export async function addMemberPlanAction(
  _prev: AddMemberPlanState,
  formData: FormData,
): Promise<AddMemberPlanState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const memberId       = String(formData.get("member_id") ?? "").trim();
  const planId         = String(formData.get("plan_id") ?? "").trim();
  const startDate      = String(formData.get("start_date") ?? getLocalDateInputValue()).trim();
  const paymentAmount  = Number(formData.get("payment_amount") ?? 0);
  const discountAmount = Number(formData.get("discount_amount") ?? 0);
  const rawMethod      = String(formData.get("payment_method") ?? "cash");
  const paymentMethod  = (["cash", "upi", "card", "online", "check"].includes(rawMethod)
    ? rawMethod
    : "cash") as "cash" | "upi" | "card" | "online" | "check";
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim() || null;

  const couplePartnerMode     = String(formData.get("couple_partner_mode") ?? "existing") as "existing" | "new";
  const couplePartnerMemberId = String(formData.get("couple_partner_member_id") ?? "").trim() || null;
  const couplePartnerFullName = String(formData.get("couple_partner_full_name") ?? "").trim() || null;
  const couplePartnerAge      = formData.get("couple_partner_age")
    ? Number(formData.get("couple_partner_age"))
    : null;
  const couplePartnerPhone    = String(formData.get("couple_partner_phone") ?? "").trim() || null;

  if (!memberId) return { error: "Member is required." };
  if (!planId)   return { error: "Select a plan." };
  if (!startDate) return { error: "Start date is required." };
  if (paymentAmount < 0) return { error: "Payment amount cannot be negative." };

  const branchId = profile.branch_id;
  if (!branchId) return { error: "Your account is not linked to a branch." };

  const member = await getMemberById(memberId);
  if (!member) return { error: "Member not found." };

  try {
    await sellMembershipPlanToMember({
      memberId,
      memberName:           member.full_name,
      branchId,
      tenantId:             profile.tenant_id,
      planId,
      startDate,
      paymentAmount:        Number.isFinite(paymentAmount) ? paymentAmount : 0,
      discountAmount:       Number.isFinite(discountAmount) ? discountAmount : 0,
      paymentMethod,
      transactionRef,
      performedBy:          profile.id,
      performedByRole:      profile.role?.slug,
      enforceDiscountAuthorization: await hasCurrentFeature("advanced_membership"),
      subscriptionAction:   "created",
      remarksPrefix:        "Collected on plan add: ",
      couplePartnerMode,
      couplePartnerMemberId,
      couplePartnerFullName,
      couplePartnerAge:     Number.isFinite(couplePartnerAge) ? couplePartnerAge : null,
      couplePartnerPhone,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add plan." };
  }

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath(`/admin/members/${memberId}?edit=1`);
  revalidatePath("/admin/members");
  revalidatePath("/admin/subscriptions");

  return { success: "Plan added successfully." };
}
