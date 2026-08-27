"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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

const NotificationContext = createContext<NotificationContextValue>({ unreadCount: 0, changeToken: 0 });

function rowMatchesScope(row: Record<string, unknown> | null | undefined, scope: NotificationScope) {
  if (!row) return false;
  const userId = typeof row.user_id === "string" ? row.user_id : null;
  const branchId = typeof row.branch_id === "string" ? row.branch_id : null;
  const tenantId = typeof row.tenant_id === "string" ? row.tenant_id : null;

  if (scope.tenantId && tenantId && tenantId !== scope.tenantId) return false;
  if (userId === scope.userId) return true;
  if (scope.role !== "member" && scope.branchId && branchId === scope.branchId) return true;
  return false;
}

export function NotificationProvider({
  children,
  initialUnreadCount,
  scope,
}: {
  children: React.ReactNode;
  initialUnreadCount: number;
  scope: NotificationScope;
}) {
  const supabase = useMemo(() => createClient(), []);
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
      let query = supabase.from("notifications").select("id", { count: "exact", head: true });
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
          if (rowMatchesScope(payload.new as Record<string, unknown>, scope)) void refreshUnreadCount();
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
  }, [scope.branchId, scope.role, scope.tenantId, scope.userId, supabase]);

  return <NotificationContext.Provider value={{ unreadCount, changeToken }}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
