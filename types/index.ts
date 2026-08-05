export type UserRole = "admin" | "manager" | "reception" | "trainer" | "dietician" | "member";
export type RecordStatus = "active" | "inactive";
export type SubscriptionStatus = "pending" | "active" | "expired" | "cancelled" | "paused";
export type AppointmentStatus = "pending" | "approved" | "completed" | "cancelled";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: { name: string; slug: UserRole } | null;
  branch_id: string | null;
}

export interface Member {
  id: string;
  member_code: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  phone: string;
  email: string | null;
  profile_photo_url: string | null;
  fitness_goal: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  status: RecordStatus;
  branch_id: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardMetrics {
  totalMembers: number;
  todayAttendance: number;
  activeMembers: number;
  inactiveMembers: number;
  expiringMemberships: number;
  revenue: number;
  pendingPayments: number;
  appointments: number;
  trainers: number;
  machines: number;
}

// ─── Report view row types ────────────────────────────────────────────────────

export interface MemberRegisterRow {
  member_id: string;
  member_code: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  age: number | null;
  phone: string;
  email: string | null;
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: string | null;
  medical_conditions: string | null;
  member_status: RecordStatus;
  branch_id: string;
  branch_name: string;
  branch_city: string | null;
  trainer_id: string | null;
  assigned_trainer: string | null;
  plan_id: string | null;
  current_plan: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  subscription_status: SubscriptionStatus | null;
  days_remaining: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  profile_photo_url: string | null;
  joined_date: string;
  created_at: string;
}

export interface AttendanceReportRow {
  attendance_id: string;
  attendance_date: string;
  member_id: string;
  member_code: string;
  full_name: string;
  phone: string;
  member_status: RecordStatus;
  branch_id: string;
  branch_name: string;
  entry_time_ist: string | null;
  exit_time_ist: string | null;
  duration_minutes: number | null;
  duration_label: string;
  source: string;
  device_id: string;
  created_at: string;
}

export interface PaymentReportRow {
  payment_id: string;
  payment_date: string;
  paid_at_ist: string | null;
  branch_id: string;
  branch_name: string;
  member_id: string;
  member_code: string;
  full_name: string;
  phone: string;
  invoice_id: string | null;
  invoice_number: string | null;
  subscription_id: string | null;
  plan_name: string | null;
  amount: number;
  refund_amount: number;
  net_amount: number;
  payment_method: "cash" | "upi" | "card" | "online";
  payment_status: "pending" | "completed" | "failed" | "refunded" | "partially_refunded";
  transaction_reference: string | null;
  collected_by: string | null;
  receipt_url: string | null;
  refund_reason: string | null;
  created_at: string;
}

export interface MembershipReportRow {
  subscription_id: string;
  branch_id: string;
  branch_name: string;
  member_id: string;
  member_code: string;
  full_name: string;
  phone: string;
  plan_id: string;
  plan_name: string;
  duration_months: number;
  plan_base_price: number;
  gst_percent: number;
  start_date: string;
  end_date: string;
  total_days: number;
  days_left: number;
  subscription_status: SubscriptionStatus;
  auto_renew: boolean;
  billed_price: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  times_renewed: number;
  created_by: string | null;
  created_date: string;
  created_at: string;
}

export interface TrainerReportRow {
  trainer_id: string;
  branch_id: string;
  branch_name: string;
  trainer_name: string;
  email: string | null;
  phone: string | null;
  staff_id: string | null;
  employee_code: string | null;
  designation: string | null;
  joining_date: string | null;
  experience_years: number;
  specializations: string[];
  certifications: string[];
  bio: string | null;
  trainer_status: RecordStatus;
  active_assigned_members: number;
  total_members_assigned: number;
  active_workouts: number;
  upcoming_appointments: number;
}

export interface SubscriptionReportRow {
  plan_id: string;
  branch_id: string;
  branch_name: string;
  plan_name: string;
  duration_months: number;
  plan_price: number;
  gst_percent: number;
  plan_status: RecordStatus;
  total_subscriptions: number;
  active_count: number;
  expired_count: number;
  cancelled_count: number;
  paused_count: number;
  pending_count: number;
  auto_renew_count: number;
  total_billed: number;
  total_discounts: number;
  total_gst: number;
  total_collected: number;
}

export interface RevenueReportRow {
  payment_id: string;
  branch_id: string;
  branch_name: string;
  paid_at: string;
  revenue_month: string;
  revenue_month_label: string;
  revenue_year: number;
  revenue_month_num: number;
  payment_method: "cash" | "upi" | "card" | "online";
  plan_name: string;
  amount: number;
  refund_amount: number;
  net_amount: number;
  invoice_gst: number | null;
  payment_status: string;
  created_at: string;
}

export interface PendingPaymentRow {
  record_type: "invoice" | "payment";
  record_id: string;
  reference: string;
  member_id: string;
  member_code: string;
  full_name: string;
  phone: string;
  branch_id: string;
  branch_name: string;
  plan_name: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  record_status: string;
  due_date: string | null;
  days_overdue: number | null;
  record_date: string;
  payment_method: string | null;
  transaction_reference: string | null;
  created_at: string;
}

export interface MonthlyJoiningRow {
  member_id: string;
  member_code: string;
  full_name: string;
  gender: string | null;
  phone: string;
  email: string | null;
  branch_id: string;
  branch_name: string;
  join_date: string;
  join_month: string;
  join_month_label: string;
  join_year: number;
  join_month_num: number;
  current_status: RecordStatus;
  first_plan: string | null;
  first_plan_id: string | null;
  plan_start: string | null;
  plan_end: string | null;
  plan_amount: number | null;
  plan_status: SubscriptionStatus | null;
  first_payment_amount: number | null;
  first_payment_method: string | null;
  first_payment_date: string | null;
  created_at: string;
}

// Aggregated monthly joining summary (computed client-side)
export interface MonthlyJoiningSummary {
  join_month: string;
  join_month_label: string;
  branch_name: string;
  new_members: number;
  still_active: number;
  now_inactive: number;
  male_count: number;
  female_count: number;
  other_count: number;
}

// Aggregated revenue summary (computed client-side)
export interface MonthlyRevenueSummary {
  revenue_month: string;
  revenue_month_label: string;
  branch_name: string;
  transaction_count: number;
  gross_amount: number;
  total_refunds: number;
  net_revenue: number;
}

export interface ReportParams {
  branchId?: string | null;
  page?: number;
  pageSize?: number;
}

export interface AttendanceReportParams extends ReportParams {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  memberId?: string;
}

export interface PaymentReportParams extends ReportParams {
  status?: "pending" | "completed" | "failed" | "refunded" | "partially_refunded" | "all";
  method?: "cash" | "upi" | "card" | "online" | "all";
  dateFrom?: string;
  dateTo?: string;
}

export interface RevenueReportParams extends ReportParams {
  monthFrom?: string; // YYYY-MM
  monthTo?: string;   // YYYY-MM
}

export interface MembershipReportParams extends ReportParams {
  status?: SubscriptionStatus | "all";
}

export interface PendingPaymentParams extends ReportParams {
  recordType?: "invoice" | "payment" | "all";
}

export interface MonthlyJoiningParams extends ReportParams {
  monthFrom?: string; // YYYY-MM
  monthTo?: string;   // YYYY-MM
}
