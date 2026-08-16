"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MembershipPlanDeleteButton({ planId, planName }: { planId: string; planName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function deletePlan() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/membership-plans/${planId}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to delete membership plan.");
      toast.success(`${planName} deleted.`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete membership plan.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" />
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete membership plan?</DialogTitle>
            <DialogDescription><strong>{planName}</strong> will no longer be available for new memberships. Existing memberships remain unchanged.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={deletePlan} disabled={isDeleting}>{isDeleting ? "Deleting…" : "Delete plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
