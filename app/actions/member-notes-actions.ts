"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string };
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

async function findAccessibleMember(memberId: string) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!profile.tenant_id) return { profile, error: "Your account is not linked to an organization." };
  const supabase = await createClient();
  const { data: member, error } = await supabase
    .from("members")
    .select("id, tenant_id, branch_id")
    .eq("id", memberId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();
  if (error || !member) return { profile, error: "Member not found in your organization." };
  if (profile.role?.slug === "reception" && member.branch_id !== profile.branch_id) return { profile, error: "Reception staff can only manage members in their assigned branch." };
  return { profile, member, supabase };
}

function revalidateMember(memberId: string) {
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath(`/reception/members/${memberId}`);
}

export async function addMemberNoteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const memberId = String(formData.get("member_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!memberId) return { error: "Member ID is missing." };
  if (!body || body.length > 4000) return { error: "Enter a note between 1 and 4,000 characters." };
  const access = await findAccessibleMember(memberId);
  if (access.error || !access.member || !access.supabase) return { error: access.error };
  const { error } = await access.supabase.from("member_notes").insert({
    tenant_id: access.member.tenant_id,
    branch_id: access.member.branch_id,
    member_id: access.member.id,
    body,
    created_by: access.profile.id,
  });
  if (error) return { error: error.message };
  revalidateMember(memberId);
  return { success: "Staff note added." };
}

export async function uploadMemberDocumentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const memberId = String(formData.get("member_id") ?? "");
  const file = formData.get("document");
  if (!memberId) return { error: "Member ID is missing." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a document to upload." };
  if (file.size > 10 * 1024 * 1024) return { error: "File must be 10 MB or smaller." };
  if (!allowedTypes.has(file.type)) return { error: "Only PDF, JPG, PNG, and WebP files are allowed." };
  const access = await findAccessibleMember(memberId);
  if (access.error || !access.member || !access.supabase) return { error: access.error };

  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${access.member.tenant_id}/${access.member.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await access.supabase.storage.from("member-documents").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { error: documentError } = await access.supabase.from("member_documents").insert({
    tenant_id: access.member.tenant_id,
    branch_id: access.member.branch_id,
    member_id: access.member.id,
    file_name: file.name.slice(0, 255),
    storage_path: storagePath,
    content_type: file.type,
    file_size_bytes: file.size,
    uploaded_by: access.profile.id,
  });
  if (documentError) {
    await access.supabase.storage.from("member-documents").remove([storagePath]);
    return { error: documentError.message };
  }
  revalidateMember(memberId);
  return { success: "Document uploaded." };
}