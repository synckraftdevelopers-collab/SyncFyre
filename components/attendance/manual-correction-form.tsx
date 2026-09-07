"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const actions = [
  { value: "approve", label: "Approve" },
  { value: "merge", label: "Merge" },
  { value: "ignore", label: "Ignore" },
  { value: "retry_sync", label: "Retry sync" },
  { value: "assign_member", label: "Assign member" },
] as const;

export function ManualCorrectionForm({
  exceptionId,
  memberOptions,
  defaultNotes = "",
  onResolved,
}: {
  exceptionId: string;
  memberOptions: { id: string; full_name: string; member_code: string }[];
  defaultNotes?: string;
  onResolved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<(typeof actions)[number]["value"]>("approve");
  const [notes, setNotes] = useState(defaultNotes);
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState("");

  function submit() {
    startTransition(async () => {
      setError("");
      try {
        const response = await fetch(`/api/attendance/exceptions/${exceptionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            notes: notes || null,
            metadata: memberId ? { member_id: memberId } : undefined,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to resolve exception.");
        onResolved?.();
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Unable to resolve exception.");
      }
    });
  }

  const needsMember = action === "assign_member" || action === "merge";

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Action</span>
          <select value={action} onChange={(event) => setAction(event.target.value as (typeof actions)[number]["value"])} className="h-10 w-full rounded-lg border bg-background px-3">
            {actions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        {needsMember ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium">Member</span>
            <select value={memberId} onChange={(event) => setMemberId(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3">
              <option value="">Select member</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} ({member.member_code})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Notes</span>
        <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional resolution notes" />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" onClick={submit} disabled={pending || (needsMember && !memberId)}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Save resolution
      </Button>
    </div>
  );
}

