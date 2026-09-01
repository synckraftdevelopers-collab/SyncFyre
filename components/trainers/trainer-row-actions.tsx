"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Trash2, Eye } from "lucide-react";
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
import { deleteTrainerAction } from "@/app/actions/trainer-management-actions";
import type { TrainerReportRow } from "@/types";

export function TrainerRowActions({ trainer }: { trainer: TrainerReportRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Open actions for ${trainer.trainer_name}`}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-48 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-[0_16px_40px_rgba(7,29,56,.14)]">
            <DropdownMenu.Item asChild>
              <Link
                href={`/admin/trainers/${trainer.trainer_id}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-muted"
              >
                <Eye className="size-4 text-muted-foreground" />
                View profile
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item asChild>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive outline-none transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                Delete
              </button>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trainer?</DialogTitle>
            <DialogDescription className="space-y-1 pt-1 text-left">
              <span className="block">Are you sure you want to delete:</span>
              <span className="block font-semibold text-foreground">{trainer.trainer_name}</span>
              <span className="block">Trainer ID: {trainer.trainer_id}</span>
              <span className="block">Branch: {trainer.branch_name}</span>
              <span className="block">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                startDelete(async () => {
                  const result = await deleteTrainerAction(trainer.trainer_id);
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(result.success ?? "Trainer deleted successfully.");
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


