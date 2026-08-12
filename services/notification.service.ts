import { createAdminClient } from "@/lib/supabase/admin";

const REMINDER_DAYS = [15, 7, 3, 1, 0] as const;

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
      .select("id, member_id, branch_id, end_date, members(full_name, user_id)")
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
