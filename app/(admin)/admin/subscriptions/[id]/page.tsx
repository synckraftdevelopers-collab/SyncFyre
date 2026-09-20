import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, CalendarPlus, History, Pause, Play, RefreshCw, Snowflake, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { selectWithSchemaFallback } from "@/lib/supabase/select-fallback";
import { inferPlanType } from "@/lib/membership-plan-type";
import { formatCurrency } from "@/lib/utils";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { listMembershipPlans } from "@/services/plan.service";
import { extendSubscriptionAction, freezeSubscriptionAction, renewSubscriptionAction, updateSubscriptionStatusAction } from "@/app/actions/subscription-actions";
import { SubscriptionExpiryBadge, SubscriptionStatusBadge } from "@/components/modules/subscription-status-badge";
import { ChangePlanForm } from "@/components/modules/change-plan-form";

export const metadata = { title: "Subscription Detail" };

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`))
    : "—";
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminSubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const { id } = await params;
  const supabase = await createClient();

  // linked_subscription_id (on subscriptions) and plan_type (on the joined
  // membership_plans) ship in migration 0046. Until that migration has run
  // against this database, asking for either errors the whole detail query
  // out — try the full shape first, then fall back to the base columns
  // (couple-plan info just won't show yet) rather than 404ing a subscription
  // that exists. See lib/supabase/select-fallback.ts.
  const baseColumns =
    "id, member_id, plan_id, branch_id, start_date, end_date, status, auto_renew, price, discount_amount, gst_amount, total_amount, members(full_name, member_code), membership_plans(name, duration_months)";
  const withCoupleColumns =
    "id, member_id, plan_id, branch_id, start_date, end_date, status, auto_renew, price, discount_amount, gst_amount, total_amount, linked_subscription_id, members(full_name, member_code), membership_plans(name, duration_months, plan_type)";
  // held_until / hold_reason ship in migration 0055 (freeze/hold). Try the
  // fullest shape first and degrade through the fallbacks above if either
  // migration (0046 couple plans, 0055 freeze/hold) hasn't reached this
  // database yet, same pattern as the couple-plan fallback already here.
  const withCoupleAndHoldColumns = `${withCoupleColumns}, held_until, hold_reason`;

  async function runSubscriptionQuery(columns: string) {
    let query = supabase.from("subscriptions").select(columns).eq("id", id);
    if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
    return query.maybeSingle();
  }

  const { data: subscription, error } = await selectWithSchemaFallback(runSubscriptionQuery, [
    withCoupleAndHoldColumns,
    withCoupleColumns,
    baseColumns,
  ]);
  if (error || !subscription) notFound();
  const subscriptionRow = subscription as unknown as Record<string, unknown>;

  // Type-safe accessors for fields accessed directly
  const sub = subscriptionRow as {
    id: string;
    member_id: string;
    plan_id: string;
    branch_id: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    auto_renew: boolean;
    price: number | string;
    discount_amount: number | string;
    gst_amount: number | string;
    total_amount: number | string;
    linked_subscription_id?: string | null;
    held_until?: string | null;
    hold_reason?: string | null;
    members: unknown;
    membership_plans: unknown;
  };

  const { data: history } = await supabase
    .from("subscription_history")
    .select("id, action, previous_status, new_status, previous_end_date, new_start_date, new_end_date, remarks, performed_at, performed_by, users(full_name)")
    .eq("subscription_id", id)
    .order("performed_at", { ascending: false });

  const member = sub.members as unknown as { full_name: string | null; member_code: string | null } | null;
  const planRaw = sub.membership_plans as unknown as { name: string | null; duration_months: number | null; plan_type?: string | null } | null;
  const plan = planRaw ? { ...planRaw, plan_type: inferPlanType(planRaw.plan_type, planRaw.name) } : null;

  let linkedMember: { full_name: string | null; member_code: string | null } | null = null;
  if (sub.linked_subscription_id) {
    const { data: linkedSubscription } = await supabase
      .from("subscriptions")
      .select("members(full_name, member_code)")
      .eq("id", String(sub.linked_subscription_id))
      .maybeSingle();
    linkedMember = (linkedSubscription?.members as unknown as { full_name: string | null; member_code: string | null } | null) ?? null;
  }

  // Both "Change plan" (Prompt 4) and the grace-period badge (Prompt 5) key
  // off the same advanced_membership (Growth+) entitlement — Growth/Scale is
  // exactly phaseRank(phase_2) <= plan rank, the same professional/enterprise
  // split migration 0053_grace_period_for_lapsed_subscriptions.sql checks in
  // SQL. Computed once here rather than twice.
  const hasAdvancedMembership = await hasCurrentFeature("advanced_membership");
  // Fixed, non-configurable per migration 0053 — see that file's header for
  // the product decision. Essential tenants get 0 (unchanged behavior: swept
  // to 'expired' the moment end_date passes).
  const gracePeriodDays = hasAdvancedMembership ? 7 : 0;

  // "Change plan" (13-prompt sprint, Prompt 4) is Growth+ only. Only bother
  // loading the branch's other active plans when the button could actually
  // be shown — active subscription + tenant has advanced_membership.
  const canChangePlan = sub.status === "active" && hasAdvancedMembership;
  const otherActivePlans = canChangePlan
    ? (await listMembershipPlans({ branchId: sub.branch_id, status: "active" }))
        .filter((p) => p.id !== sub.plan_id)
        .map((p) => ({ id: p.id, name: p.name, price: p.price, duration_months: p.duration_months }))
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/subscriptions" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" />
          Subscriptions
        </Link>
      </div>

      <Card>
        <CardContent className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{plan?.name ?? "Membership"}</h1>
              <SubscriptionStatusBadge status={sub.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              <Link href={`/admin/members/${sub.member_id}`} className="font-medium hover:text-primary hover:underline">
                {member?.full_name ?? "Unknown member"}
              </Link>
              {member?.member_code ? ` · ${member.member_code}` : ""}
            </p>
            {plan?.plan_type === "couple" && (
              <p className="mt-1 text-sm text-primary">
                Couple plan
                {linkedMember?.full_name
                  ? ` — linked with ${linkedMember.full_name}${linkedMember.member_code ? ` (${linkedMember.member_code})` : ""}`
                  : " — no linked member found"}
              </p>
            )}
            {sub.status === "paused" && sub.held_until && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-blue-700">
                <Snowflake className="size-3.5" />
                Frozen until {formatDate(sub.held_until)}
                {sub.hold_reason ? ` — ${sub.hold_reason}` : ""}
              </p>
            )}

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Start date" value={formatDate(sub.start_date)} />
              <div>
                <dt className="text-xs text-muted-foreground">End date</dt>
                <dd className="mt-0.5 font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{formatDate(sub.end_date)}</span>
                    <SubscriptionExpiryBadge endDate={sub.end_date} status={sub.status} gracePeriodDays={gracePeriodDays} />
                  </div>
                </dd>
              </div>
              <Detail label="Duration" value={plan?.duration_months ? `${plan.duration_months} month${plan.duration_months === 1 ? "" : "s"}` : "—"} />
              <Detail label="Auto renew" value={sub.auto_renew ? "Yes" : "No"} />
              <Detail label="Price" value={formatCurrency(Number(sub.price))} />
              <Detail label="Discount" value={formatCurrency(Number(sub.discount_amount))} />
              <Detail label="GST" value={formatCurrency(Number(sub.gst_amount))} />
              <Detail label="Total" value={formatCurrency(Number(sub.total_amount))} />
            </dl>
          </div>

          <div className="flex flex-col gap-2 md:w-48">
            {sub.status === "active" && (
              <>
                <form action={renewSubscriptionAction.bind(null, sub.id)}>
                  <button className={buttonVariants({ className: "w-full" })}>
                    <RefreshCw className="size-3.5" />
                    Renew
                  </button>
                </form>
                <form action={updateSubscriptionStatusAction.bind(null, sub.id, "paused")}>
                  <button className={buttonVariants({ variant: "outline", className: "w-full" })}>
                    <Pause className="size-3.5" />
                    Pause
                  </button>
                </form>
                <details className="group">
                  <summary className={buttonVariants({ variant: "outline", className: "w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden" })}>
                    <Snowflake className="size-3.5" />
                    Freeze
                  </summary>
                  <form action={freezeSubscriptionAction.bind(null, sub.id)} className="mt-2 space-y-2 rounded-lg border p-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Hold until</label>
                      <input
                        type="date"
                        name="held_until"
                        required
                        min={todayDateInputValue()}
                        max={sub.end_date ?? undefined}
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
                      <input
                        type="text"
                        name="hold_reason"
                        maxLength={200}
                        placeholder="Travel, injury, …"
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                      />
                    </div>
                    <button type="submit" className={buttonVariants({ size: "sm", className: "w-full" })}>
                      Confirm freeze
                    </button>
                  </form>
                </details>
                {canChangePlan && (
                  <details className="group">
                    <summary className={buttonVariants({ variant: "outline", className: "w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden" })}>
                      <ArrowLeftRight className="size-3.5" />
                      Change plan
                    </summary>
                    <div className="mt-2">
                      <ChangePlanForm subscriptionId={sub.id} memberName={member?.full_name ?? "this member"} plans={otherActivePlans} />
                    </div>
                  </details>
                )}
                <form action={updateSubscriptionStatusAction.bind(null, sub.id, "cancelled")}>
                  <button className={buttonVariants({ variant: "destructive", className: "w-full" })}>
                    <XCircle className="size-3.5" />
                    Cancel
                  </button>
                </form>
              </>
            )}
            {sub.status === "paused" && (
              <>
                <form action={updateSubscriptionStatusAction.bind(null, sub.id, "active")}>
                  <button className={buttonVariants({ className: "w-full" })}>
                    <Play className="size-3.5" />
                    Resume
                  </button>
                </form>
                <form action={updateSubscriptionStatusAction.bind(null, sub.id, "cancelled")}>
                  <button className={buttonVariants({ variant: "destructive", className: "w-full" })}>
                    <XCircle className="size-3.5" />
                    Cancel
                  </button>
                </form>
              </>
            )}
            {(sub.status === "active" || sub.status === "paused") && (
              <details className="group">
                <summary className={buttonVariants({ variant: "outline", className: "w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden" })}>
                  <CalendarPlus className="size-3.5" />
                  Extend
                </summary>
                <form action={extendSubscriptionAction.bind(null, sub.id)} className="mt-2 space-y-2 rounded-lg border p-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Extend by (days)</label>
                    <input
                      type="number"
                      name="days"
                      min={1}
                      max={365}
                      required
                      placeholder="e.g. 7"
                      className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
                    <input
                      type="text"
                      name="reason"
                      maxLength={200}
                      placeholder="Gym closure, goodwill credit, …"
                      className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                    />
                  </div>
                  <button type="submit" className={buttonVariants({ size: "sm", className: "w-full" })}>
                    Confirm extension
                  </button>
                </form>
              </details>
            )}
            {["pending", "expired", "cancelled"].includes(sub.status) && (
              <p className="text-center text-xs text-muted-foreground">No actions available for this status.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history?.length ? (
            <div className="divide-y">
              {history.map((entry) => {
                const performer = entry.users as unknown as { full_name: string | null } | null;
                return (
                  <div key={entry.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{entry.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.previous_status && entry.new_status ? `${entry.previous_status} → ${entry.new_status}` : entry.new_status ?? ""}
                        {entry.new_start_date ? ` · ${formatDate(entry.new_start_date)} → ${formatDate(entry.new_end_date)}` : ""}
                      </p>
                      {entry.remarks && <p className="mt-1 text-xs text-muted-foreground">{entry.remarks}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{performer?.full_name ?? "System"}</p>
                      <p>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.performed_at))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No history recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "—"}</dd>
    </div>
  );
}
