"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SystemPhaseKey } from "@/lib/phases/registry";

export type PhaseActionState = { error?: string; success?: string };

export async function activateSystemPhaseAction(_: PhaseActionState, formData: FormData): Promise<PhaseActionState> {
  try {
    const profile = await requireUser(["super_admin"]);
    const phaseKey = String(formData.get("phase_key") ?? "") as SystemPhaseKey;
    if (!phaseKey) return { error: "Phase key is required." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("activate_system_phase", {
      p_phase_key: phaseKey,
      p_performed_by: profile.id,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/superadmin/settings");
    revalidatePath("/admin", "layout");
    revalidatePath("/reception", "layout");
    revalidatePath("/trainer", "layout");
    revalidatePath("/member", "layout");
    return { success: `${phaseKey} activated.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to activate the selected phase." };
  }
}

export async function activateSystemPhaseFormAction(formData: FormData): Promise<void> {
  await activateSystemPhaseAction({}, formData);
}
