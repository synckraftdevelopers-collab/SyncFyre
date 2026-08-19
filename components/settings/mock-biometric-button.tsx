"use client";

import { useState } from "react";
import { FlaskConical, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function MockBiometricButton({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function trigger() {
    setPending(true);
    try {
      const response = await fetch(`/api/biometric/devices/${id}/mock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "valid_face" }),
      });
      const result = (await response.json()) as { error?: string; results?: { status: string }[] };
      if (!response.ok) throw new Error(result.error ?? "Unable to send mock event");
      const status = result.results?.[0]?.status ?? "UNKNOWN";
      toast.success(`Mock biometric event processed: ${status}`);
      location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send mock event");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={!enabled || pending} onClick={trigger}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
      Test event
    </Button>
  );
}
