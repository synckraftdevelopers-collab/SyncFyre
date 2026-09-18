"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { recordInstallmentPaymentAction, setInstallmentPlanAction } from "@/app/actions/installment-actions";

type Row = {
  invoiceId: string;
  balance: number;
  isInstallment: boolean;
  nextInstallmentDueDate: string | null;
};

export function ReceivableRowActions({ row }: { row: Row }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function run(task: () => Promise<{ error?: string; success?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (result.error) setError(result.error);
      else {
        if (result.success) toast.success(result.success);
        setError(null);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-7 rounded border px-2 text-xs font-medium hover:bg-muted"
      >
        Manage
      </button>
    );
  }

  return (
    <div className="w-64 space-y-3 rounded-lg border bg-background p-3 text-left shadow-sm">
      <form action={(formData) => run(() => recordInstallmentPaymentAction(formData))} className="space-y-1.5">
        <input type="hidden" name="invoice_id" value={row.invoiceId} />
        <p className="text-xs font-semibold">Record payment</p>
        <input
          name="amount"
          type="number"
          min="0.01"
          max={row.balance}
          step="0.01"
          required
          placeholder={`Up to ${row.balance.toFixed(2)}`}
          disabled={isPending}
          className="h-8 w-full rounded border bg-background px-2 text-xs"
        />
        <select name="method" defaultValue="cash" disabled={isPending} className="h-8 w-full rounded border bg-background px-2 text-xs">
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="online">Online</option>
          <option value="check">Cheque</option>
        </select>
        <input
          name="transaction_ref"
          placeholder="Reference (optional)"
          disabled={isPending}
          className="h-8 w-full rounded border bg-background px-2 text-xs"
        />
        <label className="block text-[11px] text-muted-foreground">
          Next installment due, if balance remains
          <input
            name="next_installment_due_date"
            type="date"
            disabled={isPending}
            className="mt-0.5 h-8 w-full rounded border bg-background px-2 text-xs"
          />
        </label>
        <button disabled={isPending} className="h-8 w-full rounded bg-primary px-2 text-xs font-medium text-primary-foreground">
          Collect payment
        </button>
      </form>

      <form action={(formData) => run(() => setInstallmentPlanAction(formData))} className="space-y-1.5 border-t pt-2">
        <input type="hidden" name="invoice_id" value={row.invoiceId} />
        <p className="text-xs font-semibold">{row.isInstallment ? "Update installment plan" : "Mark as installment"}</p>
        <div className="flex gap-2">
          <input
            name="next_installment_due_date"
            type="date"
            required
            defaultValue={row.nextInstallmentDueDate ?? ""}
            disabled={isPending}
            className="h-8 flex-1 rounded border bg-background px-2 text-xs"
          />
          <button disabled={isPending} className="h-8 rounded border px-2 text-xs font-medium hover:bg-muted">
            Save
          </button>
        </div>
      </form>

      {row.isInstallment ? (
        <form action={(formData) => run(() => setInstallmentPlanAction(formData))}>
          <input type="hidden" name="invoice_id" value={row.invoiceId} />
          <input type="hidden" name="next_installment_due_date" value="" />
          <button disabled={isPending} className="text-[11px] text-muted-foreground underline hover:text-foreground">
            Clear installment plan
          </button>
        </form>
      ) : null}

      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-muted-foreground underline hover:text-foreground">
        Close
      </button>
    </div>
  );
}
