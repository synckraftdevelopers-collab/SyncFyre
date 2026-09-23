import Link from "next/link";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Communication History" };

type LogRow = {
  id: string;
  channel: string;
  recipient: string | null;
  provider: string | null;
  provider_message_id: string | null;
  status: string;
  error_message: string | null;
  delivered_at: string | null;
  created_at: string;
  notification_id: string | null;
  notifications: {
    title: string | null;
    type: string | null;
    member_id: string | null;
    members: { full_name: string | null; member_code: string | null } | null;
  } | null;
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "outline" | "default"> = {
  sent: "success",
  delivered: "success",
  queued: "warning",
  sending: "warning",
  failed: "danger",
  skipped: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  sent: "Sent",
  delivered: "Delivered",
  queued: "Queued",
  sending: "Sending",
  failed: "Failed",
  skipped: "Skipped",
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; status?: string; page?: string }>;
}) {
  const profile = await requireUser(["admin", "manager"]);
  const sp = await searchParams;

  const whatsappEnabled = await hasCurrentFeature("whatsapp");
  if (!whatsappEnabled) {
    return (
      <div className="space-y-5">
        <Header />
        <Card>
          <CardContent className="grid min-h-64 place-items-center py-16 text-center">
            <div className="max-w-sm space-y-3">
              <p className="text-lg font-semibold">Growth plan required</p>
              <p className="text-sm text-muted-foreground">
                Communication history is available on the Growth plan and above.
              </p>
              <Link href="/admin/upgrade" className={buttonVariants({ className: "mt-2" })}>
                Upgrade to Growth
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("notification_logs")
    .select(
      `id, channel, recipient, provider, provider_message_id, status,
       error_message, delivered_at, created_at, notification_id,
       notifications(title, type, member_id, members(full_name, member_code))`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // Filter to tenant's branch to maintain isolation
  if (profile.branch_id) {
    query = (query as typeof query).eq("notifications.branch_id", profile.branch_id);
  }

  if (sp.channel && sp.channel !== "all") {
    query = (query as typeof query).eq("channel", sp.channel);
  }
  if (sp.status && sp.status !== "all") {
    query = (query as typeof query).eq("status", sp.status);
  }

  const { data, count, error } = await query;

  const rows = (data ?? []) as unknown as LogRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageUrl(p: number) {
    const params = new URLSearchParams({
      ...(sp.channel ? { channel: sp.channel } : {}),
      ...(sp.status ? { status: sp.status } : {}),
      page: String(p),
    });
    return `/admin/communications?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <Header />

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <select
          name="channel"
          defaultValue={sp.channel ?? "all"}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="all">All channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? "all"}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="queued">Queued</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
        <button
          type="submit"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Apply
        </button>
        {(sp.channel || sp.status) && (
          <Link
            href="/admin/communications"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Clear
          </Link>
        )}
      </form>

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Unable to load communication logs: {error.message}
          </CardContent>
        </Card>
      )}

      {!error && rows.length === 0 && (
        <Card>
          <CardContent className="grid min-h-48 place-items-center py-12 text-center">
            <div className="space-y-2">
              <p className="font-medium">No communication logs yet</p>
              <p className="text-sm text-muted-foreground">
                Logs appear here after WhatsApp, SMS, or email messages are sent via the platform.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date / Time</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Member / Recipient</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const notification = row.notifications;
                  const member = notification?.members;
                  return (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize font-medium text-xs">{row.channel}</span>
                      </td>
                      <td className="px-4 py-3">
                        {member ? (
                          <div>
                            <Link
                              href={`/admin/members/${notification?.member_id}`}
                              className="font-medium hover:text-primary hover:underline"
                            >
                              {member.full_name ?? "—"}
                            </Link>
                            <p className="text-xs text-muted-foreground">{member.member_code}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">{row.recipient ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                        {notification?.type?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"}>
                          {STATUS_LABELS[row.status] ?? row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {row.error_message
                          ? <span className="text-destructive">{row.error_message}</span>
                          : row.provider_message_id
                            ? <span className="font-mono">{row.provider_message_id}</span>
                            : row.delivered_at
                              ? `Delivered ${formatDate(row.delivered_at)}`
                              : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {Math.min(from + 1, total)}–{Math.min(to + 1, total)} of {total.toLocaleString()} logs
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link href={pageUrl(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Prev
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-xl border px-3 py-1.5 text-xs opacity-40">Prev</span>
              )}
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              {page < totalPages ? (
                <Link href={pageUrl(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-xl border px-3 py-1.5 text-xs opacity-40">Next</span>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">Communication History</h1>
        <p className="text-sm text-muted-foreground">
          WhatsApp, SMS, and email delivery logs for this branch.
        </p>
      </div>
      <div className="ml-auto flex gap-2">
        <Link href="/admin/whatsapp/templates" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <MessageCircle className="size-4" />
          Templates
        </Link>
      </div>
    </div>
  );
}
