"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { MemberCandidate, MemberImportError } from "@/lib/members/member-import";
import { createClient } from "@/lib/supabase/server";
import { createSubscriptionWithHistory, logActivity } from "@/services/workflow.service";
import { calculateGstBreakdown, type GstPricingMode } from "@/lib/finance/gst";

export type MemberExcelImportResult = {
  error?: string;
  imported: number;
  duplicates: number;
  errors: MemberImportError[];
};

type Request = {
  branchId: string;
  candidates: MemberCandidate[];
  validationErrors: MemberImportError[];
};

async function authorize(branchId: string) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (profile.role?.slug === "reception" && profile.branch_id !== branchId) {
    throw new Error("You can only import members into your assigned branch.");
  }

  const supabase = await createClient();
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .eq("status", "active")
    .maybeSingle();

  if (!branch) {
    throw new Error("Choose an active branch.");
  }

  return { profile, supabase };
}

export async function previewMemberExcelImportAction({
  branchId,
  candidates,
}: Pick<Request, "branchId" | "candidates">) {
  try {
    const { supabase } = await authorize(branchId);
    const errors: MemberImportError[] = [];

    const phones = candidates.flatMap((candidate) => (candidate.phone ? [candidate.phone] : []));
    const { data: plans, error: planError } = await supabase
      .from("membership_plans")
      .select("id,name")
      .eq("branch_id", branchId)
      .eq("status", "active");

    if (planError) {
      return { error: planError.message, errors, duplicates: 0, ready: 0 };
    }

    const planNames = new Set((plans ?? []).map((plan) => plan.name.trim().toLowerCase()));
    const existingPhones = new Set<string>();

    if (phones.length) {
      const { data, error } = await supabase
        .from("members")
        .select("phone")
        .eq("branch_id", branchId)
        .in("phone", phones);

      if (error) {
        return { error: error.message, errors, duplicates: 0, ready: 0 };
      }

      data?.forEach((member) => existingPhones.add(member.phone));
    }

    candidates.forEach((candidate) => {
      if (candidate.phone && existingPhones.has(candidate.phone)) {
        errors.push({
          row: candidate.row,
          name: candidate.fullName,
          payment: String(candidate.payment ?? ""),
          package: candidate.package ?? "",
          startDate: candidate.membershipStartDate ?? "",
          endDate: candidate.membershipEndDate ?? "",
          error: "Duplicate member.",
        });
      }

      if (candidate.package && !planNames.has(candidate.package.trim().toLowerCase())) {
        errors.push({
          row: candidate.row,
          name: candidate.fullName,
          payment: String(candidate.payment ?? ""),
          package: candidate.package,
          startDate: candidate.membershipStartDate ?? "",
          endDate: candidate.membershipEndDate ?? "",
          error: `Package '${candidate.package}' was not found.`,
        });
      }
    });

    const duplicates = errors.filter((item) => item.error === "Duplicate member.").length;
    return { errors, duplicates, ready: candidates.length - errors.length };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to validate import.",
      errors: [],
      duplicates: 0,
      ready: 0,
    };
  }
}

export async function importMemberExcelAction(request: Request): Promise<MemberExcelImportResult> {
  try {
    const { profile, supabase } = await authorize(request.branchId);
    const validation = await previewMemberExcelImportAction(request);

    if (validation.error) {
      return {
        error: validation.error,
        imported: 0,
        duplicates: 0,
        errors: request.validationErrors,
      };
    }

    const errors = [...request.validationErrors, ...validation.errors];
    const invalidRows = new Set(errors.map((item) => item.row));

    const plans = await supabase
      .from("membership_plans")
      .select("id,name,price,gst_percent,discount_percent")
      .eq("branch_id", request.branchId)
      .eq("status", "active");

    if (plans.error) {
      return { error: plans.error.message, imported: 0, duplicates: 0, errors };
    }

    const planByName = new Map((plans.data ?? []).map((plan) => [plan.name.trim().toLowerCase(), plan]));
    let imported = 0;

    for (const candidate of request.candidates.filter((item) => !invalidRows.has(item.row))) {
      const { data: member, error: memberError } = await supabase
        .from("members")
        .insert({
          branch_id: request.branchId,
          full_name: candidate.fullName,
          phone: candidate.phone,
          email: candidate.email,
          gender: candidate.gender,
          date_of_birth: candidate.dateOfBirth,
          address: candidate.address,
          emergency_contact_name: candidate.emergencyContact,
          emergency_contact_phone: candidate.emergencyPhone,
          age: candidate.age,
          candidate_consent_name: candidate.candidateConsentName,
          relationship_to_candidate: candidate.relationshipToCandidate,
          screening_date: candidate.screeningDate,
          screening_valid_until: candidate.screeningValidUntil,
          height_cm: candidate.height,
          weight_kg: candidate.weight,
          blood_group: candidate.bloodGroup,
          medical_conditions: candidate.medicalConditions,
          fitness_goal: candidate.fitnessGoal,
          status: candidate.status,
        })
        .select("id")
        .single();

      if (memberError || !member) {
        errors.push({
          row: candidate.row,
          name: candidate.fullName,
          payment: String(candidate.payment ?? ""),
          package: candidate.package ?? "",
          startDate: candidate.membershipStartDate ?? "",
          endDate: candidate.membershipEndDate ?? "",
          error: memberError?.message ?? "Unable to create member.",
        });
        continue;
      }

      const hasSubscriptionData = Boolean(
        candidate.package && candidate.membershipStartDate && candidate.membershipEndDate,
      );

      if (!hasSubscriptionData) {
        imported++;
        continue;
      }

      try {
        const plan = planByName.get(candidate.package!.trim().toLowerCase());
        if (!plan) {
          throw new Error(`Package '${candidate.package}' was not found.`);
        }

        const [{ data: branch }, { data: financeSettings }] = await Promise.all([
          supabase.from("branches").select("id, state, tenant_id").eq("id", request.branchId).maybeSingle(),
          supabase.from("finance_settings").select("gst_registered, default_gst_rate, gst_pricing_mode, business_state").eq("branch_id", request.branchId).maybeSingle(),
        ]);
        if (!branch) throw new Error("Branch not found.");

        const price = Number(plan.price);
        const discount = Math.round(price * Number(plan.discount_percent) * 100) / 10000;
        const discountedAmount = Math.max(0, price - discount);
        const gstEnabled = Boolean(financeSettings?.gst_registered) && Number(plan.gst_percent ?? financeSettings?.default_gst_rate ?? 0) > 0;
        const gst = calculateGstBreakdown({
          grossAmount: discountedAmount,
          gstRate: gstEnabled ? Number(plan.gst_percent ?? financeSettings?.default_gst_rate ?? 0) : 0,
          pricingMode: (financeSettings?.gst_pricing_mode === "inclusive" ? "inclusive" : "exclusive") as GstPricingMode,
          gymState: financeSettings?.business_state ?? branch.state ?? null,
          customerState: branch.state ?? null,
        });
        const total = gst.grandTotal;
        const paymentAmount = candidate.payment ?? 0;

        const subscriptionId = await createSubscriptionWithHistory({
          memberId: member.id,
          planId: plan.id,
          branchId: request.branchId,
          startDate: candidate.membershipStartDate!,
          endDate: candidate.membershipEndDate!,
          status: "active",
          price: gst.taxableAmount,
          discountAmount: discount,
          gstAmount: gst.gstAmount,
          totalAmount: total,
          performedBy: profile.id,
        });

        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            member_id: member.id,
            subscription_id: subscriptionId,
            branch_id: request.branchId,
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
            tenant_id: branch.tenant_id,
            amount_paid: paymentAmount,
            due_date: candidate.membershipEndDate,
            status: paymentAmount >= total ? "paid" : paymentAmount > 0 ? "partial" : "unpaid",
            line_items: [{ description: plan.name, amount: total, taxable_amount: gst.taxableAmount, gst_amount: gst.gstAmount }],
            notes: candidate.notes,
          })
          .select("id")
          .single();

        if (invoiceError || !invoice) {
          throw new Error(invoiceError?.message ?? "Unable to create invoice.");
        }

        if (paymentAmount > 0) {
          const { error: paymentError } = await supabase.from("payments").insert({
            invoice_id: invoice.id,
            member_id: member.id,
            subscription_id: subscriptionId,
            branch_id: request.branchId,
            amount: paymentAmount,
            taxable_amount: Math.round(gst.taxableAmount * (total > 0 ? Math.min(1, paymentAmount / total) : 1) * 100) / 100,
            gst_rate: gst.gstRate,
            gst_type: gst.gstKind,
            gst_amount: Math.round(gst.gstAmount * (total > 0 ? Math.min(1, paymentAmount / total) : 1) * 100) / 100,
            cgst_amount: Math.round(gst.cgstAmount * (total > 0 ? Math.min(1, paymentAmount / total) : 1) * 100) / 100,
            sgst_amount: Math.round(gst.sgstAmount * (total > 0 ? Math.min(1, paymentAmount / total) : 1) * 100) / 100,
            igst_amount: Math.round(gst.igstAmount * (total > 0 ? Math.min(1, paymentAmount / total) : 1) * 100) / 100,
            tenant_id: branch.tenant_id,
            method: "cash",
            status: "completed",
            paid_at: `${candidate.membershipStartDate}T00:00:00`,
            collected_by: profile.id,
          });

          if (paymentError) {
            throw new Error(paymentError.message);
          }
        }

        imported++;
      } catch (error) {
        errors.push({
          row: candidate.row,
          name: candidate.fullName,
          payment: String(candidate.payment ?? ""),
          package: candidate.package ?? "",
          startDate: candidate.membershipStartDate ?? "",
          endDate: candidate.membershipEndDate ?? "",
          error: error instanceof Error ? error.message : "Unable to create membership payment.",
        });
      }
    }

    await logActivity({
      performedBy: profile.id,
      branchId: request.branchId,
      action: "member_excel_import",
      entityType: "members",
      entityId: request.branchId,
      description: "Members imported from Excel",
      metadata: { imported, failed: errors.length },
    });

    revalidatePath("/admin/members");
    revalidatePath("/reception/members");

    return {
      imported,
      duplicates: errors.filter((item) => item.error === "Duplicate member.").length,
      errors,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to import members.",
      imported: 0,
      duplicates: 0,
      errors: request.validationErrors,
    };
  }
}
