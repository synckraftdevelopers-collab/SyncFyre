import { Activity, CalendarDays, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My Dashboard" };

export default async function MemberDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Find the member record linked to this user
  const { data: memberRecord } = await supabase
    .from("members")
    .select("id, member_code, status, full_name")
    .eq("user_id", profile?.id ?? "")
    .maybeSingle();

  const memberId = memberRecord?.id ?? null;

  const [attendanceCount, activeSubscription, upcomingAppts] = await Promise.all([
    memberId
      ? supabase.from("attendance").select("id", { count: "exact", head: true }).eq("member_id", memberId)
      : Promise.resolve({ count: 0 }),
    memberId
      ? supabase.from("subscriptions").select("id, end_date, status, membership_plans(name)").eq("member_id", memberId).eq("status", "active").order("end_date", { ascending: false }).limit(1)
      : Promise.resolve({ data: [] }),
    memberId
      ? supabase.from("appointments").select("id, appointment_date, start_time, status, provider_type").eq("member_id", memberId).gte("appointment_date", today).order("appointment_date").limit(3)
      : Promise.resolve({ data: [] }),
  ]);

  const subscription = (activeSubscription as { data: { id: string; end_date: string; status: string; membership_plans: unknown }[] | null }).data?.[0];
  const planName = (subscription?.membership_plans as { name: string } | null)?.name ?? "—";
  const daysLeft = subscription?.end_date
    ? Math.max(0, Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">My portal</p>
        <h1 className="mt-2 text-2xl font-bold">Welcome back, {profile?.full_name.split(" ")[0]}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">Your fitness journey, subscriptions, and appointments in one place.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total visits"       value={attendanceCount.count ?? 0}  icon={Activity}    tone="blue" />
        <MetricCard label="Active plan"        value={planName}                     icon={ShieldCheck} tone="green" />
        <MetricCard label="Days remaining"     value={daysLeft ?? "—"}              icon={CalendarDays} />
      </section>

      {/* Upcoming appointments */}
      <Card>
        <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
        <CardContent>
          {(upcomingAppts as { data: { id: string; appointment_date: string; start_time: string; status: string; provider_type: string }[] | null }).data?.length ? (
            <div className="divide-y">
              {((upcomingAppts as { data: { id: string; appointment_date: string; start_time: string; status: string; provider_type: string }[] }).data).map((appt) => (
                <div key={appt.id} className="flex items-center gap-3 py-3">
                  <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium capitalize">{appt.provider_type} session</p>
                    <p className="text-xs text-muted-foreground">{appt.appointment_date} at {appt.start_time}</p>
                  </div>
                  <Badge variant={appt.status === "approved" ? "success" : "outline"}>{appt.status}</Badge>
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
