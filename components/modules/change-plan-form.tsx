"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeMembershipPlanAction, type ChangePlanState } from "@/app/actions/subscription-actions";
import { formatCurrency } from "@/lib/utils";

type Plan = { id: string; name: string; price: number; duration_months: number };

/**
 * 13-prompt sprint, Prompt 4: "Change plan" panel on the admin subscription
 * detail page. No proration — confirming this ends the current subscription
 * today and sells the picked plan as a brand-new, full-price sale. Mirrors
 * the discount/payment/method fields already used by AddMemberPlanForm for
 * consistency, minus the couple-plan branch (out of scope here — see
 * changeMembershipPlan's own doc comment).
 */
export function ChangePlanForm({
  subscriptionId,
  memberName,
  plans,
  onDone,
}: {
  subscriptionId: string;
  memberName: string;
  plans: Plan[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const initialState: ChangePlanState = {};
  const [state, action, pending] = useActionState(changeMembershipPlanAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      if (state.newSubscriptionId) {
        router.push(`/admin/subscriptions/${state.newSubscriptionId}`);
      } else {
        router.refresh();
      }
      onDone?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <p className="text-sm text-muted-foreground">
        Changing the plan for <span className="font-medium text-foreground">{memberName}</span> — the current subscription ends today and the new plan is sold at full price. Nothing is prorated or credited from the time remaining.
      </p>

      <label className="space-y-1.5 text-sm font-medium">
        New plan *
        <select name="new_plan_id" required className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm">
          <option value="">Select new plan</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} - {formatCurrency(plan.price)} / {plan.duration_months}mo
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1.5 text-sm font-medium">
          Discount amount
          <Input name="discount_amount" type="number" min="0" step="0.01" defaultValue="0" />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Payment collected now
          <Input name="payment_amount" type="number" min="0" step="0.01" defaultValue="0" />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Payment method
          <select name="payment_method" defaultValue="cash" className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
            <option value="check">Check</option>
          </select>
        </label>
      </div>

      <label className="space-y-1.5 text-sm font-medium">
        Transaction reference
        <Input name="transaction_ref" placeholder="Optional" />
      </label>

      {state.error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{state.error}</div>}

      <div className="flex justify-end gap-2">
        {onDone ? <Button type="button" variant="outline" size="sm" onClick={onDone}>Cancel</Button> : null}
        <Button type="submit" size="sm" variant="destructive" disabled={pending || !plans.length}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          Confirm plan change
        </Button>
      </div>
    </form>
  );
}
