"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths, format, parseISO } from "date-fns";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { memberSchema } from "@/lib/validations/member";
import { createMember, updateMember } from "@/services/member.service";
import { createIncome } from "@/services/finance.service";
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
  if (!paymentAmountText || Number.isNaN(paymentAmount) || paymentAmount < 0) return { error: "Payment amount is required." };

  const parsedDate = parseISO(startDate);
  if (Number.isNaN(parsedDate.getTime())) return { error: "Enter a valid start date." };

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id, name, branch_id, price, gst_percent, discount_percent, duration_months")
    .eq("id", planId)
    .eq("status", "active")
    .maybeSingle();

  if (!plan) return { error: "Select an active package." };
  if (plan.branch_id && plan.branch_id !== parsed.data.branch_id) return { error: "Selected package does not belong to the chosen branch." };

  let createdMember: Awaited<ReturnType<typeof createMember>>;
  try {
    createdMember = await createMember(parsed.data, profile.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create member." };
  }

  const price = Number(plan.price ?? 0);
  const discount = Math.round(price * Number(plan.discount_percent ?? 0) * 100) / 10000;
  const taxable = price - discount;
  const gst = Math.round(taxable * Number(plan.gst_percent ?? 0) * 100) / 10000;
  const total = taxable + gst;
  const endDate = format(addMonths(parsedDate, Number(plan.duration_months ?? 0)), "yyyy-MM-dd");

  try {
    await createSubscriptionWithHistory({
      memberId: createdMember.id,
      planId: plan.id,
      branchId: parsed.data.branch_id,
      startDate,
      endDate,
      status: "active",
      price,
      discountAmount: discount,
      gstAmount: gst,
      totalAmount: total,
      performedBy: profile.id,
      action: "created",
      remarks: `Collected on registration: ${paymentAmount.toFixed(2)}`,
    });

    await createIncome({
      branch_id: parsed.data.branch_id,
      category_id: null,
      payment_id: null,
      invoice_id: null,
      member_id: createdMember.id,
      amount: paymentAmount,
      gst_amount: 0,
      total_amount: paymentAmount,
      payment_method: paymentMethod as "cash" | "upi" | "card" | "online",
      transaction_ref: transactionRef,
      income_date: startDate,
      description: `Membership payment for ${createdMember.full_name}`,
      notes: plan.name ? `Package: ${plan.name}` : null,
      status: "posted",
      is_membership_income: true,
      hsn_sac: null,
      created_by: profile.id,
      updated_by: profile.id,
    });
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
    assigned_trainer_id: rest.assigned_trainer_id || null,
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
  const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
  revalidatePath(`${base}/members`);
  redirect(`${base}/members`);
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
