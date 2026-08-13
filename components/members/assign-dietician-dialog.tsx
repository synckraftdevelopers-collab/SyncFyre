"use client";

import { useState, useTransition } from "react";
import { Apple, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { assignDieticianAction } from "@/app/actions/member-management-actions";

type Dietician = { id: string; name: string };

type Props = {
  memberId: string;
  currentDieticianId?: string | null;
  dieticians: Dietician[];
};

export function AssignDieticianDialog({ memberId, currentDieticianId, dieticians }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dieticianId, setDieticianId] = useState(currentDieticianId ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await assignDieticianAction(memberId, dieticianId || null);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Dietician assigned successfully.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5"><Apple className="size-4" /> Assign Dietician</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Assign Dietician</DialogTitle></DialogHeader>
        <div className="mt-2 space-y-4">
          <label className="space-y-1.5 text-sm font-medium">Select dietician
            <select value={dieticianId} onChange={(event) => setDieticianId(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Not assigned</option>
              {dieticians.map((dietician) => <option key={dietician.id} value={dietician.id}>{dietician.name}</option>)}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>{isPending && <LoaderCircle className="size-4 animate-spin" />} Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
