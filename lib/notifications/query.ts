import { BUSINESS_NOTIFICATION_TYPES } from "@/lib/notifications/business";
import type { UserRole } from "@/types";

export const NULL_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export type NotificationScopeInput = {
  userId: string;
  branchId?: string | null;
  tenantId?: string | null;
  role?: UserRole | "super_admin" | string | null;
};

export type NotificationFeedFilter = "all" | "unread" | "archived";

export const NOTIFICATION_SELECT = "id, user_id, member_id, branch_id, tenant_id, type, title, message, channels, target_roles, scheduled_for, sent_at, read_at, created_at, updated_at, metadata, members(full_name, phone, member_code), branches(name)";

export function applyBusinessNotificationScope(query: any, scope: NotificationScopeInput) {
  if (scope.role === "super_admin") {
    return query
      .is("tenant_id", null)
      .contains("target_roles", ["super_admin"])
      .in("type", [...BUSINESS_NOTIFICATION_TYPES]);
  }

  let scoped = query
    .eq("tenant_id", scope.tenantId ?? NULL_TENANT_ID)
    .in("type", [...BUSINESS_NOTIFICATION_TYPES]);

  if (scope.role === "member") return scoped.eq("user_id", scope.userId);
  if (scope.branchId) return scoped.or(`user_id.eq.${scope.userId},branch_id.eq.${scope.branchId}`);
  return scoped.eq("user_id", scope.userId);
}

export function applyNotificationFeedFilter(query: any, filter: NotificationFeedFilter) {
  if (filter === "unread") return query.is("read_at", null);
  if (filter === "archived") return query.not("read_at", "is", null);
  return query;
}
