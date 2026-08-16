"use client";

import { useTransition } from "react";
import { Check, LoaderCircle, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { checkInMemberAction } from "@/app/actions/member-management-actions";

export function CheckInMemberButton({ memberId, checkedIn }: { memberId: string; checkedIn: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function checkIn() {
    startTransition(async () => {
      const result = await checkInMemberAction(memberId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success ?? "Member checked in.");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={checkIn} disabled={checkedIn || pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : checkedIn ? <Check className="size-4" /> : <ScanLine className="size-4" />}
      {checkedIn ? "Checked In" : "Punch In"}
    </Button>
  );
}