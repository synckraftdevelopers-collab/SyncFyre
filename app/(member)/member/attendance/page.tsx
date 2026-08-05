import { Activity, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My Attendance" };

export default async function MemberAttendancePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: memberRecord } = await supabase
    .from("members").select("id").eq("user_id", profile?.id ?? "").maybeSingle();
  const memberId = memberRecord?.id ?? null;

  const { data, count } = memberId
    ? await supabase
        .from("attendance")
        .select("id,attendance_date,entry_time,exit_time,duration_minutes", { count: "exact" })
        .eq("member_id", memberId)
        .order("attendance_date", { ascending: false })
        .limit(30)
    : { data: [], count: 0 };

  // This month count
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = (data ?? []).filter((r) => r.attendance_date?.startsWith(thisMonth)).length;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">My Attendance</h1>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total visits" value={count ?? 0} icon={Activity} tone="blue" />
        <MetricCard label="This month" value={thisMonthCount} icon={Clock3} tone="green" />
        <MetricCard label="Last visit" value={(data ?? [])[0]?.attendance_date ?? "—"} icon={Activity} />
      </section>

      <Card>
        <CardHeader><CardTitle>Recent visits</CardTitle></CardHeader>
        <CardContent>
          {(data ?? []).length ? (
            <div className="divide-y">
              {(data ?? []).map((r) => (
                <div key={r.id} className="flex items-center gap-4 py-3 text-sm">
                  <Activity className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{r.attendance_date}</p>
                    <p className="text-xs text-muted-foreground">
                      Entry: {r.entry_time ? new Date(r.entry_time).toLocaleTimeString("en-IN") : "—"}
                      {r.exit_time ? ` · Exit: ${new Date(r.exit_time).toLocaleTimeString("en-IN")}` : ""}
                    </p>
                  </div>
                  {r.duration_minutes && (
                    <span className="text-xs text-muted-foreground">{r.duration_minutes} min</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div><Activity className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No attendance records yet</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
