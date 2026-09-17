"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createReceptionMembershipAction } from "@/app/actions/reception-membership-actions";
import { addCalendarMonthsToDateOnly, getLocalDateInputValue } from "@/lib/membership-dates";

type Member = { id: string; full_name: string; member_code: string };
type Plan = { id: string; name: string; price: number; duration_months: number; plan_type?: "individual" | "couple" };

export function NewMembershipForm({ members, plans, defaultPlanId, defaultMemberId }: { members: Member[]; plans: Plan[]; defaultPlanId?: string; defaultMemberId?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createReceptionMembershipAction, {});
  const [memberId, setMemberId] = useState(defaultMemberId ?? "");
  const [secondMemberMode, setSecondMemberMode] = useState<"existing" | "new">("existing");
  const [secondMemberId, setSecondMemberId] = useState("");
  const [planId, setPlanId] = useState(defaultPlanId ?? "");
  const [startDate, setStartDate] = useState(getLocalDateInputValue());

  const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
  const isCouplePlan = selectedPlan?.plan_type === "couple";
  const expiryDate = selectedPlan && startDate
    ? (() => {
        try {
          return addCalendarMonthsToDateOnly(startDate, selectedPlan.duration_months);
        } catch {
          return null;
        }
      })()
    : null;
  const expiryDateLabel = expiryDate
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${expiryDate}T00:00:00`))
    : null;

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.memberId) {
      toast.success("Membership created successfully.");
      router.push(`/reception/members/${state.memberId}?tab=membership`);
    }
  }, [router, state]);

  useEffect(() => {
    if (!isCouplePlan) {
      setSecondMemberId("");
      setSecondMemberMode("existing");
    }
  }, [isCouplePlan]);

  return <form action={action} className="space-y-5">
    <label className="block space-y-1.5 text-sm font-medium">Member
      <select name="member_id" required value={memberId} onChange={(event) => setMemberId(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
        <option value="">Select a member</option>
        {members.map((member) => <option key={member.id} value={member.id}>{member.full_name} ({member.member_code})</option>)}
      </select>
    </label>
    <label className="block space-y-1.5 text-sm font-medium">Active membership plan
      <select name="plan_id" required value={planId} onChange={(event) => setPlanId(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
        <option value="">Select a plan</option>
        {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — ₹{Number(plan.price).toLocaleString("en-IN")} / {plan.duration_months} month{plan.duration_months === 1 ? "" : "s"}{plan.plan_type === "couple" ? " (Couple)" : ""}</option>)}
      </select>
    </label>
    {isCouplePlan && (
      <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium">
        <p>Second member (couple plan) *</p>
        <input type="hidden" name="second_member_mode" value={secondMemberMode} />
        <div className="flex gap-4 text-xs font-normal">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={secondMemberMode === "existing"} onChange={() => setSecondMemberMode("existing")} />
            Existing member
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={secondMemberMode === "new"} onChange={() => setSecondMemberMode("new")} />
            New member (short form)
          </label>
        </div>

        {secondMemberMode === "existing" ? (
          <select name="second_member_id" required value={secondMemberId} onChange={(event) => setSecondMemberId(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal">
            <option value="">Select the second member</option>
            {members.filter((member) => member.id !== memberId).map((member) => <option key={member.id} value={member.id}>{member.full_name} ({member.member_code})</option>)}
          </select>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-xs font-medium sm:col-span-1">
              Full name *
              <Input name="second_member_full_name" required placeholder="Second member's full name" />
            </label>
            <label className="space-y-1 text-xs font-medium">
              Age
              <Input name="second_member_age" type="number" min="0" max="130" placeholder="Optional" />
            </label>
            <label className="space-y-1 text-xs font-medium">
              Phone
              <Input name="second_member_phone" placeholder="Optional" />
            </label>
          </div>
        )}

        <p className="text-xs font-normal text-muted-foreground">
          {selectedPlan?.name} is a couple plan. {secondMemberMode === "new" ? "Only the name is required — age and phone are optional." : "Pick the existing member being paired."} Both start on {startDate} and expire on {expiryDateLabel ?? "the same date"}.
        </p>
      </div>
    )}
    <label className="block space-y-1.5 text-sm font-medium">Start date
      <Input name="start_date" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
    </label>
    {selectedPlan && (
      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        This plan runs {selectedPlan.duration_months} month{selectedPlan.duration_months === 1 ? "" : "s"} — expiry will be {expiryDateLabel ?? "calculated from the start date"}. Price, discount, and GST are calculated securely from the active plan.
      </p>
    )}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />} Create subscription</Button></div>
  </form>;
}
