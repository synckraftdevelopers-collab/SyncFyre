import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import { dispatchPendingNotificationDeliveries } from "@/services/notification-delivery.service";
import { shouldDisplayNotification } from "@/lib/notifications/member-notification";
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
  branches: { name: string | null } | null;
};

export async function getUnreadNotificationCount(input: NotificationScopeInput) {
  const supabase = await createClient();
  const query = applyBusinessNotificationScope(
    supabase.from("notifications").select(NOTIFICATION_SELECT).order("created_at", { ascending: false }).limit(200),
    input,
  );
  const { data, error } = await query.is("read_at", null);
  if (error) {
    if (isMissingSchemaError(error)) return 0;
    throw new Error(error.message);
  }
  return (data ?? []).filter((row: NotificationFeedRow) => shouldDisplayNotification(row)).length;
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

/**
 * Protected cron entry point. Flips any 'active' subscription whose
 * end_date has passed to 'expired' (and logs it to subscription_history),
 * so the Members page, its Expired filter/count, and the dashboard's
 * expired-memberships tile — which all query subscriptions.status directly
 * — stay accurate day to day instead of subscriptions silently staying
 * "active" forever after they lapse. Idempotent: a no-op once nothing is
 * overdue. Runs before queueSubscriptionReminders() so same-day "expired
 * today" notifications reflect the just-updated status.
 */
export async function expireOverdueSubscriptions() {
  const { data, error } = await createAdminClient().rpc("expire_overdue_subscriptions");
  if (error) throw new Error(error.message);
  return { expired: Number(data ?? 0) };
}

/** Protected cron entry point. The database function reads real memberships and invoices and is idempotent. */
export async function queueSubscriptionReminders() {
  const { data, error } = await createAdminClient().rpc("generate_membership_reminders");
  if (error) throw new Error(error.message);
  return { queued: Number(data ?? 0) };
}

/**
 * Protected cron entry point (13-Prompt Sprint — Prompt 12). Flags active
 * members who haven't checked in for 14+ days with a staff-facing
 * "member_inactivity_alert" notification, so owners/admins/managers/
 * reception can proactively follow up before a member churns. The
 * database function (0057) re-fires once per ISO week per member while
 * they remain inactive, deduplicated via the existing metadata.fingerprint
 * unique index — this function itself is a thin, idempotent RPC wrapper,
 * same shape as queueSubscriptionReminders() above.
 */
export async function generateInactivityAlerts() {
  const { data, error } = await createAdminClient().rpc("generate_inactivity_alerts");
  if (error) throw new Error(error.message);
  return { flagged: Number(data ?? 0) };
}

/**
 * Protected cron entry point (13-Prompt Sprint — Prompt 13). Flags active
 * PT packages (pt_member_packages.status = 'active') with 2 or fewer
 * sessions remaining with a staff/trainer-facing "pt_sessions_low"
 * notification, so a renewal can be prompted before the package runs out.
 * The database function (0057) re-fires when the remaining-session count
 * changes, deduplicated via the same fingerprint mechanism.
 */
export async function generateLowPtSessionAlerts() {
  const { data, error } = await createAdminClient().rpc("generate_low_pt_session_alerts");
  if (error) throw new Error(error.message);
  return { flagged: Number(data ?? 0) };
}

export async function runNotificationAutomation() {
  const expiry = await expireOverdueSubscriptions();
  const reminders = await queueSubscriptionReminders();
  const inactivityAlerts = await generateInactivityAlerts();
  const lowPtSessionAlerts = await generateLowPtSessionAlerts();
  const deliveries = await dispatchPendingNotificationDeliveries();
  return { expiry, reminders, inactivityAlerts, lowPtSessionAlerts, deliveries };
}
