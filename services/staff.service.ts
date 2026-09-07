import { createClient } from "@/lib/supabase/server";

export type StaffDirectoryRow = {
  id: string;
  employee_code: string;
  designation: string | null;
  joining_date: string | null;
  salary: number | null;
  status: string;
  source_user_id: string | null;
  branch_name: string | null;
  users: { full_name: string | null; email: string | null; avatar_url: string | null; roles?: { name: string | null; slug: string | null } | null } | null;
  branches: { name: string | null } | null;
};

export async function listStaff(branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("staff")
    .select("*, users(id, full_name, email, avatar_url, branch_id, status, roles(name, slug)), branches(name)")
    .eq("status", "active")
    .order("employee_code");

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as StaffDirectoryRow[];
}

export async function getStaffById(id: string, branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("staff")
    .select("*, users(id, full_name, email, avatar_url, branch_id, status, roles(name, slug)), branches(name)")
    .eq("id", id);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as StaffDirectoryRow | null;
}

