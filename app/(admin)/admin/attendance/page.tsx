import Link from "next/link";
import { Activity, Clock3, RadioTower, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Attendance" };

export default async function AdminAttendancePage() {
  const profile = await requireUser(["admin", "manager"]);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from("attendance")
    .select("id,attendance_date,entry_time,exit_time,duration_minutes,device_id,members(member_code,full_name)")
    .order("entry_time", { ascending: false })
    .limit(50);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data } = await query;

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
        <Card><CardContent className="flex items-center gap-4 p-5"><Activity className="text-primary"/><div><p className="text-sm text-muted-foreground">Records today</p><p className="text-2xl font-bold">{(data ?? []).filter(i => i.attendance_date === today).length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><RadioTower className="text-emerald-600"/><div><p className="text-sm text-muted-foreground">Integration</p><Badge variant="success">Sync API ready</Badge></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><Clock3 className="text-blue-600"/><div><p className="text-sm text-muted-foreground">Last update</p><p className="font-semibold">{data?.[0]?.entry_time ? new Date(data[0].entry_time).toLocaleTimeString("en-IN") : "No records"}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Attendance logs</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr><th className="pb-3">Member</th><th>Date</th><th>Entry</th><th>Exit</th><th>Duration</th><th>Device</th></tr>
            </thead>
            <tbody className="divide-y">
              {(data ?? []).map(log => (
                <tr key={log.id}>
                  <td className="py-3 font-medium">{(log.members as unknown as { full_name: string })?.full_name}</td>
                  <td>{log.attendance_date}</td>
                  <td>{log.entry_time ? new Date(log.entry_time).toLocaleTimeString("en-IN") : "—"}</td>
                  <td>{log.exit_time ? new Date(log.exit_time).toLocaleTimeString("en-IN") : "—"}</td>
                  <td>{log.duration_minutes ? `${log.duration_minutes} min` : "—"}</td>
                  <td><Badge variant="outline">{log.device_id}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.length && <p className="py-12 text-center text-muted-foreground">No attendance records yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
