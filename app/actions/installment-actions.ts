"use server";

/**
 * installment-actions.ts
 *
 * "Installments / partial-payment continuation" — one of the Advanced
 * Membership Operations gated behind the `advanced_membership` SaaS
 * feature (Growth+; see lib/entitlements/registry.ts). Lightweight by
 * design (see migration 0054): an invoice can be flagged as an
 * installment plan with a single next-due-date, and staff can record an
 * additional payment against an already-created invoice — a capability
 * that didn't exist anywhere in the app before this feature.
 *
 * Role gating mirrors subscription-actions.ts: admin/manager (any branch
 * in the tenant) or reception (their own branch only) — the same set
 * already allowed to write invoices/payments per RLS
 * (0040_member_financial_write_rls.sql).
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { assertCurrentFeature } from "@/lib/entitlements/server";
import { recordReceivablePayment, setInvoiceInstallmentPlan } from "@/services/finance.service";

export type InstallmentActionState = { error?: string; success?: string };

function revalidateOutstanding() {
  revalidatePath("/admin/finance/outstanding");
  revalidatePath("/admin/finance/receivables");
  revalidatePath("/admin/finance");
}

const setInstallmentPlanSchema = z.object({
  invoice_id: z.string().uuid(),
  next_installment_due_date: z.string().date().optional().or(z.literal("")),
});

export async function setInstallmentPlanAction(formData: FormData): Promise<InstallmentActionState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  try {
    await assertCurrentFeature("advanced_membership");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = setInstallmentPlanSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const nextDate = parsed.data.next_installment_due_date;
  try {
    await setInvoiceInstallmentPlan({
      invoiceId: parsed.data.invoice_id,
      branchId: profile.branch_id,
      nextInstallmentDueDate: nextDate ? nextDate : null,
    });
    revalidateOutstanding();
    return {
      success: nextDate
        ? `Marked as an installment plan — next payment due ${nextDate}.`
        : "Installment plan cleared.",
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  method: z.enum(["cash", "upi", "card", "online", "check"]),
  transaction_ref: z.string().max(200).optional().nullable(),
  next_installment_due_date: z.string().date().optional().or(z.literal("")),
});

export async function recordInstallmentPaymentAction(formData: FormData): Promise<InstallmentActionState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  try {
    await assertCurrentFeature("advanced_membership");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = recordPaymentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const nextDateField = parsed.data.next_installment_due_date;

  try {
    const result = await recordReceivablePayment({
      invoiceId: parsed.data.invoice_id,
      branchId: profile.branch_id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      transactionRef: parsed.data.transaction_ref || null,
      collectedBy: profile.id,
      // Field is omitted from the form entirely when the payment fully
      // clears the balance (see the client component), so "" only ever
      // means "leave the existing plan as-is" here, never "clear it" —
      // clearing is implicit once recordReceivablePayment sees the
      // balance reach zero.
      nextInstallmentDueDate: nextDateField === "" ? undefined : nextDateField,
    });
    revalidateOutstanding();
    return {
      success:
        result.remainingBalance <= 0
          ? "Payment recorded — invoice is now fully paid."
          : result.isInstallment && result.nextInstallmentDueDate
            ? `Payment recorded. Remaining balance ${result.remainingBalance.toFixed(2)} — next installment due ${result.nextInstallmentDueDate}.`
            : `Payment recorded. Remaining balance ${result.remainingBalance.toFixed(2)}.`,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
