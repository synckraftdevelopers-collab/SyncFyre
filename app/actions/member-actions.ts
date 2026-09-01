"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { calculateGstBreakdown, type GstPricingMode } from "@/lib/finance/gst";
import { parseDateOnly } from "@/lib/membership-dates";
import { createClient } from "@/lib/supabase/server";
import { memberSchema } from "@/lib/validations/member";
import { createMember, updateMember } from "@/services/member.service";
import { createSubscriptionWithHistory } from "@/services/workflow.service";
import { deactivateMember } from "@/services/member-extended.service";

export type MemberFormState = { error?: string; fields?: Record<string, string[]> };

function normalizePhone(value: FormDataEntryValue | string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const local = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return local.length === 10 ? `+91${local}` : String(value ?? "").trim();
}

export async function createMemberAction(
  _: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const raw = Object.fromEntries(formData);
  const branchId = String(raw.branch_id ?? profile.branch_id ?? "");
  const parsed = memberSchema.safeParse({
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
      .maybeSingle(),
    supabase
      .from("finance_settings")
      .select("gst_registered, default_gst_rate, gst_pricing_mode, business_state")
      .eq("branch_id", parsed.data.branch_id)
      .maybeSingle(),
  ]);

  if (!plan) return { error: "Select an active package." };
  if (plan.branch_id && plan.branch_id !== parsed.data.branch_id) return { error: "Selected package does not belong to the chosen branch." };
  if (!branch) return { error: "Selected branch was not found." };

  let createdMember: Awaited<ReturnType<typeof createMember>>;
  try {
    createdMember = await createMember(parsed.data, profile.id);
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

    const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert({
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
    }).select("id").single();
    if (invoiceError || !invoice) throw new Error(invoiceError?.message ?? "Unable to create invoice.");

    if (paymentAmount > 0) {
      const ratio = total > 0 ? Math.min(1, paymentAmount / total) : 1;
      const { error: paymentError } = await supabase.from("payments").insert({
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
      });
      if (paymentError) throw new Error(paymentError.message);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Member created, but package/payment could not be saved." };
  }

  const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
  revalidatePath(`${base}/members`);
  redirect(`${base}/members`);
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
  const parsed = memberSchema.partial().safeParse({
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
