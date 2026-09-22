"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  LoaderCircle, Snowflake, ArrowLeftRight, CalendarPlus,
  Pencil, Clock, Trash2,
} from "lucide-react";
import {
  editSubscriptionAction,
  freezeSubscriptionAction,
  extendSubscriptionAction,
  changeMembershipPlanAction,
  updateSubscriptionStatusAction,
  type EditSubscriptionState,
  type ChangePlanState,
} from "@/app/actions/subscription-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanOption {
  id: string;
  name: string;
  price: number;
  duration_months: number;
}

export interface Props {
  subscriptionId: string;
  currentStartDate: string | null;
  currentEndDate: string | null;
  currentTotalAmount: number;
  currentStatus: string;
  memberName: string;
  /** Which tab to open on mount */
  initialTab?: Tab;
  /** All active plans for this branch — used for Change Plan tab */
  availablePlans?: PlanOption[];
  onDone: () => void;
}

type Tab = "edit" | "duration" | "freeze" | "extend" | "change_plan" | "delete";

const TABS: { id: Tab; label: string; icon: React.ElementType; onlyWhenActive?: boolean; danger?: boolean }[] = [
  { id: "edit",        label: "Edit",         icon: Pencil },
  { id: "duration",    label: "Duration",     icon: Clock,         onlyWhenActive: true },
  { id: "freeze",      label: "Freeze / Hold",icon: Snowflake,     onlyWhenActive: true },
  { id: "extend",      label: "Extend",       icon: CalendarPlus,  onlyWhenActive: true },
  { id: "change_plan", label: "Change plan",  icon: ArrowLeftRight, onlyWhenActive: true },
  { id: "delete",      label: "Cancel plan",  icon: Trash2,        danger: true },
];

const EDIT_STATUSES = [
  { value: "active",    label: "Active" },
  { value: "paused",    label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
  { value: "pending",   label: "Pending" },
  { value: "expired",   label: "Expired" },
];

const PAYMENT_METHODS = [
  { value: "cash",   label: "Cash" },
  { value: "upi",    label: "UPI" },
  { value: "card",   label: "Card" },
  { value: "online", label: "Online" },
  { value: "check",  label: "Check" },
];

const fieldClass = "space-y-1 text-xs font-medium text-muted-foreground";

/** Add N calendar months to a YYYY-MM-DD string */
function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ─── Tab: Edit ────────────────────────────────────────────────────────────────

function EditTab({
  subscriptionId, currentStartDate, currentEndDate,
  currentTotalAmount, currentStatus, onDone,
}: {
  subscriptionId: string; currentStartDate: string | null;
  currentEndDate: string | null; currentTotalAmount: number;
  currentStatus: string; onDone: () => void;
}) {
  const [state, action, pending] = useActionState(editSubscriptionAction, {} as EditSubscriptionState);
  useEffect(() => { if (state.success) onDone(); }, [state.success, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={fieldClass}>
          Start date
          <Input name="start_date" type="date" defaultValue={currentStartDate ?? ""} className="mt-1 h-9 text-sm" />
        </label>
        <label className={fieldClass}>
          End date
          <Input name="end_date" type="date" defaultValue={currentEndDate ?? ""} className="mt-1 h-9 text-sm" />
        </label>
        <label className={fieldClass}>
          Total amount (₹)
          <Input name="total_amount" type="number" min={0} step={0.01} defaultValue={currentTotalAmount} className="mt-1 h-9 text-sm" />
        </label>
        <label className={fieldClass}>
          Status
          <select name="status" defaultValue={currentStatus} className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm">
            {EDIT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className={`${fieldClass} sm:col-span-2 lg:col-span-4`}>
          Reason / remarks (optional)
          <Input name="remarks" type="text" maxLength={200} placeholder="Reason for this change" className="mt-1 h-9 text-sm" />
        </label>
      </div>
      {state.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <LoaderCircle className="size-3.5 animate-spin" />}
          Save changes
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Tab: Duration ────────────────────────────────────────────────────────────

function DurationTab({
  subscriptionId, currentStartDate, currentEndDate,
  currentTotalAmount, onDone,
}: {
  subscriptionId: string; currentStartDate: string | null;
  currentEndDate: string | null; currentTotalAmount: number;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(editSubscriptionAction, {} as EditSubscriptionState);
  const [months, setMonths] = useState<number>(1);
  const [previewEnd, setPreviewEnd] = useState<string>(() =>
    currentStartDate ? addMonths(currentStartDate, 1) : "",
  );

  useEffect(() => { if (state.success) onDone(); }, [state.success, onDone]);

  function handleMonthsChange(value: number) {
    const m = Math.max(1, Math.min(24, value));
    setMonths(m);
    if (currentStartDate) setPreviewEnd(addMonths(currentStartDate, m));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Change the plan duration. The end date is recalculated from the start date. Amount stays the same unless you update it.
      </p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="subscription_id" value={subscriptionId} />
        {/* Pass the recalculated end date as a hidden field */}
        <input type="hidden" name="end_date" value={previewEnd} />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={fieldClass}>
            Duration (months) *
            <Input
              name="_duration_months"
              type="number"
              min={1}
              max={24}
              value={months}
              onChange={(e) => handleMonthsChange(Number(e.target.value))}
              className="mt-1 h-9 text-sm"
            />
            <span className="mt-0.5 text-xs text-muted-foreground">
              1 = 1 month, 3 = 3 months, 12 = annual
            </span>
          </label>

          <label className={fieldClass}>
            Start date (fixed)
            <Input
              type="date"
              value={currentStartDate ?? ""}
              disabled
              className="mt-1 h-9 text-sm opacity-60"
            />
          </label>

          <label className={fieldClass}>
            New end date (preview)
            <Input
              type="date"
              value={previewEnd}
              disabled
              className="mt-1 h-9 text-sm font-medium"
            />
            {currentEndDate && previewEnd && previewEnd !== currentEndDate && (
              <span className={`mt-0.5 text-xs font-medium ${previewEnd > currentEndDate ? "text-emerald-600" : "text-amber-600"}`}>
                {previewEnd > currentEndDate ? "↑ Extended" : "↓ Shortened"} from {currentEndDate}
              </span>
            )}
          </label>

          <label className={fieldClass}>
            Total amount (₹)
            <Input name="total_amount" type="number" min={0} step={0.01} defaultValue={currentTotalAmount} className="mt-1 h-9 text-sm" />
          </label>

          <label className={`${fieldClass} sm:col-span-2`}>
            Reason / remarks (optional)
            <Input name="remarks" type="text" maxLength={200} placeholder="e.g. Member requested 2-month instead" className="mt-1 h-9 text-sm" />
          </label>
        </div>

        {state.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending || !previewEnd}>
            {pending && <LoaderCircle className="size-3.5 animate-spin" />}
            Apply duration change
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

// ─── Tab: Freeze / Hold ───────────────────────────────────────────────────────

function FreezeTab({
  subscriptionId, currentEndDate, onDone,
}: {
  subscriptionId: string; currentEndDate: string | null; onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await freezeSubscriptionAction(subscriptionId, formData);
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not freeze subscription.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Freeze / Hold pauses the subscription until a specific date. The member's expiry does not change — resume when they return.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={fieldClass}>
          Hold until *
          <Input name="held_until" type="date" required min={today} max={currentEndDate ?? undefined} className="mt-1 h-9 text-sm" />
          {currentEndDate && (
            <span className="mt-0.5 text-xs text-muted-foreground">Max: {currentEndDate} (expiry date)</span>
          )}
        </label>
        <label className={fieldClass}>
          Reason (optional)
          <Input name="hold_reason" type="text" maxLength={200} placeholder="e.g. Travel, injury, surgery…" className="mt-1 h-9 text-sm" />
        </label>
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
          {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Snowflake className="size-3.5" />}
          Confirm freeze / hold
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isPending}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Tab: Extend ──────────────────────────────────────────────────────────────

function ExtendTab({
  subscriptionId, onDone,
}: {
  subscriptionId: string; onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await extendSubscriptionAction(subscriptionId, formData);
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not extend subscription.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Push the end date forward by a number of days — gym closures, goodwill credits, makeup days. Status stays unchanged.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={fieldClass}>
          Extend by (days) *
          <Input name="days" type="number" min={1} max={365} required placeholder="e.g. 7" className="mt-1 h-9 text-sm" />
        </label>
        <label className={fieldClass}>
          Reason (optional)
          <Input name="reason" type="text" maxLength={200} placeholder="e.g. Gym closure, goodwill…" className="mt-1 h-9 text-sm" />
        </label>
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
          {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <CalendarPlus className="size-3.5" />}
          Confirm extension
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isPending}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Tab: Change Plan ─────────────────────────────────────────────────────────

function ChangePlanTab({
  subscriptionId, memberName, availablePlans, onDone,
}: {
  subscriptionId: string; memberName: string;
  availablePlans: PlanOption[]; onDone: () => void;
}) {
  const [state, action, pending] = useActionState(changeMembershipPlanAction, {} as ChangePlanState);
  useEffect(() => { if (state.success) onDone(); }, [state.success, onDone]);

  if (availablePlans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No other active plans available for this branch. Create one in Settings → Membership Plans first.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <p className="text-sm text-muted-foreground">
        Changes the plan for <span className="font-medium text-foreground">{memberName}</span>. Current subscription ends today; new plan starts at full price. Nothing is prorated.
      </p>
      <label className={`${fieldClass} block`}>
        New plan *
        <select name="new_plan_id" required className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm">
          <option value="">Select plan…</option>
          {availablePlans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatCurrency(p.price)} / {p.duration_months}mo
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={fieldClass}>
          Discount (₹)
          <Input name="discount_amount" type="number" min={0} step={0.01} defaultValue="0" className="mt-1 h-9 text-sm" />
        </label>
        <label className={fieldClass}>
          Payment collected now (₹)
          <Input name="payment_amount" type="number" min={0} step={0.01} defaultValue="0" className="mt-1 h-9 text-sm" />
        </label>
        <label className={fieldClass}>
          Payment method
          <select name="payment_method" defaultValue="cash" className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm">
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
      </div>
      <label className={`${fieldClass} block`}>
        Transaction reference (optional)
        <Input name="transaction_ref" placeholder="UPI ref, receipt no…" className="mt-1 h-9 text-sm" />
      </label>
      {state.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={pending} className="gap-1.5">
          {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <ArrowLeftRight className="size-3.5" />}
          Confirm plan change
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Tab: Cancel / Delete plan ────────────────────────────────────────────────

function DeleteTab({
  subscriptionId, onDone,
}: {
  subscriptionId: string; onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function handleCancel() {
    if (!confirmed) { setConfirmed(true); return; }
    setError(null);
    startTransition(async () => {
      try {
        await updateSubscriptionStatusAction(subscriptionId, "cancelled");
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not cancel plan.");
        setConfirmed(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cancelling a plan marks it as cancelled. This cannot be undone from the member edit form — use the subscription detail page to manage cancelled plans.
      </p>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        {!confirmed ? (
          <Button type="button" size="sm" variant="outline" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={handleCancel} disabled={isPending}>
            <Trash2 className="size-3.5" />
            Cancel this plan
          </Button>
        ) : (
          <>
            <span className="text-sm font-medium text-destructive">Are you sure? This cannot be undone.</span>
            <Button type="button" size="sm" variant="destructive" onClick={handleCancel} disabled={isPending} className="gap-1.5">
              {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Yes, cancel plan
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmed(false)} disabled={isPending}>No, go back</Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function EditSubscriptionForm({
  subscriptionId,
  currentStartDate,
  currentEndDate,
  currentTotalAmount,
  currentStatus,
  memberName,
  initialTab,
  availablePlans = [],
  onDone,
}: Props) {
  const isActive = currentStatus === "active";
  const defaultTab: Tab = initialTab ?? "edit";
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  const visibleTabs = TABS.filter((t) => !t.onlyWhenActive || isActive);

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-4">
      {/* Tab bar */}
      <div className="mb-4 flex flex-wrap gap-1 border-b pb-3">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? tab.danger
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground"
                  : tab.danger
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "edit" && (
        <EditTab
          subscriptionId={subscriptionId}
          currentStartDate={currentStartDate}
          currentEndDate={currentEndDate}
          currentTotalAmount={currentTotalAmount}
          currentStatus={currentStatus}
          onDone={onDone}
        />
      )}
      {activeTab === "duration" && isActive && (
        <DurationTab
          subscriptionId={subscriptionId}
          currentStartDate={currentStartDate}
          currentEndDate={currentEndDate}
          currentTotalAmount={currentTotalAmount}
          onDone={onDone}
        />
      )}
      {activeTab === "freeze" && isActive && (
        <FreezeTab
          subscriptionId={subscriptionId}
          currentEndDate={currentEndDate}
          onDone={onDone}
        />
      )}
      {activeTab === "extend" && isActive && (
        <ExtendTab
          subscriptionId={subscriptionId}
          onDone={onDone}
        />
      )}
      {activeTab === "change_plan" && isActive && (
        <ChangePlanTab
          subscriptionId={subscriptionId}
          memberName={memberName}
          availablePlans={availablePlans}
          onDone={onDone}
        />
      )}
      {activeTab === "delete" && (
        <DeleteTab
          subscriptionId={subscriptionId}
          onDone={onDone}
        />
      )}
    </div>
  );
}
