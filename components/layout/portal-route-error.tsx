"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortalRouteError({ label, error, reset }: { label: string; error: Error; reset: () => void }) {
  useEffect(() => { console.error(`${label} route error`, error); }, [error, label]);
  return <div className="grid min-h-[60vh] place-items-center p-6"><div className="max-w-md text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle className="size-7" /></div><h1 className="mt-5 text-xl font-bold">This page could not be loaded</h1><p className="mt-2 text-sm text-muted-foreground">The data may be temporarily unavailable. Please try again.</p><Button className="mt-5" onClick={reset}><RefreshCw className="size-4" />Try again</Button></div></div>;
}