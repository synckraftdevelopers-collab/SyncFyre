"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateMembershipPlanTotals } from "@/lib/membership-plan-calculations";
import { addCalendarMonthsToDateOnly } from "@/lib/membership-dates";
import type { MembershipPlanSummary } from "@/services/plan.service";
import { formatCurrency } from "@/lib/utils";
import { createQuickCoupleMemberAction } from "@/app/actions/member-actions";

type MemberOption = {
  id: string;
  full_name: string;
  member_code: string;
};

type SaleWizardProps = {
  members: MemberOption[];
  plans: MembershipPlanSummary[];
  branchId?: string | null;
  returnTo?: string;
  /** Preselects the member — used by the "Add Plan" link from a member's profile/edit page so staff don't have to find them again. Still changeable. */
  initialMemberId?: string;
};

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MembershipSaleWizard({ members, plans, branchId, returnTo, initialMemberId }: SaleWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [memberId, setMemberId] = useState(initialMemberId ?? "");
  const [secondMemberMode, setSecondMemberMode] = useState<"existing" | "new">("existing");
  const [secondMemberId, setSecondMemberId] = useState("");
  const [secondMemberFullName, setSecondMemberFullName] = useState("");
  const [secondMemberAge, setSecondMemberAge] = useState("");
  const [secondMemberPhone, setSecondMemberPhone] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(todayInputValue());
  const [autoRenew, setAutoRenew] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "online">("cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
  const isCouplePlan = selectedPlan?.plan_type === "couple";
  const totals = selectedPlan
    ? calculateMembershipPlanTotals({
        price: selectedPlan.price,
        discountPercent: selectedPlan.discount_percent,
        gstPercent: selectedPlan.gst_percent,
        discountAmount: Number(discountAmount) || 0,
      })
    : calculateMembershipPlanTotals({ price: 0, discountAmount: Number(discountAmount) || 0 });
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
    if (!selectedPlan) return;
    const suggestedDiscount = Math.round(((selectedPlan.price * selectedPlan.discount_percent) / 100) * 100) / 100;
    setDiscountAmount(String(suggestedDiscount));
  }, [selectedPlan]);

  useEffect(() => {
    if (!isCouplePlan) {
      setSecondMemberId("");
      setSecondMemberMode("existing");
      setSecondMemberFullName("");
      setSecondMemberAge("");
      setSecondMemberPhone("");
    }
  }, [isCouplePlan]);

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const responseBody = (await res.json()) as { error?: string };
      throw new Error(responseBody.error ?? `Request to ${url} failed.`);
    }
    return res.json();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!branchId) {
      setError("A branch is required to create a membership sale.");
      return;
    }
    if (!memberId) {
      setError("Select a member.");
      return;
    }
    if (!selectedPlan) {
      setError("Select a membership plan.");
      return;
    }
    if (isCouplePlan && secondMemberMode === "existing" && !secondMemberId) {
      setError("This is a couple plan — select the second member too.");
      return;
    }
    if (isCouplePlan && secondMemberMode === "existing" && secondMemberId === memberId) {
      setError("The second member must be different from the first member.");
      return;
    }
    if (isCouplePlan && secondMemberMode === "new" && !secondMemberFullName.trim()) {
      setError("This is a couple plan — enter the second member's name.");
      return;
    }

    const primaryMemberName = members.find((member) => member.id === memberId)?.full_name ?? "";

    startTransition(async () => {
      try {
        let resolvedSecondMemberId = secondMemberId;
        let secondaryMemberName = members.find((member) => member.id === secondMemberId)?.full_name ?? "";

        if (isCouplePlan && secondMemberMode === "new" && branchId) {
          const created = await createQuickCoupleMemberAction({
            fullName: secondMemberFullName,
            age: secondMemberAge,
            phone: secondMemberPhone,
            branchId,
          });
          if (created.error || !created.member) throw new Error(created.error ?? "Unable to create the second member.");
          resolvedSecondMemberId = created.member.id;
          secondaryMemberName = created.member.full_name;
        }

        const subscription = (await postJson("/api/subscriptions", {
          member_id: memberId,
          plan_id: selectedPlan.id,
          branch_id: branchId,
          start_date: startDate,
          status: "active",
          auto_renew: autoRenew,
          price: totals.price,
          discount_amount: totals.discountAmount,
          gst_amount: totals.gstAmount,
          total_amount: totals.totalAmount,
          workflow_action: "created",
          remarks: isCouplePlan
            ? [notes, `Couple plan with ${secondaryMemberName || "second member"}.`].filter(Boolean).join(" ")
            : notes || null,
        })) as { id: string };

        const invoice = (await postJson("/api/invoices", {
          member_id: memberId,
          subscription_id: subscription.id,
          branch_id: branchId,
          subtotal: totals.taxableAmount,
          discount_amount: totals.discountAmount,
          gst_amount: totals.gstAmount,
          total_amount: totals.totalAmount,
          amount_paid: totals.totalAmount,
          status: "paid",
          due_date: null,
          line_items: [
            {
              description: isCouplePlan
                ? `${selectedPlan.name} — Couple plan (${primaryMemberName} & ${secondaryMemberName})`
                : selectedPlan.name,
              amount: totals.price,
              discount_amount: totals.discountAmount,
              gst_amount: totals.gstAmount,
              total_amount: totals.totalAmount,
            },
          ],
          notes: notes || null,
        })) as { id: string };

        await postJson("/api/payments", {
          member_id: memberId,
          subscription_id: subscription.id,
          invoice_id: invoice.id,
          branch_id: branchId,
          amount: totals.totalAmount,
          method: paymentMethod,
          status: "completed",
          transaction_reference: transactionReference || null,
          paid_at: new Date().toISOString(),
        });

        if (isCouplePlan) {
          // Same plan, same start date — the DB derives an identical expiry
          // for this member automatically. It's billed together with the
          // primary member above, so it carries no additional price.
          await postJson("/api/subscriptions", {
            member_id: resolvedSecondMemberId,
            plan_id: selectedPlan.id,
            branch_id: branchId,
            start_date: startDate,
            status: "active",
            auto_renew: autoRenew,
            price: 0,
            discount_amount: 0,
            gst_amount: 0,
            total_amount: 0,
            workflow_action: "created",
            remarks: `Couple plan with ${primaryMemberName || "the primary member"}. Billed on that member's subscription.`,
            linked_subscription_id: subscription.id,
          });
        }

        toast.success(isCouplePlan ? "Couple membership sale completed for both members." : "Membership sale completed.");
        router.push(returnTo ?? `/admin/invoices/${invoice.id}`);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Unable to complete the membership sale.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          Member
          <select
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
            required
          >
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.member_code})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Membership plan
          <select
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
            required
          >
            <option value="">Select plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - {formatCurrency(plan.price)}
                {plan.plan_type === "couple" ? " (Couple)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isCouplePlan && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium">
          <p>Second member (couple plan) *</p>
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
            <select
              value={secondMemberId}
              onChange={(event) => setSecondMemberId(event.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal"
              required
            >
              <option value="">Select the second member</option>
              {members
                .filter((member) => member.id !== memberId)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.member_code})
                  </option>
                ))}
            </select>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="space-y-1 text-xs font-medium sm:col-span-1">
                Full name *
                <Input value={secondMemberFullName} onChange={(event) => setSecondMemberFullName(event.target.value)} placeholder="Second member's full name" required />
              </label>
              <label className="space-y-1 text-xs font-medium">
                Age
                <Input type="number" min="0" max="130" value={secondMemberAge} onChange={(event) => setSecondMemberAge(event.target.value)} placeholder="Optional" />
              </label>
              <label className="space-y-1 text-xs font-medium">
                Phone
                <Input value={secondMemberPhone} onChange={(event) => setSecondMemberPhone(event.target.value)} placeholder="Optional" />
              </label>
            </div>
          )}

          <p className="text-xs font-normal text-muted-foreground">
            {selectedPlan?.name} is a couple plan. {secondMemberMode === "new" ? "Only the name is required — age and phone are optional." : "Pick the second member being paired."} Both start on {startDate} and expire on {expiryDateLabel ?? "the same date"}.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1.5 text-sm font-medium">
          Start date
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Discount amount
          <Input type="number" min="0" step="0.01" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Payment method
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}
            className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          Transaction reference
          <Input value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} placeholder="UPI ID, reference number, or receipt ID" />
        </label>
        <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
          <input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} className="size-4 rounded border-gray-300" />
          Auto renew membership
        </label>
      </div>

      <label className="space-y-1.5 text-sm font-medium">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="Optional sale notes"
        />
      </label>

      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Sale summary</p>
            <p className="text-xs text-muted-foreground">
              {isCouplePlan
                ? "Subscription, invoice, and payment are created for the first member; the second member gets a linked subscription on the same plan and dates, at no extra charge."
                : "Subscription, invoice, and payment are created together."}
            </p>
          </div>
          <ShieldCheck className="size-5 text-muted-foreground" />
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Plan price</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(totals.price)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="font-medium tabular-nums">-{formatCurrency(totals.discountAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">GST</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(totals.gstAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Total payable</dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(totals.totalAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Expiry</dt>
            <dd className="font-medium tabular-nums">{expiryDateLabel ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !plans.length || !members.length}>
          {isPending && <LoaderCircle className="size-4 animate-spin" />}
          Create sale
        </Button>
      </div>
    </form>
  );
}
