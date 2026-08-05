import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Appointments" };

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  approved: "success", pending: "warning", cancelled: "danger", completed: "outline",
};

export default async function ReceptionAppointmentsPage() {
  const profile = await requireUser(["reception"]);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("appointments")
    .select("id,appointment_date,start_time,end_time,status,provider_type,purpose,members(full_name,member_code)")
    .gte("appointment_date", today)
    .order("appointment_date")
    .order("start_time")
    .limit(50);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data } = await query;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Upcoming sessions — book and manage member appointments.</p>
        </div>
        <Link href="/reception/appointments/new" className={buttonVariants({ className: "ml-auto" })}>
          <Plus className="size-4" />Book appointment
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {data?.length ? (
            <table className="w-full min-w-[650px] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>{["Member", "Date", "Time", "Type", "Purpose", "Status"].map((h) => <th key={h} className="pb-3 pr-4 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {data.map((appt) => (
                  <tr key={appt.id}>
                    <td className="py-3 pr-4 font-medium">{(appt.members as unknown as { full_name: string } | null)?.full_name ?? "—"}</td>
                    <td className="pr-4">{appt.appointment_date}</td>
                    <td className="pr-4">{appt.start_time} – {appt.end_time}</td>
                    <td className="pr-4 capitalize text-muted-foreground">{appt.provider_type}</td>
                    <td className="pr-4 text-muted-foreground max-w-40 truncate">{appt.purpose ?? "—"}</td>
                    <td><Badge variant={statusVariant[appt.status] ?? "outline"}>{appt.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div><CalendarDays className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No upcoming appointments</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
