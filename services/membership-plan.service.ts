/**
 * membership-plan.service.ts
 *
 * Sells one membership plan to a member who already exists — used by:
 *   - addMemberPlanAction (adding an extra, concurrent plan to an existing
 *     member from their profile or the Edit Member page)
 *   - createMemberAction's optional "extra plan at registration" step (the
 *     member is created first, then this runs for the second plan)
 *
 * This does NOT touch or replace any plan the member already holds — it
 * always creates a brand new subscription (+ invoice, + optional payment),
 * so a member can end up with more than one active plan running at the same
 * time (e.g. Gym + Personal Training). See migration 0051, which relaxed
 * the DB trigger that used to block a second, different plan from
 * overlapping an existing one.
 *
 * Mirrors the pricing/invoice/couple-plan logic already used by
 * createMemberAction (app/actions/member-actions.ts) so behavior — GST,
 * discounts, invoice due dates, couple-plan partner linking — stays
 * consistent across every place a plan gets sold.
 */

import { createClient } from "@/lib/supabase/server";
import { calculateGstBreakdown, type GstPricingMode } from "@/lib/finance/gst";
import { calculatePaymentBalance } from "@/lib/finance/payment-balance";
import { insertWithSchemaFallback } from "@/lib/supabase/insert-fallback";
import type { MemberInput } from "@/lib/validations/member";
import { createMember } from "@/services/member.service";
import { getPlanForSale } from "@/services/plan.service";
import { createSubscriptionWithHistory, logActivity } from "@/services/workflow.service";

const invoiceSchemaFallbackKeys = [
  ["taxable_amount", "gst_rate", "gst_type", "cgst_amount", "sgst_amount", "igst_amount"],
  ["balance_amount", "payment_status"],
  ["tenant_id"],
] as const;

const paymentSchemaFallbackKeys = [
  ["taxable_amount", "gst_rate", "gst_type", "gst_amount", "cgst_amount", "sgst_amount", "igst_amount"],
  ["tenant_id"],
] as const;

export type SellPlanPaymentMethod = "cash" | "upi" | "card" | "online" | "check";

export interface SellPlanInput {
  memberId: string;
  memberName: string;
  branchId: string;
  tenantId: string;
  planId: string;
  startDate: string;
  paymentAmount: number;
  discountAmount: number;
  paymentMethod: SellPlanPaymentMethod;
  transactionRef?: string | null;
  performedBy: string;
  /** Label recorded on the subscription_history row. Defaults to "created". */
  subscriptionAction?: "created" | "renewed";
  /** Freeform prefix for the subscription's remarks, before the collected amount. */
  remarksPrefix?: string;
  couplePartnerMode?: "existing" | "new";
  couplePartnerMemberId?: string | null;
  couplePartnerFullName?: string | null;
  couplePartnerAge?: number | null;
  couplePartnerPhone?: string | null;
}

export interface SellPlanResult {
  subscriptionId: string;
  invoiceId: string;
  couplePartnerId?: string;
}

export async function sellMembershipPlanToMember(input: SellPlanInput): Promise<SellPlanResult> {
  const supabase = await createClient();

  const [plan, { data: branch }, { data: financeSettings }] = await Promise.all([
    getPlanForSale(input.planId),
    supabase
      .from("branches")
      .select("id, state, tenant_id")
      .eq("id", input.branchId)
      .eq("tenant_id", input.tenantId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("finance_settings")
      .select("gst_registered, default_gst_rate, gst_pricing_mode, business_state")
      .eq("branch_id", input.branchId)
      .maybeSingle(),
  ]);

  if (!plan) throw new Error("Select an active package.");
  if (plan.branch_id && plan.branch_id !== input.branchId) throw new Error("Selected package does not belong to the chosen branch.");
  if (!branch) throw new Error("Select an active branch in your organization.");

  const isCouplePlan = plan.plan_type === "couple";
  const partnerMode: "existing" | "new" = input.couplePartnerMode === "new" ? "new" : "existing";
  if (isCouplePlan && partnerMode === "existing" && !input.couplePartnerMemberId) {
    throw new Error("This is a couple plan — select the second member too.");
  }
  if (isCouplePlan && partnerMode === "new" && !input.couplePartnerFullName) {
    throw new Error("This is a couple plan — enter the second member's name.");
  }

  let existingCouplePartner: { id: string; full_name: string | null } | null = null;
  if (isCouplePlan && partnerMode === "existing") {
    const { data: partner } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("id", input.couplePartnerMemberId as string)
      .eq("branch_id", input.branchId)
      .eq("status", "active")
      .maybeSingle();
    if (!partner) throw new Error("The second member is unavailable for this branch.");
    if (partner.id === input.memberId) throw new Error("The second member must be a different person.");
    existingCouplePartner = partner;
  }

  const discountBase = Number(plan.price ?? 0);
  const planDiscount = Math.round(discountBase * Number(plan.discount_percent ?? 0) * 100) / 10000;
  if (input.discountAmount > Math.max(0, discountBase - planDiscount)) throw new Error("Discount cannot exceed the package amount.");
  const discount = planDiscount + input.discountAmount;
  const discountedAmount = Math.max(0, discountBase - discount);

  const gstEnabled = Boolean(financeSettings?.gst_registered) && Number(plan.gst_percent ?? financeSettings?.default_gst_rate ?? 0) > 0;
  const pricingMode = (financeSettings?.gst_pricing_mode === "inclusive" ? "inclusive" : "exclusive") as GstPricingMode;
  const gstRate = gstEnabled ? Number(plan.gst_percent ?? financeSettings?.default_gst_rate ?? 0) : 0;
  const gst = calculateGstBreakdown({
    grossAmount: discountedAmount,
    gstRate,
    pricingMode,
    gymState: financeSettings?.business_state ?? branch.state ?? null,
    customerState: branch.state ?? null,
  });
  const total = gst.grandTotal;

  if (calculatePaymentBalance(total, input.paymentAmount).isOverpaid) throw new Error("Payment completed cannot be greater than total amount.");

  const subscription = (await createSubscriptionWithHistory({
    memberId: input.memberId,
    planId: plan.id,
    branchId: input.branchId,
    tenantId: input.tenantId,
    startDate: input.startDate,
    status: "active",
    price: gst.taxableAmount,
    discountAmount: discount,
    gstAmount: gst.gstAmount,
    totalAmount: total,
    performedBy: input.performedBy,
    action: input.subscriptionAction ?? "created",
    remarks: `${input.remarksPrefix ?? "Collected: "}${input.paymentAmount.toFixed(2)}`,
  })) as { id?: string } | null;
  const subscriptionId = subscription?.id;
  if (!subscriptionId) throw new Error("Unable to create subscription.");

  let couplePartnerId: string | undefined;
  if (isCouplePlan) {
    let partner = existingCouplePartner;
    if (partnerMode === "new") {
      const newPartner = await createMember(
        {
          full_name: input.couplePartnerFullName as string,
          phone: input.couplePartnerPhone || null,
          age: input.couplePartnerAge ?? null,
          branch_id: input.branchId,
          status: "active",
        } as MemberInput,
        input.performedBy,
        input.tenantId,
      );
      partner = { id: newPartner.id, full_name: newPartner.full_name };
    }
    if (partner) {
      // Same plan and start date as the primary subscription above, so the
      // plan's duration trigger derives a matching expiry for the partner
      // automatically. No separate charge — already billed on the primary
      // member's invoice below.
      await createSubscriptionWithHistory({
        memberId: partner.id,
        planId: plan.id,
        branchId: input.branchId,
        tenantId: input.tenantId,
        startDate: input.startDate,
        status: "active",
        price: 0,
        discountAmount: 0,
        gstAmount: 0,
        totalAmount: 0,
        performedBy: input.performedBy,
        action: input.subscriptionAction ?? "created",
        remarks: `Couple plan — paired with ${input.memberName}. Billed on that member's subscription.`,
        linkedSubscriptionId: subscriptionId,
      });
      couplePartnerId = partner.id;
    }
  }

  const invoicePayload = {
    member_id: input.memberId,
    subscription_id: subscriptionId,
    branch_id: input.branchId,
    tenant_id: branch.tenant_id,
    subtotal: gst.taxableAmount,
    taxable_amount: gst.taxableAmount,
    gst_rate: gst.gstRate,
    gst_type: gst.gstKind,
    discount_amount: discount,
    cgst_amount: gst.cgstAmount,
    sgst_amount: gst.sgstAmount,
    igst_amount: gst.igstAmount,
    gst_amount: gst.gstAmount,
    total_amount: total,
    amount_paid: 0,
    balance_amount: total,
    payment_status: "pending",
    status: "unpaid",
    // Payment due date, not the membership's expiry date — see the note in
    // createMemberAction (app/actions/member-actions.ts) for why end_date
    // must never be used here: it clusters unrelated invoices onto whatever
    // date the plan happens to expire on, instead of spreading due dates
    // across when each plan was actually sold.
    due_date: input.startDate,
    line_items: [{ description: plan.name, amount: total, taxable_amount: gst.taxableAmount, gst_amount: gst.gstAmount }],
    created_by: input.performedBy,
  };
  const { data: invoice, error: invoiceError } = await insertWithSchemaFallback<{ id: string }>(
    (payload) => supabase.from("invoices").insert(payload).select("id").single(),
    invoicePayload,
    invoiceSchemaFallbackKeys,
  );
  if (invoiceError || !invoice) throw new Error(invoiceError?.message ?? "Unable to create invoice.");

  if (input.paymentAmount > 0) {
    const ratio = total > 0 ? Math.min(1, input.paymentAmount / total) : 1;
    const paymentPayload = {
      invoice_id: invoice.id,
      member_id: input.memberId,
      subscription_id: subscriptionId,
      branch_id: input.branchId,
      tenant_id: branch.tenant_id,
      amount: input.paymentAmount,
      taxable_amount: Math.round(gst.taxableAmount * ratio * 100) / 100,
      gst_rate: gst.gstRate,
      gst_type: gst.gstKind,
      gst_amount: Math.round(gst.gstAmount * ratio * 100) / 100,
      cgst_amount: Math.round(gst.cgstAmount * ratio * 100) / 100,
      sgst_amount: Math.round(gst.sgstAmount * ratio * 100) / 100,
      igst_amount: Math.round(gst.igstAmount * ratio * 100) / 100,
      method: input.paymentMethod,
      status: "completed",
      transaction_reference: input.transactionRef ?? null,
      paid_at: new Date().toISOString(),
      collected_by: input.performedBy,
    };
    const { error: paymentError } = await insertWithSchemaFallback<null>(
      (payload) => supabase.from("payments").insert(payload),
      paymentPayload,
      paymentSchemaFallbackKeys,
    );
    if (paymentError) throw new Error(paymentError.message ?? "Unable to create payment.");
  }

  await logActivity({
    performedBy: input.performedBy,
    branchId: input.branchId,
    action: "membership_plan_added",
    entityType: "subscription",
    entityId: subscriptionId,
    description: `Added plan "${plan.name}" for ${input.memberName}`,
    metadata: { member_id: input.memberId, plan_id: plan.id, total_amount: total },
  });

  return { subscriptionId, invoiceId: invoice.id, couplePartnerId };
}
