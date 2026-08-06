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
  balance_amount?: number;
  is_pt?: boolean;
  pt_details?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface PersonalTraining {
  id: string;
  member_id: string;
  branch_id: string;
  subscription_id?: string | null;
  package: string;
  trainer_name?: string | null;
  start_date: string;
  end_date?: string | null;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
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
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  payment_status?: string | null;
  package_code?: string | null;
  is_pt?: boolean | null;
  pt_details?: string | null;
  notes?: string | null;
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


// ─── Finance Module Types ─────────────────────────────────────────────────────

export type FinEntryType = "debit" | "credit";
export type FinTxnStatus = "draft" | "pending" | "posted" | "voided" | "reversed";
export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export type ExpenseApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
export type BankTxnType = "deposit" | "withdrawal" | "transfer" | "adjustment";
export type ReceivableStatus = "pending" | "partial" | "paid" | "overdue" | "written_off";
export type ReceivableType = "membership" | "pt" | "merchandise" | "other";

export interface IncomeCategory {
  id: string;
  branch_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  is_system: boolean;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  branch_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  is_system: boolean;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  branch_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccount {
  id: string;
  branch_id: string | null;
  parent_id: string | null;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  is_system: boolean;
  is_leaf: boolean;
  opening_balance: number;
  description: string | null;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: string;
  income_number: string;
  branch_id: string;
  category_id: string | null;
  payment_id: string | null;
  invoice_id: string | null;
  member_id: string | null;
  amount: number;
  gst_amount: number;
  total_amount: number;
  payment_method: "cash" | "upi" | "card" | "online";
  transaction_ref: string | null;
  income_date: string;
  description: string | null;
  notes: string | null;
  status: FinTxnStatus;
  is_membership_income: boolean;
  hsn_sac: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  income_categories?: Pick<IncomeCategory, "id" | "name" | "code"> | null;
  members?: { full_name: string; member_code: string } | null;
}

export interface Expense {
  id: string;
  expense_number: string;
  branch_id: string;
  category_id: string | null;
  vendor_id: string | null;
  amount: number;
  gst_amount: number;
  total_amount: number;
  payment_method: "cash" | "upi" | "card" | "online";
  bill_number: string | null;
  expense_date: string;
  description: string;
  notes: string | null;
  approval_status: ExpenseApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  is_recurring: boolean;
  recurring_interval: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | null;
  next_due_date: string | null;
  status: FinTxnStatus;
  hsn_sac: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  expense_categories?: Pick<ExpenseCategory, "id" | "name" | "code"> | null;
  vendors?: Pick<Vendor, "id" | "name"> | null;
}

export interface BankAccount {
  id: string;
  branch_id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string | null;
  account_type: "savings" | "current" | "overdraft" | "cash";
  opening_balance: number;
  current_balance: number;
  is_default: boolean;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  branch_id: string;
  bank_account_id: string;
  txn_type: BankTxnType;
  amount: number;
  balance_after: number;
  reference_no: string | null;
  txn_date: string;
  description: string;
  linked_expense_id: string | null;
  linked_income_id: string | null;
  linked_payment_id: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  status: FinTxnStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  bank_accounts?: Pick<BankAccount, "id" | "account_name" | "bank_name"> | null;
}

export interface CashBookEntry {
  id: string;
  branch_id: string;
  entry_date: string;
  entry_type: FinEntryType;
  amount: number;
  balance_after: number;
  description: string;
  linked_expense_id: string | null;
  linked_income_id: string | null;
  linked_payment_id: string | null;
  status: FinTxnStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  journal_number: string;
  branch_id: string;
  entry_date: string;
  narration: string;
  reference_type: string | null;
  reference_id: string | null;
  is_reversal: boolean;
  reversed_entry_id: string | null;
  status: FinTxnStatus;
  total_debit: number;
  total_credit: number;
  created_by: string | null;
  updated_by: string | null;
  posted_by: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  journal_lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  entry_type: FinEntryType;
  amount: number;
  narration: string | null;
  created_at: string;
  // joined
  chart_of_accounts?: Pick<ChartOfAccount, "id" | "account_code" | "account_name" | "account_type"> | null;
}

export interface LedgerEntry {
  id: string;
  branch_id: string;
  account_id: string;
  journal_entry_id: string | null;
  journal_line_id: string | null;
  entry_date: string;
  entry_type: FinEntryType;
  amount: number;
  balance: number;
  narration: string | null;
  created_at: string;
}

export interface GstTransaction {
  id: string;
  branch_id: string;
  txn_type: "sales" | "purchase";
  reference_type: "income" | "expense" | "payment";
  reference_id: string;
  invoice_number: string | null;
  party_name: string | null;
  party_gstin: string | null;
  taxable_amount: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  hsn_sac: string | null;
  txn_date: string;
  status: FinTxnStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receivable {
  id: string;
  branch_id: string;
  member_id: string | null;
  invoice_id: string | null;
  subscription_id: string | null;
  receivable_type: ReceivableType;
  original_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string | null;
  status: ReceivableStatus;
  reminder_count: number;
  last_reminder_at: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  members?: { full_name: string; member_code: string; phone: string } | null;
}

export interface FinAttachment {
  id: string;
  branch_id: string;
  entity_type: "expense" | "income" | "journal_entry" | "bank_transaction";
  entity_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// ─── Finance Dashboard KPIs ───────────────────────────────────────────────────

export interface FinanceDashboardMetrics {
  todayCollection: number;
  monthlyCollection: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashInHand: number;
  bankBalance: number;
  outstandingReceivables: number;
  activeMembers: number;
  membershipsRenewingDue: number;
  collectionEfficiency: number;
  avgRevenuePerMember: number;
}

export interface FinanceRevenuePoint { date: string; income: number; expense: number; profit: number; }
export interface FinancePaymentModePoint { mode: string; amount: number; count: number; }
export interface FinanceReceivableAgingPoint { bucket: string; amount: number; count: number; }

// ─── Finance Query Params ────────────────────────────────────────────────────

export interface FinanceParams extends ReportParams {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export interface ExpenseParams extends FinanceParams {
  categoryId?: string;
  vendorId?: string;
  approvalStatus?: ExpenseApprovalStatus | "all";
}

export interface IncomeParams extends FinanceParams {
  categoryId?: string;
  memberId?: string;
  isMembershipIncome?: boolean;
}

export interface ReceivableParams extends FinanceParams {
  receivableType?: ReceivableType | "all";
  memberId?: string;
}

export interface LedgerParams extends FinanceParams {
  accountId?: string;
}

export interface GstParams extends FinanceParams {
  txnType?: "sales" | "purchase" | "all";
}
