import { createClient } from "@/lib/supabase/server";
import type { DashboardMetrics } from "@/types";

export async function getDashboardData(branchId?: string | null) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const inThirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  // Supabase exposes different builder types for aggregate and row queries; both support eq at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const branch = (query: any) => branchId ? query.eq("branch_id", branchId) : query;
  const [members, active, attendance, expiring, revenue, pending, appointments, trainers, machines, activities] = await Promise.all([
    branch(supabase.from("members").select("id", { count: "exact", head: true })),
    branch(supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active")),
    branch(supabase.from("attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today)),
    branch(supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").lte("end_date", inThirtyDays).gte("end_date", today)),
    branch(supabase.from("payments").select("amount").eq("status", "completed").gte("paid_at", `${today}T00:00:00Z`)),
    branch(supabase.from("payments").select("amount").eq("status", "pending")),
    branch(supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today)),
    branch(supabase.from("trainers").select("id", { count: "exact", head: true }).eq("status", "active")),
    branch(supabase.from("equipment").select("id", { count: "exact", head: true })),
    supabase.from("activity_logs").select("id, action, entity_type, description, created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  const total = members.count ?? 0;
  const metrics: DashboardMetrics = {
    totalMembers: total,
    activeMembers: active.count ?? 0,
    inactiveMembers: Math.max(0, total - (active.count ?? 0)),
    todayAttendance: attendance.count ?? 0,
    expiringMemberships: expiring.count ?? 0,
    revenue: revenue.data?.reduce((sum: number, item: { amount: number | string }) => sum + Number(item.amount), 0) ?? 0,
    pendingPayments: pending.data?.reduce((sum: number, item: { amount: number | string }) => sum + Number(item.amount), 0) ?? 0,
    appointments: appointments.count ?? 0,
    trainers: trainers.count ?? 0,
    machines: machines.count ?? 0,
  };
  return { metrics, activities: activities.data ?? [] };
}
