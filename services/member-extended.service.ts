/**
 * member-extended.service.ts
 *
 * Extended server-side queries for the Members Management module.
 * Reads from existing tables + report views. Never mutates schema.
 * Uses the SSR Supabase client – RLS is always enforced.
 */

import { createClient } from "@/lib/supabase/server";
import type { MemberRegisterRow } from "@/types";
import { createSubscriptionWithHistory, logActivity } from "@/services/workflow.service";

// ─── Rich member list (from member_register_view) ────────────────────────────

export interface MemberListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  branchId?: string | null;
  status?: string;
  planId?: string;
  trainerId?: string;
  gender?: string;
  subscriptionStatus?: string;
  paymentStatus?: string;   // derives from invoice status
  joinDateFrom?: string;    // YYYY-MM-DD
  joinDateTo?: string;
  expiryDateFrom?: string;
  expiryDateTo?: string;
  attendanceToday?: boolean; // filter to members present today
}

export interface MemberListResult {
  data: MemberRegisterRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listMembersRich(
  filters: MemberListFilters = {},
): Promise<MemberListResult> {
  const {
    page = 1,
    pageSize = 25,
    search,
    branchId,
    status,
    planId,
    trainerId,
    gender,
    subscriptionStatus,
    joinDateFrom,
    joinDateTo,
    expiryDateFrom,
    expiryDateTo,
  } = filters;

  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("member_register_view")
    .select("*", { count: "exact" });

  if (branchId)                        query = query.eq("branch_id", branchId);
  if (status && status !== "all")      query = query.eq("member_status", status);
  if (gender && gender !== "all")      query = query.eq("gender", gender);
  if (planId && planId !== "all")      query = query.eq("plan_id", planId);
  if (trainerId && trainerId !== "all") query = query.eq("trainer_id", trainerId);
  if (subscriptionStatus && subscriptionStatus !== "all")
    query = query.eq("subscription_status", subscriptionStatus);
  if (joinDateFrom)  query = query.gte("joined_date", joinDateFrom);
  if (joinDateTo)    query = query.lte("joined_date", joinDateTo);
  if (expiryDateFrom) query = query.gte("subscription_end", expiryDateFrom);
  if (expiryDateTo)   query = query.lte("subscription_end", expiryDateTo);
  if (search) {
    const s = search.replace(/[%_]/g, "");
    query = query.or(
      `full_name.ilike.%${s}%,member_code.ilike.%${s}%,phone.ilike.%${s}%`,
    );
  }

  const { data, count, error } = await query
    .order("joined_date", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    data: (data ?? []) as MemberRegisterRow[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── Full member profile (all fields) ────────────────────────────────────────

export interface FullMember {
  id: string;
  member_code: string;
  user_id: string | null;
  branch_id: string;
  machine_user_id: string | null;
  profile_photo_url: string | null;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_group: string | null;
  medical_conditions: string | null;
  fitness_goal: string | null;
  assigned_trainer_id: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export async function getMemberById(id: string): Promise<FullMember | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as FullMember;
}

// ─── Member subscriptions ─────────────────────────────────────────────────────

export interface MemberSubscription {
  id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: string;
  auto_renew: boolean;
  price: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  created_at: string;
  plan_name: string;
  duration_months: number;
  times_renewed: number;
}

export async function getMemberSubscriptions(memberId: string): Promise<MemberSubscription[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_report_view")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MemberSubscription[];
}

// ─── Member payments ──────────────────────────────────────────────────────────

export interface MemberPayment {
  payment_id: string;
  payment_date: string;
  invoice_number: string | null;
  plan_name: string | null;
  amount: number;
  refund_amount: number;
  net_amount: number;
  payment_method: string;
  payment_status: string;
  transaction_reference: string | null;
  collected_by: string | null;
}

export async function getMemberPayments(memberId: string): Promise<MemberPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_report_view")
    .select("payment_id, payment_date, invoice_number, plan_name, amount, refund_amount, net_amount, payment_method, payment_status, transaction_reference, collected_by")
    .eq("member_id", memberId)
    .order("payment_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MemberPayment[];
}

// ─── Member attendance summary ────────────────────────────────────────────────

export interface AttendanceSummary {
  todayPresent: boolean;
  lastVisitDate: string | null;
  totalVisits: number;
  currentMonthVisits: number;
}

export async function getMemberAttendanceSummary(
  memberId: string,
): Promise<AttendanceSummary> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [todayRes, totalRes, monthRes, lastRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .eq("attendance_date", today),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .gte("attendance_date", monthStart),
    supabase
      .from("attendance")
      .select("attendance_date")
      .eq("member_id", memberId)
      .order("attendance_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    todayPresent: (todayRes.count ?? 0) > 0,
    lastVisitDate: lastRes.data?.attendance_date ?? null,
    totalVisits: totalRes.count ?? 0,
    currentMonthVisits: monthRes.count ?? 0,
  };
}

// ─── Member attendance records ────────────────────────────────────────────────

export async function getMemberAttendanceRecords(
  memberId: string,
  page = 1,
  pageSize = 30,
) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from("attendance_report_view")
    .select("*", { count: "exact" })
    .eq("member_id", memberId)
    .order("attendance_date", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  return { data: data ?? [], total: count ?? 0 };
}

// ─── Member progress records ──────────────────────────────────────────────────

export async function getMemberProgress(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress")
    .select("*")
    .eq("member_id", memberId)
    .order("measured_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Member workouts ──────────────────────────────────────────────────────────

export async function getMemberWorkouts(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_categories(name)")
    .eq("member_id", memberId)
    .eq("status", "active")
    .order("scheduled_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Member diet plans ────────────────────────────────────────────────────────

export async function getMemberDietPlans(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diet_plans")
    .select("*")
    .eq("member_id", memberId)
    .eq("status", "active")
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Member notifications ─────────────────────────────────────────────────────

export async function getMemberNotifications(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export async function getBranchOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("branches")
    .select("id, name")
    .eq("status", "active")
    .order("name");
  return data ?? [];
}

export async function getPlanOptions(branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("membership_plans")
    .select("id, name, price, gst_percent, discount_percent, duration_months")
    .eq("status", "active");
  if (branchId) query = query.eq("branch_id", branchId);
  const { data } = await query.order("name");
  return data ?? [];
}

export async function getTrainerOptions(branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("trainers")
    .select("id, branch_id, users(full_name)")
    .eq("status", "active");
  if (branchId) query = query.eq("branch_id", branchId);
  const { data } = await query;
  return (data ?? []).map((t) => ({
    id: t.id,
    name:
      (t.users as unknown as { full_name: string } | null)?.full_name ?? "Trainer",
  }));
}

// ─── Soft-delete (deactivate) ─────────────────────────────────────────────────

export async function deactivateMember(id: string, performedBy: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .update({ status: "inactive", deleted_at: new Date().toISOString(), deleted_by: performedBy })
    .eq("id", id)
    .select("id, branch_id")
    .single();
  if (error) throw new Error(error.message);
  await logActivity({
    performedBy,
    branchId: data.branch_id,
    action: "member_deactivated",
    entityType: "member",
    entityId: id,
    description: "Member deactivated",
  });
}

// Membership renewal

export interface RenewInput {
  memberId: string;
  branchId: string;
  planId: string;
  startDate: string;
  price: number;
  discountAmount: number;
  gstAmount: number;
  totalAmount: number;
  createdBy: string;
  remarks?: string | null;
}

export async function renewMembership(input: RenewInput): Promise<string> {
  const data = await createSubscriptionWithHistory({
    memberId: input.memberId,
    branchId: input.branchId,
    planId: input.planId,
    startDate: input.startDate,
    status: "active",
    price: input.price,
    discountAmount: input.discountAmount,
    gstAmount: input.gstAmount,
    totalAmount: input.totalAmount,
    performedBy: input.createdBy,
    action: "renewed",
    remarks: input.remarks ?? null,
  }) as { id: string } | null;
  if (!data?.id) throw new Error("Renewal failed.");
  return data.id;
}

// Trainer assignment

export async function assignTrainer(
  memberId: string,
  trainerId: string | null,
  performedBy: string,
): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .update({ assigned_trainer_id: trainerId })
    .eq("id", memberId)
    .select("id, branch_id")
    .single();
  if (error) throw new Error(error.message);
  await logActivity({
    performedBy,
    branchId: data.branch_id,
    action: "trainer_assigned",
    entityType: "member",
    entityId: memberId,
    description: "Trainer assignment updated",
    metadata: { trainer_id: trainerId },
  });
}
