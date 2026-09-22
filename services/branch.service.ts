/**
 * branch.service.ts
 *
 * Read-only service for branch data used by the multi-branch management UI.
 * All functions are tenant-scoped — a user can only see branches belonging
 * to their own tenant.
 *
 * Mutations (create, update, deactivate) are handled in:
 *   app/actions/settings-actions.ts
 *   (createBranchAction, updateBranchAction, deleteBranchAction)
 *
 * Talwalkar Safety: All queries require tenant_id = profile.tenant_id.
 * Talwalkar data is never accessible to other tenants.
 */

import { createClient } from "@/lib/supabase/server";

export type BranchSummary = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  status: string;
  tenant_id: string;
  created_at: string;
  // Computed counts (populated by getBranchesWithStats)
  memberCount?: number;
  staffCount?: number;
  machineCount?: number;
};

export type BranchDetail = BranchSummary & {
  staff: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    roleSlug: string | null;
    status: string;
  }>;
  recentTransfers?: Array<{
    id: string;
    member_name: string | null;
    direction: "in" | "out";
    other_branch_name: string | null;
    transferred_at: string;
    reason: string | null;
  }>;
};

/**
 * Returns all branches for a given tenant, ordered by name.
 * Does NOT include member/staff counts — use getBranchesWithStats for that.
 */
export async function getBranches(tenantId: string): Promise<BranchSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id,name,code,city,state,address,phone,status,tenant_id,created_at")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as BranchSummary[];
}

/**
 * Returns all active branches for a tenant with member, staff, and machine counts.
 * Uses Promise.all to fetch counts in parallel.
 */
export async function getBranchesWithStats(tenantId: string): Promise<BranchSummary[]> {
  const branches = await getBranches(tenantId);

  if (branches.length === 0) return [];

  const supabase = await createClient();
  const branchIds = branches.map((b) => b.id);

  // Fetch counts in parallel for all branches
  const [membersRes, staffRes, machinesRes] = await Promise.all([
    supabase
      .from("members")
      .select("branch_id")
      .in("branch_id", branchIds)
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
    supabase
      .from("staff")
      .select("branch_id")
      .in("branch_id", branchIds)
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
    supabase
      .from("face_machine_settings")
      .select("branch_id")
      .in("branch_id", branchIds)
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
  ]);

  const memberCounts = new Map<string, number>();
  const staffCounts = new Map<string, number>();
  const machineCounts = new Map<string, number>();

  for (const row of membersRes.data ?? []) {
    memberCounts.set(row.branch_id, (memberCounts.get(row.branch_id) ?? 0) + 1);
  }
  for (const row of staffRes.data ?? []) {
    staffCounts.set(row.branch_id, (staffCounts.get(row.branch_id) ?? 0) + 1);
  }
  for (const row of machinesRes.data ?? []) {
    machineCounts.set(row.branch_id, (machineCounts.get(row.branch_id) ?? 0) + 1);
  }

  return branches.map((branch) => ({
    ...branch,
    memberCount: memberCounts.get(branch.id) ?? 0,
    staffCount: staffCounts.get(branch.id) ?? 0,
    machineCount: machineCounts.get(branch.id) ?? 0,
  }));
}

/**
 * Returns a single branch by ID, validating it belongs to the given tenant.
 * Returns null if not found or tenant mismatch.
 */
export async function getBranchById(branchId: string, tenantId: string): Promise<BranchSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id,name,code,city,state,address,phone,status,tenant_id,created_at")
    .eq("id", branchId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as BranchSummary | null;
}

/**
 * Returns a single branch with its staff list and counts.
 */
export async function getBranchDetail(branchId: string, tenantId: string): Promise<BranchDetail | null> {
  const supabase = await createClient();

  const [branchRes, staffRes, memberCountRes, machineCountRes, transfersRes] = await Promise.all([
    supabase
      .from("branches")
      .select("id,name,code,city,state,address,phone,status,tenant_id,created_at")
      .eq("id", branchId)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id,full_name,email,status,role:roles(slug)")
      .eq("branch_id", branchId)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .neq("role.slug", "member")
      .order("full_name"),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branchId)
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
    supabase
      .from("face_machine_settings")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branchId)
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
    supabase
      .from("member_transfer_log")
      .select("id, transferred_at, reason, member_id, from_branch_id, to_branch_id, members(full_name), from_branch:branches!member_transfer_log_from_branch_id_fkey(name), to_branch:branches!member_transfer_log_to_branch_id_fkey(name)")
      .eq("tenant_id", tenantId)
      .or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`)
      .order("transferred_at", { ascending: false })
      .limit(20),
  ]);

  if (branchRes.error || !branchRes.data) return null;

  const branch = branchRes.data as BranchSummary;

  const staff = (staffRes.data ?? []).map((u) => {
    const roleValue = Array.isArray(u.role)
      ? (u.role[0] as { slug?: string | null } | undefined)?.slug ?? null
      : (u.role as { slug?: string | null } | null)?.slug ?? null;
    return {
      id: u.id,
      full_name: u.full_name as string | null,
      email: u.email as string | null,
      roleSlug: roleValue,
      status: u.status as string,
    };
  });

  return {
    ...branch,
    memberCount: memberCountRes.count ?? 0,
    staffCount: staff.length,
    machineCount: machineCountRes.count ?? 0,
    staff,
    recentTransfers: (transfersRes.data ?? []).map((row) => {
      const isInbound = row.to_branch_id === branchId;
      const memberRecord = Array.isArray(row.members)
        ? (row.members[0] as { full_name?: string | null } | undefined)
        : (row.members as { full_name?: string | null } | null);
      const fromBranchRecord = Array.isArray(row.from_branch)
        ? (row.from_branch[0] as { name?: string | null } | undefined)
        : (row.from_branch as { name?: string | null } | null);
      const toBranchRecord = Array.isArray(row.to_branch)
        ? (row.to_branch[0] as { name?: string | null } | undefined)
        : (row.to_branch as { name?: string | null } | null);
      return {
        id: row.id as string,
        member_name: memberRecord?.full_name ?? null,
        direction: isInbound ? ("in" as const) : ("out" as const),
        other_branch_name: isInbound
          ? (fromBranchRecord?.name ?? null)
          : (toBranchRecord?.name ?? null),
        transferred_at: row.transferred_at as string,
        reason: row.reason as string | null,
      };
    }),
  };
}
