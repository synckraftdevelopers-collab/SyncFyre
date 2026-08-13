import { CalendarDays, Dumbbell, Gauge, UsersRound, Utensils } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getTrainerDashboard } from "@/services/trainer-portal.service";

export const metadata = { title: "Dashboard" };

export default async function TrainerDashboardPage() {
  const profile = await requireUser(["trainer", "dietician", "diet-planner", "diet_planner"]);
  const dashboard = await getTrainerDashboard(profile);
  const data = dashboard.data;

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">Trainer workspace</p>
        <h1 className="mt-2 text-2xl font-bold">Welcome, {profile.full_name.split(" ")[0]}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">Your assigned members, workouts, and diet plans at a glance.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Assigned members" value={data.assignedMembers} icon={UsersRound} tone="blue" />
        <MetricCard label="Today's sessions" value={data.todayAppointments} icon={CalendarDays} tone="green" />
        <MetricCard label="Active workouts" value={data.activeWorkouts} icon={Dumbbell} />
        <MetricCard label="Active diet plans" value={data.activeDietPlans} icon={Utensils} tone="green" />
        <MetricCard label="Progress records" value={data.progressRecords} icon={Gauge} tone="purple" />
      </section>
      {dashboard.error && <Card className="border-destructive/40"><CardContent className="py-4 text-sm text-destructive">{dashboard.error}</CardContent></Card>}
      <Card>
        <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
        <CardContent>
          {data.upcomingAppointments.length ? <div className="divide-y">{data.upcomingAppointments.map((appointment) => <div key={appointment.id} className="flex items-center gap-3 py-3"><CalendarDays className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="font-medium">{appointment.members?.full_name ?? "ï¿½"}</p><p className="text-xs text-muted-foreground">{appointment.appointment_date} at {appointment.start_time}</p></div><span className="text-xs capitalize text-muted-foreground">{appointment.status}</span></div>)}</div> : <div className="py-8 text-center text-sm text-muted-foreground">No upcoming appointments.</div>}
        </CardContent>
      </Card>
    </div>
  );
}