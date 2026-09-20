"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import { assertCurrentFeature } from "@/lib/entitlements/server";
import { updateSubscriptionWithHistory } from "@/services/workflow.service";
import { changeMembershipPlan, type SellPlanPaymentMethod } from "@/services/membership-plan.service";
import { addCalendarMonthsToDateOnly, addDaysToDateOnly, getLocalDateInputValue, parseDateOnly } from "@/lib/membership-dates";

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

  if (status === "active") {
    // Resuming (whether from a plain Pause or a dated Freeze) always clears
    // any freeze/hold metadata — see freezeSubscriptionAction below. A no-op
    // when the subscription wasn't frozen. Tolerate the columns not existing
    // yet on a database that hasn't run the freeze/hold migration.
    const { error: clearError } = await supabase
      .from("subscriptions")
      .update({ held_until: null, hold_reason: null })
      .eq("id", subscriptionId);
    if (clearError && !isMissingSchemaError(clearError)) throw new Error(clearError.message);
  }

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${subscriptionId}`);
  revalidatePath("/reception/memberships");
  revalidatePath(`/admin/members/${subscription.member_id}`);
}

/**
 * 13-prompt sprint, Prompt 2: freeze/hold a subscription. Reuses the
 * existing 'paused' status and 'paused' subscription_history action (both
 * already valid — see the update_subscription_with_history RPC and the
 * subscription_history_action_check constraint) rather than introducing a
 * new status value or touching that RPC. `held_until` / `hold_reason` are
 * lightweight columns (migration 0055) that record hold-specific metadata
 * on top of the ordinary pause.
 */
export async function freezeSubscriptionAction(subscriptionId: string, formData: FormData) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();

  const heldUntil = String(formData.get("held_until") ?? "").trim();
  const reason = String(formData.get("hold_reason") ?? "").trim();
  if (!heldUntil) throw new Error("A hold end date is required to freeze a subscription.");

  let query = supabase
    .from("subscriptions")
    .select("id, member_id, branch_id, status, end_date")
    .eq("id", subscriptionId);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data: subscription, error } = await query.maybeSingle();
  if (error || !subscription) throw new Error(error?.message ?? "Subscription not found.");
  if (subscription.status !== "active") throw new Error("Only an active subscription can be frozen.");
  if (subscription.end_date && heldUntil > subscription.end_date) {
    throw new Error("Hold end date cannot be after the subscription's current end date.");
  }

  await updateSubscriptionWithHistory({
    subscriptionId,
    performedBy: profile.id,
    status: "paused",
    action: "paused",
    remarks: reason ? `Frozen until ${heldUntil} — ${reason}` : `Frozen until ${heldUntil}`,
  });

  const { error: holdError } = await supabase
    .from("subscriptions")
    .update({ held_until: heldUntil, hold_reason: reason || null })
    .eq("id", subscriptionId);
  if (holdError && !isMissingSchemaError(holdError)) throw new Error(holdError.message);

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

/**
 * 13-prompt sprint, Prompt 3: custom extension — push a subscription's end
 * date out by an arbitrary number of days (e.g. a goodwill credit or a gym
 * closure) without re-running a renewal. Reuses the existing 'extended'
 * subscription_history action (same one renewSubscriptionAction already
 * uses for a full-term renewal) — no schema change needed. Leaves status
 * and start_date untouched; works from either active or paused (a frozen
 * subscription's clock can still be adjusted).
 */
const MAX_EXTENSION_DAYS = 365;

export async function extendSubscriptionAction(subscriptionId: string, formData: FormData) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();

  const days = Number(String(formData.get("days") ?? "").trim());
  const reason = String(formData.get("reason") ?? "").trim();
  if (!Number.isInteger(days) || days <= 0 || days > MAX_EXTENSION_DAYS) {
    throw new Error(`Enter a whole number of days between 1 and ${MAX_EXTENSION_DAYS}.`);
  }

  let query = supabase
    .from("subscriptions")
    .select("id, member_id, branch_id, end_date, status")
    .eq("id", subscriptionId);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data: subscription, error } = await query.maybeSingle();
  if (error || !subscription) throw new Error(error?.message ?? "Subscription not found.");
  if (subscription.status !== "active" && subscription.status !== "paused") {
    throw new Error("Only an active or paused subscription can be extended.");
  }
  if (!subscription.end_date) throw new Error("This subscription has no end date to extend from.");

  const newEndDate = addDaysToDateOnly(subscription.end_date, days);

  await updateSubscriptionWithHistory({
    subscriptionId,
    performedBy: profile.id,
    endDate: newEndDate,
    status: subscription.status as "active" | "paused",
    action: "extended",
    remarks: reason
      ? `Extended by ${days} day${days === 1 ? "" : "s"} — ${reason}`
      : `Extended by ${days} day${days === 1 ? "" : "s"}`,
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${subscriptionId}`);
  revalidatePath("/reception/memberships");
  revalidatePath(`/admin/members/${subscription.member_id}`);
}

/**
 * 13-prompt sprint, Prompt 4: change a member's plan (no proration).
 * Growth+ only — gated behind the `advanced_membership` feature. Uses the
 * useActionState calling convention (prevState, formData); the subscription
 * being changed is read from a hidden form field rather than bound, matching
 * the existing AddMemberPlanForm/addMemberPlanAction pattern in this codebase.
 */
export type ChangePlanState = { error?: string; success?: string; newSubscriptionId?: string };

const allowedPaymentMethods = ["cash", "upi", "card", "online", "check"] as const;

export async function changeMembershipPlanAction(
  _prev: ChangePlanState,
  formData: FormData,
): Promise<ChangePlanState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  try {
    await assertCurrentFeature("advanced_membership");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Plan change is not included in the current plan." };
  }

  const subscriptionId = String(formData.get("subscription_id") ?? "").trim();
  const newPlanId = String(formData.get("new_plan_id") ?? "").trim();
  const paymentAmount = Number(formData.get("payment_amount") ?? 0);
  const discountAmount = Number(formData.get("discount_amount") ?? 0);
  const rawMethod = String(formData.get("payment_method") ?? "cash");
  const paymentMethod = (allowedPaymentMethods as readonly string[]).includes(rawMethod)
    ? (rawMethod as SellPlanPaymentMethod)
    : "cash";
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim() || null;

  if (!subscriptionId) return { error: "Subscription is required." };
  if (!newPlanId) return { error: "Select the new plan." };
  if (!Number.isFinite(paymentAmount) || paymentAmount < 0) return { error: "Payment amount cannot be negative." };
  if (!Number.isFinite(discountAmount) || discountAmount < 0) return { error: "Discount amount cannot be negative." };

  try {
    const result = await changeMembershipPlan({
      subscriptionId,
      newPlanId,
      paymentAmount,
      discountAmount,
      paymentMethod,
      transactionRef,
      performedBy: profile.id,
      branchId: profile.branch_id,
    });

    revalidatePath("/admin/subscriptions");
    revalidatePath(`/admin/subscriptions/${subscriptionId}`);
    revalidatePath(`/admin/subscriptions/${result.newSubscriptionId}`);
    revalidatePath("/reception/memberships");

    return { success: "Plan changed successfully.", newSubscriptionId: result.newSubscriptionId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not change plan." };
  }
}