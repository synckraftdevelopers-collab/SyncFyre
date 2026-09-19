import { Activity, Clock3, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Attendance" };

const SORTABLE_COLUMNS = [
  { label: "Member", column: "member" as const },
  { label: "Entry", column: "entry" as const },
  { label: "Exit", column: "exit" as const },
  { label: "Duration", column: "duration" as const },
  { label: "Device", column: "device" as const },
];

export default async function ReceptionAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requireUser(["reception"]);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("attendance")
    .select("id,attendance_date,entry_time,exit_time,duration_minutes,device_id,members(member_code,full_name)")
    .order("entry_time", { ascending: false })
    .limit(50);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data } = await query;
  let logs = data ?? [];

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (log: (typeof logs)[number]): string => {
      const member = log.members as unknown as { full_name: string } | null;
      switch (colSort) {
        case "member": return member?.full_name ?? "";
        case "entry": return log.entry_time ?? "";
        case "exit": return log.exit_time ?? "";
        case "duration": return String(log.duration_minutes ?? "");
        case "device": return log.device_id ?? "";
        default: return "";
      }
    };
    logs = [...logs].sort((a, b) => sortValue(a).localeCompare(sortValue(b)) * dirMul);
  }

  const todayCount = logs.filter((r) => r.attendance_date === today).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Live check-ins synced from face detection devices.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-4 p-5"><Activity className="text-primary" /><div><p className="text-sm text-muted-foreground">Present today</p><p className="text-2xl font-bold">{todayCount}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><RadioTower className="text-emerald-600" /><div><p className="text-sm text-muted-foreground">Integration</p><Badge variant="success">Sync API ready</Badge></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><Clock3 className="text-blue-600" /><div><p className="text-sm text-muted-foreground">Last update</p><p className="font-semibold">{data?.[0]?.entry_time ? new Date(data[0].entry_time).toLocaleTimeString("en-IN") : "No records"}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Today&apos;s attendance log</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                {SORTABLE_COLUMNS.map(({ label, column }) => (
                  <SortableTh
                    key={column}
                    label={label}
                    column={column}
                    basePath="/reception/attendance"
                    searchParams={sp as Record<string, string | undefined>}
                    currentSort={colSort}
                    currentDir={colDir}
                    paramNames={{ sort: "colSort", dir: "colDir" }}
                    className="pb-3 font-medium"
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 font-medium">{(log.members as unknown as { full_name: string } | null)?.full_name ?? "—"}</td>
                  <td>{log.entry_time ? new Date(log.entry_time).toLocaleTimeString("en-IN") : "—"}</td>
                  <td>{log.exit_time ? new Date(log.exit_time).toLocaleTimeString("en-IN") : "—"}</td>
                  <td>{log.duration_minutes ? `${log.duration_minutes} min` : "—"}</td>
                  <td><Badge variant="outline">{log.device_id}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && <p className="py-12 text-center text-muted-foreground">No attendance records yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
