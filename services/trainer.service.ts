import { createClient } from "@/lib/supabase/server";

export type TrainerDirectoryRow = {
  id: string;
  user_id: string;
  staff_id: string | null;
  branch_id: string;
  status: string;
  users: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
  staff: { employee_code: string | null; designation: string | null } | null;
  branches: { name: string | null } | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listTrainers(branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("trainers")
    .select("id,user_id,staff_id,branch_id,status,users(full_name,email,avatar_url),staff(employee_code,designation),branches(name)")
    .order("created_at", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const raw = row as any;
    return {
      ...raw,
      users: firstRelation(raw.users),
      staff: firstRelation(raw.staff),
      branches: firstRelation(raw.branches),
    };
  }) as TrainerDirectoryRow[];
}

export async function getTrainerById(id: string, branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("trainers")
    .select("id,user_id,staff_id,branch_id,status,users(full_name,email,avatar_url),staff(employee_code,designation),branches(name)")
    .eq("id", id);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const raw = data as any;
  return {
    ...raw,
    users: firstRelation(raw.users),
    staff: firstRelation(raw.staff),
    branches: firstRelation(raw.branches),
  } as TrainerDirectoryRow;
}
