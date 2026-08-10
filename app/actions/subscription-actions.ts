"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateSubscriptionWithHistory } from "@/services/workflow.service";

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
  revalidatePath("/reception/memberships");
  revalidatePath(`/admin/members/${subscription.member_id}`);
}