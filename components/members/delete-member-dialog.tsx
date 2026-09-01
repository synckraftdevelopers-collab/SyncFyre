"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMemberAction } from "@/app/actions/member-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteMemberDialog({
  memberId,
  memberName,
  redirectTo,
}: {
  memberId: string;
  memberName: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMemberAction(memberId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(`${memberName} was removed from the active member register.`);
      if (redirectTo) router.replace(redirectTo);
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="size-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Member?</DialogTitle>
          <DialogDescription>
            <strong>{memberName}</strong> will be removed from the active member register. Historical records remain preserved for audit. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deletingâ€¦" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


