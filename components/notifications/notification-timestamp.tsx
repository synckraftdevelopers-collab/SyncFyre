"use client";

import { useEffect, useState } from "react";

export function NotificationTimestamp({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const created = new Date(createdAt).getTime();
  const minutes = Math.max(0, Math.floor((now - created) / 60_000));
  const label = minutes < 1 ? "Just now" : minutes < 60 ? `${minutes} minute${minutes === 1 ? "" : "s"} ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) === 1 ? "" : "s"} ago` : new Date(createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  return <time dateTime={createdAt} title={new Date(createdAt).toLocaleString("en-IN")}>{label}</time>;
}