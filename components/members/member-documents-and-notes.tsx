"use client";

import { useActionState, useEffect, useRef } from "react";
import { FileText, LoaderCircle, MessageSquarePlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { addMemberNoteAction, uploadMemberDocumentAction } from "@/app/actions/member-notes-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Note = { id: string; body: string; created_at: string; author_name: string | null };
type Document = { id: string; file_name: string; content_type: string; file_size_bytes: number; created_at: string; download_url: string | null };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MemberDocumentsAndNotes({ memberId, notes, documents, canManage }: { memberId: string; notes: Note[]; documents: Document[]; canManage: boolean }) {
  const [noteState, noteAction, notePending] = useActionState(addMemberNoteAction, {});
  const [documentState, documentAction, documentPending] = useActionState(uploadMemberDocumentAction, {});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (noteState.success) toast.success(noteState.success); }, [noteState.success]);
  useEffect(() => { if (documentState.success) { toast.success(documentState.success); if (fileRef.current) fileRef.current.value = ""; } }, [documentState.success]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">Staff Notes</h2><p className="text-sm text-muted-foreground">Internal notes visible only to your organization&apos;s staff.</p></div>
        {canManage ? <form action={noteAction} className="space-y-3 rounded-2xl border p-4"><input type="hidden" name="member_id" value={memberId} /><textarea name="body" maxLength={4000} required placeholder="Add a note about this member…" aria-label="New member note" className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" /><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Maximum 4,000 characters.</p><Button size="sm" disabled={notePending}>{notePending ? <LoaderCircle className="size-4 animate-spin" /> : <MessageSquarePlus className="size-4" />}Add Note</Button></div>{noteState.error ? <p role="alert" className="text-sm text-destructive">{noteState.error}</p> : null}</form> : null}
        <div className="space-y-3">{notes.length ? notes.map((note) => <article key={note.id} className="rounded-2xl border p-4"><p className="whitespace-pre-wrap text-sm">{note.body}</p><p className="mt-3 text-xs text-muted-foreground">{note.author_name ?? "Staff"} · {formatDate(note.created_at)}</p></article>) : <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No staff notes yet.</p>}</div>
      </section>
      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">Documents</h2><p className="text-sm text-muted-foreground">PDF, JPG, PNG, or WebP. Files stay private to your organization.</p></div>
        {canManage ? <form action={documentAction} className="space-y-3 rounded-2xl border p-4"><input type="hidden" name="member_id" value={memberId} /><Input ref={fileRef} type="file" name="document" required accept="application/pdf,image/jpeg,image/png,image/webp" /><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Maximum file size: 10 MB.</p><Button size="sm" disabled={documentPending}>{documentPending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}Upload</Button></div>{documentState.error ? <p role="alert" className="text-sm text-destructive">{documentState.error}</p> : null}</form> : null}
        <div className="space-y-3">{documents.length ? documents.map((document) => <div key={document.id} className="flex items-center gap-3 rounded-2xl border p-4"><FileText className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{document.file_name}</p><p className="text-xs text-muted-foreground">{formatSize(document.file_size_bytes)} · {formatDate(document.created_at)}</p></div>{document.download_url ? <a href={document.download_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Open</a> : <span className="text-xs text-muted-foreground">Unavailable</span>}</div>) : <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No documents uploaded yet.</p>}</div>
      </section>
    </div>
  );
}