import { addCalendarMonthsToDateOnly } from "@/lib/membership-dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ResourceName } from "@/lib/validations/resources";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export async function logActivity(input: {
  performedBy?: string | null;
  branchId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  description?: string | null;
  metadata?: Record<string, Json>;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_activity", {
    p_user_id: input.performedBy ?? null,
    p_branch_id: input.branchId ?? null,
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_description: input.description ?? null,
    p_changes: input.metadata ?? {},
  });
  if (error) throw new Error(error.message);
}

export async function createSubscriptionWithHistory(input: {
  memberId: string;
  planId: string;
  branchId: string;
  tenantId?: string | null;
  startDate: string;
  endDate?: string | null;
  status?: "pending" | "active" | "expired" | "cancelled" | "paused";
  autoRenew?: boolean;
  price: number;
  discountAmount?: number;
  gstAmount?: number;
  totalAmount: number;
  performedBy: string;
  action?: "created" | "renewed";
  remarks?: string | null;
}) {
  const supabase = await createClient();
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, tenant_id")
    .eq("id", input.branchId)
    .maybeSingle();
  if (branchError) throw new Error(branchError.message);
  if (!branch) throw new Error("Branch not found.");

  if (input.tenantId && branch.tenant_id && branch.tenant_id !== input.tenantId) {
    throw new Error("Selected branch does not belong to your organization.");
  }

  const resolvedTenantId = branch.tenant_id ?? input.tenantId ?? null;
  if (!resolvedTenantId) throw new Error("Selected branch is missing tenant ownership.");

  if (!branch.tenant_id && input.tenantId) {
    const admin = createAdminClient();
    const { error: backfillError } = await admin
      .from("branches")
      .update({ tenant_id: input.tenantId })
      .eq("id", branch.id)
      .is("tenant_id", null);
    if (backfillError) throw new Error(backfillError.message);
  }

  let resolvedEndDate = input.endDate ?? null;

  if (!resolvedEndDate) {
    const { data: plan, error: planError } = await supabase
      .from("membership_plans")
      .select("duration_months")
      .eq("id", input.planId)
      .single();

    if (planError) throw new Error(planError.message);
    resolvedEndDate = addCalendarMonthsToDateOnly(input.startDate, Number(plan.duration_months));
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .insert({
      member_id: input.memberId,
      plan_id: input.planId,
      branch_id: input.branchId,
      tenant_id: resolvedTenantId,
      start_date: input.startDate,
      end_date: resolvedEndDate,
      status: input.status ?? "pending",
      auto_renew: input.autoRenew ?? false,
      price: input.price,
      discount_amount: input.discountAmount ?? 0,
      gst_amount: input.gstAmount ?? 0,
      total_amount: input.totalAmount,
      created_by: input.performedBy,
    })
    .select("id, member_id, branch_id, tenant_id, start_date, end_date, status, auto_renew, price, discount_amount, gst_amount, total_amount, created_by")
    .single();
  if (subscriptionError || !subscription) throw new Error(subscriptionError?.message ?? "Unable to create subscription.");

  const { error: historyError } = await supabase.from("subscription_history").insert({
    subscription_id: subscription.id,
    member_id: input.memberId,
    previous_end_date: null,
    new_start_date: input.startDate,
    new_end_date: resolvedEndDate,
    action: input.action ?? "created",
    notes: input.remarks ?? null,
    performed_by: input.performedBy,
    previous_status: null,
    new_status: input.status ?? "pending",
    performed_at: new Date().toISOString(),
    remarks: input.remarks ?? null,
  });
  if (historyError) throw new Error(historyError.message);

  await logActivity({
    performedBy: input.performedBy,
    branchId: branch.id,
    action: input.action === "renewed" ? "membership_renewed" : "membership_created",
    entityType: "subscription",
    entityId: subscription.id,
    description: "Membership lifecycle event",
    metadata: { action: input.action ?? "created", member_id: input.memberId, status: input.status ?? "pending" },
  });

  return subscription;
}

export async function updateSubscriptionWithHistory(input: {
  subscriptionId: string;
  performedBy: string;
  planId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: "pending" | "active" | "expired" | "cancelled" | "paused" | null;
  autoRenew?: boolean | null;
  price?: number | null;
  discountAmount?: number | null;
  gstAmount?: number | null;
  totalAmount?: number | null;
  action?: "extended" | "paused" | "resumed" | "cancelled" | "expired" | "updated";
  remarks?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_subscription_with_history", {
    p_subscription_id: input.subscriptionId,
    p_plan_id: input.planId ?? null,
    p_start_date: input.startDate ?? null,
    p_end_date: input.endDate ?? null,
    p_status: input.status ?? null,
    p_auto_renew: input.autoRenew ?? null,
    p_price: input.price ?? null,
    p_discount_amount: input.discountAmount ?? null,
    p_gst_amount: input.gstAmount ?? null,
    p_total_amount: input.totalAmount ?? null,
    p_performed_by: input.performedBy,
    p_action: input.action ?? null,
    p_remarks: input.remarks ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

const softDeleteTables: Partial<Record<ResourceName | "members", string>> = {
  members: "members",
  "membership-plans": "membership_plans",
  subscriptions: "subscriptions",
  trainers: "trainers",
  workouts: "workouts",
  "diet-plans": "diet_plans",
  equipment: "equipment",
  staff: "staff",
  "face-machines": "face_machine_settings",
};

export function supportsSoftDelete(resource: ResourceName | "members") {
  return resource in softDeleteTables;
}

export function tableForSoftDelete(resource: ResourceName | "members") {
  return softDeleteTables[resource] ?? null;
}

export async function softDeleteById(input: {
  table: string;
  id: string;
  performedBy: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(input.table)
    .update({
      status: "inactive",
      deleted_at: new Date().toISOString(),
      deleted_by: input.performedBy,
    })
    .eq("id", input.id)
    .select("id, branch_id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; branch_id: string | null };
}

export async function resolveAttendanceException(input: {
  id: string;
  action: "approve" | "merge" | "ignore" | "retry_sync" | "assign_member";
  performedBy: string;
  branchId?: string | null;
  notes?: string | null;
  metadata?: Record<string, Json>;
}) {
  const supabase = await createClient();
  const resolutionStatus = input.action === "ignore" ? "ignored" : "resolved";
  const { data, error } = await supabase
    .from("attendance_sync_logs")
    .update({
      resolution_status: resolutionStatus,
      resolution_action: input.action,
      resolved_by: input.performedBy,
      resolved_at: new Date().toISOString(),
      resolution_notes: input.notes ?? null,
      resolution_metadata: input.metadata ?? {},
    })
    .eq("id", input.id)
    .select("id, branch_id, status, exception_type")
    .single();
  if (error) throw new Error(error.message);

  await logActivity({
    performedBy: input.performedBy,
    branchId: data.branch_id ?? input.branchId ?? null,
    action: `attendance_exception_${input.action}`,
    entityType: "attendance_exception",
    entityId: input.id,
    description: "Attendance exception resolved",
    metadata: {
      status: data.status,
      exception_type: data.exception_type,
      notes: input.notes ?? null,
    },
  });

  return data;
}
