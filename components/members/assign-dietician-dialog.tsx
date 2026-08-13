"use client";

import { useMemo, useState, useTransition } from "react";
import { Apple, LoaderCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredDieticians = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return dieticians;
    return dieticians.filter((dietician) => dietician.name.toLowerCase().includes(term));
  }, [dieticians, query]);

  function handleSubmit() {
    startTransition(async () => {
      const result = await assignDieticianAction(memberId, dieticianId || null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(dieticianId ? "Dietician assigned successfully." : "Dietician assignment removed.");
      setOpen(false);
      router.refresh();
    });
  }

  const triggerLabel = currentDieticianId ? "Change Dietician" : "Assign Dietician";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5"><Apple className="size-4" /> {triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{triggerLabel}</DialogTitle></DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dietician..." className="pl-9" />
          </div>
          <div className="rounded-xl border">
            <button type="button" onClick={() => setDieticianId("")} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${dieticianId === "" ? "bg-primary/10 font-medium" : ""}`}>
              <span>Not assigned</span>
            </button>
            <div className="max-h-64 overflow-y-auto">
              {filteredDieticians.length ? filteredDieticians.map((dietician) => (
                <button key={dietician.id} type="button" onClick={() => setDieticianId(dietician.id)} className={`flex w-full items-center justify-between border-t px-3 py-2 text-left text-sm ${dieticianId === dietician.id ? "bg-primary/10 font-medium" : "hover:bg-muted/40"}`}>
                  <span>{dietician.name}</span>
                </button>
              )) : <p className="border-t px-3 py-4 text-sm text-muted-foreground">No active dietitians available.</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>{isPending && <LoaderCircle className="size-4 animate-spin" />} {dieticianId ? "Save Changes" : "Remove"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
