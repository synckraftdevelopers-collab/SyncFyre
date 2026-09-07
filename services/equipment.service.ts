import { createClient } from "@/lib/supabase/server";
import type { PaginatedResult } from "@/types";

export type EquipmentStatus =
  | "operational"
  | "maintenance_due"
  | "under_maintenance"
  | "out_of_service"
  | "retired";

export type Equipment = {
  id: string;
  branch_id: string;
  machine_name: string;
  category: string;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_until: string | null;
  next_maintenance_date: string | null;
  status: EquipmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listEquipment(params: {
  branchId?: string | null;
  search?: string;
  status?: EquipmentStatus | "all";
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedResult<Equipment>> {
  const { branchId, search, status, page = 1, pageSize = 20 } = params;
  const supabase = await createClient();
  const from = (page - 1) * pageSize;

  let query = supabase.from("equipment").select("*", { count: "exact" });
  if (branchId) query = query.eq("branch_id", branchId);
  if (search) query = query.ilike("machine_name", "%" + search.replace(/[%_]/g, "") + "%");
  if (status && status !== "all") query = query.eq("status", status);

  const { data, count, error } = await query
    .order("machine_name", { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    data: (data ?? []) as Equipment[],
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getEquipmentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Equipment | null;
}

export async function listMaintenanceDueEquipment(
  branchId?: string | null,
  before = new Date().toISOString().slice(0, 10),
) {
  const supabase = await createClient();
  let query = supabase
    .from("equipment")
    .select("*")
    .not("next_maintenance_date", "is", null)
    .lte("next_maintenance_date", before)
    .neq("status", "retired")
    .order("next_maintenance_date", { ascending: true });
  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Equipment[];
}
