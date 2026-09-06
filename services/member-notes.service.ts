import { createClient } from "@/lib/supabase/server";

export type MemberNoteRecord = { id: string; body: string; created_at: string; author_name: string | null };
export type MemberDocumentRecord = { id: string; file_name: string; content_type: string; file_size_bytes: number; created_at: string; download_url: string | null };

export async function getMemberNotes(memberId: string): Promise<MemberNoteRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_notes")
    .select("id, body, created_at, author:users!member_notes_created_by_fkey(full_name)")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((note: any) => ({
    id: note.id,
    body: note.body,
    created_at: note.created_at,
    author_name: note.author?.full_name ?? null,
  }));
}

export async function getMemberDocuments(memberId: string): Promise<MemberDocumentRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_documents")
    .select("id, file_name, storage_path, content_type, file_size_bytes, created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return Promise.all((data ?? []).map(async (document) => {
    const { data: signed } = await supabase.storage.from("member-documents").createSignedUrl(document.storage_path, 60 * 15);
    return { ...document, download_url: signed?.signedUrl ?? null };
  }));
}