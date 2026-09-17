"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMemberPlanAction, type AddPlanState } from "@/app/actions/member-actions";
import { addCalendarMonthsToDateOnly, getLocalDateInputValue } from "@/lib/membership-dates";
import { formatCurrency } from "@/lib/utils";

type Plan = { id: string; name: string; price: number; duration_months: number; plan_type?: "individual" | "couple" };
type MemberOption = { id: string; full_name: string; member_code: string };

/**
 * Inline "Add Plan" panel used on the Edit Member page — sells one more,
 * separate plan to the member already being edited (couple pairing included
 * when the picked plan is a couple plan), without navigating away. Mirrors
 * the same package/couple-partner UI used on the registration wizard and the
 * standalone sale screens, just embedded and pre-scoped to this member.
 */
export function AddMemberPlanForm({
  memberId,
  memberName,
  plans,
  members,
  onDone,
}: {
  memberId: string;
  memberName: string;
  plans: Plan[];
  members: MemberOption[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const initialState: AddPlanState = {};
  const [state, action, pending] = useActionState(addMemberPlanAction, initialState);
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(getLocalDateInputValue());
  const [couplePartnerMode, setCouplePartnerMode] = useState<"existing" | "new">("existing");
  const [couplePartnerMemberId, setCouplePartnerMemberId] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "online" | "check">("cash");

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
    if (!isCouplePlan) setCouplePartnerMode("existing");
  }, [isCouplePlan]);

  useEffect(() => {
    if (state.success) {
      toast.success("Plan added successfully.");
      router.refresh();
      onDone?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <input type="hidden" name="member_id" value={memberId} />
      <p className="text-sm text-muted-foreground">
        Adding a new, separate plan for <span className="font-medium text-foreground">{memberName}</span> — this never replaces a plan they already have.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          Select package *
          <select name="plan_id" required value={planId} onChange={(event) => setPlanId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm">
            <option value="">Select package</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - {formatCurrency(plan.price)} / {plan.duration_months}mo{plan.plan_type === "couple" ? " (Couple)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Start date *
          <Input name="start_date" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
      </div>

      {isCouplePlan && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium">
          <p>Second member (couple plan) *</p>
          <input type="hidden" name="couple_partner_mode" value={couplePartnerMode} />
          <div className="flex gap-4 text-xs font-normal">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={couplePartnerMode === "existing"} onChange={() => setCouplePartnerMode("existing")} />
              Existing member
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={couplePartnerMode === "new"} onChange={() => setCouplePartnerMode("new")} />
              New member (short form)
            </label>
          </div>

          {couplePartnerMode === "existing" ? (
            <select
              name="couple_partner_member_id"
              value={couplePartnerMemberId}
              onChange={(event) => setCouplePartnerMemberId(event.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal"
              required
            >
              <option value="">Select the second member</option>
              {members.filter((member) => member.id !== memberId).map((member) => (
                <option key={member.id} value={member.id}>{member.full_name} ({member.member_code})</option>
              ))}
            </select>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="space-y-1 text-xs font-medium sm:col-span-1">
                Full name *
                <Input name="couple_partner_full_name" placeholder="Second member's full name" required />
              </label>
              <label className="space-y-1 text-xs font-medium">
                Age
                <Input name="couple_partner_age" type="number" min="0" max="130" placeholder="Optional" />
              </label>
              <label className="space-y-1 text-xs font-medium">
                Phone
                <Input name="couple_partner_phone" placeholder="Optional" />
              </label>
            </div>
          )}

          <p className="text-xs font-normal text-muted-foreground">
            {selectedPlan?.name} is a couple plan. {couplePartnerMode === "new" ? "Only the name is required — age and phone are optional." : "Pick the second member being paired."} Both start on {startDate} and expire on {expiryDateLabel ?? "the same date"}.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1.5 text-sm font-medium">
          Discount amount
          <Input name="discount_amount" type="number" min="0" step="0.01" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Payment collected now
          <Input name="payment_amount" type="number" min="0" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Payment method
          <select name="payment_method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
            <option value="check">Check</option>
          </select>
        </label>
      </div>

      {expiryDateLabel ? (
        <p className="text-xs text-muted-foreground">This plan runs {selectedPlan?.duration_months} month{selectedPlan?.duration_months === 1 ? "" : "s"} — expiry will be {expiryDateLabel}. Anything not collected now stays as a pending balance on this plan&apos;s invoice.</p>
      ) : null}

      {state.error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{state.error}</div>}

      <div className="flex justify-end gap-2">
        {onDone ? <Button type="button" variant="outline" size="sm" onClick={onDone}>Cancel</Button> : null}
        <Button type="submit" size="sm" disabled={pending || !plans.length}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          Add plan
        </Button>
      </div>
    </form>
  );
}
