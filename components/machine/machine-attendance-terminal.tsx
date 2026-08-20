"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, RadioTower, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TerminalDevice = { id: string; machine_name: string; device_id: string; connection_status: string; last_seen_at: string | null };
type Result = { success: boolean; title: string; message: string } | null;

const resultMessages: Record<string, string> = {
  SUCCESS: "Attendance marked successfully.", DUPLICATE_EVENT: "This attendance was already recorded.", MEMBER_NOT_FOUND: "Member could not be identified.", MEMBER_INACTIVE: "This member account is inactive.", MEMBERSHIP_EXPIRED: "Access denied: membership has expired.", MEMBERSHIP_FROZEN: "Access denied: membership is currently paused.", WRONG_BRANCH: "Access denied for this gym location.", DEVICE_NOT_REGISTERED: "This terminal is not registered.",
};

export function MachineAttendanceTerminal({ devices }: { devices: TerminalDevice[] }) {
  const [deviceId, setDeviceId] = useState(devices[0]?.device_id ?? "");
  const [memberId, setMemberId] = useState("");
  const [eventType, setEventType] = useState<"check_in" | "check_out">("check_in");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const device = devices.find((item) => item.device_id === deviceId);

  async function submit() {
    if (!memberId.trim() || !deviceId) return;
    setPending(true); setResult(null);
    try {
      const response = await fetch("/api/machine/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId, biometricUserId: memberId.trim(), eventType }) });
      const body = await response.json();
      const status = body.result?.status as string | undefined;
      const success = status === "SUCCESS" || status === "DUPLICATE_EVENT";
      setResult({ success, title: success ? (status === "SUCCESS" ? "Access granted" : "Already recorded") : "Access denied", message: body.result?.message ?? (status ? resultMessages[status] : body.error) ?? "Unable to process attendance." });
      if (success) setMemberId("");
    } catch { setResult({ success: false, title: "Connection error", message: "Unable to reach the attendance service. Please try again." }); }
    finally { setPending(false); }
  }

  return <main className="grid min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8"><section className="m-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"><header className="flex items-center justify-between border-b border-slate-700 px-6 py-5"><div className="flex items-center gap-3"><ScanFace className="size-8 text-cyan-400" /><div><h1 className="text-xl font-bold">SyncFyre Attendance</h1><p className="text-sm text-slate-400">Face & biometric terminal</p></div></div><div className="flex items-center gap-2 text-sm text-slate-300"><RadioTower className={`size-4 ${device?.connection_status === "online" ? "text-emerald-400" : "text-amber-400"}`} />{device?.connection_status ?? "offline"}</div></header><div className="space-y-6 p-6 sm:p-8">{devices.length ? <><div className="rounded-2xl border border-dashed border-slate-600 bg-slate-800/60 px-6 py-10 text-center"><ScanFace className="mx-auto mb-4 size-16 text-cyan-400" /><h2 className="text-2xl font-semibold">Ready to identify member</h2><p className="mt-2 text-sm text-slate-400">Use the connected face-recognition device, or enter a biometric ID for assisted check-in.</p></div><label className="block text-sm font-medium">Terminal<select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm">{devices.map((item) => <option key={item.id} value={item.device_id}>{item.machine_name} ({item.device_id})</option>)}</select></label><label className="block text-sm font-medium">Member biometric ID<Input value={memberId} onChange={(event) => setMemberId(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} className="mt-2 border-slate-600 bg-slate-800 text-white" placeholder="Scan or enter member ID" autoFocus /></label><div className="grid grid-cols-2 gap-3"><Button type="button" variant={eventType === "check_in" ? "default" : "outline"} onClick={() => setEventType("check_in")}>Check in</Button><Button type="button" variant={eventType === "check_out" ? "default" : "outline"} onClick={() => setEventType("check_out")}>Check out</Button></div><Button type="button" className="h-12 w-full" disabled={pending || !memberId.trim()} onClick={() => void submit()}>{pending ? <LoaderCircle className="animate-spin" /> : <ScanFace />}{pending ? "Verifying…" : "Verify and mark attendance"}</Button></> : <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-5 text-amber-100">No active attendance machine is assigned to this branch. An administrator must register and enable one before this terminal can be used.</div>}{result && <div role="status" className={`flex gap-3 rounded-xl border p-4 ${result.success ? "border-emerald-700 bg-emerald-950/50 text-emerald-100" : "border-rose-700 bg-rose-950/50 text-rose-100"}`}>{result.success ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <CircleAlert className="mt-0.5 size-5 shrink-0" />}<div><p className="font-semibold">{result.title}</p><p className="text-sm opacity-90">{result.message}</p></div></div>}</div></section></main>;
}
