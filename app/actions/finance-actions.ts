"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createIncome,
  createExpense,
  approveExpense,
  rejectExpense,
  upsertVendor,
  createBankAccount,
  postJournalEntry,
} from "@/services/finance.service";
import { logActivity } from "@/services/workflow.service";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const incomeSchema = z.object({
  branch_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  member_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  gst_amount: z.coerce.number().nonnegative().default(0),
  total_amount: z.coerce.number().positive(),
  payment_method: z.enum(["cash", "upi", "card", "online"]),
  transaction_ref: z.string().max(200).optional().nullable(),
  income_date: z.string().date(),
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  hsn_sac: z.string().max(20).optional().nullable(),
});

const expenseSchema = z.object({
  branch_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  gst_amount: z.coerce.number().nonnegative().default(0),
  total_amount: z.coerce.number().positive(),
  payment_method: z.enum(["cash", "upi", "card", "online"]),
  bill_number: z.string().max(100).optional().nullable(),
  expense_date: z.string().date(),
  description: z.string().min(2).max(500),
  notes: z.string().max(2000).optional().nullable(),
  is_recurring: z.coerce.boolean().default(false),
  recurring_interval: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).optional().nullable(),
  hsn_sac: z.string().max(20).optional().nullable(),
});

const vendorSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(2).max(200),
  contact_name: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  gstin: z.string().max(15).optional().nullable(),
  pan: z.string().max(10).optional().nullable(),
  bank_name: z.string().max(200).optional().nullable(),
  bank_account_no: z.string().max(30).optional().nullable(),
  bank_ifsc: z.string().max(15).optional().nullable(),
});

const bankAccountSchema = z.object({
  branch_id: z.string().uuid(),
  account_name: z.string().min(2).max(200),
  bank_name: z.string().min(2).max(200),
  account_number: z.string().min(4).max(30),
  ifsc_code: z.string().max(15).optional().nullable(),
  account_type: z.enum(["savings", "current", "overdraft", "cash"]).default("current"),
  opening_balance: z.coerce.number().nonnegative().default(0),
  is_default: z.coerce.boolean().default(false),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ─── Income Actions ───────────────────────────────────────────────────────────

export async function createIncomeAction(
  _state: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const userId = await getCurrentUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = incomeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    const record = await createIncome({
      ...parsed.data,
      is_membership_income: false,
      status: "posted",
      payment_id: null,
      invoice_id: null,
      created_by: userId,
      updated_by: userId,
    });
    await logActivity({
      performedBy: userId,
      branchId: record.branch_id,
      action: "income_created",
      entityType: "income",
      entityId: record.id,
      description: `Income entry ${record.income_number} created`,
    });
    revalidatePath("/admin/finance/income");
    revalidatePath("/admin/finance");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ─── Expense Actions ──────────────────────────────────────────────────────────

export async function createExpenseAction(
  _state: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const userId = await getCurrentUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    const record = await createExpense({
      ...parsed.data,
      approval_status: "pending",
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      next_due_date: null,
      status: "draft",
      created_by: userId,
      updated_by: userId,
    });
    await logActivity({
      performedBy: userId,
      branchId: record.branch_id,
      action: "expense_created",
      entityType: "expense",
      entityId: record.id,
      description: `Expense ${record.expense_number} submitted for approval`,
    });
    revalidatePath("/admin/finance/expenses");
    revalidatePath("/admin/finance");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function approveExpenseAction(
  expenseId: string
): Promise<{ error?: string; success?: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Unauthorized" };
  try {
    const record = await approveExpense(expenseId, userId);
    await logActivity({
      performedBy: userId,
      branchId: record.branch_id,
      action: "expense_approved",
      entityType: "expense",
      entityId: record.id,
      description: `Expense ${record.expense_number} approved`,
    });
    revalidatePath("/admin/finance/expenses");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function rejectExpenseAction(
  expenseId: string,
  reason: string
): Promise<{ error?: string; success?: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Unauthorized" };
  try {
    const record = await rejectExpense(expenseId, userId, reason);
    await logActivity({
      performedBy: userId,
      branchId: record.branch_id,
      action: "expense_rejected",
      entityType: "expense",
      entityId: record.id,
      description: `Expense ${record.expense_number} rejected: ${reason}`,
    });
    revalidatePath("/admin/finance/expenses");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ─── Vendor Actions ───────────────────────────────────────────────────────────

export async function upsertVendorAction(
  _state: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const userId = await getCurrentUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = vendorSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    await upsertVendor({ ...parsed.data, created_by: userId, updated_by: userId, status: "active" });
    revalidatePath("/admin/finance/settings");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ─── Bank Account Actions ─────────────────────────────────────────────────────

export async function createBankAccountAction(
  _state: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const userId = await getCurrentUserId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = bankAccountSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    const record = await createBankAccount({
      ...parsed.data,
      current_balance: parsed.data.opening_balance,
      status: "active",
      created_by: userId,
      updated_by: userId,
    });
    await logActivity({
      performedBy: userId,
      branchId: record.branch_id,
      action: "bank_account_created",
      entityType: "bank_account",
      entityId: record.id,
      description: `Bank account ${record.account_name} created`,
    });
    revalidatePath("/admin/finance/bank");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ─── Journal Entry Actions ────────────────────────────────────────────────────

export async function postJournalEntryAction(
  journalEntryId: string
): Promise<{ error?: string; success?: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Unauthorized" };
  try {
    const record = await postJournalEntry(journalEntryId, userId);
    await logActivity({
      performedBy: userId,
      branchId: record.branch_id,
      action: "journal_posted",
      entityType: "journal_entry",
      entityId: record.id,
      description: `Journal entry ${record.journal_number} posted`,
    });
    revalidatePath("/admin/finance/accounting/journal");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
