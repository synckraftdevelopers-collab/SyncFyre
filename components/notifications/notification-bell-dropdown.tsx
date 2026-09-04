"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, Eye } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationTimestamp } from "@/components/notifications/notification-timestamp";
import { NotificationActions } from "@/components/notifications/notification-actions";
import { useNotifications } from "@/components/notifications/notification-provider";
import type { NotificationPortal } from "@/lib/notifications/destination";
import { getNotificationCategoryLabel, getNotificationDisplayDetail } from "@/lib/notifications/member-notification";
import { cn } from "@/lib/utils";

export function NotificationBellDropdown({ notificationsHref, portal }: { notificationsHref: string; portal: NotificationPortal }) {
  const { notifications, unreadCount, loading, viewNotification } = useNotifications();
  const unreadNotifications = notifications.filter((item) => !item.read_at).slice(0, 8);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button id="notification-bell-trigger" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")} aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <>
              <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </>
          ) : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-[360px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_16px_40px_rgba(7,29,56,.14)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : "No new notifications."}</p>
            </div>
            <Link href={notificationsHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open inbox
            </Link>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading notifications...</div> : null}
            {!loading && unreadNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No new notifications.</div>
            ) : null}
            {!loading && unreadNotifications.map((item) => {
              const detail = getNotificationDisplayDetail(item);
              return (
                <div key={item.id} className="border-b border-border/70 px-4 py-3 last:border-b-0">
                  <DropdownMenu.Item asChild>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 rounded-lg px-0 py-1.5 text-left outline-none hover:bg-muted/40 focus:bg-muted/40"
                      onClick={() => void viewNotification(item)}
                    >
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <Badge variant="outline">{getNotificationCategoryLabel(item) ?? item.type}</Badge>
                          {item.members?.member_code ? <Badge variant="outline">{item.members.member_code}</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                        {detail ? <p className="mt-1 text-xs font-medium text-foreground/80">{detail}</p> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {item.members?.full_name ? <span>{item.members.full_name}</span> : null}
                          <NotificationTimestamp createdAt={item.created_at} />
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <Eye className="size-3.5" />
                        View
                      </span>
                    </button>
                  </DropdownMenu.Item>
                  <div onClick={(event) => event.stopPropagation()}>
                    <NotificationActions notification={item} portal={portal} compact />
                  </div>
                </div>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
