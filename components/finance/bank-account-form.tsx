"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBankAccountAction } from "@/app/actions/finance-actions";

interface BankAccountFormProps {
  branchId: string;
}

export function BankAccountForm({ branchId }: BankAccountFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createBankAccountAction, {});

  useEffect(() => {
    if (state.success) {
      toast.success("Bank account added successfully");
      router.push("/admin/finance/bank");
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Card>
      <CardContent className="p-6">
        <form action={action} className="space-y-5">
          <input type="hidden" name="branch_id" value={branchId} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Account Name <span className="text-destructive">*</span></label>
              <Input name="account_name" placeholder="e.g. HDFC Current Account" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bank Name <span className="text-destructive">*</span></label>
              <Input name="bank_name" placeholder="e.g. HDFC Bank" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Account Number <span className="text-destructive">*</span></label>
              <Input name="account_number" placeholder="Account number" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">IFSC Code</label>
              <Input name="ifsc_code" placeholder="e.g. HDFC0001234" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Account Type <span className="text-destructive">*</span></label>
              <select
                name="account_type"
                required
                className="w-full h-9 rounded-lg border bg-background px-3 text-sm"
              >
                <option value="current">Current</option>
                <option value="savings">Savings</option>
                <option value="overdraft">Overdraft</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Opening Balance (₹)</label>
              <Input type="number" name="opening_balance" defaultValue="0" step="0.01" min="0" />
            </div>

            <div className="space-y-1.5 flex items-center gap-3 pt-5">
              <input type="checkbox" name="is_default" value="true" id="is_default" className="size-4 rounded" />
              <label htmlFor="is_default" className="text-sm font-medium cursor-pointer">Set as Default Account</label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add Bank Account"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/finance/bank")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
