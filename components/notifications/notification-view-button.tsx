"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { markNotificationReadAction } from "@/app/actions/notification-actions";
import { Button } from "@/components/ui/button";

export function NotificationViewButton({ id, destination, unread }: { id: string; destination: string; unread: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function viewNotification() {
    startTransition(async () => {
      try {
        if (unread) await markNotificationReadAction(id);
        router.push(destination);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to open this notification.");
      }
    });
  }

  return <Button type="button" variant="outline" size="sm" disabled={pending} onClick={viewNotification}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}{pending ? "Opening..." : "View"}</Button>;
}
