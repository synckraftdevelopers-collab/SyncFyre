"use client";

import { useState } from "react";
import { KeyRound, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MachineConnectForm() {
  const [machineId, setMachineId] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function connect() {
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/machine/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ machineId, secret }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to authenticate this machine.");
      window.location.assign("/machine");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to authenticate this machine."); }
    finally { setPending(false); }
  }
  return <main className="grid min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8"><section className="m-auto w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8"><div className="mb-7 flex items-center gap-3"><ScanFace className="size-9 text-cyan-400" /><div><h1 className="text-xl font-bold">Connect attendance terminal</h1><p className="text-sm text-slate-400">Use the credentials issued by Gym Admin.</p></div></div><div className="space-y-4"><label className="block text-sm font-medium">Machine ID<Input value={machineId} onChange={(event) => setMachineId(event.target.value)} className="mt-2 border-slate-600 bg-slate-800 text-white" autoComplete="username" /></label><label className="block text-sm font-medium">Device secret<Input value={secret} onChange={(event) => setSecret(event.target.value)} type="password" className="mt-2 border-slate-600 bg-slate-800 text-white" autoComplete="current-password" onKeyDown={(event) => { if (event.key === "Enter") void connect(); }} /></label>{error && <p role="alert" className="rounded-lg border border-rose-700 bg-rose-950/50 p-3 text-sm text-rose-100">{error}</p>}<Button className="h-12 w-full" disabled={pending || !machineId.trim() || !secret.trim()} onClick={() => void connect()}>{pending ? "Connecting…" : <><KeyRound /> Connect machine</>}</Button></div></section></main>;
}
