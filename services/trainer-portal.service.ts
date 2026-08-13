import type { UserProfile } from "@/types";
import { createClient } from "@/lib/supabase/server";

export type TrainerPortalContext = {
  trainerId: string;
  staffId: string | null;
  branchId: string;
};

export type AssignedMember = {
  id: string;
  member_code: string;
  full_name: string;
  phone: string;
  email: string | null;
  status: string;
  fitness_goal: string | null;
  profile_photo_url: string | null;
};

type ServiceResult<T> = { data: T; error: null } | { data: T; error: string };

function messageFor(error: { message: string } | null, fallback: string) {
  return error ? `${fallback}: ${error.message}` : fallback;
}

/** Resolves the active trainer record without trusting browser-supplied IDs. */
export async function getTrainerPortalContext(profile: UserProfile): Promise<ServiceResult<TrainerPortalContext | null>> {
  if (!profile.branch_id) return { data: null, error: "Your account is not assigned to a branch." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("trainers").select("id,staff_id,branch_id").eq("user_id", profile.id).eq("branch_id", profile.branch_id).eq("status", "active").maybeSingle();
  if (error) return { data: null, error: messageFor(error, "Unable to load your trainer profile") };
  if (!data) return { data: null, error: "No active trainer profile is assigned to this account." };
  return { data: { trainerId: data.id, staffId: data.staff_id, branchId: data.branch_id }, error: null };
}

export async function getAssignedMembers(context: TrainerPortalContext): Promise<ServiceResult<AssignedMember[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").select("id,member_code,full_name,phone,email,status,fitness_goal,profile_photo_url").eq("assigned_trainer_id", context.trainerId).eq("branch_id", context.branchId).order("full_name");
  return { data: data ?? [], error: error ? messageFor(error, "Unable to load assigned members") : null };
}

export type TrainerDashboardData = {
  assignedMembers: number;
  todayAppointments: number;
  activeWorkouts: number;
  activeDietPlans: number;
  progressRecords: number;
  upcomingAppointments: { id: string; appointment_date: string; start_time: string; status: string; members: { full_name: string } | null }[];
};

export async function getTrainerDashboard(profile: UserProfile): Promise<ServiceResult<TrainerDashboardData>> {
  const empty: TrainerDashboardData = { assignedMembers: 0, todayAppointments: 0, activeWorkouts: 0, activeDietPlans: 0, progressRecords: 0, upcomingAppointments: [] };
  const contextResult = await getTrainerPortalContext(profile);
  if (!contextResult.data) return { data: empty, error: contextResult.error };
  const membersResult = await getAssignedMembers(contextResult.data);
  if (membersResult.error) return { data: empty, error: membersResult.error };

  const context = contextResult.data;
  const memberIds = membersResult.data.map((member) => member.id);
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const noRecords = Promise.resolve({ count: 0, data: [], error: null });
  const [appointments, workouts, dietPlans, progress, upcoming] = await Promise.all([
    context.staffId && memberIds.length ? supabase.from("appointments").select("id", { count: "exact", head: true }).eq("provider_staff_id", context.staffId).eq("branch_id", context.branchId).in("member_id", memberIds).eq("appointment_date", today) : noRecords,
    memberIds.length ? supabase.from("workouts").select("id", { count: "exact", head: true }).eq("trainer_id", context.trainerId).eq("branch_id", context.branchId).in("member_id", memberIds).eq("status", "active") : noRecords,
    memberIds.length ? supabase.from("diet_plans").select("id", { count: "exact", head: true }).eq("staff_id", context.staffId ?? "").eq("branch_id", context.branchId).in("member_id", memberIds).eq("status", "active") : noRecords,
    memberIds.length ? supabase.from("progress").select("id", { count: "exact", head: true }).eq("branch_id", context.branchId).in("member_id", memberIds) : noRecords,
    context.staffId && memberIds.length ? supabase.from("appointments").select("id,appointment_date,start_time,status,members(full_name)").eq("provider_staff_id", context.staffId).eq("branch_id", context.branchId).in("member_id", memberIds).gte("appointment_date", today).order("appointment_date").limit(5) : noRecords,
  ]);
  const failed = [appointments, workouts, dietPlans, progress, upcoming].find((result) => result.error);
  if (failed?.error) return { data: empty, error: messageFor(failed.error, "Unable to load dashboard data") };
  return { data: { assignedMembers: membersResult.data.filter((member) => member.status === "active").length, todayAppointments: appointments.count ?? 0, activeWorkouts: workouts.count ?? 0, activeDietPlans: dietPlans.count ?? 0, progressRecords: progress.count ?? 0, upcomingAppointments: (upcoming.data ?? []) as unknown as TrainerDashboardData["upcomingAppointments"] }, error: null };
}
