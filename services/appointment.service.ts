import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus, PaginatedResult } from "@/types";

export type Appointment = {
  id: string;
  member_id: string;
  branch_id: string;
  provider_staff_id: string | null;
  provider_type: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
};

export async function listAppointments(params: {
  branchId?: string | null;
  memberId?: string;
  status?: AppointmentStatus | "all";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedResult<Appointment>> {
  const { branchId, memberId, status, dateFrom, dateTo, page = 1, pageSize = 20 } = params;
  const supabase = await createClient();
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("appointments")
    .select("*", { count: "exact" });

  if (branchId) query = query.eq("branch_id", branchId);
  if (memberId) query = query.eq("member_id", memberId);
  if (status && status !== "all") query = query.eq("status", status);
  if (dateFrom) query = query.gte("appointment_date", dateFrom);
  if (dateTo) query = query.lte("appointment_date", dateTo);

  const { data, count, error } = await query
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    data: (data ?? []) as Appointment[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAppointmentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, members(full_name, member_code), staff(users(full_name))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Appointment;
}
