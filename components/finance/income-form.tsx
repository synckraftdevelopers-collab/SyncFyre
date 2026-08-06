"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createIncomeAction } from "@/app/actions/finance-actions";
import type { IncomeCategory } from "@/types";

interface IncomeFormProps {
  branchId: string;
  categories: IncomeCategory[];
}

const PAYMENT_METHODS = ["cash", "upi", "card", "online"] as const;

export function IncomeForm({ branchId, categories }: IncomeFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createIncomeAction, {});

  useEffect(() => {
    if (state.success) {
      toast.success("Income entry added successfully");
      router.push("/admin/finance/income");
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
              <label className="text-sm font-medium">Date <span className="text-destructive">*</span></label>
              <Input type="date" name="income_date" defaultValue={today} required />
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
                className="w-full h-9 rounded-lg border bg-background px-3 text-sm capitalize"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m} className="capitalize">{m.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Input name="description" placeholder="Brief description of this income..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Transaction Reference</label>
              <Input name="transaction_ref" placeholder="UPI Ref / Cheque No..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">HSN/SAC Code</label>
              <Input name="hsn_sac" placeholder="e.g. 999312" />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Additional notes..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save Income"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/finance/income")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
