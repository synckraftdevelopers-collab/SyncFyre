import Link from "next/link";
import { Activity, Clock3, RadioTower, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Attendance" };

type AttendanceLog = {
  id: string;
  attendance_date: string;
  entry_time: string | null;
  exit_time: string | null;
  duration_minutes: number | null;
  device_id: string;
  members: { member_code?: string | null; full_name?: string | null } | null;
};

type AttendanceSyncLog = {
  id: string;
  device_id: string;
  machine_user_id: string;
  event_type: string;
  event_at: string;
  status: string;
  processing_result: string | null;
  error_message: string | null;
  event_received_at: string | null;
  members: { full_name?: string | null; member_code?: string | null } | null;
};

type BiometricMappingRow = {
  id: string;
  member_id: string | null;
  machine_user_id: string | null;
  machine_name: string | null;
  match_status: string | null;
  verified: boolean | null;
  created_at: string | null;
  members?: { full_name?: string | null; member_code?: string | null } | null;
};

export default async function AdminAttendancePage() {
  const profile = await requireUser(["admin", "manager"]);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  let attendanceQuery = supabase
    .from("attendance")
    .select("id,attendance_date,entry_time,exit_time,duration_minutes,device_id,members(member_code,full_name)")
    .order("entry_time", { ascending: false })
    .limit(50);
  if (profile.branch_id) attendanceQuery = attendanceQuery.eq("branch_id", profile.branch_id);

  let syncLogsQuery = supabase
    .from("attendance_sync_logs")
    .select("id,device_id,machine_user_id,event_type,event_at,status,processing_result,error_message,event_received_at,member:members(full_name,member_code)")
    .order("event_received_at", { ascending: false })
    .limit(50);
  if (profile.branch_id) syncLogsQuery = syncLogsQuery.eq("branch_id", profile.branch_id);

  let mappingQuery = (supabase as any)
    .from("biometric_member_mapping")
    .select(`
      id,
      member_id,
      machine_user_id,
      machine_name,
      match_status,
      verified,
      created_at,
      members(full_name,member_code)
    `)
    .order("created_at", { ascending: false })
    .limit(25);

  if (profile.branch_id) {
    mappingQuery = mappingQuery.eq("members.branch_id", profile.branch_id);
  }

  const [
    { data: attendanceData },
    { data: syncLogsData, error: syncLogsError },
    { data: mappingData, error: mappingError },
  ] = await Promise.all([attendanceQuery, syncLogsQuery, mappingQuery]);

  if (syncLogsError && !isMissingSchemaError(syncLogsError)) {
    console.error("Unable to load attendance_sync_logs:", syncLogsError);
  }

  if (mappingError && !isMissingSchemaError(mappingError)) {
    console.error("Unable to load biometric_member_mapping:", mappingError);
  }

  const attendanceLogs = (attendanceData ?? []) as AttendanceLog[];
  const syncLogs: AttendanceSyncLog[] = isMissingSchemaError(syncLogsError)
    ? []
    : ((syncLogsData ?? []).map((row: any) => ({
        ...row,
        members: Array.isArray(row.member) ? row.member[0] ?? null : row.member ?? null,
      })) as AttendanceSyncLog[]);
  const mappings: BiometricMappingRow[] = isMissingSchemaError(mappingError)
    ? []
    : ((mappingData ?? []) as BiometricMappingRow[]);

  return (
    <div className="space-y-5">
      <div className="flex items-center">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Live records synced from configured face detection machines.</p>
        </div>
        <Link href="/admin/attendance" className={buttonVariants({ variant: "outline", className: "ml-auto" })}>
          <RefreshCw className="size-4" />Refresh
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-4 p-5"><Activity className="text-primary"/><div><p className="text-sm text-muted-foreground">Records today</p><p className="text-2xl font-bold">{attendanceLogs.filter((i) => i.attendance_date === today).length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><RadioTower className="text-emerald-600"/><div><p className="text-sm text-muted-foreground">Sync logs</p><p className="text-2xl font-bold">{syncLogs.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><Clock3 className="text-blue-600"/><div><p className="text-sm text-muted-foreground">Last update</p><p className="font-semibold">{syncLogs[0]?.event_received_at ? new Date(syncLogs[0].event_received_at).toLocaleTimeString("en-IN") : attendanceLogs[0]?.entry_time ? new Date(attendanceLogs[0].entry_time).toLocaleTimeString("en-IN") : "No records"}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Attendance logs</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr><th className="pb-3">Member</th><th>Date</th><th>Entry</th><th>Exit</th><th>Duration</th><th>Device</th></tr>
            </thead>
            <tbody className="divide-y">
              {attendanceLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 font-medium">{log.members?.full_name ?? "-"}</td>
                  <td>{log.attendance_date}</td>
                  <td>{log.entry_time ? new Date(log.entry_time).toLocaleTimeString("en-IN") : "-"}</td>
                  <td>{log.exit_time ? new Date(log.exit_time).toLocaleTimeString("en-IN") : "-"}</td>
                  <td>{log.duration_minutes ? `${log.duration_minutes} min` : "-"}</td>
                  <td><Badge variant="outline">{log.device_id}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!attendanceLogs.length && <p className="py-12 text-center text-muted-foreground">No attendance records yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Sync Logs</CardTitle>
          <p className="text-sm text-muted-foreground">Recent rows from attendance_sync_logs received by the biometric backend.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="pb-3">Member</th>
                <th className="pb-3">Member code</th>
                <th className="pb-3">Machine user ID</th>
                <th className="pb-3">Device</th>
                <th className="pb-3">Event</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Processing</th>
                <th className="pb-3">Event time</th>
                <th className="pb-3">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {syncLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 font-medium">{log.members?.full_name ?? "Unknown member"}</td>
                  <td>{log.members?.member_code ?? "-"}</td>
                  <td>{log.machine_user_id}</td>
                  <td><Badge variant="outline">{log.device_id}</Badge></td>
                  <td className="capitalize">{log.event_type}</td>
                  <td>
                    <Badge variant={log.status === "processed" ? "success" : log.status === "error" ? "danger" : "outline"}>
                      {log.status}
                    </Badge>
                  </td>
                  <td>{log.processing_result ?? (log.error_message ? "PROCESSING_ERROR" : "-")}</td>
                  <td>{new Date(log.event_at).toLocaleString("en-IN")}</td>
                  <td>{log.event_received_at ? new Date(log.event_received_at).toLocaleString("en-IN") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isMissingSchemaError(syncLogsError) ? (
            <p className="py-12 text-center text-muted-foreground">The attendance_sync_logs table is not available in the current schema.</p>
          ) : null}
          {!isMissingSchemaError(syncLogsError) && !syncLogs.length ? (
            <p className="py-12 text-center text-muted-foreground">No attendance sync logs found.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Biometric Member Mapping</CardTitle>
          <p className="text-sm text-muted-foreground">
            Recent rows from biometric_member_mapping linked to member records.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="pb-3">Member</th>
                <th className="pb-3">Member code</th>
                <th className="pb-3">Machine user ID</th>
                <th className="pb-3">Machine</th>
                <th className="pb-3">Match status</th>
                <th className="pb-3">Verified</th>
                <th className="pb-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mappings.map((mapping) => (
                <tr key={mapping.id}>
                  <td className="py-3 font-medium">{mapping.members?.full_name ?? "Unknown member"}</td>
                  <td>{mapping.members?.member_code ?? "-"}</td>
                  <td>{mapping.machine_user_id ?? "-"}</td>
                  <td>{mapping.machine_name ?? "-"}</td>
                  <td>
                    <Badge variant={mapping.match_status === "verified" ? "success" : "outline"}>
                      {mapping.match_status ?? "unknown"}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={mapping.verified ? "success" : "outline"}>
                      {mapping.verified ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td>{mapping.created_at ? new Date(mapping.created_at).toLocaleString("en-IN") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isMissingSchemaError(mappingError) ? (
            <p className="py-12 text-center text-muted-foreground">
              The biometric_member_mapping table is not available in the current schema.
            </p>
          ) : null}
          {!isMissingSchemaError(mappingError) && !mappings.length ? (
            <p className="py-12 text-center text-muted-foreground">No biometric member mappings found.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
