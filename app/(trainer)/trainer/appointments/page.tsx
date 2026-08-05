import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Appointments" };

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  approved: "success", pending: "warning", cancelled: "danger", completed: "outline",
};

export default async function TrainerAppointmentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: trainerRecord } = await supabase
    .from("trainers").select("id").eq("user_id", profile?.id ?? "").single();
  const trainerId = trainerRecord?.id ?? "";

  const { data } = await supabase
    .from("appointments")
    .select("id,appointment_date,start_time,end_time,status,purpose,members(full_name,member_code)")
    .eq("provider_staff_id", trainerId)
    .gte("appointment_date", today)
    .order("appointment_date")
    .order("start_time")
    .limit(50);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Your upcoming member sessions.</p>
        </div>
        <Link href="/trainer/appointments/new" className={buttonVariants({ className: "ml-auto" })}>
          <Plus className="size-4" />New appointment
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming sessions</CardTitle></CardHeader>
        <CardContent>
          {data?.length ? (
            <div className="divide-y">
              {data.map((appt) => (
                <div key={appt.id} className="flex items-center gap-4 py-4">
                  <CalendarDays className="size-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{(appt.members as unknown as { full_name: string } | null)?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{appt.appointment_date} · {appt.start_time} – {appt.end_time}</p>
                    {appt.purpose && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{appt.purpose}</p>}
                  </div>
                  <Badge variant={statusVariant[appt.status] ?? "outline"}>{appt.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div><CalendarDays className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No upcoming sessions</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
