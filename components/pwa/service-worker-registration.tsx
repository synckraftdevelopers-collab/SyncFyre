"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Turbopack serves development modules from stable URLs. A cache-first
    // service worker can therefore combine freshly-rendered server HTML with
    // an older client module and trigger a React hydration mismatch.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      caches.keys().then((keys) => {
        keys.filter((key) => key.startsWith("sync-tyre-static-")).forEach((key) => caches.delete(key));
      });
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("SyncFyre service worker registration failed", error);
    });
  }, []);
  return null;
}