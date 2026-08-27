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

type MappingMember = {
  id?: string | null;
  full_name?: string | null;
  member_code?: string | null;
  machine_user_id?: string | null;
  status?: string | null;
  branch_id?: string | null;
};

type BiometricMappingRow = {
  id: string;
  member_id: string | null;
  matched_machine_user_id: string | null;
  machine_name: string | null;
  match_type: string | null;
  is_confident_match: boolean | null;
  created_at: string | null;
  members?: MappingMember | MappingMember[] | null;
};

type MappedMemberRow = {
  member_id: string;
  member_code: string | null;
  full_name: string | null;
  machine_user_id: string | null;
  matched_machine_user_id: string | null;
  machine_name: string | null;
  status: string | null;
  subscription_end: string | null;
  balance_amount: number;
};

function cleanSearch(value: string | undefined) {
  return (value ?? "").trim();
}

function firstMember(value: MappingMember | MappingMember[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; machine?: string; expiry?: string; amount?: string }>;
}) {
  const profile = await requireUser(["admin", "manager"]);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const sp = await searchParams;
  const nameFilter = cleanSearch(sp.name);
  const machineFilter = cleanSearch(sp.machine);
  const expiryFilter = cleanSearch(sp.expiry);
  const amountFilter = cleanSearch(sp.amount);
  const minAmount = amountFilter ? Number(amountFilter) : Number.NaN;

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
    .from("member_machine_mappings")
    .select(`
      id,
      member_id,
      matched_machine_user_id,
      machine_name,
      match_type,
      is_confident_match,
      created_at,
      members!inner(id,full_name,member_code,machine_user_id,status,branch_id)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (profile.branch_id) mappingQuery = mappingQuery.eq("branch_id", profile.branch_id);
  if (nameFilter) mappingQuery = mappingQuery.ilike("member_name", `%${nameFilter.replace(/[%_,]/g, "")}%`);
  if (machineFilter) {
    const machineSearch = machineFilter.replace(/[%_,]/g, "");
    mappingQuery = mappingQuery.or(`matched_machine_user_id.ilike.%${machineSearch}%,existing_machine_user_id.ilike.%${machineSearch}%,machine_name.ilike.%${machineSearch}%`);
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
    console.error("Unable to load member_machine_mappings:", mappingError);
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

  const mappedMembersBase = mappings
    .map((mapping) => {
      const member = firstMember(mapping.members);
      if (!mapping.member_id || !member) return null;
      return {
        member_id: mapping.member_id,
        member_code: member.member_code ?? null,
        full_name: member.full_name ?? null,
        machine_user_id: member.machine_user_id ?? null,
        matched_machine_user_id: mapping.matched_machine_user_id ?? null,
        machine_name: mapping.machine_name ?? null,
        status: member.status ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const memberIds = mappedMembersBase.map((row) => row.member_id);
  const [subscriptionsResult, receivablesResult] = memberIds.length
    ? await Promise.all([
        supabase
          .from("subscriptions")
          .select("member_id,end_date,status")
          .in("member_id", memberIds)
          .in("status", ["active", "pending", "paused"])
          .order("end_date", { ascending: false }),
        supabase
          .from("receivables")
          .select("member_id,balance_amount,status")
          .in("member_id", memberIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  const subscriptionMap = new Map<string, string | null>();
  for (const row of (subscriptionsResult.data ?? []) as Array<{ member_id: string; end_date: string; status: string }>) {
    if (!subscriptionMap.has(row.member_id)) subscriptionMap.set(row.member_id, row.end_date);
  }

  const receivableMap = new Map<string, number>();
  for (const row of (receivablesResult.data ?? []) as Array<{ member_id: string; balance_amount: number | string | null; status: string }>) {
    const current = receivableMap.get(row.member_id) ?? 0;
    receivableMap.set(row.member_id, current + Number(row.balance_amount ?? 0));
  }

  const mappedMembers: MappedMemberRow[] = mappedMembersBase
    .map((row) => ({
      ...row,
      subscription_end: subscriptionMap.get(row.member_id) ?? null,
      balance_amount: receivableMap.get(row.member_id) ?? 0,
    }))
    .filter((row) => !expiryFilter || ((row.subscription_end ?? "") !== "" && (row.subscription_end ?? "") <= expiryFilter))
    .filter((row) => Number.isNaN(minAmount) || row.balance_amount >= minAmount);

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
        <CardHeader>
          <CardTitle>Mapped Members Search</CardTitle>
          <p className="text-sm text-muted-foreground">Search by user name, machine ID, expiry date, and pending amount. Use Edit user to update the member name or machine ID.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input name="name" defaultValue={nameFilter} placeholder="Search user name" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="machine" defaultValue={machineFilter} placeholder="Search machine ID or machine name" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="expiry" defaultValue={expiryFilter} type="date" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="amount" defaultValue={amountFilter} type="number" min="0" step="0.01" placeholder="Min pending amount" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
              <button className={buttonVariants({ variant: "outline" })}>Apply filters</button>
              <Link href="/admin/attendance" className={buttonVariants({ variant: "ghost" })}>Reset</Link>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="pb-3">User name</th>
                  <th className="pb-3">Member code</th>
                  <th className="pb-3">Current machine ID</th>
                  <th className="pb-3">Matched machine ID</th>
                  <th className="pb-3">Machine name</th>
                  <th className="pb-3">Expiry</th>
                  <th className="pb-3">Pending amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mappedMembers.map((row) => (
                  <tr key={row.member_id}>
                    <td className="py-3 font-medium">{row.full_name ?? "-"}</td>
                    <td>{row.member_code ?? "-"}</td>
                    <td>{row.machine_user_id ?? "-"}</td>
                    <td>{row.matched_machine_user_id ?? "-"}</td>
                    <td>{row.machine_name ?? "-"}</td>
                    <td>{row.subscription_end ?? "-"}</td>
                    <td>{`Rs. ${row.balance_amount.toFixed(2)}`}</td>
                    <td>
                      <Badge variant={row.status === "active" ? "success" : "outline"}>
                        {row.status ?? "unknown"}
                      </Badge>
                    </td>
                    <td>
                      <Link href={`/admin/members/${row.member_id}?edit=1`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Edit user
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!mappedMembers.length ? <p className="py-8 text-center text-muted-foreground">No mapped members found for the current filters.</p> : null}
        </CardContent>
      </Card>

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
          <p className="text-sm text-muted-foreground">Recent rows from member_machine_mappings linked to member records.</p>
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
              {mappings.map((mapping) => {
                const member = firstMember(mapping.members);
                return (
                  <tr key={mapping.id}>
                    <td className="py-3 font-medium">{member?.full_name ?? "Unknown member"}</td>
                    <td>{member?.member_code ?? "-"}</td>
                    <td>{mapping.matched_machine_user_id ?? "-"}</td>
                    <td>{mapping.machine_name ?? "-"}</td>
                    <td>
                      <Badge variant={mapping.match_type === "name+existing_machine_id" ? "success" : "outline"}>
                        {mapping.match_type ?? "unknown"}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={mapping.is_confident_match ? "success" : "outline"}>
                        {mapping.is_confident_match ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td>{mapping.created_at ? new Date(mapping.created_at).toLocaleString("en-IN") : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isMissingSchemaError(mappingError) ? (
            <p className="py-12 text-center text-muted-foreground">The member_machine_mappings table is not available in the current schema.</p>
          ) : null}
          {!isMissingSchemaError(mappingError) && !mappings.length ? (
            <p className="py-12 text-center text-muted-foreground">No biometric member mappings found.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
