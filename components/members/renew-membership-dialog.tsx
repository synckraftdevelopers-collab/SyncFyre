"use client";

import { useActionState, useEffect, useState } from "react";
import { RotateCcw, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLocalDateInputValue } from "@/lib/membership-dates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { renewMembershipAction } from "@/app/actions/member-management-actions";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  gst_percent: number;
  discount_percent: number;
  duration_months: number;
}

interface Props {
  memberId: string;
  branchId: string;
  plans: Plan[];
}

const fieldClass = "space-y-1.5 text-sm font-medium";

export function RenewMembershipDialog({ memberId, branchId, plans }: Props) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [state, action, pending] = useActionState(renewMembershipAction, {});

  const plan = plans.find((p) => p.id === planId);
  const price = plan?.price ?? 0;
  const discount = 0;
  const gst = Math.round((price - discount) * (plan?.gst_percent ?? 18) / 100);
  const total = price - discount + gst;

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      setOpen(false);
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <RotateCcw className="size-4" />
          Renew
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Renew Membership</DialogTitle>
        </DialogHeader>

        <form action={action} className="space-y-4 mt-2">
          <input type="hidden" name="member_id" value={memberId} />
          <input type="hidden" name="branch_id" value={branchId} />
          <input type="hidden" name="gst_amount" value={gst} />
          <input type="hidden" name="total_amount" value={total} />

          <label className={fieldClass}>
            Plan
            <select
              name="plan_id"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.price)} / {p.duration_months}mo
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className={fieldClass}>
              Start date
              <Input
                name="start_date"
                type="date"
                defaultValue={getLocalDateInputValue()}
                required
              />
            </label>
            <label className={fieldClass}>
              Price (₹)
              <input
                name="price"
                type="hidden"
                value={price}
              />
              <input
                name="discount_amount"
                type="hidden"
                value={discount}
              />
              <div className="mt-1 flex h-10 items-center rounded-lg border bg-muted/40 px-3 text-sm tabular-nums">
                {formatCurrency(price)}
              </div>
            </label>
          </div>

          <div className="rounded-xl border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Plan price</span><span>{formatCurrency(price)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST ({plan?.gst_percent ?? 18}%)</span><span>{formatCurrency(gst)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2 mt-1">
              <span>Total</span><span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              Renew Membership
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
