import { Activity, CalendarDays, CircleDollarSign, IndianRupee, ShieldAlert, UserCheck, UsersRound } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getDashboardData } from "@/services/dashboard.service";

export const metadata = { title: "Dashboard" };

export default async function ReceptionDashboardPage() {
  const profile = await getCurrentProfile();
  const { metrics, activities } = await getDashboardData(profile?.branch_id);

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">Reception desk</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Welcome, {profile?.full_name.split(" ")[0]}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">Register members, collect payments, and manage appointments.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total members"     value={metrics.totalMembers}                  icon={UsersRound} />
        <MetricCard label="Today's attendance" value={metrics.todayAttendance}              icon={Activity}      tone="blue" />
        <MetricCard label="Active members"    value={metrics.activeMembers}                 icon={UserCheck}     tone="green" />
        <MetricCard label="Expiring soon"     value={metrics.expiringMemberships}           icon={ShieldAlert} />
        <MetricCard label="Today's revenue"   value={formatCurrency(metrics.revenue)}       icon={IndianRupee}   tone="green" />
        <MetricCard label="Pending payments"  value={formatCurrency(metrics.pendingPayments)} icon={CircleDollarSign} />
        <MetricCard label="Appointments"      value={metrics.appointments}                  icon={CalendarDays}  tone="blue" />
      </section>

      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent>
          {activities.length ? (
            <div className="divide-y">
              {activities.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <span className="size-2 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.description ?? item.action}</p>
                    <p className="text-xs capitalize text-muted-foreground">{item.entity_type}</p>
                  </div>
                  <time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("en-IN")}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Activity will appear here as your team works.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
