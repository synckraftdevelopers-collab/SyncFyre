import { createClient } from "@/lib/supabase/server";
import type { Member, PaginatedResult } from "@/types";
import type { MemberInput } from "@/lib/validations/member";
import { logActivity } from "@/services/workflow.service";

export async function listMembers(params: { page?: number; pageSize?: number; search?: string; status?: string; branchId?: string | null } = {}): Promise<PaginatedResult<Member>> {
  const { page = 1, pageSize = 10, search, status = "active", branchId } = params;
  const supabase = await createClient();
  let query = supabase.from("members").select("id, member_code, full_name, gender, date_of_birth, phone, email, profile_photo_url, fitness_goal, height_cm, weight_kg, status, branch_id, created_at", { count: "exact" });
  if (search) query = query.or(`full_name.ilike.%${search.replace(/[%_,]/g, "")}%,member_code.ilike.%${search.replace(/[%_,]/g, "")}%,phone.ilike.%${search.replace(/[%_,]/g, "")}%`);
  if (status && status !== "all") query = query.eq("status", status);
  if (branchId) query = query.eq("branch_id", branchId);
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return { data: (data ?? []) as Member[], page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function createMember(input: MemberInput, performedBy?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").insert(input).select().single();
  if (error) throw new Error(error.message);
  await logActivity({
    performedBy: performedBy ?? null,
    branchId: data.branch_id,
    action: "member_created",
    entityType: "member",
    entityId: data.id,
    description: "Member created",
    metadata: { member_code: data.member_code, status: data.status },
  });
  return data;
}

export async function updateMember(id: string, input: Partial<MemberInput>, performedBy?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").update(input).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  await logActivity({
    performedBy: performedBy ?? null,
    branchId: data.branch_id,
    action: "member_updated",
    entityType: "member",
    entityId: data.id,
    description: "Member updated",
    metadata: input as Record<string, string | number | boolean | null>,
  });
  return data;
}
