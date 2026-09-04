"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationTimestamp } from "@/components/notifications/notification-timestamp";
import { NotificationActions } from "@/components/notifications/notification-actions";
import { useNotifications } from "@/components/notifications/notification-provider";
import type { NotificationPortal } from "@/lib/notifications/destination";
import { getNotificationCategoryLabel, getNotificationDisplayDetail } from "@/lib/notifications/member-notification";
import { cn } from "@/lib/utils";

function filterNotifications(filter: string | undefined, rows: ReturnType<typeof useNotifications>["notifications"]) {
  if (filter === "unread") return rows.filter((item) => !item.read_at);
  if (filter === "archived") return rows.filter((item) => !!item.read_at);
  return rows;
}

function emptyMessage(filter: string | undefined) {
  if (filter === "unread") return "No new notifications.";
  if (filter === "archived") return "No archived notifications.";
  return "No new notifications.";
}

function portalDescription(portal: NotificationPortal) {
  if (portal === "member") return "Updates about your membership, attendance, and payments.";
  if (portal === "trainer") return "Business notifications relevant to your branch and role.";
  if (portal === "reception") return "Your branch notifications and member alerts.";
  return "Membership expiry reminders and pending balance alerts from the live backend.";
}

export function NotificationInbox({
  portal,
  notificationsHref,
  activeFilter,
}: {
  portal: NotificationPortal;
  notificationsHref: string;
  activeFilter?: string;
}) {
  const { notifications, unreadCount, loading, viewNotification } = useNotifications();
  const rows = filterNotifications(activeFilter, notifications);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 ? <Badge variant="warning">{unreadCount} unread</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{portalDescription(portal)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link href={notificationsHref} className={buttonVariants({ variant: !activeFilter || activeFilter === "all" ? "default" : "outline", size: "sm" })}>All</Link>
        <Link href={`${notificationsHref}?filter=unread`} className={buttonVariants({ variant: activeFilter === "unread" ? "default" : "outline", size: "sm" })}>Unread</Link>
        <Link href={`${notificationsHref}?filter=archived`} className={buttonVariants({ variant: activeFilter === "archived" ? "default" : "outline", size: "sm" })}>Archived</Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{activeFilter === "archived" ? "Archived Notifications" : activeFilter === "unread" ? "Unread Notifications" : "All Notifications"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {activeFilter === "archived" ? "Read notifications are preserved here and do not contribute to the bell count." : "Only real backend-generated business notifications are shown here."}
            </p>
          </div>
          <Badge variant="outline">{rows.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="grid min-h-64 place-items-center p-8 text-center text-sm text-muted-foreground">Loading notifications...</div> : null}
          {!loading && rows.length > 0 ? (
            <div className="divide-y">
              {rows.map((notification) => {
                const detail = getNotificationDisplayDetail(notification);
                return (
                <div
                  key={notification.id}
                  className={cn(
                    "flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30",
                    !notification.read_at ? "bg-primary/5" : "",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void viewNotification(notification)}
                    className="flex w-full gap-3 text-left"
                  >
                    <span className={cn("mt-2 size-2 shrink-0 rounded-full", !notification.read_at ? "bg-primary" : "bg-transparent ring-1 ring-border")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("text-sm", !notification.read_at ? "font-bold" : "font-medium")}>{notification.title}</p>
                        <Badge variant="outline">{getNotificationCategoryLabel(notification) ?? notification.type}</Badge>
                        {notification.members?.member_code ? <Badge variant="outline">{notification.members.member_code}</Badge> : null}
                        {notification.read_at ? <Badge variant="secondary">Archived</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                      {detail ? (
                        <p className="mt-1 text-xs font-medium text-foreground/80">{detail}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {notification.members?.full_name ? <span>Member: {notification.members.full_name}</span> : null}
                        {notification.members?.phone ? <span>{notification.members.phone}</span> : null}
                        <NotificationTimestamp createdAt={notification.created_at} />
                      </div>
                    </div>
                    <div className="shrink-0 text-xs font-medium text-primary">View</div>
                  </button>
                  <NotificationActions notification={notification} portal={portal} />
                </div>
                );
              })}
            </div>
          ) : null}
          {!loading && rows.length === 0 ? (
            <div className="grid min-h-64 place-items-center p-8 text-center">
              <div>
                <Bell className="mx-auto mb-3 size-10 text-muted-foreground" />
                <p className="font-medium">{emptyMessage(activeFilter)}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
