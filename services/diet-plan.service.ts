import { createClient } from "@/lib/supabase/server";

export type DietPlanRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  snacks: string | null;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  water_liters: number | null;
  notes: string | null;
  status: string;
  member_id: string;
  branch_id: string;
  members: { full_name: string | null; member_code: string | null } | null;
  staff: { users: { full_name: string | null } | null } | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listDietPlans(branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("diet_plans")
    .select("id,name,start_date,end_date,breakfast,lunch,dinner,snacks,calories,protein_g,fat_g,carbs_g,water_liters,notes,status,member_id,branch_id,members(full_name,member_code),staff!diet_plans_staff_id_fkey(users!staff_user_id_fkey(full_name))")
    .order("created_at", { ascending: false })
    .limit(100);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const raw = row as any;
    return {
      ...raw,
      members: firstRelation(raw.members),
      staff: firstRelation(raw.staff),
    };
  }) as DietPlanRow[];
}

export async function getDietPlanById(id: string, branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("diet_plans")
    .select("id,name,start_date,end_date,breakfast,lunch,dinner,snacks,calories,protein_g,fat_g,carbs_g,water_liters,notes,status,member_id,branch_id,members(full_name,member_code),staff!diet_plans_staff_id_fkey(users!staff_user_id_fkey(full_name))")
    .eq("id", id);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const raw = data as any;
  return {
    ...raw,
    members: firstRelation(raw.members),
    staff: firstRelation(raw.staff),
  } as DietPlanRow;
}
