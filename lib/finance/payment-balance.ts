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