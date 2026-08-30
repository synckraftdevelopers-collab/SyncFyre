import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS_NOTIFICATION_TYPES } from "@/lib/notifications/business";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import type { UserRole } from "@/types";

export async function getUnreadNotificationCount(input: { userId: string; branchId?: string | null; tenantId?: string | null; role?: UserRole | null }) {
  const supabase = await createClient();
  let query = supabase.from("notifications").select("id", { count: "exact", head: true }).eq("tenant_id", input.tenantId ?? "00000000-0000-0000-0000-000000000000");
  if (input.role === "member") query = query.eq("user_id", input.userId);
  else if (input.branchId) query = query.or(`user_id.eq.${input.userId},branch_id.eq.${input.branchId}`);
  else query = query.eq("user_id", input.userId);
  const { count, error } = await query.in("type", BUSINESS_NOTIFICATION_TYPES).is("read_at", null);
  if (error) { if (isMissingSchemaError(error)) return 0; throw new Error(error.message); }
  return count ?? 0;
}

/** Protected cron entry point. The database function reads real memberships and invoices and is idempotent. */
export async function queueSubscriptionReminders() {
  const { data, error } = await createAdminClient().rpc("generate_membership_reminders");
  if (error) throw new Error(error.message);
  return { queued: Number(data ?? 0) };
}
