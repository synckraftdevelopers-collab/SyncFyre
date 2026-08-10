/**
 * Queries owned by the reception portal.
 *
 * Keep the branch predicate in the query even when RLS is enabled. This
 * prevents reception URLs from being used to enumerate another branch.
 */
import { createClient } from "@/lib/supabase/server";
import type { FullMember } from "@/services/member-extended.service";

export async function getReceptionMemberById(
  memberId: string,
  branchId: string | null | undefined,
): Promise<FullMember | null> {
  if (!branchId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (error) return null;
  return data as FullMember | null;
}
