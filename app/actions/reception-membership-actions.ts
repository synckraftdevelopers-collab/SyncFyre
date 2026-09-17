"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/membership-dates";
import { createClient } from "@/lib/supabase/server";
import { insertWithSchemaFallback } from "@/lib/supabase/insert-fallback";
import type { MemberInput } from "@/lib/validations/member";
import { createMember } from "@/services/member.service";
import { getPlanForSale } from "@/services/plan.service";
import { createSubscriptionWithHistory } from "@/services/workflow.service";

export type ReceptionMembershipState = { error?: string; memberId?: string };

const invoiceSchemaFallbackKeys = [
  ["taxable_amount", "gst_rate", "gst_type", "cgst_amount", "sgst_amount", "igst_amount"],
  ["balance_amount", "payment_status"],
  ["tenant_id"],
] as const;

function normalizePhone(value: FormDataEntryValue | string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const local = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return local.length === 10 ? `+91${local}` : String(value ?? "").trim();
}

export async function createReceptionMembershipAction(
  _: ReceptionMembershipState,
  formData: FormData,
): Promise<ReceptionMembershipState> {
  const profile = await requireUser(["reception"]);
  if (!profile.branch_id) return { error: "Your reception account is not assigned to a branch." };

  const memberId = String(formData.get("member_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const secondMemberMode = String(formData.get("second_member_mode") ?? "existing") === "new" ? "new" : "existing";
  const secondMemberId = String(formData.get("second_member_id") ?? "");
  const secondMemberFullName = String(formData.get("second_member_full_name") ?? "").trim();
  const secondMemberAgeText = String(formData.get("second_member_age") ?? "").trim();
  const secondMemberAge = secondMemberAgeText ? Number(secondMemberAgeText) : null;
  const secondMemberPhone = normalizePhone(formData.get("second_member_phone"));
  if (!memberId || !planId || !startDate) return { error: "Member, plan, and start date are required." };

  try {
    parseDateOnly(startDate);
  } catch {
    return { error: "Enter a valid start date." };
  }

  const supabase = await createClient();
  const [{ data: member }, plan] = await Promise.all([
    supabase.from("members").select("id").eq("id", memberId).eq("branch_id", profile.branch_id).maybeSingle(),
    getPlanForSale(planId, profile.branch_id),
  ]);
  if (!member) return { error: "That member is unavailable for this branch." };
  if (!plan) return { error: "Select an active membership plan for this branch." };

  const isCouplePlan = plan.plan_type === "couple";
  if (isCouplePlan && secondMemberMode === "existing" && !secondMemberId) return { error: "This is a couple plan — select the second member too." };
  if (isCouplePlan && secondMemberMode === "existing" && secondMemberId === memberId) return { error: "The second member must be different from the first member." };
  if (isCouplePlan && secondMemberMode === "new" && !secondMemberFullName) return { error: "This is a couple plan — enter the second member's name." };

  let secondMember: { id: string } | null = null;
  if (isCouplePlan && secondMemberMode === "existing") {
    const { data } = await supabase.from("members").select("id").eq("id", secondMemberId).eq("branch_id", profile.branch_id).maybeSingle();
    secondMember = data;
    if (!secondMember) return { error: "The second member is unavailable for this branch." };
  }

  const price = Number(plan.price);
  const discount = Math.round(price * Number(plan.discount_percent) * 100) / 10000;
  const taxable = price - discount;
  const gst = Math.round(taxable * Number(plan.gst_percent) * 100) / 10000;
  const total = taxable + gst;

  try {
    const primarySubscription = await createSubscriptionWithHistory({
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
      remarks: isCouplePlan ? "Couple plan — billed together with the linked member." : null,
    });

    if (isCouplePlan && secondMemberMode === "new") {
      // Short-form registration: create the second member with just a name
      // (age and phone optional) — everything else defaults, same as any
      // other member record. Created here, alongside billing, so a failure
      // below surfaces as one combined error rather than an orphan member.
      const newMember = await createMember(
        {
          full_name: secondMemberFullName,
          phone: secondMemberPhone || null,
          age: Number.isFinite(secondMemberAge) ? secondMemberAge : null,
          branch_id: profile.branch_id,
          status: "active",
        } as MemberInput,
        profile.id,
        profile.tenant_id,
      );
      secondMember = { id: newMember.id };
    }

    if (isCouplePlan && secondMember) {
      // Same plan and start date, so the plan's duration trigger derives an
      // identical expiry for both members. No additional charge — this
      // member's cost was already carried on the primary subscription above.
      await createSubscriptionWithHistory({
        memberId: secondMember.id,
        planId,
        branchId: profile.branch_id,
        tenantId: profile.tenant_id,
        startDate,
        status: "active",
        price: 0,
        discountAmount: 0,
        gstAmount: 0,
        totalAmount: 0,
        performedBy: profile.id,
        action: "created",
        remarks: "Couple plan — billed on the linked member's subscription.",
        linkedSubscriptionId: (primarySubscription as { id?: string } | null)?.id ?? null,
      });
    }

    // This subscription had no invoice at all before — the Members page's
    // Paid/Balance columns and Finance → Outstanding Dues (both driven by
    // invoices/receivables) never reflected a plan sold through this
    // reception flow. Create one here so the amount owed shows up like any
    // other sale, same as the admin sale wizard and member registration.
    const cgstAmount = Math.round((gst / 2) * 100) / 100;
    const sgstAmount = Math.round((gst - cgstAmount) * 100) / 100;
    const invoicePayload = {
      member_id: memberId,
      subscription_id: (primarySubscription as { id?: string } | null)?.id ?? null,
      branch_id: profile.branch_id,
      tenant_id: profile.tenant_id,
      subtotal: taxable,
      taxable_amount: taxable,
      gst_rate: Number(plan.gst_percent ?? 0),
      gst_type: gst > 0 ? "intra" : "none",
      discount_amount: discount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: 0,
      gst_amount: gst,
      total_amount: total,
      amount_paid: 0,
      balance_amount: total,
      payment_status: "pending",
      status: "unpaid",
      // Payment due date, not the membership's expiry date — see the note
      // in app/actions/member-actions.ts (createMemberAction) for why
      // end_date must never be used here.
      due_date: startDate,
      line_items: [{ description: plan.name, amount: total, taxable_amount: taxable, gst_amount: gst }],
      created_by: profile.id,
    };
    const { error: invoiceError } = await insertWithSchemaFallback<{ id: string }>(
      (payload) => supabase.from("invoices").insert(payload).select("id").single(),
      invoicePayload,
      invoiceSchemaFallbackKeys,
    );
    if (invoiceError) throw new Error(invoiceError.message ?? "Subscription created, but the invoice could not be saved.");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create the subscription." };
  }

  revalidatePath("/reception/memberships");
  revalidatePath("/reception/members");
  revalidatePath(`/reception/members/${memberId}`);
  if (secondMember) revalidatePath(`/reception/members/${secondMember.id}`);
  return { memberId };
}
