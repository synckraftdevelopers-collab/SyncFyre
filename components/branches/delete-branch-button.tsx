"use client";

import { Trash2 } from "lucide-react";
import { deleteBranchAction } from "@/app/actions/settings-actions";
import { Button } from "@/components/ui/button";

type DeleteBranchButtonProps = {
  branchId: string;
  branchName: string;
  isCurrentBranch: boolean;
  totalActiveBranches: number;
};

/**
 * Soft-deletes (deactivates) a branch.
 * Disabled if this is the user's current branch or the last active branch.
 * Uses deleteBranchAction already implemented in settings-actions.ts.
 */
export function DeleteBranchButton({
  branchId,
  branchName,
  isCurrentBranch,
  totalActiveBranches,
}: DeleteBranchButtonProps) {
  const isDisabled = isCurrentBranch || totalActiveBranches <= 1;

  const tooltipText = isCurrentBranch
    ? "Cannot deactivate your current branch"
    : totalActiveBranches <= 1
    ? "Cannot deactivate the last active branch"
    : `Deactivate ${branchName}`;

  return (
    <form
      action={deleteBranchAction}
      onSubmit={(e) => {
        if (!window.confirm(`Deactivate "${branchName}"? Members and staff will not be deleted.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="branch_id" value={branchId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isDisabled}
        title={tooltipText}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
        Deactivate
      </Button>
    </form>
  );
}
