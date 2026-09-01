"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markNotificationReadAction } from "@/app/actions/notification-actions";
import { isBusinessNotificationType } from "@/lib/notifications/business";
import { notificationDestination, type NotificationPortal } from "@/lib/notifications/destination";
import { applyBusinessNotificationScope, NOTIFICATION_SELECT, type NotificationScopeInput } from "@/lib/notifications/query";
import { createClient } from "@/lib/supabase/client";

export type NotificationRecord = {
  id: string;
  user_id: string | null;
  member_id: string | null;
  branch_id: string | null;
  tenant_id: string | null;
  type: string;
  title: string;
  message: string;
  channels: string[] | null;
  target_roles: string[] | null;
  scheduled_for: string | null;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
  members: { full_name: string | null; phone: string | null; member_code: string | null } | null;
};

type NotificationContextValue = {
  unreadCount: number;
  notifications: NotificationRecord[];
  loading: boolean;
  markAsRead: (id: string) => Promise<boolean>;
  viewNotification: (notification: NotificationRecord) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  notifications: [],
  loading: true,
  markAsRead: async () => false,
  viewNotification: async () => {},
});

function rowMatchesScope(row: Record<string, unknown> | null | undefined, scope: NotificationScopeInput) {
  if (!row || !isBusinessNotificationType(row.type)) return false;

  const tenantId = typeof row.tenant_id === "string" ? row.tenant_id : null;
  const branchId = typeof row.branch_id === "string" ? row.branch_id : null;
  const userId = typeof row.user_id === "string" ? row.user_id : null;
  const targetRoles = Array.isArray(row.target_roles) ? row.target_roles.filter((role): role is string => typeof role === "string") : [];

  if (scope.role === "super_admin") {
    return tenantId === null && targetRoles.includes("super_admin");
  }

  if (!scope.tenantId || tenantId !== scope.tenantId) return false;
  if (userId === scope.userId) return true;
  if (scope.role === "member") return false;
  if (!scope.branchId || branchId !== scope.branchId) return false;
  return !scope.role || targetRoles.length === 0 || targetRoles.includes(scope.role);
}

function normalizeNotification(row: Record<string, unknown>): NotificationRecord {
  return {
    id: String(row.id),
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    member_id: typeof row.member_id === "string" ? row.member_id : null,
    branch_id: typeof row.branch_id === "string" ? row.branch_id : null,
    tenant_id: typeof row.tenant_id === "string" ? row.tenant_id : null,
    type: String(row.type ?? ""),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    channels: Array.isArray(row.channels) ? row.channels.filter((value): value is string => typeof value === "string") : null,
    target_roles: Array.isArray(row.target_roles) ? row.target_roles.filter((value): value is string => typeof value === "string") : null,
    scheduled_for: typeof row.scheduled_for === "string" ? row.scheduled_for : null,
    sent_at: typeof row.sent_at === "string" ? row.sent_at : null,
    read_at: typeof row.read_at === "string" ? row.read_at : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
    metadata: row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : null,
    members: row.members && typeof row.members === "object" ? (row.members as NotificationRecord["members"]) : null,
  };
}

function mergeNotifications(current: NotificationRecord[], incoming: NotificationRecord[]) {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) merged.set(item.id, item);
  return [...merged.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
  scope: NotificationScopeInput;
  portal: NotificationPortal;
  notificationsHref?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const notificationsRef = useRef<NotificationRecord[]>([]);

  const markNotificationReadAndUpdate = useCallback(async (id: string) => {
    const current = notificationsRef.current.find((item) => item.id === id);
    if (current?.read_at) return false;
    await markNotificationReadAction(id);
    const readAt = new Date().toISOString();
    setNotifications((rows) => rows.map((item) => (item.id === id ? { ...item, read_at: readAt, updated_at: readAt } : item)));
    if (current && !current.read_at) setUnreadCount((count) => Math.max(0, count - 1));
    else void applyBusinessNotificationScope(
      supabase.from("notifications").select("id", { count: "exact", head: true }),
      scope,
    ).is("read_at", null).then(({ count, error }: { count: number | null; error: { message: string } | null }) => {
      if (!error && mountedRef.current) setUnreadCount(count ?? 0);
    });
    return true;
  }, [scope.branchId, scope.role, scope.tenantId, scope.userId, supabase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    let active = true;

    async function refreshUnreadCount() {
      const query = applyBusinessNotificationScope(
        supabase.from("notifications").select("id", { count: "exact", head: true }),
        scope,
      );
      const { count, error } = await query.is("read_at", null);
      if (!active || !mountedRef.current || error) return;
      setUnreadCount(count ?? 0);
    }

    async function refreshNotifications() {
      const query = applyBusinessNotificationScope(
        supabase.from("notifications").select(NOTIFICATION_SELECT).order("created_at", { ascending: false }).limit(200),
        scope,
      );
      const { data, error } = await query;
      if (!active || !mountedRef.current) return;
      if (error) {
        console.warn("[notifications] failed to load notification feed", error.message);
        setLoading(false);
        return;
      }
      setNotifications((data ?? []).map((row: unknown) => normalizeNotification(row as Record<string, unknown>)));
      setLoading(false);
    }

    void Promise.all([refreshUnreadCount(), refreshNotifications()]);

    const channelName = scope.role === "super_admin"
      ? "notifications:super_admin"
      : `notifications:${scope.tenantId ?? scope.userId}:${scope.branchId ?? scope.userId}:${scope.role ?? "unknown"}`;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        if (!rowMatchesScope(payload.new as Record<string, unknown>, scope)) return;
        const notification = normalizeNotification(payload.new as Record<string, unknown>);
        setNotifications((current) => mergeNotifications(current, [notification]));
        void refreshUnreadCount();
        const destination = notificationDestination(notification, portal, notificationsHref);
        toast(notification.title, {
          description: notification.message,
          closeButton: true,
          action: {
            label: "View",
            onClick: () => {
              void (async () => {
                try {
                  await markNotificationReadAndUpdate(notification.id);
                  router.push(destination);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to open this notification.");
                }
              })();
            },
          },
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, (payload) => {
        const newMatches = rowMatchesScope(payload.new as Record<string, unknown>, scope);
        const oldMatches = rowMatchesScope(payload.old as Record<string, unknown>, scope);
        if (!newMatches && !oldMatches) return;
        if (newMatches) {
          const notification = normalizeNotification(payload.new as Record<string, unknown>);
          setNotifications((current) => mergeNotifications(current, [notification]));
        } else {
          const oldId = typeof (payload.old as Record<string, unknown>).id === "string" ? String((payload.old as Record<string, unknown>).id) : "";
          if (oldId) setNotifications((current) => current.filter((item) => item.id !== oldId));
        }
        void refreshUnreadCount();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, (payload) => {
        if (!rowMatchesScope(payload.old as Record<string, unknown>, scope)) return;
        const oldId = typeof (payload.old as Record<string, unknown>).id === "string" ? String((payload.old as Record<string, unknown>).id) : "";
        if (oldId) setNotifications((current) => current.filter((item) => item.id !== oldId));
        void refreshUnreadCount();
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("[notifications] realtime subscription unavailable", status);
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [markNotificationReadAndUpdate, notificationsHref, portal, router, scope.branchId, scope.role, scope.tenantId, scope.userId, supabase]);

  async function viewNotification(notification: NotificationRecord) {
    const destination = notificationDestination(notification, portal, notificationsHref);
    if (!notification.read_at) await markNotificationReadAndUpdate(notification.id);
    router.push(destination);
  }

  return <NotificationContext.Provider value={{ unreadCount, notifications, loading, markAsRead: markNotificationReadAndUpdate, viewNotification }}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
