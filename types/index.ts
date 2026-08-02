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
