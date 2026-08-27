"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markNotificationReadAction } from "@/app/actions/notification-actions";
import { notificationDestination, type NotificationPortal } from "@/lib/notifications/destination";
import { createClient } from "@/lib/supabase/client";

type NotificationScope = {
  userId: string;
  branchId?: string | null;
  tenantId?: string | null;
  role?: string | null;
};

type NotificationContextValue = {
  unreadCount: number;
  changeToken: number;
};

type NotificationRow = Record<string, unknown> & {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  member_id?: string | null;
  metadata?: Record<string, unknown> | null;
  read_at?: string | null;
};

const NotificationContext = createContext<NotificationContextValue>({ unreadCount: 0, changeToken: 0 });

function rowMatchesScope(row: Record<string, unknown> | null | undefined, scope: NotificationScope) {
  if (!row) return false;
  const userId = typeof row.user_id === "string" ? row.user_id : null;
  const branchId = typeof row.branch_id === "string" ? row.branch_id : null;
  const tenantId = typeof row.tenant_id === "string" ? row.tenant_id : null;

  if (!scope.tenantId || tenantId !== scope.tenantId) return false;
  if (userId === scope.userId) return true;
  const targetRoles = Array.isArray(row.target_roles) ? row.target_roles.filter((role): role is string => typeof role === "string") : [];
  if (targetRoles.length > 0 && (!scope.role || !targetRoles.includes(scope.role))) return false;
  if (scope.role !== "member" && scope.branchId && branchId === scope.branchId) return true;
  return false;
}

export function NotificationProvider({
  children,
  initialUnreadCount,
  scope,
  portal,
  notificationsHref = "/notifications",
}: {
  children: React.ReactNode;
  initialUnreadCount: number;
  scope: NotificationScope;
  portal: NotificationPortal;
  notificationsHref?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [changeToken, setChangeToken] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    let active = true;

    const refreshUnreadCount = async () => {
      let query = supabase.from("notifications").select("id", { count: "exact", head: true }).eq("tenant_id", scope.tenantId ?? "00000000-0000-0000-0000-000000000000");
      if (scope.role === "member") {
        query = query.eq("user_id", scope.userId);
      } else if (scope.branchId) {
        query = query.or(`user_id.eq.${scope.userId},branch_id.eq.${scope.branchId}`);
      } else {
        query = query.eq("user_id", scope.userId);
      }

      const { count, error } = await query.is("read_at", null);
      if (!active || !mountedRef.current || error) return;
      setUnreadCount(count ?? 0);
      setChangeToken((value) => value + 1);
    };

    const channel = supabase
      .channel(`notifications:${scope.tenantId ?? scope.userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: scope.tenantId ? `tenant_id=eq.${scope.tenantId}` : `user_id=eq.${scope.userId}` },
        (payload) => {
          const notification = payload.new as NotificationRow;
          if (!rowMatchesScope(notification, scope)) return;

          void refreshUnreadCount();
          const destination = notificationDestination(notification, portal, notificationsHref);
          toast(notification.title || "New notification", {
            description: notification.message || "You have a new notification.",
            closeButton: true,
            action: {
              label: "View",
              onClick: async () => {
                try {
                  if (!notification.read_at && notification.id) {
                    await markNotificationReadAction(notification.id);
                    setUnreadCount((count) => Math.max(0, count - 1));
                    setChangeToken((value) => value + 1);
                  }
                  router.push(destination);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to open this notification.");
                }
              },
            },
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: scope.tenantId ? `tenant_id=eq.${scope.tenantId}` : `user_id=eq.${scope.userId}` },
        (payload) => {
          if (rowMatchesScope(payload.new as Record<string, unknown>, scope) || rowMatchesScope(payload.old as Record<string, unknown>, scope)) {
            void refreshUnreadCount();
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[notifications] realtime subscription unavailable", status);
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [notificationsHref, portal, router, scope, supabase]);

  return <NotificationContext.Provider value={{ unreadCount, changeToken }}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
