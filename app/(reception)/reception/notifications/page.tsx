import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { NotificationAutoRefresh } from "@/components/notifications/notification-auto-refresh";
import { NotificationTimestamp } from "@/components/notifications/notification-timestamp";
import { NotificationViewButton } from "@/components/notifications/notification-view-button";
import { notificationDestination } from "@/lib/notifications/destination";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS_NOTIFICATION_TYPES } from "@/lib/notifications/business";

export const metadata = { title: "Notifications" };

export default async function ReceptionNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requireUser(["reception"]);
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("tenant_id", profile.tenant_id ?? "00000000-0000-0000-0000-000000000000")
    .or(`user_id.eq.${profile.id},branch_id.eq.${profile.branch_id ?? ""}`)
    .in("type", BUSINESS_NOTIFICATION_TYPES)
    .order("created_at", { ascending: false })
    .limit(50);

  if (sp.filter === "unread") query = query.is("read_at", null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const unread = rows.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-5">
      <NotificationAutoRefresh />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unread > 0 && <Badge variant="warning">{unread} unread</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">Your branch notifications and member alerts.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href="/reception/notifications"
          className={buttonVariants({ variant: sp.filter !== "unread" ? "default" : "outline", size: "sm" })}
        >
          All
        </Link>
        <Link
          href="/reception/notifications?filter=unread"
          className={buttonVariants({ variant: sp.filter === "unread" ? "default" : "outline", size: "sm" })}
        >
          Unread
        </Link>
      </div>

      <Card>
        {rows.length > 0 ? (
          <div className="divide-y">
            {rows.map((notification) => (
              <div
                key={notification.id}
                className={`flex gap-3 p-4 ${!notification.read_at ? "bg-primary/5" : ""}`}
              >
                <span
                  className={`mt-2 size-2 shrink-0 rounded-full ${
                    !notification.read_at ? "bg-primary" : "bg-transparent"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!notification.read_at ? "font-bold" : "font-medium"}`}>
                    {notification.title}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {notification.type}
                  </Badge>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <NotificationTimestamp createdAt={notification.created_at} />
                  </p>
                </div>
                <NotificationViewButton
                  id={notification.id}
                  unread={!notification.read_at}
                  destination={notificationDestination(
                    { type: notification.type, memberId: notification.member_id, metadata: notification.metadata },
                    "reception",
                    "/reception/notifications",
                  )}
                />
              </div>
            ))}
          </div>
        ) : (
          <CardContent className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <Bell className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No new notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sp.filter === "unread" ? "No unread notifications." : "You're all caught up."}
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
