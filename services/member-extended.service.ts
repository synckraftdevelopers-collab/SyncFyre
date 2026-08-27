/**
 * member-extended.service.ts
 *
 * Extended server-side queries for the Members Management module.
 * Reads from existing tables + report views. Never mutates schema.
 * Uses the SSR Supabase client Ã¢â‚¬â€œ RLS is always enforced.
 */

import { createClient } from "@/lib/supabase/server";
import type { MemberRegisterRow } from "@/types";
import { createSubscriptionWithHistory, logActivity } from "@/services/workflow.service";

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Rich member list (from member_register_view) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
  subscriptionStartFrom?: string;
  subscriptionStartTo?: string;
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
    subscriptionStartFrom,
    subscriptionStartTo,
  } = filters;

  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Try the rich view first; fall back to the base members table if unavailable.
  try {
    let query = supabase
      .from("member_register_view")
      .select("*", { count: "exact" });

    if (branchId)                         query = query.eq("branch_id", branchId);
    if (status && status !== "all")       query = query.eq("member_status", status);
    if (gender && gender !== "all")       query = query.eq("gender", gender);
    if (planId && planId !== "all")       query = query.eq("plan_id", planId);
    if (trainerId && trainerId !== "all") query = query.eq("trainer_id", trainerId);
    if (subscriptionStatus && subscriptionStatus !== "all")
      query = query.eq("subscription_status", subscriptionStatus);
    if (joinDateFrom)   query = query.gte("joined_date", joinDateFrom);
    if (joinDateTo)     query = query.lte("joined_date", joinDateTo);
    if (expiryDateFrom) query = query.gte("subscription_end", expiryDateFrom);
    if (expiryDateTo)   query = query.lte("subscription_end", expiryDateTo);
    if (subscriptionStartFrom) query = query.gte("subscription_start", subscriptionStartFrom);
    if (subscriptionStartTo)   query = query.lte("subscription_start", subscriptionStartTo);
    if (search) {
      const s = search.replace(/[%_]/g, "");
      query = query.or(
        `full_name.ilike.%${s}%,member_code.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`,
      );
    }

    let { data, count, error } = await query
      .order("joined_date", { ascending: false })
      .range(from, to);

    // If page index is out of bounds (e.g., stale ?page=5 in URL), fallback to page 1
    if (error && (error.code === "PGRST103" || error.message.toLowerCase().includes("range"))) {
      const fallback = await query
        .order("joined_date", { ascending: false })
        .range(0, pageSize - 1);
      data = fallback.data;
      count = fallback.count;
      error = fallback.error;
    }

    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      data: (data ?? []) as MemberRegisterRow[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch {
    // Ã¢â€â‚¬Ã¢â€â‚¬ Fallback: query the base members table Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // Used when the view doesn't exist yet or Supabase returns an error for it.
    let q = supabase
      .from("members")
      .select(
        "id, member_code, full_name, gender, date_of_birth, phone, email, profile_photo_url, status, branch_id, assigned_trainer_id, created_at",
        { count: "exact" },
      );

    if (branchId)                   q = q.eq("branch_id", branchId);
    if (status && status !== "all") q = q.eq("status", status);
    if (gender && gender !== "all") q = q.eq("gender", gender);
    if (search) {
      const s = search.replace(/[%_]/g, "");
      q = q.or(`full_name.ilike.%${s}%,member_code.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data: fallbackData, count: fallbackCount } = await q
      .order("created_at", { ascending: false })
      .range(from, to);

    const total = fallbackCount ?? 0;

    // Map base member fields to MemberRegisterRow shape
    const mapped = (fallbackData ?? []).map((m) => ({
      member_id:          m.id,
      member_code:        m.member_code,
      full_name:          m.full_name,
      gender:             m.gender ?? null,
      date_of_birth:      m.date_of_birth ?? null,
      age:                null,
      phone:              m.phone,
      email:              m.email ?? null,
      blood_group:        null,
      height_cm:          null,
      weight_kg:          null,
      fitness_goal:       null,
      medical_conditions: null,
      member_status:      m.status,
      branch_id:          m.branch_id,
      branch_name:        "",
      branch_city:        null,
      trainer_id:         m.assigned_trainer_id ?? null,
      assigned_trainer:   null,
      plan_id:            null,
      current_plan:       null,
      subscription_start: null,
      subscription_end:   null,
      subscription_status:null,
      days_remaining:     null,
      emergency_contact_name:  null,
      emergency_contact_phone: null,
      profile_photo_url:  m.profile_photo_url ?? null,
      joined_date:        m.created_at,
      created_at:         m.created_at,
      total_amount:       null,
      paid_amount:        null,
      balance_amount:     null,
      payment_status:     null,
      package_code:       null,
      is_pt:              null,
      pt_details:         null,
      notes:              null,
    })) as MemberRegisterRow[];

    return {
      data: mapped,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Full member profile (all fields) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
  age: number | null;
  candidate_consent_name: string | null;
  relationship_to_candidate: string | null;
  screening_date: string | null;
  screening_valid_until: string | null;
  fitness_goal: string | null;
  assigned_trainer_id: string | null;
  assigned_dietician_id: string | null;
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Member subscriptions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Member payments Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Member attendance summary Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Member attendance records Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Member progress records Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Member workouts Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Member diet plans Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Member notifications Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Lookup helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

type AssignableRole = "trainer" | "dietician";

type AssignableProfileRow = {
  id: string;
  user_id: string;
  staff_id: string | null;
  branch_id: string;
  status: string;
};

type AssignableUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  branch_id: string | null;
  role: { slug: string | null }[] | null;
};

type AssignableStaffRow = {
  id: string;
  user_id: string;
  branch_id: string;
  designation: string | null;
  employee_code: string;
  status: string;
};

async function ensureAssignableProfiles(role: AssignableRole, branchId?: string | null) {
  const supabase = await createClient();
  let staffQuery = supabase
    .from("staff")
    .select("id, user_id, branch_id, designation, employee_code, status")
    .eq("status", "active");
  if (branchId) staffQuery = staffQuery.eq("branch_id", branchId);

  const [{ data: staffRows, error: staffError }, { data: userRows, error: userError }, { data: profileRows, error: profileError }] = await Promise.all([
    staffQuery,
    supabase
      .from("users")
      .select("id, full_name, email, phone, status, branch_id, role:roles!inner(slug)")
      .eq("roles.slug", role)
      .eq("status", "active"),
    (() => {
      let query = supabase
        .from("trainers")
        .select("id, user_id, staff_id, branch_id, status")
        .eq("status", "active");
      if (branchId) query = query.eq("branch_id", branchId);
      return query;
    })(),
  ]);

  if (staffError) {
    console.error("[member-extended.service] ensureAssignableProfiles staff error:", staffError.message);
    return [];
  }
  if (userError) {
    console.error("[member-extended.service] ensureAssignableProfiles user error:", userError.message);
    return [];
  }
  if (profileError) {
    console.error("[member-extended.service] ensureAssignableProfiles profile error:", profileError.message);
    return [];
  }

  const staff = (staffRows ?? []) as AssignableStaffRow[];
  const users = (userRows ?? []) as unknown as AssignableUserRow[];
  const profiles = (profileRows ?? []) as AssignableProfileRow[];
  const userMap = new Map(users.map((row) => [row.id, row]));
  const staffRowsForRole = staff.filter((row) => userMap.has(row.user_id));
  const profileByUserId = new Map(profiles.map((row) => [row.user_id, row]));

  const missingProfiles = staffRowsForRole.filter((row) => !profileByUserId.has(row.user_id));
  if (missingProfiles.length && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: inserted, error: insertError } = await admin
      .from("trainers")
      .insert(missingProfiles.map((row) => ({
        user_id: row.user_id,
        staff_id: row.id,
        branch_id: row.branch_id,
        status: "active",
      })))
      .select("id, user_id, staff_id, branch_id, status");
    if (insertError) throw new Error(insertError.message);
    for (const row of (inserted ?? []) as AssignableProfileRow[]) {
      profileByUserId.set(row.user_id, row);
    }
  }

  return staffRowsForRole
    .map((staffRow) => {
      const user = userMap.get(staffRow.user_id);
      const profile = profileByUserId.get(staffRow.user_id);
      if (!user || !profile) return null;
      return {
        id: profile.id,
        name: user.full_name ?? staffRow.designation ?? (role === "trainer" ? "Trainer" : "Dietician"),
      };
    })
    .filter((row): row is { id: string; name: string } => Boolean(row))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function validateAssignment(
  memberId: string,
  assigneeId: string | null,
  role: AssignableRole,
  performedBy: string,
): Promise<{ branchId: string; previousAssignmentId: string | null }> {
  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, branch_id, assigned_trainer_id")
    .eq("id", memberId)
    .single();
  if (memberError || !member) throw new Error(memberError?.message ?? "Member not found.");

  if (!assigneeId) {
    return {
      branchId: member.branch_id,
      previousAssignmentId: member.assigned_trainer_id ?? null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("trainers")
    .select("id, user_id, branch_id, status")
    .eq("id", assigneeId)
    .eq("status", "active")
    .single();
  if (profileError || !profile) throw new Error('Selected ' + role + ' is not available.');
  if (profile.branch_id !== member.branch_id) throw new Error('Selected ' + role + " does not belong to this member's branch.");

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, status, role:roles!inner(slug)")
    .eq("id", profile.user_id)
    .eq("status", "active")
    .eq("roles.slug", role)
    .single();
  if (userError || !user) throw new Error('Selected ' + role + ' is not eligible for assignment.');

  const { data: actor } = await supabase.from("users").select("id").eq("id", performedBy).single();
  if (!actor) throw new Error("You are not authorized to change assignments.");

  return {
    branchId: member.branch_id,
    previousAssignmentId: member.assigned_trainer_id ?? null,
  };
}

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
  return await ensureAssignableProfiles("trainer", branchId);
}

export async function getDieticianOptions(branchId?: string | null) {
  return await ensureAssignableProfiles("dietician", branchId);
}

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

export async function assignDietician(memberId: string, dieticianId: string | null, performedBy: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").update({ assigned_dietician_id: dieticianId }).eq("id", memberId).select("id, branch_id").single();
  if (error) throw new Error(error.message);
  await logActivity({ performedBy, branchId: data.branch_id, action: "dietician_assigned", entityType: "member", entityId: memberId, description: "Dietician assignment updated", metadata: { dietician_id: dieticianId } });
}
