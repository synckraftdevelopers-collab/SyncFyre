"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createReceptionMembershipAction } from "@/app/actions/reception-membership-actions";

type Member = { id: string; full_name: string; member_code: string };
type Plan = { id: string; name: string; price: number; duration_months: number };

export function NewMembershipForm({ members, plans, defaultPlanId }: { members: Member[]; plans: Plan[]; defaultPlanId?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createReceptionMembershipAction, {});

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.memberId) {
      toast.success("Membership created successfully.");
      router.push(`/reception/members/${state.memberId}?tab=membership`);
    }
  }, [router, state]);

  return <form action={action} className="space-y-5">
    <label className="block space-y-1.5 text-sm font-medium">Member
      <select name="member_id" required className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
        <option value="">Select a member</option>
        {members.map((member) => <option key={member.id} value={member.id}>{member.full_name} ({member.member_code})</option>)}
      </select>
    </label>
    <label className="block space-y-1.5 text-sm font-medium">Active membership plan
      <select name="plan_id" required defaultValue={defaultPlanId} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
        <option value="">Select a plan</option>
        {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — ₹{Number(plan.price).toLocaleString("en-IN")} / {plan.duration_months} month{plan.duration_months === 1 ? "" : "s"}</option>)}
      </select>
    </label>
    <label className="block space-y-1.5 text-sm font-medium">Start date
      <Input name="start_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
    </label>
    <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">The plan price, configured discount, GST, and expiry date are calculated securely from the active plan.</p>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />} Create subscription</Button></div>
  </form>;
}
