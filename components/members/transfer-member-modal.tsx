"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { transferMemberAction } from "@/app/actions/member-management-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Branch {
  id: string;
  name: string;
}

interface Props {
  memberId: string;
  memberName: string;
  currentBranchId: string;
  currentBranchName: string;
  branches: Branch[];
}

export function TransferMemberModal({
  memberId,
  memberName,
  currentBranchId,
  currentBranchName,
  branches,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(transferMemberAction, {});

  // Close modal and show success when transfer completes
  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  const otherBranches = branches.filter((b) => b.id !== currentBranchId);

  if (otherBranches.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <ArrowLeftRight className="size-3.5" />
        Transfer Branch
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Member to Another Branch</DialogTitle>
            <DialogDescription>
              Move <span className="font-medium text-foreground">{memberName}</span> from{" "}
              <span className="font-medium text-foreground">{currentBranchName}</span> to a different branch.
              Their active subscription will also be transferred.
            </DialogDescription>
          </DialogHeader>

          <form action={action} className="space-y-4">
            <input type="hidden" name="member_id" value={memberId} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Destination branch</label>
              <select
                name="to_branch_id"
                required
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>Select branch…</option>
                {otherBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                name="reason"
                type="text"
                maxLength={200}
                placeholder="e.g. Closer to home, branch preference…"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              />
            </div>

            {state.error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Transferring…" : "Confirm Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
