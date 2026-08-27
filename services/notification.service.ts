import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

const REMINDER_DAYS = [15, 7, 3, 1, 0] as const;
const STAFF_ROLES: UserRole[] = ["owner", "admin", "manager", "reception", "trainer", "dietician", "diet-planner", "diet_planner", "super_admin"];

export async function getUnreadNotificationCount(input: {
  userId: string;
  branchId?: string | null;
  role?: UserRole | null;
}) {
  const supabase = await createClient();
  let query = supabase.from("notifications").select("id", { count: "exact", head: true });

  if (input.role === "member") {
    query = query.eq("user_id", input.userId);
  } else if (input.branchId) {
    query = query.or(`user_id.eq.${input.userId},branch_id.eq.${input.branchId}`);
  } else {
    query = query.eq("user_id", input.userId);
  }

  const { count, error } = await query.is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function queueTimePeriodNotification(input: {
  userId: string;
  tenantId?: string | null;
  branchId?: string | null;
  fullName?: string | null;
  role?: UserRole | null;
  localDate: string;
  period: "morning" | "afternoon" | "evening" | "night";
  timeZone: string;
}) {
  const supabase = createAdminClient();
  const fingerprint = `time-period:${input.userId}:${input.tenantId ?? "no-tenant"}:${input.localDate}:${input.period}`;
  const existing = await supabase.from("notifications").select("id").contains("metadata", { fingerprint }).maybeSingle();
  if (existing.data?.id) return { created: false, id: existing.data.id };

  const titleByPeriod = {
    morning: "Good Morning! Have a productive day at SyncTyre.",
    afternoon: "Good Afternoon! Here is your gym activity update.",
    evening: "Good Evening! Don't forget to review today's gym activity.",
    night: "Good Night! Today's gym operations are complete.",
  } as const;

  const messageByPeriod = {
    morning: `Hello ${input.fullName?.trim() || "there"}, your ${input.period} dashboard summary is ready.`,
    afternoon: `Hello ${input.fullName?.trim() || "there"}, check the latest updates for your gym operations.`,
    evening: `Hello ${input.fullName?.trim() || "there"}, review attendance, payments, and renewals before the day closes.`,
    night: `Hello ${input.fullName?.trim() || "there"}, all key activities for today have been recorded.`,
  } as const;

  const targetBranchId = STAFF_ROLES.includes(input.role ?? "member") ? input.branchId ?? null : input.branchId ?? null;
  const { data, error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    branch_id: targetBranchId,
    tenant_id: input.tenantId ?? null,
    type: "time_period_greeting",
    title: titleByPeriod[input.period],
    message: messageByPeriod[input.period],
    channels: ["dashboard"],
    scheduled_for: new Date().toISOString(),
    metadata: {
      fingerprint,
      category: "time_period_greeting",
      local_date: input.localDate,
      period: input.period,
      time_zone: input.timeZone,
    },
  }).select("id").single();

  if (error) {
    if (error.code === "23505") return { created: false, id: null };
    throw new Error(error.message);
  }

  return { created: true, id: data?.id ?? null };
}

export async function queueSubscriptionReminders() {
  const supabase = createAdminClient();
  const today = new Date();
  const queued: string[] = [];

  for (const days of REMINDER_DAYS) {
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + days);
    const date = target.toISOString().slice(0, 10);
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("id, member_id, branch_id, tenant_id, end_date, members(full_name, user_id)")
      .in("status", ["active", "expired"])
      .eq("end_date", date);
    if (error) throw new Error(error.message);

    for (const subscription of subscriptions ?? []) {
      const member = subscription.members as unknown as { full_name: string; user_id: string | null };
      const type = days === 0 ? "membership_expired" : "membership_expiry_reminder";
      const fingerprint = `${subscription.id}:${date}:${days}`;
      const { data: existing } = await supabase.from("notifications").select("id").contains("metadata", { fingerprint }).maybeSingle();
      if (existing) continue;

      const { data: notification, error: insertError } = await supabase.from("notifications").insert({
        user_id: member.user_id,
        member_id: subscription.member_id,
        branch_id: subscription.branch_id,
        tenant_id: subscription.tenant_id,
        type,
        title: days === 0 ? "Membership expired" : `Membership expires in ${days} day${days === 1 ? "" : "s"}`,
        message: days === 0 ? `${member.full_name}'s membership has expired. Renew it to restore access.` : `${member.full_name}'s membership ends on ${date}.`,
        channels: ["dashboard", "email", "sms", "whatsapp"],
        scheduled_for: new Date().toISOString(),
        metadata: { fingerprint, subscription_id: subscription.id, remaining_days: days },
      }).select("id").single();

      if (!insertError) {
        queued.push(fingerprint);
        await supabase.from("activity_logs").insert({
          branch_id: subscription.branch_id,
          action: "notification_sent",
          entity_type: "notification",
          entity_id: notification?.id ?? fingerprint,
          description: `Queued ${type} notification`,
          changes: { subscription_id: subscription.id, remaining_days: days },
        });
      }
    }
  }

  return { queued: queued.length };
}
