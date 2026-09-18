export type InvoicePaymentStatus = "pending" | "partial" | "completed" | "overpaid";

export interface PaymentBalance {
  totalAmount: number;
  amountPaid: number;
  pendingAmount: number;
  status: InvoicePaymentStatus;
  isOverpaid: boolean;
}

function roundMoney(value: number): number {
  return Math.round((Math.max(0, value) + Number.EPSILON) * 100) / 100;
}

export function calculatePaymentBalance(totalAmount: number, amountPaid: number): PaymentBalance {
  const total = roundMoney(totalAmount);
  const paid = roundMoney(amountPaid);
  const pending = roundMoney(Math.max(0, total - paid));
  const isOverpaid = paid > total;
  const status: InvoicePaymentStatus = isOverpaid ? "overpaid" : paid === 0 ? "pending" : pending === 0 ? "completed" : "partial";

  return { totalAmount: total, amountPaid: paid, pendingAmount: pending, status, isOverpaid };
}

// ─── Outstanding Dues / Receivables — canonical, date-aware status ──────────
//
// The `receivables.status` column (pending/partial/paid/overdue/written_off)
// is written once, at invoice/payment time, by DB triggers
// (sync_receivable_from_invoice / sync_receivable_on_payment — see
// supabase/migrations/0005_finance_module.sql and 0047_receivables_auto_create.sql).
// It is a snapshot: nothing ever revisits it just because time has passed, so
// a row correctly stored as "pending" the day it was created stays "pending"
// forever once its due date quietly slips into the past, unless another
// invoice/payment write happens to fire the trigger again. `balance_amount`,
// by contrast, IS trustworthy — both triggers recompute it as
// original_amount - paid_amount on every invoice/payment event, so it always
// reflects the real, current amount owed.
//
// computeReceivableDisplayStatus() is the single place that turns
// (balance, due_date, stored status) into the status the UI actually shows —
// derived fresh on every read, never trusted from the stored snapshot. Every
// Outstanding Dues KPI, table row and filter must go through this function
// (or the higher-level helpers built on it in services/finance.service.ts)
// rather than reading `receivables.status` directly. See
// docs/OUTSTANDING_DUES_REALTIME_IMPLEMENTATION.md for the full write-up.
export type ReceivableDisplayStatus = "overdue" | "pending" | "paid" | "written_off";

/**
 * Canonical status for a receivable, computed fresh every call:
 *   - stored status === 'written_off'      -> written_off (manual, never re-derived)
 *   - balance <= 0                          -> paid        (excluded from Outstanding)
 *   - balance > 0 and effective due date < today -> overdue
 *   - balance > 0 and (no effective due date, or it's >= today) -> pending
 *
 * `todayDateKey` must be a "YYYY-MM-DD" string in the app's canonical
 * timezone (see lib/time.ts#getLocalDateKey) — never the browser's local
 * date, and never a value cached across requests.
 *
 * `installment` (optional) is the lightweight installment plan on the
 * underlying invoice/receivable (see migration 0054 and
 * services/finance.service.ts#setInvoiceInstallmentPlan). When
 * `isInstallment` is true and `nextInstallmentDueDate` is set, that date —
 * not the invoice's original `dueDate` — is what determines overdue vs
 * pending. This is the whole point of marking something an installment:
 * a partially-paid invoice whose original due date has already passed
 * should read as "pending, next installment due <date>" rather than
 * "overdue", right up until that next installment date itself passes, at
 * which point it correctly flips back to overdue like anything else.
 */
export function computeReceivableDisplayStatus(
  balanceAmount: number,
  dueDate: string | null,
  storedStatus: string,
  todayDateKey: string,
  installment?: { isInstallment: boolean; nextInstallmentDueDate: string | null } | null
): ReceivableDisplayStatus {
  if (storedStatus === "written_off") return "written_off";
  if (roundMoney(balanceAmount) <= 0) return "paid";
  const effectiveDueDate =
    installment?.isInstallment && installment.nextInstallmentDueDate
      ? installment.nextInstallmentDueDate
      : dueDate;
  if (effectiveDueDate && effectiveDueDate < todayDateKey) return "overdue";
  return "pending";
}