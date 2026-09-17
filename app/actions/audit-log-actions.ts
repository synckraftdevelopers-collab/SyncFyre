"use server";

import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
  branch_id: string | null;
};

export type AuditLogParams = {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  action?: string;
  entityType?: string;
};

export type AuditLogResult = {
  data: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

/**
 * Fetches activity_logs scoped to the requesting user's tenant.
 *
 * Security:
 *  - Requires Scale plan (enterprise_rbac feature)
 *  - Requires owner or admin role
 *  - Uses admin client (service role) because the existing activity_logs RLS
 *    scopes reads to branch_id, not tenant_id.
 *    We enforce tenant isolation manually by filtering to the tenant's branch IDs.
 *
 * Talwalkar Safety: Talwalkar is plan_1 → hasCurrentFeature("enterprise_rbac") = false.
 * No Talwalkar data is ever returned.
 */
export async function getAuditLogsAction(params: AuditLogParams = {}): Promise<AuditLogResult> {
  const profile = await requireUser(["owner", "admin"]);

  if (!profile.tenant_id) {
    return { data: [], total: 0, page: 1, pageSize: 50, error: "No organization linked to your account." };
  }

  if (!(await hasCurrentFeature("enterprise_rbac"))) {
    return { data: [], total: 0, page: 1, pageSize: 50, error: "Enterprise audit logs require the Scale plan." };
  }

  const { page = 1, pageSize = 50, from, to, action, entityType } = params;
  const fromIdx = (page - 1) * pageSize;

  const admin = createAdminClient();

  // Get all branch IDs for this tenant — used to scope the activity_logs query
  const { data: branches, error: branchError } = await admin
    .from("branches")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active");

  if (branchError) {
    return { data: [], total: 0, page, pageSize, error: branchError.message };
  }

  const branchIds = (branches ?? []).map((b) => b.id);

  // If no branches found, return empty (shouldn't happen for valid tenants)
  if (branchIds.length === 0) {
    return { data: [], total: 0, page, pageSize };
  }

  let query = admin
    .from("activity_logs")
    .select("id,action,entity_type,entity_id,description,changes,created_at,user_id,branch_id", { count: "exact" })
    .in("branch_id", branchIds)
    .order("created_at", { ascending: false })
    .range(fromIdx, fromIdx + pageSize - 1);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to + "T23:59:59.999Z");
  if (action) query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);

  const { data, count, error } = await query;

  if (error) {
    return { data: [], total: 0, page, pageSize, error: error.message };
  }

  return {
    data: (data ?? []) as AuditLogRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}
