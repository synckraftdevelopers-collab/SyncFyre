"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { convertLeadAction, recordLeadActivityAction, updateLeadStageAction } from "@/app/actions/lead-actions";

type Lead = { id: string; stage: string };
type Member = { id: string; full_name: string; member_code: string };

export function LeadActions({ lead, members }: { lead: Lead; members: Member[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const closed = lead.stage === "won" || lead.stage === "lost";
  function run(task: () => Promise<{ error?: string; success?: string }>) {
    setError(null);
    startTransition(async () => { const result = await task(); if (result.error) setError(result.error); else if (result.success) toast.success(result.success); });
  }
  return <div className="min-w-[270px] space-y-2"><form action={(formData) => run(() => updateLeadStageAction(formData))} className="flex flex-wrap gap-2"><input type="hidden" name="lead_id" value={lead.id} /><select name="stage" defaultValue={lead.stage} disabled={closed || isPending} className="h-8 rounded border bg-background px-2 text-xs"><option value="new">New</option><option value="contacted">Contacted</option><option value="follow_up">Follow-up</option><option value="trial_scheduled">Trial scheduled</option><option value="trial_completed">Trial completed</option><option value="lost">Lost</option></select><input name="lost_reason" placeholder="Lost reason (if lost)" disabled={closed || isPending} className="h-8 min-w-32 flex-1 rounded border bg-background px-2 text-xs" /><button disabled={closed || isPending} className="h-8 rounded bg-primary px-2 text-xs font-medium text-primary-foreground">Save</button></form>{!closed ? <form action={(formData) => run(() => recordLeadActivityAction(formData))} className="grid grid-cols-[auto_1fr] gap-2"><input type="hidden" name="lead_id" value={lead.id} /><select name="activity_type" defaultValue="note" disabled={isPending} className="h-8 rounded border bg-background px-2 text-xs"><option value="note">Note</option><option value="call">Call</option><option value="message">Message</option><option value="follow_up">Follow-up</option><option value="trial">Trial</option></select><input name="description" required maxLength={2000} placeholder="Activity note" disabled={isPending} className="h-8 rounded border bg-background px-2 text-xs" /><input name="follow_up_at" type="datetime-local" disabled={isPending} className="col-span-2 h-8 rounded border bg-background px-2 text-xs" /><button disabled={isPending} className="col-span-2 h-8 rounded border px-2 text-xs font-medium hover:bg-muted">Record activity</button></form> : null}{!closed ? <form action={(formData) => run(() => convertLeadAction(formData))} className="flex gap-2"><input type="hidden" name="lead_id" value={lead.id} /><select name="member_id" required defaultValue="" disabled={isPending || !members.length} className="h-8 min-w-0 flex-1 rounded border bg-background px-2 text-xs"><option value="" disabled>{members.length ? "Select registered member" : "No members in branch"}</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name} ({member.member_code})</option>)}</select><button disabled={isPending || !members.length} className="h-8 rounded bg-emerald-600 px-2 text-xs font-medium text-white">Convert</button></form> : null}{error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}</div>;
}