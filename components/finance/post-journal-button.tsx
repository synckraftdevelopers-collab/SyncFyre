"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { postJournalEntryAction } from "@/app/actions/finance-actions";

export function PostJournalButton({ journalEntryId }: { journalEntryId: string }) {
  const [pending, startTransition] = useTransition();

  function handlePost() {
    startTransition(async () => {
      const result = await postJournalEntryAction(journalEntryId);
      if (result.success) {
        toast.success("Journal entry posted successfully");
      } else {
        toast.error(result.error ?? "Failed to post entry");
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handlePost}
      disabled={pending}
      className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <CheckCircle className="size-3.5" />
      )}
      Post
    </Button>
  );
}
