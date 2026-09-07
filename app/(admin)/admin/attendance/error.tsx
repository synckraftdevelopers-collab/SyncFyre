"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AttendanceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Attendance route error", error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="mt-5 text-xl font-bold">Attendance data could not be loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This can happen if a device sync is in progress or the connection was interrupted. Try again in a moment.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
