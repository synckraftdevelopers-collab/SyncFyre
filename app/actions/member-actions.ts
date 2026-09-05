"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { calculateGstBreakdown, type GstPricingMode } from "@/lib/finance/gst";
import { insertWithSchemaFallback } from "@/lib/supabase/insert-fallback";
import { parseDateOnly } from "@/lib/membership-dates";
import { createClient } from "@/lib/supabase/server";
import { applyMemberFormConfiguration, memberSchema } from "@/lib/validations/member";
import { createMember, updateMember } from "@/services/member.service";
import { getMemberFormConfiguration } from "@/services/member-form-config.service";
import { createSubscriptionWithHistory, logActivity } from "@/services/workflow.service";
import { deactivateMember } from "@/services/member-extended.service";

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
  const paymentMethod = ["cash", "upi", "card", "online"].includes(String(raw.payment_method ?? "")) ? String(raw.payment_method) : "cash";
  const transactionRef = String(raw.transaction_ref ?? "").trim() || null;

  if (!planId) return { error: "Package is required." };
  if (!startDate) return { error: "Start date is required." };
  if (!paymentAmountText || Number.isNaN(paymentAmount) || paymentAmount < 0) return { error: "Payment completed is required." };

  try {
    parseDateOnly(startDate);
  } catch {
    return { error: "Enter a valid start date." };
  }

  const supabase = await createClient();
  const [{ data: plan }, { data: branch }, { data: financeSettings }] = await Promise.all([
    supabase
      .from("membership_plans")
      .select("id, name, branch_id, price, gst_percent, discount_percent, duration_months")
      .eq("id", planId)
      .eq("status", "active")
      .maybeSingle(),
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

  let createdMember: Awaited<ReturnType<typeof createMember>>;
  try {
    createdMember = await createMember(parsed.data, profile.id, profile.tenant_id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create member." };
  }

  const discountBase = Number(plan.price ?? 0);
  const discount = Math.round(discountBase * Number(plan.discount_percent ?? 0) * 100) / 10000;
  const discountedAmount = Math.max(0, discountBase - discount);
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

  if (paymentAmount > total) return { error: "Payment completed cannot be greater than total amount." };

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

    const subscriptionEndDate = (subscription as { id?: string; end_date?: string } | null)?.end_date ?? null;
    if (!subscriptionEndDate) throw new Error("Unable to determine membership expiry date.");

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
      due_date: subscriptionEndDate,
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
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Member created, but package/payment could not be saved." };
  }

  const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
  revalidatePath(`${base}/members`);
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
  const dueDate = subscription.end_date ?? subscription.start_date ?? new Date().toISOString().slice(0, 10);

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
