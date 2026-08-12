"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(id: string) {
  const profile = await requireUser(["admin", "manager", "reception", "trainer", "dietician"]);
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).or(`user_id.eq.${profile.id},branch_id.eq.${profile.branch_id ?? ""}`);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/notifications"); revalidatePath("/trainer/notifications");
}

export async function updateTrainerProfileAction(formData: FormData) {
  const profile = await requireUser(["trainer", "dietician"]);
  const supabase = await createClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (fullName.length < 2) throw new Error("Name must be at least 2 characters.");
  const { error } = await supabase.from("users").update({ full_name: fullName, phone: phone || null }).eq("id", profile.id);
  if (error) throw new Error(error.message);
  revalidatePath("/trainer/settings");
}
