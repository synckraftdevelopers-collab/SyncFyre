"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const allowedStatuses = new Set(["pending", "approved", "completed", "cancelled"]);

export async function updateAppointmentStatusAction(id: string, status: string) {
  await requireUser(["admin", "manager", "reception"]);
  if (!allowedStatuses.has(status)) throw new Error("Invalid appointment status");

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/appointments");
  revalidatePath("/reception/appointments");
  revalidatePath("/trainer/appointments");
}
