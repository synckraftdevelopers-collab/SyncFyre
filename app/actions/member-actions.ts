"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { memberSchema } from "@/lib/validations/member";
import { createMember, updateMember } from "@/services/member.service";
import { deactivateMember } from "@/services/member-extended.service";

export type MemberFormState = { error?: string; fields?: Record<string, string[]> };

export async function createMemberAction(
  _: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const raw = Object.fromEntries(formData);
  const parsed = memberSchema.safeParse({
    ...raw,
    height_cm: raw.height_cm || null,
    weight_kg: raw.weight_kg || null,
    date_of_birth: raw.date_of_birth || null,
    email: raw.email || null,
    assigned_trainer_id: raw.assigned_trainer_id || null,
  });
  if (!parsed.success)
    return { error: "Review the highlighted information.", fields: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    await createMember(parsed.data, profile.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create member." };
  }
  const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
  revalidatePath(`${base}/members`);
  redirect(`${base}/members`);
}

export async function updateMemberAction(
  _: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const id = formData.get("id") as string;
  if (!id) return { error: "Member ID is missing." };
  const raw = Object.fromEntries(formData);
  const { id: _id, ...rest } = raw;
  void _id;
  const parsed = memberSchema.partial().safeParse({
    ...rest,
    height_cm: rest.height_cm || null,
    weight_kg: rest.weight_kg || null,
    date_of_birth: rest.date_of_birth || null,
    email: rest.email || null,
    assigned_trainer_id: rest.assigned_trainer_id || null,
  });
  if (!parsed.success)
    return { error: "Review the highlighted information.", fields: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    await updateMember(id, parsed.data, profile.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update member." };
  }
  const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
  revalidatePath(`${base}/members/${id}`);
  revalidatePath(`${base}/members`);
  redirect(`${base}/members/${id}`);
}

export async function deleteMemberAction(id: string): Promise<{ error?: string }> {
  const profile = await requireUser(["admin", "manager"]);
  try {
    await deactivateMember(id, profile.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to deactivate member." };
  }
  const base = profile.role?.slug === "reception" ? "/reception" : "/admin";
  revalidatePath(`${base}/members`);
  redirect(`${base}/members`);
}

export async function uploadMemberPhotoAction(
  _: { error?: string; url?: string },
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const id = formData.get("id") as string;
  const file = formData.get("photo") as File | null;
  if (!id) return { error: "Member ID is missing." };
  if (!file || file.size === 0) return { error: "No file selected." };
  if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5 MB." };
  if (!file.type.startsWith("image/")) return { error: "Only image files are accepted." };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${profile.branch_id ?? "global"}/${id}/profile.${ext}`;
  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from("member-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: publicData } = supabase.storage.from("member-photos").getPublicUrl(path);
  const url = publicData.publicUrl;

  try {
    await updateMember(id, { profile_photo_url: url } as Parameters<typeof updateMember>[1], profile.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Photo saved but profile not updated." };
  }

  revalidatePath(`/admin/members/${id}`);
  revalidatePath(`/reception/members/${id}`);
  return { url };
}
