"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createExpenseAction } from "@/app/actions/finance-actions";
import type { ExpenseCategory, Vendor } from "@/types";

interface ExpenseFormProps {
  branchId: string;
  categories: ExpenseCategory[];
  vendors: Vendor[];
}

const PAYMENT_METHODS = ["cash", "upi", "card", "online"] as const;

export function ExpenseForm({ branchId, categories, vendors }: ExpenseFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createExpenseAction, {});

  useEffect(() => {
    if (state.success) {
      toast.success("Expense submitted for approval");
      router.push("/admin/finance/expenses");
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardContent className="p-6">
        <form action={action} className="space-y-5">
          <input type="hidden" name="branch_id" value={branchId} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <select
                name="category_id"
                className="w-full h-9 rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">— Select Category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Vendor</label>
              <select
                name="vendor_id"
                className="w-full h-9 rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">— Select Vendor —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date <span className="text-destructive">*</span></label>
              <Input type="date" name="expense_date" defaultValue={today} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bill Number</label>
              <Input name="bill_number" placeholder="Invoice / Bill No." />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount (₹) <span className="text-destructive">*</span></label>
              <Input type="number" name="amount" placeholder="0.00" step="0.01" min="0.01" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">GST Amount (₹)</label>
              <Input type="number" name="gst_amount" placeholder="0.00" step="0.01" min="0" defaultValue="0" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Total Amount (₹) <span className="text-destructive">*</span></label>
              <Input type="number" name="total_amount" placeholder="0.00" step="0.01" min="0.01" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method <span className="text-destructive">*</span></label>
              <select
                name="payment_method"
                required
                className="w-full h-9 rounded-lg border bg-background px-3 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
              <Input name="description" placeholder="What is this expense for?" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">HSN/SAC Code</label>
              <Input name="hsn_sac" placeholder="e.g. 9963" />
            </div>

            <div className="space-y-1.5 flex items-center gap-3 pt-5">
              <input type="checkbox" name="is_recurring" value="true" id="is_recurring" className="size-4 rounded" />
              <label htmlFor="is_recurring" className="text-sm font-medium cursor-pointer">Recurring Expense</label>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Additional notes or justification..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            This expense will be submitted for manager approval before being posted.
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Submit for Approval"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/finance/expenses")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
