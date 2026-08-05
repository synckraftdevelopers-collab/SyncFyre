import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My Appointments" };

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  approved: "success", pending: "warning", cancelled: "danger", completed: "outline",
};

export default async function MemberAppointmentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: memberRecord } = await supabase
    .from("members").select("id").eq("user_id", profile?.id ?? "").maybeSingle();
  const memberId = memberRecord?.id ?? null;

  const today = new Date().toISOString().slice(0, 10);

  const [upcoming, past] = await Promise.all([
    memberId
      ? supabase.from("appointments").select("id,appointment_date,start_time,end_time,status,provider_type,purpose").eq("member_id", memberId).gte("appointment_date", today).order("appointment_date").limit(10)
      : Promise.resolve({ data: [] }),
    memberId
      ? supabase.from("appointments").select("id,appointment_date,start_time,status,provider_type").eq("member_id", memberId).lt("appointment_date", today).order("appointment_date", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">My Appointments</h1>

      <Card>
        <CardHeader><CardTitle>Upcoming sessions</CardTitle></CardHeader>
        <CardContent>
          {(upcoming as { data: { id: string; appointment_date: string; start_time: string; end_time: string; status: string; provider_type: string; purpose: string | null }[] | null }).data?.length ? (
            <div className="divide-y">
              {((upcoming as { data: { id: string; appointment_date: string; start_time: string; end_time: string; status: string; provider_type: string; purpose: string | null }[] }).data).map((a) => (
                <div key={a.id} className="flex items-center gap-4 py-4">
                  <CalendarDays className="size-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold capitalize">{a.provider_type} session</p>
                    <p className="text-xs text-muted-foreground">{a.appointment_date} · {a.start_time} – {a.end_time}</p>
                    {a.purpose && <p className="mt-0.5 text-xs text-muted-foreground">{a.purpose}</p>}
                  </div>
                  <Badge variant={statusVariant[a.status] ?? "outline"}>{a.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-32 place-items-center text-center text-sm text-muted-foreground">No upcoming appointments.</div>
          )}
        </CardContent>
      </Card>

      {(past as { data: unknown[] | null }).data?.length ? (
        <Card>
          <CardHeader><CardTitle>Past sessions</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {((past as { data: { id: string; appointment_date: string; start_time: string; status: string; provider_type: string }[] }).data).map((a) => (
              <div key={a.id} className="flex items-center gap-4 py-3 text-sm">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium capitalize">{a.provider_type} session</p>
                  <p className="text-xs text-muted-foreground">{a.appointment_date} at {a.start_time}</p>
                </div>
                <Badge variant={statusVariant[a.status] ?? "outline"}>{a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
