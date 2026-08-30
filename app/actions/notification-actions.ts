"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(id: string) {
  await requireUser(["super_admin", "owner", "admin", "manager", "reception", "trainer", "dietician", "diet-planner", "diet_planner", "member"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_notification_read", { p_notification_id: id });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Notification was not found or you do not have access to it.");
  revalidatePath("/admin/notifications");
  revalidatePath("/reception/notifications");
  revalidatePath("/trainer/notifications");
  revalidatePath("/member/notifications");
}

export async function updateOwnProfileAction(formData: FormData) {
  const profile = await requireUser(["super_admin", "owner", "admin", "manager", "reception", "trainer", "dietician", "diet-planner", "diet_planner", "member"]);
  const supabase = await createClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (fullName.length < 2) throw new Error("Name must be at least 2 characters.");
  const { error } = await supabase.from("users").update({ full_name: fullName, phone: phone || null }).eq("id", profile.id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/reception/settings");
  revalidatePath("/trainer/settings");
  revalidatePath("/member/profile");
}
