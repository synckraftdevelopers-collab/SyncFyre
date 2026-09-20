"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { calculateGstBreakdown, type GstPricingMode } from "@/lib/finance/gst";
import { calculatePaymentBalance } from "@/lib/finance/payment-balance";
import { insertWithSchemaFallback } from "@/lib/supabase/insert-fallback";
import { parseDateOnly } from "@/lib/membership-dates";
import { createClient } from "@/lib/supabase/server";
import { applyMemberFormConfiguration, memberSchema, type MemberInput } from "@/lib/validations/member";
import { createMember, updateMember } from "@/services/member.service";
import { getMemberFormConfiguration } from "@/services/member-form-config.service";
import { getPlanForSale } from "@/services/plan.service";
import { createSubscriptionWithHistory, logActivity } from "@/services/workflow.service";
import { deactivateMember } from "@/services/member-extended.service";
import { changeCouplePartner, sellMembershipPlanToMember } from "@/services/membership-plan.service";
import { checkDiscountAuthorization } from "@/lib/finance/discount-authorization";
import { hasCurrentFeature } from "@/lib/entitlements/server";

export type MemberFormState = { error?: string; fields?: Record<string, string[]> };

function normalizePhone(value: FormDataEntryValue | string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const local = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return local.length === 10 ? `+91${local}` : String(value ?? "").trim();
}

const invoiceSchemaFallbackKeys = [
  ["taxable_amount", "gst_rate", "gst_type", "cgst_amount", "sgst_amount", "igst_amount"],
  ["balance_amount", "payment_status"],
  ["tenant_id"],
] as const;

const paymentSchemaFallbackKeys = [
  ["taxable_amount", "gst_rate", "gst_type", "gst_amount", "cgst_amount", "sgst_amount", "igst_amount"],
  ["tenant_id"],
] as const;

export type QuickMemberState = { error?: string; member?: { id: string; full_name: string; member_code: string } };

/**
 * Short-form member creation (name required, age/phone optional) for the
 * "New member" option on a couple plan's second-member picker. Unlike
 * createMemberAction, this is called directly from client code (not a
 * <form action>) — the admin sale wizard talks to the REST resource API for
 * everything else, but member creation isn't exposed there (see
 * lib/validations/resources.ts), so this server action fills that gap. Uses
 * the same createMember() as every other member-creation path in the app.
 */
export async function createQuickCoupleMemberAction(input: {
  fullName: string;
  age?: string | number | null;
  phone?: string | null;
  branchId: string;
}): Promise<QuickMemberState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };
  const fullName = String(input.fullName ?? "").trim();
  if (!fullName) return { error: "Enter the second member's name." };
  if (!input.branchId) return { error: "A branch is required." };
  if (profile.role?.slug === "reception" && profile.branch_id !== input.branchId) {
    return { error: "Reception staff can register members only for their assigned branch." };
  }

  const age = input.age !== undefined && input.age !== null && input.age !== "" ? Number(input.age) : null;
  try {
    const member = await createMember(
      {
        full_name: fullName,
        phone: normalizePhone(input.phone) || null,
        age: Number.isFinite(age) ? age : null,
        branch_id: input.branchId,
        status: "active",
      } as MemberInput,
      profile.id,
      profile.tenant_id,
    );
    return { member: { id: member.id, full_name: member.full_name, member_code: member.member_code } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create the second member." };
  }
}

export type AddPlanState = { error?: string; success?: boolean; subscriptionId?: string; couplePartnerId?: string };

/**
 * Sells one more plan to a member who already exists — the server action
 * behind the inline "Add Plan" panel on the Edit Member page. Unlike
 * createMemberAction, this never creates or touches personal-info fields —
 * it only calls sellMembershipPlanToMember, which always creates a brand
 * new subscription/invoice rather than replacing any plan the member
 * already holds (see migration 0051). Couple plans are supported here the
 * same way as everywhere else a plan gets sold (existing partner or a
 * quick new-member short form).
 */
export async function addMemberPlanAction(
  _: AddPlanState,
  formData: FormData,
): Promise<AddPlanState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const memberId = String(formData.get("member_id") ?? "").trim();
  const planId = String(formData.get("plan_id") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const paymentAmountText = String(formData.get("payment_amount") ?? "").trim();
  const paymentAmount = paymentAmountText ? Number(paymentAmountText) : 0;
  const discountAmount = Number(formData.get("discount_amount") ?? 0);
  const paymentMethodRaw = String(formData.get("payment_method") ?? "cash");
  const paymentMethod = (["cash", "upi", "card", "online", "check"].includes(paymentMethodRaw) ? paymentMethodRaw : "cash") as "cash" | "upi" | "card" | "online" | "check";
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim() || null;
  const couplePartnerMode = String(formData.get("couple_partner_mode") ?? "existing") === "new" ? "new" : "existing";
  const couplePartnerMemberId = String(formData.get("couple_partner_member_id") ?? "").trim();
  const couplePartnerFullName = String(formData.get("couple_partner_full_name") ?? "").trim();
  const couplePartnerAgeText = String(formData.get("couple_partner_age") ?? "").trim();
  const couplePartnerAge = couplePartnerAgeText ? Number(couplePartnerAgeText) : null;
  const couplePartnerPhone = normalizePhone(formData.get("couple_partner_phone"));

  if (!memberId) return { error: "Member is required." };
  if (!planId) return { error: "Select a package." };
  if (!startDate) return { error: "Start date is required." };
  if (!Number.isFinite(paymentAmount) || paymentAmount < 0) return { error: "Enter a valid payment amount." };
  if (!Number.isFinite(discountAmount) || discountAmount < 0) return { error: "Enter a valid discount amount." };
  try {
    parseDateOnly(startDate);
  } catch {
    return { error: "Enter a valid start date." };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, branch_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return { error: "Member not found." };
  if (profile.role?.slug === "reception" && profile.branch_id !== member.branch_id) {
    return { error: "Reception staff can only add plans for members at their assigned branch." };
  }

  try {
    const result = await sellMembershipPlanToMember({
      memberId: member.id,
      memberName: member.full_name ?? "",
      branchId: member.branch_id,
      tenantId: profile.tenant_id,
      planId,
      startDate,
      paymentAmount,
      discountAmount,
      paymentMethod,
      transactionRef,
      performedBy: profile.id,
      performedByRole: profile.role?.slug,
      enforceDiscountAuthorization: await hasCurrentFeature("advanced_membership"),
      subscriptionAction: "created",
      remarksPrefix: "Collected: ",
      couplePartnerMode,
      couplePartnerMemberId: couplePartnerMemberId || null,
      couplePartnerFullName: couplePartnerFullName || null,
      couplePartnerAge,
      couplePartnerPhone: couplePartnerPhone || null,
    });

    const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
    revalidatePath(`${base}/members/${memberId}`);
    if (result.couplePartnerId) revalidatePath(`${base}/members/${result.couplePartnerId}`);
    return { success: true, subscriptionId: result.subscriptionId, couplePartnerId: result.couplePartnerId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to add the plan." };
  }
}

export type ChangePartnerState = { error?: string; success?: boolean; newPartnerId?: string };

/**
 * Swaps out who a member's already-sold couple plan is paired with — the
 * server action behind the "Change partner" control on the Edit Member
 * page's Memberships section. Must be called with the subscription id of
 * the member who was actually billed for the plan (see
 * changeCouplePartner's docstring); the old partner's linked subscription is
 * cancelled, not deleted, and a new one is created for the replacement
 * partner on the same plan/dates.
 */
export async function changeCouplePartnerAction(
  _: ChangePartnerState,
  formData: FormData,
): Promise<ChangePartnerState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const subscriptionId = String(formData.get("subscription_id") ?? "").trim();
  const partnerMode = String(formData.get("partner_mode") ?? "existing") === "new" ? "new" : "existing";
  const partnerMemberId = String(formData.get("partner_member_id") ?? "").trim();
  const partnerFullName = String(formData.get("partner_full_name") ?? "").trim();
  const partnerAgeText = String(formData.get("partner_age") ?? "").trim();
  const partnerAge = partnerAgeText ? Number(partnerAgeText) : null;
  const partnerPhone = normalizePhone(formData.get("partner_phone"));

  if (!subscriptionId) return { error: "Subscription is required." };
  if (partnerMode === "existing" && !partnerMemberId) return { error: "Select the new second member." };
  if (partnerMode === "new" && !partnerFullName) return { error: "Enter the new second member's name." };

  try {
    const result = await changeCouplePartner({
      subscriptionId,
      tenantId: profile.tenant_id,
      performedBy: profile.id,
      requestingRole: profile.role?.slug ?? null,
      requestingBranchId: profile.branch_id ?? null,
      partnerMode,
      partnerMemberId: partnerMemberId || null,
      partnerFullName: partnerFullName || null,
      partnerAge,
      partnerPhone: partnerPhone || null,
    });

    const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
    revalidatePath(`${base}/members/${result.memberId}`);
    if (result.oldPartnerId) revalidatePath(`${base}/members/${result.oldPartnerId}`);
    revalidatePath(`${base}/members/${result.newPartnerId}`);
    return { success: true, newPartnerId: result.newPartnerId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to change the couple partner." };
  }
}

export async function createMemberAction(
  _: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };
  const raw = Object.fromEntries(formData);
  const branchId = String(raw.branch_id ?? profile.branch_id ?? "");
  const memberFormConfiguration = profile.tenant_id ? await getMemberFormConfiguration(profile.tenant_id) : [];
  const parsed = applyMemberFormConfiguration(memberSchema, memberFormConfiguration).safeParse({
    ...raw,
    branch_id: branchId,
    phone: normalizePhone(raw.phone),
    emergency_contact_phone: normalizePhone(raw.emergency_contact_phone),
    height_cm: raw.height_cm || null,
    weight_kg: raw.weight_kg || null,
    date_of_birth: raw.date_of_birth || null,
    email: raw.email || null,
    machine_user_id: raw.machine_user_id || null,
    assigned_trainer_id: raw.assigned_trainer_id || null,
    blood_group: raw.blood_group || null,
  });
  if (!parsed.success) {
    return { error: "Review the highlighted information.", fields: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const planId = String(raw.plan_id ?? "");
  const startDate = String(raw.start_date ?? "");
  const paymentAmountText = String(raw.payment_amount ?? "");
  const paymentAmount = paymentAmountText ? Number(paymentAmountText) : NaN;
  const discountAmount = Number(raw.discount_amount ?? 0);
  const paymentMethod = ["cash", "upi", "card", "online", "check"].includes(String(raw.payment_method ?? "")) ? String(raw.payment_method) : "cash";
  const transactionRef = String(raw.transaction_ref ?? "").trim() || null;
  const couplePartnerMode = String(raw.couple_partner_mode ?? "existing") === "new" ? "new" : "existing";
  const couplePartnerMemberId = String(raw.couple_partner_member_id ?? "").trim();
  const couplePartnerFullName = String(raw.couple_partner_full_name ?? "").trim();
  const couplePartnerAgeText = String(raw.couple_partner_age ?? "").trim();
  const couplePartnerAge = couplePartnerAgeText ? Number(couplePartnerAgeText) : null;
  const couplePartnerPhone = normalizePhone(raw.couple_partner_phone);
  // Optional second, independently-billed plan sold at the same time as the
  // primary one above (e.g. a Gym membership + a Personal Training plan) —
  // see the "Add another plan" toggle on the registration wizard. Both plans
  // stay active at once; this never replaces the primary plan. Only
  // individual (non-couple) plans are offered here to keep this simple —
  // couple pairing is already handled for the primary plan slot.
  const extraPlanId = String(raw.extra_plan_id ?? "").trim();
  const extraPaymentAmountText = String(raw.extra_payment_amount ?? "").trim();
  const extraPaymentAmount = extraPaymentAmountText ? Number(extraPaymentAmountText) : 0;
  const extraDiscountAmount = Number(raw.extra_discount_amount ?? 0);

  if (!planId) return { error: "Package is required." };
  if (!startDate) return { error: "Start date is required." };
  if (!paymentAmountText || Number.isNaN(paymentAmount) || paymentAmount < 0) return { error: "Payment completed is required." };
  if (!Number.isFinite(discountAmount) || discountAmount < 0) return { error: "Enter a valid discount amount." };
  if (extraPlanId && (!Number.isFinite(extraPaymentAmount) || extraPaymentAmount < 0)) return { error: "Enter a valid payment amount for the extra plan." };
  if (extraPlanId && (!Number.isFinite(extraDiscountAmount) || extraDiscountAmount < 0)) return { error: "Enter a valid discount amount for the extra plan." };

  try {
    parseDateOnly(startDate);
  } catch {
    return { error: "Enter a valid start date." };
  }

  const supabase = await createClient();
  const [plan, { data: branch }, { data: financeSettings }] = await Promise.all([
    getPlanForSale(planId),
    supabase
      .from("branches")
      .select("id, state, tenant_id")
      .eq("id", parsed.data.branch_id)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("finance_settings")
      .select("gst_registered, default_gst_rate, gst_pricing_mode, business_state")
      .eq("branch_id", parsed.data.branch_id)
      .maybeSingle(),
  ]);

  if (!plan) return { error: "Select an active package." };
  if (plan.branch_id && plan.branch_id !== parsed.data.branch_id) return { error: "Selected package does not belong to the chosen branch." };
  if (!branch) return { error: "Select an active branch in your organization." };
  if (profile.role?.slug === "reception" && profile.branch_id !== branch.id) {
    return { error: "Reception staff can register members only for their assigned branch." };
  }

  const isCouplePlan = plan.plan_type === "couple";
  if (isCouplePlan && couplePartnerMode === "existing" && !couplePartnerMemberId) {
    return { error: "This is a couple plan — select the second member too." };
  }
  if (isCouplePlan && couplePartnerMode === "new" && !couplePartnerFullName) {
    return { error: "This is a couple plan — enter the second member's name." };
  }
  // "existing" pairs with an already-registered member (looked up now, before
  // we spend anything). "new" registers a second brand-new member via a
  // short form (name + phone) — that member is created further below,
  // alongside the primary member and billing, so any failure there rolls
  // back the same way.
  let existingCouplePartner: { id: string; full_name: string | null } | null = null;
  if (isCouplePlan && couplePartnerMode === "existing") {
    const { data: partner } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("id", couplePartnerMemberId)
      .eq("branch_id", parsed.data.branch_id)
      .eq("status", "active")
      .maybeSingle();
    if (!partner) return { error: "The second member is unavailable for this branch." };
    existingCouplePartner = partner;
  }

  const discountBase = Number(plan.price ?? 0);
  const planDiscount = Math.round(discountBase * Number(plan.discount_percent ?? 0) * 100) / 10000;
  if (discountAmount > Math.max(0, discountBase - planDiscount)) return { error: "Discount cannot exceed the package amount." };
  if (await hasCurrentFeature("advanced_membership")) {
    const auth = checkDiscountAuthorization({
      listPrice: discountBase,
      manualDiscountAmount: discountAmount,
      performedByRole: profile.role?.slug,
    });
    if (!auth.allowed) return { error: auth.reason ?? "This discount requires manager-level authorization." };
  }
  const discount = planDiscount + discountAmount;
  const discountedAmount = Math.max(0, discountBase - discount);

  let createdMember: Awaited<ReturnType<typeof createMember>>;
  try {
    createdMember = await createMember(parsed.data, profile.id, profile.tenant_id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create member." };
  }

  const gstEnabled = Boolean(financeSettings?.gst_registered) && Number(plan.gst_percent ?? financeSettings?.default_gst_rate ?? 0) > 0;
  const pricingMode = (financeSettings?.gst_pricing_mode === "inclusive" ? "inclusive" : "exclusive") as GstPricingMode;
  const gstRate = gstEnabled ? Number(plan.gst_percent ?? financeSettings?.default_gst_rate ?? 0) : 0;
  const gst = calculateGstBreakdown({
    grossAmount: discountedAmount,
    gstRate,
    pricingMode,
    gymState: financeSettings?.business_state ?? branch.state ?? null,
    customerState: parsed.data.address ?? branch.state ?? null,
  });
  const total = gst.grandTotal;

  if (calculatePaymentBalance(total, paymentAmount).isOverpaid) return { error: "Payment completed cannot be greater than total amount." };

  let couplePartner: { id: string; full_name: string | null } | null = existingCouplePartner;

  try {
    const subscription = await createSubscriptionWithHistory({
      memberId: createdMember.id,
      planId: plan.id,
      branchId: parsed.data.branch_id,
      tenantId: profile.tenant_id,
      startDate,
      status: "active",
      price: gst.taxableAmount,
      discountAmount: discount,
      gstAmount: gst.gstAmount,
      totalAmount: total,
      performedBy: profile.id,
      action: "created",
      remarks: `Collected on registration: ${paymentAmount.toFixed(2)}`,
    });

    // Note: the invoice's due_date is the *payment* due date, not the
    // membership's expiry date — those were previously conflated here,
    // which made every registration-day invoice's due date track the
    // subscription's end_date instead of when payment was actually owed
    // (causing unrelated invoices to cluster onto the same "due date" on
    // the Outstanding Dues page whenever their plans happened to share a
    // duration). Payment is expected on the day the membership starts.

    if (isCouplePlan && couplePartnerMode === "new") {
      // Short-form registration: create the second member with just a name
      // (and optional phone) — everything else defaults, same as any other
      // member record. Created here, alongside billing, so a failure below
      // surfaces as one combined error rather than leaving an orphan member.
      const newPartner = await createMember(
        {
          full_name: couplePartnerFullName,
          phone: couplePartnerPhone || null,
          age: Number.isFinite(couplePartnerAge) ? couplePartnerAge : null,
          branch_id: parsed.data.branch_id,
          status: "active",
        } as MemberInput,
        profile.id,
        profile.tenant_id,
      );
      couplePartner = { id: newPartner.id, full_name: newPartner.full_name };
    }

    if (isCouplePlan && couplePartner) {
      // Same plan and start date as the new member's subscription above, so
      // the plan's duration trigger derives a matching expiry for the
      // partner automatically. No separate charge — already billed on the
      // new member's invoice/payment below.
      await createSubscriptionWithHistory({
        memberId: couplePartner.id,
        planId: plan.id,
        branchId: parsed.data.branch_id,
        tenantId: profile.tenant_id,
        startDate,
        status: "active",
        price: 0,
        discountAmount: 0,
        gstAmount: 0,
        totalAmount: 0,
        performedBy: profile.id,
        action: "created",
        remarks: `Couple plan — paired with new member ${parsed.data.full_name}. Billed on that member's subscription.`,
        linkedSubscriptionId: (subscription as { id?: string } | null)?.id ?? null,
      });
    }

    const invoicePayload = {
      member_id: createdMember.id,
      subscription_id: (subscription as { id?: string } | null)?.id ?? null,
      branch_id: parsed.data.branch_id,
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
      due_date: startDate,
      line_items: [{ description: plan.name, amount: total, taxable_amount: gst.taxableAmount, gst_amount: gst.gstAmount }],
      created_by: profile.id,
    };
    const { data: invoice, error: invoiceError } = await insertWithSchemaFallback<{ id: string }>(
      (payload) => supabase.from("invoices").insert(payload).select("id").single(),
      invoicePayload,
      invoiceSchemaFallbackKeys,
    );
    if (invoiceError || !invoice) throw new Error(invoiceError?.message ?? "Unable to create invoice.");

    if (paymentAmount > 0) {
      const ratio = total > 0 ? Math.min(1, paymentAmount / total) : 1;
      const paymentPayload = {
        invoice_id: invoice.id,
        member_id: createdMember.id,
        subscription_id: (subscription as { id?: string } | null)?.id ?? null,
        branch_id: parsed.data.branch_id,
        tenant_id: branch.tenant_id,
        amount: paymentAmount,
        taxable_amount: Math.round(gst.taxableAmount * ratio * 100) / 100,
        gst_rate: gst.gstRate,
        gst_type: gst.gstKind,
        gst_amount: Math.round(gst.gstAmount * ratio * 100) / 100,
        cgst_amount: Math.round(gst.cgstAmount * ratio * 100) / 100,
        sgst_amount: Math.round(gst.sgstAmount * ratio * 100) / 100,
        igst_amount: Math.round(gst.igstAmount * ratio * 100) / 100,
        method: paymentMethod,
        status: "completed",
        transaction_reference: transactionRef,
        paid_at: new Date().toISOString(),
        collected_by: profile.id,
      };
      const { error: paymentError } = await insertWithSchemaFallback<null>(
        (payload) => supabase.from("payments").insert(payload),
        paymentPayload,
        paymentSchemaFallbackKeys,
      );
      if (paymentError) throw new Error(paymentError.message ?? "Unable to create payment.");
    }

    if (extraPlanId) {
      // A second, separate plan for the same new member — its own
      // subscription, invoice, and (optional) payment, running alongside
      // the primary plan above rather than replacing it.
      await sellMembershipPlanToMember({
        memberId: createdMember.id,
        memberName: createdMember.full_name,
        branchId: parsed.data.branch_id,
        tenantId: profile.tenant_id,
        planId: extraPlanId,
        startDate,
        paymentAmount: extraPaymentAmount,
        discountAmount: extraDiscountAmount,
        paymentMethod: paymentMethod as "cash" | "upi" | "card" | "online" | "check",
        transactionRef: null,
        performedBy: profile.id,
        performedByRole: profile.role?.slug,
        enforceDiscountAuthorization: await hasCurrentFeature("advanced_membership"),
        subscriptionAction: "created",
        remarksPrefix: "Extra plan added at registration — collected: ",
      });
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Member created, but package/payment could not be saved." };
  }

  const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
  revalidatePath(`${base}/members`);
  if (couplePartner) revalidatePath(`${base}/members/${couplePartner.id}`);
  redirect(`${base}/members`);
}

export async function generateMemberInvoiceAction(memberId: string): Promise<{ error?: string; invoiceId?: string; redirectTo?: string }> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!memberId) return { error: "Member ID is missing." };

  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, full_name, branch_id, address")
    .eq("id", memberId)
    .single();

  if (memberError || !member) return { error: memberError?.message ?? "Member not found." };

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("id, branch_id, plan_id, start_date, end_date, status, membership_plans(id, name, price, gst_percent, discount_percent)")
    .eq("member_id", memberId)
    .in("status", ["active", "pending"])
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) return { error: subscriptionError.message };
  if (!subscription?.plan_id) return { error: "No active membership plan found for this member." };

  const { data: existingInvoices, error: existingInvoiceError } = await supabase
    .from("invoices")
    .select("id")
    .eq("member_id", memberId)
    .eq("subscription_id", subscription.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingInvoiceError) return { error: existingInvoiceError.message };

  const portalBase = profile.role?.slug === "reception" ? "/reception" : "/admin";
  const existingInvoice = existingInvoices?.[0];
  if (existingInvoice?.id) {
    return {
      invoiceId: existingInvoice.id,
      redirectTo: `${portalBase}/invoices/${existingInvoice.id}`,
    };
  }

  const [{ data: branch, error: branchError }, { data: financeSettings, error: financeError }] = await Promise.all([
    supabase
      .from("branches")
      .select("id, state, tenant_id")
      .eq("id", subscription.branch_id ?? member.branch_id)
      .maybeSingle(),
    supabase
      .from("finance_settings")
      .select("gst_registered, default_gst_rate, gst_pricing_mode, business_state")
      .eq("branch_id", subscription.branch_id ?? member.branch_id)
      .maybeSingle(),
  ]);

  if (branchError) return { error: branchError.message };
  if (financeError) return { error: financeError.message };
  if (!branch) return { error: "Branch not found for this membership." };

  const plan = Array.isArray(subscription.membership_plans)
    ? subscription.membership_plans[0] ?? null
    : subscription.membership_plans;
  if (!plan) return { error: "Membership plan details are missing." };

  const basePrice = Number(plan.price ?? 0);
  const discount = Math.round(basePrice * Number(plan.discount_percent ?? 0) * 100) / 10000;
  const discountedAmount = Math.max(0, basePrice - discount);
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
  // Payment due date, not the membership's expiry date — see the note in
  // createMemberAction above for why end_date must not be used here.
  const dueDate = subscription.start_date ?? new Date().toISOString().slice(0, 10);

  const invoicePayload = {
      member_id: memberId,
      subscription_id: subscription.id,
      branch_id: branch.id,
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
      due_date: dueDate,
      notes: null,
      line_items: [{
        description: plan.name ?? "Membership",
        amount: total,
        taxable_amount: gst.taxableAmount,
        gst_amount: gst.gstAmount,
      }],
      created_by: profile.id,
  };
  const { data: invoice, error: invoiceError } = await insertWithSchemaFallback<{ id: string }>(
    (payload) => supabase.from("invoices").insert(payload).select("id").single(),
    invoicePayload,
    invoiceSchemaFallbackKeys,
  );

  if (invoiceError || !invoice) return { error: invoiceError?.message ?? "Unable to create invoice." };

  await logActivity({
    performedBy: profile.id,
    branchId: branch.id,
    action: "invoice_created",
    entityType: "invoice",
    entityId: invoice.id,
    description: `Invoice created for ${member.full_name}`,
    metadata: {
      member_id: memberId,
      subscription_id: subscription.id,
      plan_id: subscription.plan_id,
      total_amount: total,
    },
  });

  revalidatePath(`${portalBase}/members`);
  revalidatePath(`${portalBase}/members/${memberId}`);
  revalidatePath(`${portalBase}/payments`);

  return {
    invoiceId: invoice.id,
    redirectTo: `${portalBase}/invoices/${invoice.id}`,
  };
}

export async function updateMemberAction(
  _: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const id = formData.get("id") as string;
  if (!id) return { error: "Member ID is missing." };
  const raw = Object.fromEntries(formData);
  const { id: _id, ...rest } = raw;
  void _id;
  const memberFormConfiguration = profile.tenant_id ? await getMemberFormConfiguration(profile.tenant_id) : [];
  const parsed = applyMemberFormConfiguration(memberSchema.partial(), memberFormConfiguration).safeParse({
    ...rest,
    phone: normalizePhone(rest.phone),
    emergency_contact_phone: normalizePhone(rest.emergency_contact_phone),
    height_cm: rest.height_cm || null,
    weight_kg: rest.weight_kg || null,
    date_of_birth: rest.date_of_birth || null,
    email: rest.email || null,
    machine_user_id: rest.machine_user_id || null,
    assigned_trainer_id: rest.assigned_trainer_id || null,
    assigned_dietician_id: rest.assigned_dietician_id || null,
    blood_group: rest.blood_group || null,
  });
  if (!parsed.success)
    return { error: "Review the highlighted information.", fields: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    await updateMember(id, parsed.data, profile.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update member." };
  }
  const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
  revalidatePath(`${base}/members/${id}`);
  revalidatePath(`${base}/members`);
  redirect(`${base}/members/${id}`);
}

export async function deleteMemberAction(id: string): Promise<{ error?: string }> {
  const profile = await requireUser(["admin", "manager"]);
  try {
    await deactivateMember(id, profile.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to deactivate member." };
  }
  revalidatePath("/admin/members");
  revalidatePath("/reception/members");
  revalidatePath("/admin/dashboard");
  revalidatePath("/reception/dashboard");
  return {};
}

export async function uploadMemberPhotoAction(
  _: { error?: string; url?: string },
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const id = formData.get("id") as string;
  const file = formData.get("photo") as File | null;
  if (!id) return { error: "Member ID is missing." };
  if (!file || file.size === 0) return { error: "No file selected." };
  if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5 MB." };
  if (!file.type.startsWith("image/")) return { error: "Only image files are accepted." };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${profile.branch_id ?? "global"}/${id}/profile.${ext}`;
  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from("member-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: publicData } = supabase.storage.from("member-photos").getPublicUrl(path);
  const url = publicData.publicUrl;

  try {
    await updateMember(id, { profile_photo_url: url } as Parameters<typeof updateMember>[1], profile.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Photo saved but profile not updated." };
  }

  revalidatePath(`/admin/members/${id}`);
  revalidatePath(`/reception/members/${id}`);
  return { url };
}
