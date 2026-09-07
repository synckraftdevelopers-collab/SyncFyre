"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateSubscriptionWithHistory } from "@/services/workflow.service";
import { addCalendarMonthsToDateOnly, getLocalDateInputValue, parseDateOnly } from "@/lib/membership-dates";

const allowedStatuses = ["active", "paused", "cancelled"] as const;
type LifecycleStatus = (typeof allowedStatuses)[number];

export async function updateSubscriptionStatusAction(subscriptionId: string, status: LifecycleStatus) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();

  let query = supabase.from("subscriptions").select("id, member_id, branch_id").eq("id", subscriptionId);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data: subscription, error } = await query.maybeSingle();
  if (error || !subscription) throw new Error(error?.message ?? "Subscription not found.");

  const action = status === "paused" ? "paused" : status === "cancelled" ? "cancelled" : "resumed";
  await updateSubscriptionWithHistory({
    subscriptionId,
    performedBy: profile.id,
    status,
    action,
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${subscriptionId}`);
  revalidatePath("/reception/memberships");
  revalidatePath(`/admin/members/${subscription.member_id}`);
}

function dayAfter(dateOnly: string): string {
  const { year, monthIndex, day } = parseDateOnly(dateOnly);
  const next = new Date(Date.UTC(year, monthIndex, day + 1));
  return next.toISOString().slice(0, 10);
}

/**
 * dev-task-split.md Phase 2 (#12): renew a subscription for another full
 * plan term. Keeps the existing plan/price/discount/GST — this extends the
 * lifecycle, it does not re-run a sale (a price change is a new sale, done
 * from the member profile). New period starts the day after the current
 * end date, or today if the subscription already lapsed.
 */
export async function renewSubscriptionAction(subscriptionId: string) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();

  let query = supabase
    .from("subscriptions")
    .select("id, member_id, branch_id, end_date, status, membership_plans(duration_months)")
    .eq("id", subscriptionId);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data: subscription, error } = await query.maybeSingle();
  if (error || !subscription) throw new Error(error?.message ?? "Subscription not found.");
  if (subscription.status !== "active") throw new Error("Only an active subscription can be renewed.");

  const plan = subscription.membership_plans as unknown as { duration_months: number | null } | null;
  if (!plan?.duration_months) throw new Error("This subscription's plan has no configured duration.");

  const today = getLocalDateInputValue();
  const newStartDate = subscription.end_date && subscription.end_date >= today ? dayAfter(subscription.end_date) : today;
  const newEndDate = addCalendarMonthsToDateOnly(newStartDate, plan.duration_months);

  await updateSubscriptionWithHistory({
    subscriptionId,
    performedBy: profile.id,
    startDate: newStartDate,
    endDate: newEndDate,
    status: "active",
    action: "extended",
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${subscriptionId}`);
  revalidatePath("/reception/memberships");
  revalidatePath(`/admin/members/${subscription.member_id}`);
}