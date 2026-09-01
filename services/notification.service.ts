import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import { dispatchPendingNotificationDeliveries } from "@/services/notification-delivery.service";
import {
  applyBusinessNotificationScope,
  applyNotificationFeedFilter,
  NOTIFICATION_SELECT,
  type NotificationFeedFilter,
  type NotificationScopeInput,
} from "@/lib/notifications/query";

export type NotificationFeedRow = {
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

export async function getUnreadNotificationCount(input: NotificationScopeInput) {
  const supabase = await createClient();
  const query = applyBusinessNotificationScope(
    supabase.from("notifications").select("id", { count: "exact", head: true }),
    input,
  );
  const { count, error } = await query.is("read_at", null);
  if (error) {
    if (isMissingSchemaError(error)) return 0;
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function getNotificationFeed(input: NotificationScopeInput & { filter?: NotificationFeedFilter; limit?: number }) {
  const supabase = await createClient();
  let query = applyBusinessNotificationScope(
    supabase.from("notifications").select(NOTIFICATION_SELECT).order("created_at", { ascending: false }).limit(input.limit ?? 200),
    input,
  );
  query = applyNotificationFeedFilter(query, input.filter ?? "all");
  const { data, error } = await query;
  if (error) {
    if (isMissingSchemaError(error)) return [] as NotificationFeedRow[];
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as NotificationFeedRow[];
}

/** Protected cron entry point. The database function reads real memberships and invoices and is idempotent. */
export async function queueSubscriptionReminders() {
  const { data, error } = await createAdminClient().rpc("generate_membership_reminders");
  if (error) throw new Error(error.message);
  return { queued: Number(data ?? 0) };
}

export async function runNotificationAutomation() {
  const reminders = await queueSubscriptionReminders();
  const deliveries = await dispatchPendingNotificationDeliveries();
  return { reminders, deliveries };
}
