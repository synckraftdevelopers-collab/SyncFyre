import { CalendarDays, Dumbbell, Gauge, UsersRound, Utensils } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function TrainerDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: trainer } = await supabase.from("trainers").select("id").eq("user_id", profile?.id ?? "").single();
  const trainerId = trainer?.id ?? "";
  const { data: assignedMembers, count: membersCount } = trainerId
    ? await supabase.from("members").select("id", { count: "exact" }).eq("assigned_trainer_id", trainerId).eq("status", "active")
    : { data: [] as { id: string }[], count: 0 };
  const memberIds = (assignedMembers ?? []).map((member) => member.id);

  const [todayAppointments, workouts, dietPlans, progressRecords, recentAppointments] = await Promise.all([
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("provider_staff_id", trainerId).eq("appointment_date", today),
    memberIds.length ? supabase.from("workouts").select("id", { count: "exact", head: true }).in("member_id", memberIds).eq("status", "active") : Promise.resolve({ count: 0 }),
    memberIds.length ? supabase.from("diet_plans").select("id", { count: "exact", head: true }).in("member_id", memberIds).eq("status", "active") : Promise.resolve({ count: 0 }),
    supabase.from("progress").select("id", { count: "exact", head: true }).eq("recorded_by", profile?.id ?? ""),
    supabase.from("appointments").select("id, appointment_date, start_time, members(full_name), status").eq("provider_staff_id", trainerId).gte("appointment_date", today).order("appointment_date").limit(5),
  ]);

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">Trainer workspace</p>
        <h1 className="mt-2 text-2xl font-bold">Welcome, {profile?.full_name.split(" ")[0]}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">Your assigned members, workouts, and diet plans at a glance.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Assigned members" value={membersCount ?? 0} icon={UsersRound} tone="blue" />
        <MetricCard label="Today's sessions" value={todayAppointments.count ?? 0} icon={CalendarDays} tone="green" />
        <MetricCard label="Active workouts" value={workouts.count ?? 0} icon={Dumbbell} />
        <MetricCard label="Active diet plans" value={dietPlans.count ?? 0} icon={Utensils} tone="green" />
        <MetricCard label="Progress records" value={progressRecords.count ?? 0} icon={Gauge} tone="purple" />
      </section>
      <Card>
        <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
        <CardContent>
          {recentAppointments.data?.length ? <div className="divide-y">{recentAppointments.data.map((appointment) => <div key={appointment.id} className="flex items-center gap-3 py-3"><CalendarDays className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="font-medium">{(appointment.members as unknown as { full_name: string } | null)?.full_name ?? "—"}</p><p className="text-xs text-muted-foreground">{appointment.appointment_date} at {appointment.start_time}</p></div><span className="text-xs capitalize text-muted-foreground">{appointment.status}</span></div>)}</div> : <div className="py-8 text-center text-sm text-muted-foreground">No upcoming appointments.</div>}
        </CardContent>
      </Card>
    </div>
  );
}