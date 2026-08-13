"use client";

import { useMemo, useState, useTransition } from "react";
import { Dumbbell, LoaderCircle, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredTrainers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return trainers;
    return trainers.filter((trainer) => trainer.name.toLowerCase().includes(term));
  }, [trainers, query]);

  function handleSubmit() {
    startTransition(async () => {
      const result = await assignTrainerAction(memberId, trainerId || null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(trainerId ? "Trainer assigned successfully." : "Trainer assignment removed.");
      setOpen(false);
      router.refresh();
    });
  }

  const triggerLabel = currentTrainerId ? "Change Trainer" : "Assign Trainer";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Dumbbell className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search trainer..." className="pl-9" />
          </div>
          <div className="rounded-xl border">
            <button type="button" onClick={() => setTrainerId("")} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${trainerId === "" ? "bg-primary/10 font-medium" : ""}`}>
              <span>Not assigned</span>
            </button>
            <div className="max-h-64 overflow-y-auto">
              {filteredTrainers.length ? filteredTrainers.map((trainer) => (
                <button key={trainer.id} type="button" onClick={() => setTrainerId(trainer.id)} className={`flex w-full items-center justify-between border-t px-3 py-2 text-left text-sm ${trainerId === trainer.id ? "bg-primary/10 font-medium" : "hover:bg-muted/40"}`}>
                  <span>{trainer.name}</span>
                </button>
              )) : <p className="border-t px-3 py-4 text-sm text-muted-foreground">No active trainers available.</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <LoaderCircle className="size-4 animate-spin" />}
              {trainerId ? "Save Changes" : "Remove"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
