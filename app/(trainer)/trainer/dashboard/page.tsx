import { CalendarDays, Dumbbell, Gauge, UsersRound } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function TrainerDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Fetch trainer-specific metrics
  const [assignedResult, appointmentsResult, workoutsResult, progressResult] = await Promise.all([
    // Members assigned to this trainer
    supabase.from("members").select("id", { count: "exact", head: true }).eq("assigned_trainer_id",
      // look up trainer record by user id
      supabase.from("trainers").select("id").eq("user_id", profile?.id ?? "").single() as unknown as string
    ),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("provider_staff_id", profile?.id ?? "").eq("appointment_date", today),
    supabase.from("workouts").select("id", { count: "exact", head: true }).eq("trainer_id", profile?.id ?? ""),
    supabase.from("progress").select("id", { count: "exact", head: true }).eq("recorded_by", profile?.id ?? ""),
  ]);

  // Simpler approach: just count from the trainer record
  const { data: trainerRecord } = await supabase
    .from("trainers")
    .select("id")
    .eq("user_id", profile?.id ?? "")
    .single();

  const trainerId = trainerRecord?.id ?? "";

  const [membersCount, todayAppointments, totalWorkouts, recentActivities] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("assigned_trainer_id", trainerId),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("provider_staff_id", trainerId).eq("appointment_date", today),
    supabase.from("workouts").select("id", { count: "exact", head: true }).eq("trainer_id", trainerId),
    supabase.from("appointments").select("id, appointment_date, start_time, members(full_name), status").eq("provider_staff_id", trainerId).order("appointment_date", { ascending: false }).limit(5),
  ]);

  void assignedResult; void appointmentsResult; void workoutsResult; void progressResult;

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">Trainer workspace</p>
        <h1 className="mt-2 text-2xl font-bold">Welcome, {profile?.full_name.split(" ")[0]}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">Your assigned members, sessions, and workouts at a glance.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Assigned members"    value={membersCount.count ?? 0}        icon={UsersRound}  tone="blue" />
        <MetricCard label="Today's sessions"    value={todayAppointments.count ?? 0}   icon={CalendarDays} tone="green" />
        <MetricCard label="Active workouts"     value={totalWorkouts.count ?? 0}       icon={Dumbbell} />
        <MetricCard label="Progress records"    value={progressResult.count ?? 0}      icon={Gauge}       tone="purple" />
      </section>

      <Card>
        <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
        <CardContent>
          {recentActivities.data?.length ? (
            <div className="divide-y">
              {recentActivities.data.map((appt) => (
                <div key={appt.id} className="flex items-center gap-3 py-3">
                  <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{(appt.members as unknown as { full_name: string } | null)?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{appt.appointment_date} at {appt.start_time}</p>
                  </div>
                  <span className="text-xs capitalize text-muted-foreground">{appt.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">No upcoming appointments.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
