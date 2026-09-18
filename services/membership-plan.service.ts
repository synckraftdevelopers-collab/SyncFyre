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
import { selectWithSchemaFallback } from "@/lib/supabase/select-fallback";
import { inferPlanType } from "@/lib/membership-plan-type";
import type { MemberInput } from "@/lib/validations/member";
import { createMember } from "@/services/member.service";
import { getPlanForSale } from "@/services/plan.service";
import { createSubscriptionWithHistory, logActivity, updateSubscriptionWithHistory } from "@/services/workflow.service";

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

/**
 * Per-member, per-subscription couple-pairing info for rendering "Change
 * partner" on the Edit Member page. Reads directly from `subscriptions` /
 * `membership_plans` (schema-fallback aware, same as everywhere else couple
 * plans are handled) rather than any report view — report views in this app
 * have a history of drifting from what's in supabase/migrations (see the
 * member_register_view payment-columns fix), so a second, separate read path
 * avoids depending on that surface being current.
 */
export interface CouplePlanRowInfo {
  subscriptionId: string;
  isPrimary: boolean;
  partnerSubscriptionId: string | null;
  partnerMemberId: string | null;
  partnerMemberName: string | null;
}

export async function getMemberCouplePlanInfo(memberId: string): Promise<CouplePlanRowInfo[]> {
  const supabase = await createClient();

  const { data, error } = await selectWithSchemaFallback<
    Array<{
      id: string;
      total_amount: number | null;
      linked_subscription_id?: string | null;
      membership_plans: { name: string | null; plan_type?: string | null } | null;
    }>
  >(
    (columns) =>
      supabase
        .from("subscriptions")
        .select(columns)
        .eq("member_id", memberId)
        .in("status", ["active", "paused", "pending"]) as unknown as PromiseLike<{
        data: Array<{
          id: string;
          total_amount: number | null;
          linked_subscription_id?: string | null;
          membership_plans: { name: string | null; plan_type?: string | null } | null;
        }> | null;
        error: { code?: string | null; message?: string | null } | null;
      }>,
    [
      "id, total_amount, linked_subscription_id, membership_plans(name, plan_type)",
      "id, total_amount, membership_plans(name, plan_type)",
      "id, total_amount, membership_plans(name)",
    ],
  );
  if (error) throw new Error(error.message ?? "Unable to load couple-plan info.");

  const rows = data ?? [];
  const coupleRows = rows.filter((row) => inferPlanType(row.membership_plans?.plan_type, row.membership_plans?.name) === "couple");
  if (!coupleRows.length) return [];

  const linkedIds = [...new Set(coupleRows.map((row) => row.linked_subscription_id).filter((id): id is string => Boolean(id)))];
  const partnerByLinkedSub = new Map<string, { member_id: string; full_name: string | null }>();
  if (linkedIds.length) {
    const { data: partnerSubs } = await supabase
      .from("subscriptions")
      .select("id, member_id, members(full_name)")
      .in("id", linkedIds);
    for (const partnerSub of (partnerSubs ?? []) as unknown as Array<{ id: string; member_id: string; members: { full_name: string | null } | null }>) {
      partnerByLinkedSub.set(partnerSub.id, { member_id: partnerSub.member_id, full_name: partnerSub.members?.full_name ?? null });
    }
  }

  return coupleRows.map((row) => {
    const partner = row.linked_subscription_id ? partnerByLinkedSub.get(row.linked_subscription_id) ?? null : null;
    return {
      subscriptionId: row.id,
      isPrimary: Number(row.total_amount ?? 0) > 0,
      partnerSubscriptionId: row.linked_subscription_id ?? null,
      partnerMemberId: partner?.member_id ?? null,
      partnerMemberName: partner?.full_name ?? null,
    };
  });
}

export interface ChangeCouplePartnerInput {
  subscriptionId: string;
  tenantId: string;
  performedBy: string;
  requestingRole?: string | null;
  requestingBranchId?: string | null;
  partnerMode: "existing" | "new";
  partnerMemberId?: string | null;
  partnerFullName?: string | null;
  partnerAge?: number | null;
  partnerPhone?: string | null;
}

export interface ChangeCouplePartnerResult {
  memberId: string;
  oldPartnerId?: string;
  newPartnerId: string;
  newPartnerSubscriptionId: string;
}

/**
 * Swaps who a member's already-sold couple plan is paired with. Must be
 * called with the subscription belonging to the member who was actually
 * billed (total_amount > 0) — that row is the source of truth for the plan
 * and dates; the partner's row is always the ₹0 linked one.
 *
 * The old partner's linked subscription is cancelled (not deleted — it stays
 * in their history, just no longer active), and a new ₹0 subscription is
 * created for the new partner on the same plan/start/end dates, re-linking
 * both sides via `linked_subscription_id`. Nothing about the primary
 * member's own subscription (price, dates, invoice) changes.
 */
export async function changeCouplePartner(input: ChangeCouplePartnerInput): Promise<ChangeCouplePartnerResult> {
  const supabase = await createClient();

  const { data: subscription, error: subError } = await selectWithSchemaFallback<{
    id: string;
    member_id: string;
    branch_id: string;
    plan_id: string;
    start_date: string;
    end_date: string;
    status: "pending" | "active" | "expired" | "cancelled" | "paused";
    total_amount: number | null;
    linked_subscription_id?: string | null;
    membership_plans: { name: string | null; plan_type?: string | null } | null;
  }>(
    (columns) =>
      supabase
        .from("subscriptions")
        .select(columns)
        .eq("id", input.subscriptionId)
        .eq("tenant_id", input.tenantId)
        .maybeSingle() as unknown as PromiseLike<{
        data: {
          id: string;
          member_id: string;
          branch_id: string;
          plan_id: string;
          start_date: string;
          end_date: string;
          status: "pending" | "active" | "expired" | "cancelled" | "paused";
          total_amount: number | null;
          linked_subscription_id?: string | null;
          membership_plans: { name: string | null; plan_type?: string | null } | null;
        } | null;
        error: { code?: string | null; message?: string | null } | null;
      }>,
    [
      "id, member_id, branch_id, plan_id, start_date, end_date, status, total_amount, linked_subscription_id, membership_plans(name, plan_type)",
      "id, member_id, branch_id, plan_id, start_date, end_date, status, total_amount, membership_plans(name, plan_type)",
    ],
  );
  if (subError) throw new Error(subError.message ?? "Unable to load the subscription.");
  if (!subscription) throw new Error("Subscription not found.");

  if (input.requestingRole === "reception" && input.requestingBranchId && subscription.branch_id !== input.requestingBranchId) {
    throw new Error("Reception staff can only manage subscriptions at their assigned branch.");
  }

  const isCouplePlan = inferPlanType(subscription.membership_plans?.plan_type, subscription.membership_plans?.name) === "couple";
  if (!isCouplePlan) throw new Error("This plan isn't a couple plan.");
  if (Number(subscription.total_amount ?? 0) <= 0) {
    throw new Error("Change the partner from the member who was billed for this plan, not their paired partner.");
  }

  const linkedSubscriptionId = subscription.linked_subscription_id ?? null;
  let oldPartnerId: string | undefined;
  if (linkedSubscriptionId) {
    const { data: oldPartnerSub } = await supabase
      .from("subscriptions")
      .select("id, member_id, status")
      .eq("id", linkedSubscriptionId)
      .maybeSingle();
    if (oldPartnerSub) {
      oldPartnerId = oldPartnerSub.member_id;
      if (oldPartnerSub.status !== "cancelled") {
        await updateSubscriptionWithHistory({
          subscriptionId: oldPartnerSub.id,
          performedBy: input.performedBy,
          status: "cancelled",
          action: "cancelled",
          remarks: "Un-paired — couple plan partner changed.",
        });
      }
    }
  }

  let newPartnerId: string;
  if (input.partnerMode === "new") {
    if (!input.partnerFullName) throw new Error("Enter the new second member's name.");
    const newMember = await createMember(
      {
        full_name: input.partnerFullName,
        phone: input.partnerPhone || null,
        age: input.partnerAge ?? null,
        branch_id: subscription.branch_id,
        status: "active",
      } as MemberInput,
      input.performedBy,
      input.tenantId,
    );
    newPartnerId = newMember.id;
  } else {
    if (!input.partnerMemberId) throw new Error("Select the new second member.");
    if (input.partnerMemberId === subscription.member_id) throw new Error("The second member must be a different person.");
    const { data: partnerMember } = await supabase
      .from("members")
      .select("id")
      .eq("id", input.partnerMemberId)
      .eq("branch_id", subscription.branch_id)
      .eq("status", "active")
      .maybeSingle();
    if (!partnerMember) throw new Error("The selected member is unavailable for this branch.");
    newPartnerId = partnerMember.id;
  }

  const newPartnerSub = (await createSubscriptionWithHistory({
    memberId: newPartnerId,
    planId: subscription.plan_id,
    branchId: subscription.branch_id,
    tenantId: input.tenantId,
    startDate: subscription.start_date,
    endDate: subscription.end_date,
    status: subscription.status === "pending" ? "pending" : "active",
    price: 0,
    discountAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    performedBy: input.performedBy,
    action: "created",
    remarks: "Couple plan — paired via partner change.",
    linkedSubscriptionId: subscription.id,
  })) as { id?: string } | null;
  if (!newPartnerSub?.id) throw new Error("Unable to create the new partner's subscription.");

  await logActivity({
    performedBy: input.performedBy,
    branchId: subscription.branch_id,
    action: "couple_partner_changed",
    entityType: "subscription",
    entityId: subscription.id,
    description: "Changed couple plan partner",
    metadata: { subscription_id: subscription.id, old_partner_id: oldPartnerId ?? null, new_partner_id: newPartnerId },
  });

  return { memberId: subscription.member_id, oldPartnerId, newPartnerId, newPartnerSubscriptionId: newPartnerSub.id };
}
