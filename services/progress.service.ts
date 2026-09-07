import { createClient } from "@/lib/supabase/server";
import type { PaginatedResult } from "@/types";

export type ProgressMeasurement = {
  id: string;
  member_id: string;
  branch_id: string;
  measured_at: string;
  weight_kg: number | null;
  bmi: number | null;
  body_fat_percent: number | null;
  muscle_mass_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  legs_cm: number | null;
  notes: string | null;
  created_at: string;
};

export async function listProgressMeasurements(params: {
  branchId?: string | null;
  memberId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedResult<ProgressMeasurement>> {
  const { branchId, memberId, dateFrom, dateTo, page = 1, pageSize = 20 } = params;
  const supabase = await createClient();
  const from = (page - 1) * pageSize;

  let query = supabase.from("progress").select("*", { count: "exact" });
  if (branchId) query = query.eq("branch_id", branchId);
  if (memberId) query = query.eq("member_id", memberId);
  if (dateFrom) query = query.gte("measured_at", dateFrom);
  if (dateTo) query = query.lte("measured_at", dateTo);

  const { data, count, error } = await query
    .order("measured_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    data: (data ?? []) as ProgressMeasurement[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function listMemberProgress(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress")
    .select("*")
    .eq("member_id", memberId)
    .order("measured_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProgressMeasurement[];
}

export async function getProgressMeasurementById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("progress").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ProgressMeasurement | null;
}
