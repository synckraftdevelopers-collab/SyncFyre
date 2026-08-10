"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function setStaffStatusAction(staffId: string, status: "active" | "inactive") {
  await requireUser(["admin"]);
  const supabase = await createClient();

  const { data: staff, error: staffLookupError } = await supabase
    .from("staff")
    .select("id, user_id")
    .eq("id", staffId)
    .maybeSingle();
  if (staffLookupError || !staff) throw new Error(staffLookupError?.message ?? "Staff member not found.");

  const { error: staffError } = await supabase.from("staff").update({ status }).eq("id", staffId);
  if (staffError) throw new Error(staffError.message);

  if (staff.user_id) {
    const { error: userError } = await supabase.from("users").update({ status }).eq("id", staff.user_id);
    if (userError) throw new Error(userError.message);
  }

  revalidatePath("/admin/staff");
}