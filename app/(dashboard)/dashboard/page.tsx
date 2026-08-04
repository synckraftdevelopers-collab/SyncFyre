import { Activity, CalendarDays, CircleDollarSign, Dumbbell, IndianRupee, ShieldAlert, UserCheck, UserRoundCog, UsersRound, UserX } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/charts";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import {
  getDashboardData,
  getRevenueChartData,
  getAttendanceChartData,
  getPlanDistributionData,
} from "@/services/dashboard.service";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const [{ metrics, activities }, revenue, attendance, plans] = await Promise.all([
    getDashboardData(branchId),
    getRevenueChartData(branchId),
    getAttendanceChartData(branchId),
    getPlanDistributionData(branchId),
  ]);

  return (
    <div className="space-y-7">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <div className="absolute bottom-0 right-28 h-24 w-4 skew-x-[-28deg] bg-primary/80" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">Operations overview</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          Welcome back, {profile?.full_name.split(" ")[0]}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">
          Everything happening across your gym, in one intelligent workspace.
        </p>
      </div>

      {/* Metric cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total members" value={metrics.totalMembers} icon={UsersRound} />
        <MetricCard label="Today's attendance" value={metrics.todayAttendance} icon={Activity} tone="blue" />
        <MetricCard label="Active members" value={metrics.activeMembers} icon={UserCheck} tone="green" />
        <MetricCard label="Inactive members" value={metrics.inactiveMembers} icon={UserX} />
        <MetricCard label="Expiring soon" value={metrics.expiringMemberships} icon={ShieldAlert} />
        <MetricCard label="Today's revenue" value={formatCurrency(metrics.revenue)} icon={IndianRupee} tone="green" />
        <MetricCard label="Pending payments" value={formatCurrency(metrics.pendingPayments)} icon={CircleDollarSign} />
        <MetricCard label="Appointments" value={metrics.appointments} icon={CalendarDays} tone="blue" />
        <MetricCard label="Trainers" value={metrics.trainers} icon={UserRoundCog} tone="purple" />
        <MetricCard label="Machines" value={metrics.machines} icon={Dumbbell} />
      </section>

      {/* Live charts */}
      <DashboardCharts
        revenueData={revenue}
        attendanceData={attendance}
        planData={plans}
      />

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
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
                  <time className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("en-IN")}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Activity will appear here as your team starts working.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
