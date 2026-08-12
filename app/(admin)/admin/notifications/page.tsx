import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareActions } from "@/components/notifications/share-actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { markNotificationReadAction } from "@/app/actions/notification-actions";
import { listReceivables } from "@/services/finance.service";

export const metadata = { title: "Notifications" };

type NotificationRow = {
  id: string;
  title: string;
  type: string;
  message: string;
  channels: string[] | null;
  scheduled_for: string | null;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  members: { full_name: string | null; phone: string | null; member_code: string | null } | null;
};

type PendingPaymentRow = {
  id: string;
  balance_amount: number | string;
  due_date: string | null;
  status: string;
  receivable_type: string | null;
  reference: string | null;
  members: { full_name: string | null; phone: string | null; member_code: string | null } | null;
};

function sectionKeyForNotification(item: NotificationRow) {
  if (item.type === "membership_expired") return "expired";
  if (item.type === "membership_expiry_reminder") {
    const days = Number(item.metadata?.remaining_days ?? NaN);
    if (days === 14 || days === 15) return "expiring-two-weeks";
    if (days >= 0 && days < 14) return "expiring-soon";
  }
  return "other";
}

function buildNotificationMessage(item: NotificationRow) {
  const memberName = item.members?.full_name ?? "Member";
  const days = Number(item.metadata?.remaining_days ?? NaN);
  if (item.type === "membership_expired") {
    return `Hello ${memberName}, your gym plan has expired. Please renew your membership to continue your access.`;
  }
  if (item.type === "membership_expiry_reminder" && Number.isFinite(days)) {
    return `Hello ${memberName}, your gym plan will expire in ${days} day${days === 1 ? "" : "s"}. Please renew it before the end date to avoid interruption.`;
  }
  return `Hello ${memberName}, ${item.message}`;
}

function buildPendingPaymentMessage(item: PendingPaymentRow) {
  const memberName = item.members?.full_name ?? "Member";
  const amount = formatCurrency(Number(item.balance_amount ?? 0));
  const dueDate = item.due_date ?? "the due date";
  return `Hello ${memberName}, you have a pending gym payment of ${amount}. Please complete it by ${dueDate}.`;
}

function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  return (
    <div className="divide-y">
      {notifications.map((item) => {
        const memberName = item.members?.full_name ?? "Unknown member";
        const memberPhone = item.members?.phone ?? null;
        const memberCode = item.members?.member_code ?? null;
        return (
          <div key={item.id} className={`space-y-3 p-4 ${!item.read_at ? "bg-primary/5" : ""}`}>
            <div className="flex gap-3">
              <span className={`mt-2 size-2 shrink-0 rounded-full ${!item.read_at ? "bg-primary" : "bg-transparent"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm ${!item.read_at ? "font-bold" : "font-medium"}`}>{item.title}</p>
                  <Badge variant="outline">{item.type}</Badge>
                  {memberCode ? <Badge variant="outline">{memberCode}</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Member: {memberName}
                  {memberPhone ? ` · ${memberPhone}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Channels: {(item.channels ?? []).join(", ") || "—"} · Scheduled: {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString("en-IN") : "—"} · Sent: {item.sent_at ? new Date(item.sent_at).toLocaleString("en-IN") : "Not sent"}
                </p>
              </div>
              {!item.read_at && (
                <form action={markNotificationReadAction.bind(null, item.id)}>
                  <button className={buttonVariants({ variant: "outline", size: "sm" })}>Mark read</button>
                </form>
              )}
            </div>
            <div className="pl-5">
              <ShareActions memberName={memberName} phone={memberPhone} message={buildNotificationMessage(item)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PendingPaymentList({ rows }: { rows: PendingPaymentRow[] }) {
  return (
    <div className="divide-y">
      {rows.map((item) => {
        const memberName = item.members?.full_name ?? "Unknown member";
        const memberPhone = item.members?.phone ?? null;
        const memberCode = item.members?.member_code ?? null;
        const dueDate = item.due_date ? parseISO(item.due_date) : null;
        const daysLeft = dueDate ? differenceInCalendarDays(dueDate, new Date()) : null;
        return (
          <div key={item.id} className="space-y-3 p-4">
            <div className="flex gap-3">
              <span className="mt-2 size-2 shrink-0 rounded-full bg-amber-500" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">Pending payment follow-up</p>
                  <Badge variant="outline">{item.status}</Badge>
                  {item.receivable_type ? <Badge variant="outline">{item.receivable_type}</Badge> : null}
                  {memberCode ? <Badge variant="outline">{memberCode}</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {memberName} has an outstanding balance of {formatCurrency(Number(item.balance_amount ?? 0))}
                  {item.reference ? ` for ${item.reference}` : ""}.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Due: {item.due_date ?? "—"}
                  {daysLeft !== null ? ` · ${daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}` : ""}
                  {memberPhone ? ` · ${memberPhone}` : ""}
                </p>
              </div>
            </div>
            <div className="pl-5">
              <ShareActions memberName={memberName} phone={memberPhone} message={buildPendingPaymentMessage(item)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotificationSection({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{count}</Badge>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const sp = await searchParams;
  const profile = await requireUser(["admin", "manager"]);
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("id, title, type, message, channels, scheduled_for, sent_at, read_at, created_at, metadata, members(full_name, phone, member_code)")
    .eq("branch_id", profile.branch_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (sp.filter === "unread") query = query.is("read_at", null);

  const [{ data, error }, pendingPaymentsRes] = await Promise.all([
    query,
    listReceivables({ branchId: profile.branch_id, page: 1, pageSize: 100 }),
  ]);

  if (error) throw new Error(error.message);

  const notifications = (data ?? []) as unknown as NotificationRow[];
  const unread = notifications.filter((item) => !item.read_at).length;
  const pendingPayments = pendingPaymentsRes.data
    .filter((item) => ["pending", "partial", "overdue"].includes(item.status))
    .slice(0, 25) as unknown as PendingPaymentRow[];

  const expiringTwoWeeks = notifications.filter((item) => sectionKeyForNotification(item) === "expiring-two-weeks");
  const expiringSoon = notifications.filter((item) => sectionKeyForNotification(item) === "expiring-soon");
  const expired = notifications.filter((item) => sectionKeyForNotification(item) === "expired");
  const other = notifications.filter((item) => sectionKeyForNotification(item) === "other");

  const hasAnySection = expiringTwoWeeks.length || expiringSoon.length || expired.length || pendingPayments.length || other.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unread > 0 && <Badge variant="warning">{unread} unread</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">Expiry reminders, pending payment follow-ups, and share-ready member prompts for your branch.</p>
        </div>
        <Link href="/admin/notifications/new" className={buttonVariants({ className: "ml-auto" })}>
          <Plus className="size-4" /> Create Notification
        </Link>
      </div>

      <div className="flex gap-2">
        <Link href="/admin/notifications" className={buttonVariants({ variant: sp.filter !== "unread" ? "default" : "outline", size: "sm" })}>All</Link>
        <Link href="/admin/notifications?filter=unread" className={buttonVariants({ variant: sp.filter === "unread" ? "default" : "outline", size: "sm" })}>Unread</Link>
      </div>

      {hasAnySection ? (
        <div className="space-y-5">
          {pendingPayments.length ? (
            <NotificationSection title="Pending Payments" description="Members with pending, partial, or overdue balances." count={pendingPayments.length}>
              <PendingPaymentList rows={pendingPayments} />
            </NotificationSection>
          ) : null}

          {expiringTwoWeeks.length ? (
            <NotificationSection title="Plan Expiring In Two Weeks" description="Members whose active plan is reaching the 14 to 15 day reminder window." count={expiringTwoWeeks.length}>
              <NotificationList notifications={expiringTwoWeeks} />
            </NotificationSection>
          ) : null}

          {expiringSoon.length ? (
            <NotificationSection title="Plan Expiring Soon" description="Upcoming expiries inside the short reminder window." count={expiringSoon.length}>
              <NotificationList notifications={expiringSoon} />
            </NotificationSection>
          ) : null}

          {expired.length ? (
            <NotificationSection title="Plan Expired" description="Members whose plan has already ended and need renewal follow-up." count={expired.length}>
              <NotificationList notifications={expired} />
            </NotificationSection>
          ) : null}

          {other.length ? (
            <NotificationSection title="Other Notifications" description="General branch notifications and alerts." count={other.length}>
              <NotificationList notifications={other} />
            </NotificationSection>
          ) : null}
        </div>
      ) : (
        <Card>
          <CardContent className="grid min-h-64 place-items-center text-center">
            <div>
              <Bell className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No notifications found</p>
              <p className="text-sm text-muted-foreground">Create a notification or change the filter.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
