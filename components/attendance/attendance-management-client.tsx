"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Fingerprint, LoaderCircle, RefreshCw, Trash2, UserRoundSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const POLL_MS = 15000;

type AttendanceItem = {
  id: string;
  attendance_id: string | null;
  machine_user_id: string;
  member: { id: string; full_name: string; member_code: string; status: string } | null;
  device_id: string;
  machine_name: string | null;
  event_type: string;
  event_at: string;
  status: "mapped" | "unmapped";
  processing_result: string | null;
  resolution_status: string;
  exception_type: string | null;
};

type CurrentMappedMember = {
  id: string;
  full_name: string;
  member_code: string;
  branch_id: string;
  status: string;
  machine_user_id: string | null;
};

type MappingItem = {
  id: string;
  member_id: string;
  machine_user_id: string | null;
  machine_name: string | null;
  match_status: string;
  verified: boolean;
  created_at: string;
  members: {
    id: string;
    full_name: string;
    member_code: string;
    branch_id: string;
    machine_user_id: string | null;
    status: string;
  } | null;
};

type MemberItem = {
  id: string;
  full_name: string;
  member_code: string;
  branch_id: string;
  status: string;
  machine_user_id: string | null;
};

type UnidentifiedItem = {
  machine_user_id: string;
  device_id: string;
  machine_name: string | null;
  first_seen: string;
  last_seen: string;
  attendance_events: number;
};

type Summary = {
  today_total: number;
  mapped_attendance: number;
  unmapped_attendance: number;
  pending_biometric_mappings: number;
};

function istDateString(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function yesterdayString() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return istDateString(yesterday);
}

function todayString() {
  return istDateString(new Date());
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Request failed.");
  return json as T;
}

export function AttendanceManagementClient() {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState(yesterdayString());
  const [to, setTo] = useState(todayString());
  const [attendanceTab, setAttendanceTab] = useState<"mapped" | "unmapped">("mapped");
  const [mappingTab, setMappingTab] = useState<"verified" | "pending" | "unmapped_members" | "unidentified">("verified");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [mappedAttendance, setMappedAttendance] = useState<AttendanceItem[]>([]);
  const [unmappedAttendance, setUnmappedAttendance] = useState<AttendanceItem[]>([]);
  const [currentMappedMembers, setCurrentMappedMembers] = useState<CurrentMappedMember[]>([]);
  const [verifiedMappings, setVerifiedMappings] = useState<MappingItem[]>([]);
  const [pendingMappings, setPendingMappings] = useState<MappingItem[]>([]);
  const [unmappedMembers, setUnmappedMembers] = useState<MemberItem[]>([]);
  const [unidentifiedUsers, setUnidentifiedUsers] = useState<UnidentifiedItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mapDialog, setMapDialog] = useState({ open: false, machineUserId: "", machineName: "FACE-DEV-002", memberId: "", eventAt: "", reprocess: true });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: "attendance" | "mapping"; id: string; unassign: boolean }>({ open: false, type: "attendance", id: "", unassign: false });

  async function load() {
    try {
      setError(null);
      const encoded = encodeURIComponent(query);
      const [summaryRes, mappedRes, unmappedRes, verifiedRes, pendingRes, unmappedMembersRes, unidentifiedRes] = await Promise.all([
        fetchJson<Summary>("/api/attendance?summary=true"),
        fetchJson<{ data: AttendanceItem[] }>(`/api/attendance?status=mapped&search=${encoded}&from=${from}&to=${to}`),
        fetchJson<{ data: AttendanceItem[] }>(`/api/attendance?status=unmapped&search=${encoded}&from=${from}&to=${to}`),
        fetchJson<{ data: MappingItem[]; mappedMembers: CurrentMappedMember[] }>(`/api/biometric/mappings?status=verified&search=${encoded}`),
        fetchJson<{ data: MappingItem[] }>(`/api/biometric/mappings?status=pending&search=${encoded}`),
        fetchJson<{ data: MemberItem[] }>(`/api/biometric/unmapped-members?search=${encoded}`),
        fetchJson<{ unidentified: UnidentifiedItem[] }>(`/api/biometric/mappings?status=all&includeUnidentified=true&from=${from}&to=${to}`),
      ]);

      setSummary(summaryRes);
      setMappedAttendance(mappedRes.data);
      setUnmappedAttendance(unmappedRes.data);
      setVerifiedMappings(verifiedRes.data);
      setCurrentMappedMembers(verifiedRes.mappedMembers ?? []);
      setPendingMappings(pendingRes.data);
      setUnmappedMembers(unmappedMembersRes.data);
      setUnidentifiedUsers(unidentifiedRes.unidentified ?? []);

      const memberMap = new Map<string, MemberItem>();
      for (const member of unmappedMembersRes.data) memberMap.set(member.id, member);
      for (const member of verifiedRes.mappedMembers ?? []) memberMap.set(member.id, member);
      for (const row of verifiedRes.data) if (row.members) memberMap.set(row.members.id, row.members as MemberItem);
      for (const row of pendingRes.data) if (row.members) memberMap.set(row.members.id, row.members as MemberItem);
      setMembers(Array.from(memberMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load attendance dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [from, to]);

  useEffect(() => {
    const timer = window.setInterval(() => { void load(); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [from, to, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const visibleAttendance = attendanceTab === "mapped" ? mappedAttendance : unmappedAttendance;
  const visibleMappingRows = useMemo(() => (mappingTab === "verified" ? verifiedMappings : pendingMappings), [mappingTab, pendingMappings, verifiedMappings]);

  async function submitMapping() {
    if (!mapDialog.memberId) {
      setError("Select a member before saving the mapping.");
      return;
    }
    setBusy(true);
    try {
      await fetchJson("/api/biometric/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: mapDialog.memberId,
          machine_user_id: mapDialog.machineUserId,
          machine_name: mapDialog.machineName,
          verified: true,
          match_status: "matched",
          reprocess: mapDialog.reprocess,
        }),
      });
      setSuccess("Biometric mapping saved successfully.");
      setMapDialog({ open: false, machineUserId: "", machineName: "FACE-DEV-002", memberId: "", eventAt: "", reprocess: true });
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save mapping.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      if (deleteDialog.type === "attendance") {
        await fetchJson(`/api/attendance/${deleteDialog.id}`, { method: "DELETE" });
        setSuccess("Attendance event deleted.");
      } else {
        await fetchJson(`/api/biometric/mappings/${deleteDialog.id}?unassign=${deleteDialog.unassign}`, { method: "DELETE" });
        setSuccess(deleteDialog.unassign ? "Biometric mapping deleted and Machine User ID unassigned." : "Biometric mapping deleted.");
      }
      setDeleteDialog({ open: false, type: "attendance", id: "", unassign: false });
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyMapping(id: string) {
    setBusy(true);
    try {
      await fetchJson(`/api/biometric/mappings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      setSuccess("Biometric registration marked verified.");
      await load();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify mapping.");
    } finally {
      setBusy(false);
    }
  }

  async function generateMachineId(memberId: string) {
    setBusy(true);
    try {
      await fetchJson("/api/biometric/generate-machine-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
      });
      setSuccess("Numeric Machine User ID generated.");
      await load();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Unable to generate Machine User ID.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold">Biometric Attendance Management</h1>
          <p className="text-sm text-muted-foreground">Real Supabase attendance, current mapped members, biometric mappings, and unidentified machine users.</p>
        </div>
        <Button variant="outline" className="lg:ml-auto" onClick={() => void load()} disabled={busy || loading}>
          <RefreshCw className={cn("size-4", (busy || loading) && "animate-spin")} />Refresh
        </Button>
      </div>

      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-4 p-5"><Fingerprint className="text-primary" /><div><p className="text-sm text-muted-foreground">Today's Total Attendance</p><p className="text-2xl font-bold">{summary?.today_total ?? 0}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><CheckCircle2 className="text-emerald-600" /><div><p className="text-sm text-muted-foreground">Mapped Attendance</p><p className="text-2xl font-bold">{summary?.mapped_attendance ?? 0}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><AlertTriangle className="text-amber-600" /><div><p className="text-sm text-muted-foreground">Unmapped Attendance</p><p className="text-2xl font-bold">{summary?.unmapped_attendance ?? 0}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><UserRoundSearch className="text-blue-600" /><div><p className="text-sm text-muted-foreground">Pending Biometric Mappings</p><p className="text-2xl font-bold">{summary?.pending_biometric_mappings ?? 0}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Search and Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, code, machine user ID" />
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <Button type="button" variant="outline" onClick={() => { const today = todayString(); setFrom(yesterdayString()); setTo(today); setQuery(""); }}>Reset to Yesterday + Today</Button>
          <p className="text-xs text-muted-foreground xl:self-center">Auto-refreshes every 15 seconds.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Attendance</CardTitle>
          <div className="flex gap-2">
            <button className={buttonVariants({ variant: attendanceTab === "mapped" ? "default" : "outline", size: "sm" })} onClick={() => setAttendanceTab("mapped")}>Mapped Attendance</button>
            <button className={buttonVariants({ variant: attendanceTab === "unmapped" ? "default" : "outline", size: "sm" })} onClick={() => setAttendanceTab("unmapped")}>Unmapped Attendance</button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="pb-3">Member</th>
                <th className="pb-3">Member Code</th>
                <th className="pb-3">Machine User ID</th>
                <th className="pb-3">Machine / Device</th>
                <th className="pb-3">Punch Time</th>
                <th className="pb-3">Event Type</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleAttendance.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 font-medium">{row.member?.full_name ?? "No match"}</td>
                  <td>{row.member?.member_code ?? "-"}</td>
                  <td>{row.machine_user_id}</td>
                  <td>{row.machine_name ?? row.device_id}</td>
                  <td>{formatDateTime(row.event_at)}</td>
                  <td className="capitalize">{row.event_type}</td>
                  <td><Badge variant={row.status === "mapped" ? "success" : "outline"}>{row.status}</Badge></td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {row.status === "unmapped" ? <Button variant="outline" size="sm" onClick={() => setMapDialog({ open: true, machineUserId: row.machine_user_id, machineName: row.machine_name ?? row.device_id, memberId: "", eventAt: row.event_at, reprocess: true })}>Map</Button> : null}
                      <Button variant="outline" size="sm" onClick={() => setDeleteDialog({ open: true, type: "attendance", id: row.id, unassign: false })}><Trash2 className="size-4" />Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleAttendance.length && !loading ? <p className="py-10 text-center text-sm text-muted-foreground">No attendance records found for this tab and date range.</p> : null}
          {loading ? <div className="py-10 text-center text-sm text-muted-foreground"><LoaderCircle className="mx-auto mb-3 size-5 animate-spin" />Loading attendance...</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Biometric Member Mapping</CardTitle>
          <div className="flex flex-wrap gap-2">
            <button className={buttonVariants({ variant: mappingTab === "verified" ? "default" : "outline", size: "sm" })} onClick={() => setMappingTab("verified")}>Verified / Mapped</button>
            <button className={buttonVariants({ variant: mappingTab === "pending" ? "default" : "outline", size: "sm" })} onClick={() => setMappingTab("pending")}>Pending</button>
            <button className={buttonVariants({ variant: mappingTab === "unmapped_members" ? "default" : "outline", size: "sm" })} onClick={() => setMappingTab("unmapped_members")}>Unmapped Members</button>
            <button className={buttonVariants({ variant: mappingTab === "unidentified" ? "default" : "outline", size: "sm" })} onClick={() => setMappingTab("unidentified")}>Unidentified Machine Users</button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {mappingTab === "verified" ? (
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">Current mapped members from the real `members.machine_user_id` data.</p>
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="pb-3">Member</th>
                      <th className="pb-3">Member Code</th>
                      <th className="pb-3">Machine User ID</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentMappedMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="py-3 font-medium">{member.full_name}</td>
                        <td>{member.member_code}</td>
                        <td>{member.machine_user_id ?? "-"}</td>
                        <td><Badge variant={member.status === "active" ? "success" : "outline"}>{member.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!currentMappedMembers.length ? <p className="py-6 text-sm text-muted-foreground">No current mapped members found.</p> : null}
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">Verified rows from the real `biometric_member_mapping` table. If someone is verified now, this list updates automatically on poll/refresh.</p>
                <table className="w-full min-w-[1180px] text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="pb-3">Member</th>
                      <th className="pb-3">Member Code</th>
                      <th className="pb-3">Machine User ID</th>
                      <th className="pb-3">Machine Name</th>
                      <th className="pb-3">Verified</th>
                      <th className="pb-3">Mapping Status</th>
                      <th className="pb-3">Created Date</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {verifiedMappings.map((row) => (
                      <tr key={row.id}>
                        <td className="py-3 font-medium">{row.members?.full_name ?? "Unknown"}</td>
                        <td>{row.members?.member_code ?? "-"}</td>
                        <td>{row.machine_user_id ?? "-"}</td>
                        <td>{row.machine_name ?? "FACE-DEV-002"}</td>
                        <td><Badge variant={row.verified ? "success" : "outline"}>{String(row.verified)}</Badge></td>
                        <td><Badge variant={row.verified ? "success" : "outline"}>{row.match_status}</Badge></td>
                        <td>{formatDateTime(row.created_at)}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDeleteDialog({ open: true, type: "mapping", id: row.id, unassign: false })}>Delete Mapping</Button>
                            <Button variant="outline" size="sm" onClick={() => setDeleteDialog({ open: true, type: "mapping", id: row.id, unassign: true })}>Unassign</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!verifiedMappings.length ? <p className="py-6 text-sm text-muted-foreground">No verified biometric mapping rows found.</p> : null}
              </div>
            </div>
          ) : null}

          {mappingTab === "pending" ? (
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="pb-3">Member</th>
                  <th className="pb-3">Member Code</th>
                  <th className="pb-3">Machine User ID</th>
                  <th className="pb-3">Machine Name</th>
                  <th className="pb-3">Verified</th>
                  <th className="pb-3">Mapping Status</th>
                  <th className="pb-3">Created Date</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingMappings.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 font-medium">{row.members?.full_name ?? "Unknown"}</td>
                    <td>{row.members?.member_code ?? "-"}</td>
                    <td>{row.machine_user_id ?? "-"}</td>
                    <td>{row.machine_name ?? "FACE-DEV-002"}</td>
                    <td><Badge variant={row.verified ? "success" : "outline"}>{String(row.verified)}</Badge></td>
                    <td><Badge variant={row.verified ? "success" : "outline"}>{row.match_status}</Badge></td>
                    <td>{formatDateTime(row.created_at)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {!row.verified ? <Button variant="outline" size="sm" onClick={() => void verifyMapping(row.id)}>Mark Verified</Button> : null}
                        {!row.verified ? <Button variant="ghost" size="sm" onClick={() => setSuccess(`Go to the biometric device and enroll ${row.members?.full_name ?? "the member"} using Machine User ID: ${row.machine_user_id ?? "not assigned"}`)}>Register on Machine</Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {mappingTab === "unmapped_members" ? (
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="pb-3">Member Name</th>
                  <th className="pb-3">Member Code</th>
                  <th className="pb-3">Branch</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Machine User ID</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {unmappedMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="py-3 font-medium">{member.full_name}</td>
                    <td>{member.member_code}</td>
                    <td className="font-mono text-xs">{member.branch_id}</td>
                    <td><Badge variant={member.status === "active" ? "success" : "outline"}>{member.status}</Badge></td>
                    <td>{member.machine_user_id ?? "-"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setMapDialog({ open: true, machineUserId: member.machine_user_id ?? "", machineName: "FACE-DEV-002", memberId: member.id, eventAt: new Date().toISOString(), reprocess: false })}>Assign Machine ID</Button>
                        <Button variant="outline" size="sm" onClick={() => void generateMachineId(member.id)}>Generate Machine ID</Button>
                        <Button variant="ghost" size="sm" onClick={() => setSuccess(`Go to FACE-DEV-002 and enroll ${member.full_name} using the generated Machine User ID.`)}>Start Biometric Registration</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {mappingTab === "unidentified" ? (
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="pb-3">Machine User ID</th>
                  <th className="pb-3">Machine / Device</th>
                  <th className="pb-3">First Seen</th>
                  <th className="pb-3">Last Seen</th>
                  <th className="pb-3">Events</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {unidentifiedUsers.map((row) => (
                  <tr key={`${row.machine_user_id}-${row.device_id}`}>
                    <td className="py-3 font-medium">{row.machine_user_id}</td>
                    <td>{row.machine_name ?? row.device_id}</td>
                    <td>{formatDateTime(row.first_seen)}</td>
                    <td>{formatDateTime(row.last_seen)}</td>
                    <td>{row.attendance_events}</td>
                    <td><Button variant="outline" size="sm" onClick={() => setMapDialog({ open: true, machineUserId: row.machine_user_id, machineName: row.machine_name ?? row.device_id, memberId: "", eventAt: row.last_seen, reprocess: true })}>Map</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={mapDialog.open} onOpenChange={(open) => setMapDialog((current) => ({ ...current, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map Biometric Attendance</DialogTitle>
            <DialogDescription>Machine User ID: {mapDialog.machineUserId || "Enter manually"} | Device: {mapDialog.machineName} | Recent Punch: {mapDialog.eventAt ? formatDateTime(mapDialog.eventAt) : "-"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="space-y-1.5 text-sm font-medium">Machine User ID<Input value={mapDialog.machineUserId} onChange={(event) => setMapDialog((current) => ({ ...current, machineUserId: event.target.value }))} /></label>
            <label className="space-y-1.5 text-sm font-medium">Machine / Device<Input value={mapDialog.machineName} onChange={(event) => setMapDialog((current) => ({ ...current, machineName: event.target.value }))} /></label>
            <label className="space-y-1.5 text-sm font-medium">Select Member<select value={mapDialog.memberId} onChange={(event) => setMapDialog((current) => ({ ...current, memberId: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Choose member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name} - {member.member_code} {member.machine_user_id ? `(${member.machine_user_id})` : ""}</option>)}</select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mapDialog.reprocess} onChange={(event) => setMapDialog((current) => ({ ...current, reprocess: event.target.checked }))} /> Reprocess previously unmapped attendance for this Machine User ID</label>
            {mapDialog.memberId ? <div className="rounded-xl border bg-muted/40 p-3 text-sm">You are mapping Machine User ID <strong>{mapDialog.machineUserId}</strong> to <strong>{members.find((member) => member.id === mapDialog.memberId)?.full_name ?? "Selected member"}</strong>.</div> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapDialog((current) => ({ ...current, open: false }))}>Cancel</Button>
            <Button onClick={() => void submitMapping()} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}Save Mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((current) => ({ ...current, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteDialog.type === "attendance" ? "Delete Attendance Record" : "Delete Biometric Mapping"}</DialogTitle>
            <DialogDescription>{deleteDialog.type === "attendance" ? "Are you sure you want to delete this attendance record?" : deleteDialog.unassign ? "Delete the mapping and unassign the Machine User ID from the member?" : "Delete mapping only and keep the member record?"}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog((current) => ({ ...current, open: false }))}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

