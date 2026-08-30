import { createClient } from "@/lib/supabase/server";
import { getLocalDateKey } from "@/lib/time";
import type { DashboardMetrics } from "@/types";
import { getOutstandingReceivablesSummary } from "@/services/finance.service";

export async function getDashboardData(branchId?: string | null, timeZone = "Asia/Kolkata") {
  const supabase = await createClient();
  const today = getLocalDateKey(new Date(), timeZone);
  const through = new Date(`${today}T00:00:00.000Z`);
  through.setUTCDate(through.getUTCDate() + 30);
  const inThirtyDays = through.toISOString().slice(0, 10);
  // Supabase exposes different builder types for aggregate and row queries; both support eq at runtime.
  const branch = (query: any) => branchId ? query.eq("branch_id", branchId) : query;
  const [members, active, attendance, expiring, expired, revenue, pending, outstandingSummary, appointments, trainers, machines, notifications, branches, activities] = await Promise.all([
    branch(supabase.from("members").select("id", { count: "exact", head: true })),
    branch(supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active")),
    branch(supabase.from("attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today)),
    branch(supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").lte("end_date", inThirtyDays).gte("end_date", today)),
    branch(supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired")),
    branch(supabase.from("payments").select("amount").eq("status", "completed").gte("paid_at", `${today}T00:00:00Z`)),
    branch(supabase.from("payments").select("amount").eq("status", "pending")),
    getOutstandingReceivablesSummary(branchId),
    branch(supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today)),
    branch(supabase.from("trainers").select("id", { count: "exact", head: true }).eq("status", "active")),
    branch(supabase.from("equipment").select("id", { count: "exact", head: true })),
    // Notifications: unread count (scoped to branch if available)
    branchId
      ? supabase.from("notifications").select("id", { count: "exact", head: true }).eq("branch_id", branchId).is("read_at", null)
      : supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    // Branches: only meaningful for admin (no branch filter)
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("activity_logs").select("id, action, entity_type, description, created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  const total = members.count ?? 0;
  const metrics: DashboardMetrics = {
    totalMembers: total,
    activeMembers: active.count ?? 0,
    inactiveMembers: Math.max(0, total - (active.count ?? 0)),
    todayAttendance: attendance.count ?? 0,
    expiringMemberships: expiring.count ?? 0,
    expiredMemberships: expired.count ?? 0,
    revenue: revenue.data?.reduce((sum: number, item: { amount: number | string }) => sum + Number(item.amount), 0) ?? 0,
    pendingPayments: pending.data?.reduce((sum: number, item: { amount: number | string }) => sum + Number(item.amount), 0) ?? 0,
    outstandingPayments: outstandingSummary.totalOutstanding,
    appointments: appointments.count ?? 0,
    trainers: trainers.count ?? 0,
    machines: machines.count ?? 0,
    notifications: notifications.count ?? 0,
    branches: branches.count ?? 0,
  };
  return { metrics, activities: activities.data ?? [] };
}

// ─── Recent data for dashboard feed ───────────────────────────────────────────

export async function getRecentMembers(branchId?: string | null, limit = 5) {
  const supabase = await createClient();
  let q = supabase
    .from("members")
    .select("id, full_name, member_code, phone, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (branchId) q = q.eq("branch_id", branchId);
  const { data } = await q;
  return data ?? [];
}

export async function getRecentPayments(branchId?: string | null, limit = 5) {
  const supabase = await createClient();
  let q = supabase
    .from("payments")
    .select("id, amount, status, payment_method, paid_at, created_at, members(full_name, member_code)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (branchId) q = q.eq("branch_id", branchId);
  const { data } = await q;
  return (data ?? []) as unknown as Array<{
    id: string;
    amount: number;
    status: string;
    payment_method: string;
    paid_at: string | null;
    created_at: string;
    members: { full_name: string; member_code: string } | null;
  }>;
}

export async function getRecentAttendance(branchId?: string | null, limit = 5) {
  const supabase = await createClient();
  let q = supabase
    .from("attendance")
    .select("id, attendance_date, entry_time_ist, member_id, members(full_name, member_code)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (branchId) q = q.eq("branch_id", branchId);
  const { data } = await q;
  return (data ?? []) as unknown as Array<{
    id: string;
    attendance_date: string;
    entry_time_ist: string | null;
    member_id: string;
    members: { full_name: string; member_code: string } | null;
  }>;
}

export async function getLatestRenewals(branchId?: string | null, limit = 5) {
  const supabase = await createClient();
  let q = supabase
    .from("subscriptions")
    .select("id, start_date, end_date, status, times_renewed, members(full_name, member_code), membership_plans(name)")
    .gt("times_renewed", 0)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (branchId) q = q.eq("branch_id", branchId);
  const { data } = await q;
  return (data ?? []) as unknown as Array<{
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    times_renewed: number;
    members: { full_name: string; member_code: string } | null;
    membership_plans: { name: string } | null;
  }>;
}

export async function getExpiringMemberships(branchId?: string | null, timeZone = "Asia/Kolkata") {
  const supabase = await createClient();
  const today = getLocalDateKey(new Date(), timeZone);
  const through = new Date(`${today}T00:00:00.000Z`);
  through.setUTCDate(through.getUTCDate() + 30);
  const inThirtyDays = through.toISOString().slice(0, 10);
  
  let q = supabase
    .from("subscriptions")
    .select("id, start_date, end_date, status, total_amount, member_id, members(full_name, member_code, phone), membership_plans(name)")
    .eq("status", "active")
    .gte("end_date", today)
    .lte("end_date", inThirtyDays)
    .order("end_date", { ascending: true });
    
  if (branchId) q = q.eq("branch_id", branchId);
  
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  
  return (data ?? []) as unknown as Array<{
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    total_amount: number;
    member_id: string;
    members: { full_name: string; member_code: string; phone: string | null } | null;
    membership_plans: { name: string } | null;
  }>;
}

// ─── Chart data ────────────────────────────────────────────────────────────

export interface RevenuePoint { m: string; v: number }
export interface AttendancePoint { d: string; v: number }
export interface PlanPoint { name: string; value: number; color: string }

const PLAN_COLORS = ["#ff3024", "#52c7ea", "#22b978", "#f4b844", "#a78bfa", "#fb923c"];

/**
 * Last 6 months of completed payment totals, grouped by month.
 */
export async function getRevenueChartData(branchId?: string | null): Promise<RevenuePoint[]> {
  const supabase = await createClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const since = sixMonthsAgo.toISOString();

  let query = supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("status", "completed")
    .gte("paid_at", since)
    .not("paid_at", "is", null);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data } = await query;

  // Group by month label
  const map = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleString("en-IN", { month: "short" });
    map.set(label, 0);
  }

  for (const row of data ?? []) {
    if (!row.paid_at) continue;
    const label = new Date(row.paid_at).toLocaleString("en-IN", { month: "short" });
    if (map.has(label)) {
      map.set(label, (map.get(label) ?? 0) + Number(row.amount));
    }
  }

  return Array.from(map.entries()).map(([m, v]) => ({ m, v }));
}

/**
 * Last 7 days of daily attendance counts.
 */
export async function getAttendanceChartData(branchId?: string | null): Promise<AttendancePoint[]> {
  const supabase = await createClient();
  const days: AttendancePoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleString("en-IN", { weekday: "short" });

    let q = supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("attendance_date", dateStr);
    if (branchId) q = q.eq("branch_id", branchId);
    const { count } = await q;
    days.push({ d: label, v: count ?? 0 });
  }

  return days;
}

/**
 * Active subscription counts grouped by plan name.
 */
export async function getPlanDistributionData(branchId?: string | null): Promise<PlanPoint[]> {
  const supabase = await createClient();

  let query = supabase
    .from("subscriptions")
    .select("membership_plans(name)")
    .eq("status", "active");
  if (branchId) query = query.eq("branch_id", branchId);

  const { data } = await query;

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const planName =
      (row.membership_plans as unknown as { name: string } | null)?.name ?? "Unknown";
    map.set(planName, (map.get(planName) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([name, value], i) => ({
    name,
    value,
    color: PLAN_COLORS[i % PLAN_COLORS.length],
  }));
}
