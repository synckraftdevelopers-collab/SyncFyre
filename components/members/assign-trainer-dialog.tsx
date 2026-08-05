"use client";

import { useState, useTransition } from "react";
import { Dumbbell, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { assignTrainerAction } from "@/app/actions/member-management-actions";

interface Trainer {
  id: string;
  name: string;
}

interface Props {
  memberId: string;
  currentTrainerId?: string | null;
  trainers: Trainer[];
}

export function AssignTrainerDialog({ memberId, currentTrainerId, trainers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [trainerId, setTrainerId] = useState<string>(currentTrainerId ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await assignTrainerAction(memberId, trainerId || null);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Trainer assigned successfully.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Dumbbell className="size-4" />
          Assign Trainer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Trainer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <label className="space-y-1.5 text-sm font-medium">
            Select trainer
            <select
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Not assigned</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <LoaderCircle className="size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
