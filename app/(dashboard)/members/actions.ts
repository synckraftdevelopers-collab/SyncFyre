"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { memberSchema } from "@/lib/validations/member";
import { createMember } from "@/services/member.service";

export type MemberFormState = { error?: string; fields?: Record<string, string[]> };
export async function createMemberAction(_: MemberFormState, formData: FormData): Promise<MemberFormState> {
  await requireUser(["admin", "manager", "reception"]);
  const raw = Object.fromEntries(formData);
  const parsed = memberSchema.safeParse({ ...raw, height_cm: raw.height_cm || null, weight_kg: raw.weight_kg || null, date_of_birth: raw.date_of_birth || null, email: raw.email || null, assigned_trainer_id: raw.assigned_trainer_id || null });
  if (!parsed.success) return { error: "Review the highlighted information.", fields: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try { await createMember(parsed.data); }
  catch (error) { return { error: error instanceof Error ? error.message : "Unable to create member." }; }
  revalidatePath("/members"); redirect("/members");
}
