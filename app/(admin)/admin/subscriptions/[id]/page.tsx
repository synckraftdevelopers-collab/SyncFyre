import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, Pause, Play, RefreshCw, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { renewSubscriptionAction, updateSubscriptionStatusAction } from "@/app/actions/subscription-actions";
import { SubscriptionExpiryBadge, SubscriptionStatusBadge } from "@/components/modules/subscription-status-badge";

export const metadata = { title: "Subscription Detail" };

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`))
    : "—";
}

export default async function AdminSubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const { id } = await params;
  const supabase = await createClient();

  let subscriptionQuery = supabase
    .from("subscriptions")
    .select(
      "id, member_id, plan_id, branch_id, start_date, end_date, status, auto_renew, price, discount_amount, gst_amount, total_amount, members(full_name, member_code), membership_plans(name, duration_months)",
    )
    .eq("id", id);
  if (profile.branch_id) subscriptionQuery = subscriptionQuery.eq("branch_id", profile.branch_id);
  const { data: subscription, error } = await subscriptionQuery.maybeSingle();
  if (error || !subscription) notFound();

  const { data: history } = await supabase
    .from("subscription_history")
    .select("id, action, previous_status, new_status, previous_end_date, new_start_date, new_end_date, remarks, performed_at, performed_by, users(full_name)")
    .eq("subscription_id", id)
    .order("performed_at", { ascending: false });

  const member = subscription.members as unknown as { full_name: string | null; member_code: string | null } | null;
  const plan = subscription.membership_plans as unknown as { name: string | null; duration_months: number | null } | null;

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
              <SubscriptionStatusBadge status={subscription.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              <Link href={`/admin/members/${subscription.member_id}`} className="font-medium hover:text-primary hover:underline">
                {member?.full_name ?? "Unknown member"}
              </Link>
              {member?.member_code ? ` · ${member.member_code}` : ""}
            </p>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Start date" value={formatDate(subscription.start_date)} />
              <div>
                <dt className="text-xs text-muted-foreground">End date</dt>
                <dd className="mt-0.5 font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{formatDate(subscription.end_date)}</span>
                    <SubscriptionExpiryBadge endDate={subscription.end_date} />
                  </div>
                </dd>
              </div>
              <Detail label="Duration" value={plan?.duration_months ? `${plan.duration_months} month${plan.duration_months === 1 ? "" : "s"}` : "—"} />
              <Detail label="Auto renew" value={subscription.auto_renew ? "Yes" : "No"} />
              <Detail label="Price" value={formatCurrency(Number(subscription.price))} />
              <Detail label="Discount" value={formatCurrency(Number(subscription.discount_amount))} />
              <Detail label="GST" value={formatCurrency(Number(subscription.gst_amount))} />
              <Detail label="Total" value={formatCurrency(Number(subscription.total_amount))} />
            </dl>
          </div>

          <div className="flex flex-col gap-2 md:w-48">
            {subscription.status === "active" && (
              <>
                <form action={renewSubscriptionAction.bind(null, subscription.id)}>
                  <button className={buttonVariants({ className: "w-full" })}>
                    <RefreshCw className="size-3.5" />
                    Renew
                  </button>
                </form>
                <form action={updateSubscriptionStatusAction.bind(null, subscription.id, "paused")}>
                  <button className={buttonVariants({ variant: "outline", className: "w-full" })}>
                    <Pause className="size-3.5" />
                    Pause
                  </button>
                </form>
                <form action={updateSubscriptionStatusAction.bind(null, subscription.id, "cancelled")}>
                  <button className={buttonVariants({ variant: "destructive", className: "w-full" })}>
                    <XCircle className="size-3.5" />
                    Cancel
                  </button>
                </form>
              </>
            )}
            {subscription.status === "paused" && (
              <>
                <form action={updateSubscriptionStatusAction.bind(null, subscription.id, "active")}>
                  <button className={buttonVariants({ className: "w-full" })}>
                    <Play className="size-3.5" />
                    Resume
                  </button>
                </form>
                <form action={updateSubscriptionStatusAction.bind(null, subscription.id, "cancelled")}>
                  <button className={buttonVariants({ variant: "destructive", className: "w-full" })}>
                    <XCircle className="size-3.5" />
                    Cancel
                  </button>
                </form>
              </>
            )}
            {["pending", "expired", "cancelled"].includes(subscription.status) && (
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
