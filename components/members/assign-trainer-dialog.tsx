"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dumbbell, LoaderCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { assignTrainerAction } from "@/app/actions/member-management-actions";

type Trainer = { id: string; name: string };

type Props = {
  memberId: string;
  memberName?: string;
  currentTrainerId?: string | null;
  trainers: Trainer[];
};

export function AssignTrainerDialog({ memberId, memberName, currentTrainerId, trainers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [trainerId, setTrainerId] = useState(currentTrainerId ?? "");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentTrainer = trainers.find((trainer) => trainer.id === currentTrainerId);

  useEffect(() => {
    if (!open) return;
    setTrainerId(currentTrainerId ?? "");
    setQuery("");
    setError(null);
  }, [currentTrainerId, open]);

  const filteredTrainers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? trainers.filter((trainer) => trainer.name.toLowerCase().includes(term)) : trainers;
  }, [query, trainers]);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await assignTrainerAction(memberId, trainerId || null);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(result.success ?? "Trainer assignment updated.");
      setOpen(false);
      router.refresh();
    });
  }

  const triggerLabel = currentTrainerId ? "Change Trainer" : "Assign Trainer";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5"><Dumbbell className="size-4" />{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
          <DialogDescription>
            {memberName ? `Assign an active trainer to ${memberName}.` : "Assign an active trainer to this member."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm"><span className="text-muted-foreground">Current trainer: </span>{currentTrainer?.name ?? "Not assigned"}</div>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search active trainers" className="pl-9" /></div>
          <div className="max-h-64 overflow-y-auto rounded-xl border" role="listbox" aria-label="Available trainers">
            <button type="button" onClick={() => setTrainerId("")} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${trainerId === "" ? "bg-primary/10 font-medium" : "hover:bg-muted/40"}`}>Not assigned</button>
            {filteredTrainers.map((trainer) => <button key={trainer.id} type="button" onClick={() => setTrainerId(trainer.id)} className={`flex w-full items-center justify-between border-t px-3 py-2 text-left text-sm ${trainerId === trainer.id ? "bg-primary/10 font-medium" : "hover:bg-muted/40"}`}>{trainer.name}{trainer.id === currentTrainerId ? <span className="text-xs text-muted-foreground">Current</span> : null}</button>)}
            {!filteredTrainers.length ? <p className="border-t px-3 py-4 text-sm text-muted-foreground">No active trainers available for this branch.</p> : null}
          </div>
          {error ? <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button><Button onClick={save} disabled={isPending}>{isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}{trainerId ? "Save assignment" : "Remove assignment"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}