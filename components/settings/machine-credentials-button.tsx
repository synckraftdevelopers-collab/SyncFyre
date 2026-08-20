"use client";

import { useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function MachineCredentialsButton({ id, active }: { id: string; active: boolean }) {
  const [pending, setPending] = useState(false);
  const [credentials, setCredentials] = useState<{ machineId: string; secret: string } | null>(null);
  async function issue() {
    if (!confirm("This rotates the current terminal secret and disconnects it until the new secret is entered. Continue?")) return;
    setPending(true);
    try {
      const response = await fetch(`/api/face-machines/${id}/terminal-credentials`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to issue credentials.");
      setCredentials({ machineId: body.machineId, secret: body.secret });
      try { await navigator.clipboard.writeText(`Machine ID: ${body.machineId}\nDevice secret: ${body.secret}`); toast.success("New machine credentials copied to clipboard."); }
      catch { toast.success("New machine credentials generated. Copy them from the screen now."); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to issue credentials."); }
    finally { setPending(false); }
  }
  return <div className="space-y-2"><Button variant="outline" size="sm" disabled={!active || pending} title={active ? "Issue or rotate device credentials" : "Activate the machine first"} onClick={() => void issue()}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}Credentials</Button>{credentials && <div className="max-w-sm rounded border border-amber-500/40 bg-amber-50 p-2 text-xs text-amber-950 dark:bg-amber-950 dark:text-amber-100"><p className="font-semibold">Copy now — this secret will not be shown again.</p><p>Machine ID: <code>{credentials.machineId}</code></p><p className="break-all">Device secret: <code>{credentials.secret}</code></p></div>}</div>;
}