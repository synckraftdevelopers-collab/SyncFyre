"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/notifications/notification-provider";

export function NotificationAutoRefresh() {
  const router = useRouter();
  const { changeToken } = useNotifications();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    router.refresh();
  }, [changeToken, router]);

  return null;
}
