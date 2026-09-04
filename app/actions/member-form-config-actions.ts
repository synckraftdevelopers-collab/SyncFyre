"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { memberFormConfigurationSchema } from "@/lib/members/member-form-config";
import { resetMemberFormConfiguration, saveMemberFormConfiguration } from "@/services/member-form-config.service";

export type MemberFormConfigActionState = { error?: string; success?: string };

export async function saveMemberFormConfigurationAction(
  _: MemberFormConfigActionState,
  formData: FormData,
): Promise<MemberFormConfigActionState> {
  try {
    const profile = await requireUser(["owner", "admin"]);
    if (!profile.tenant_id) return { error: "Your account is not linked to a gym." };
    const payload = JSON.parse(String(formData.get("config") ?? "[]")) as unknown;
    const parsed = memberFormConfigurationSchema.safeParse(payload);
    if (!parsed.success) return { error: "The submitted member form configuration is invalid." };
    await saveMemberFormConfiguration(profile.tenant_id, profile.id, parsed.data);
    revalidatePath("/admin/settings/member-form");
    revalidatePath("/admin/members/new");
    revalidatePath("/admin/members");
    revalidatePath("/admin/members/[id]");
    revalidatePath("/reception/members/new");
    revalidatePath("/reception/members");
    revalidatePath("/reception/members/[id]");
    return { success: "Member form settings saved successfully." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save member form settings." };
  }
}

export async function resetMemberFormConfigurationAction(
  _: MemberFormConfigActionState,
  _formData: FormData,
): Promise<MemberFormConfigActionState> {
  try {
    const profile = await requireUser(["owner", "admin"]);
    if (!profile.tenant_id) return { error: "Your account is not linked to a gym." };
    await resetMemberFormConfiguration(profile.tenant_id);
    revalidatePath("/admin/settings/member-form");
    revalidatePath("/admin/members/new");
    revalidatePath("/admin/members");
    revalidatePath("/admin/members/[id]");
    revalidatePath("/reception/members/new");
    revalidatePath("/reception/members");
    revalidatePath("/reception/members/[id]");
    return { success: "Member form settings reset to the default configuration." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to reset member form settings." };
  }
}
