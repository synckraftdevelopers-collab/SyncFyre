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
  const { data, error } = await supabase.rpc("create_subscription_with_history", {
    p_member_id: input.memberId,
    p_plan_id: input.planId,
    p_branch_id: input.branchId,
    p_start_date: input.startDate,
    p_end_date: input.endDate ?? null,
    p_status: input.status ?? "pending",
    p_auto_renew: input.autoRenew ?? false,
    p_price: input.price,
    p_discount_amount: input.discountAmount ?? 0,
    p_gst_amount: input.gstAmount ?? 0,
    p_total_amount: input.totalAmount,
    p_created_by: input.performedBy,
    p_action: input.action ?? "created",
    p_remarks: input.remarks ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
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
