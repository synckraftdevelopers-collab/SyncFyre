import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Activity,
  Bell,
  CalendarDays,
  CircleDollarSign,
  IndianRupee,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import {
  getDashboardData,
  getRecentMembers,
  getRecentPayments,
  getRecentAttendance,
  getLatestRenewals,
} from "@/services/dashboard.service";

export const metadata = { title: "Reception Dashboard" };

const quickActions = [
  { label: "Add Member",         href: "/reception/members/new",       icon: UserPlus },
  { label: "Collect Payment",    href: "/reception/invoices/new",       icon: IndianRupee },
  { label: "Book Appointment",   href: "/reception/appointments/new",   icon: CalendarDays },
  { label: "View Attendance",    href: "/reception/attendance",         icon: Activity },
  { label: "Renew Membership",   href: "/reception/memberships/renew",  icon: ShieldCheck },
  { label: "View Members",       href: "/reception/members",            icon: UsersRound },
] as const;

export default async function ReceptionDashboardPage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const [
    { metrics, activities },
    recentMembers,
    recentPayments,
    recentAttendance,
    latestRenewals,
  ] = await Promise.all([
    getDashboardData(branchId),
    getRecentMembers(branchId, 5),
    getRecentPayments(branchId, 5),
    getRecentAttendance(branchId, 5),
    getLatestRenewals(branchId, 5),
  ]);

  return (
    <div className="space-y-7">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <div className="absolute bottom-0 right-28 h-24 w-4 skew-x-[-28deg] bg-primary/80" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">Reception desk</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          Welcome, {profile?.full_name.split(" ")[0]}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">
          Register members, collect payments, and manage appointments.
        </p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Members &amp; Attendance</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Members"      value={metrics.totalMembers}     icon={UsersRound}  href="/reception/members" />
          <MetricCard label="Active Members"     value={metrics.activeMembers}    icon={UserCheck}   tone="green" href="/reception/members?status=active" />
          <MetricCard label="Today's Attendance" value={metrics.todayAttendance}  icon={Activity}    tone="blue"  href="/reception/attendance" />
          <MetricCard label="Appointments Today" value={metrics.appointments}     icon={CalendarDays} tone="blue" href="/reception/appointments" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Memberships &amp; Finance</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Renewals Due (30d)"   value={metrics.expiringMemberships}          icon={ShieldAlert}       href="/reception/memberships" />
          <MetricCard label="Revenue Today"         value={formatCurrency(metrics.revenue)}      icon={IndianRupee}   tone="green" href="/reception/payments" />
          <MetricCard label="Pending Payments"      value={formatCurrency(metrics.pendingPayments)} icon={CircleDollarSign} href="/reception/payments?status=pending" />
        </div>
      </section>

      {/* ── Unread notifications ──────────────────────────────────────────── */}
      {metrics.notifications > 0 && (
        <Link
          href="/reception/notifications"
          className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm hover:bg-primary/10 transition-colors"
        >
          <Bell className="size-4 text-primary" />
          <span>
            You have <strong>{metrics.notifications}</strong> unread notification{metrics.notifications !== 1 ? "s" : ""}
          </span>
          <span className="ml-auto text-primary">View →</span>
        </Link>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <action.icon className="size-4" />
                </div>
                <span className="text-xs font-medium leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Live feeds ───────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Latest Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Latest Members</CardTitle>
            <Link href="/reception/members" className={buttonVariants({ variant: "ghost", size: "sm" })}>View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentMembers.length === 0 ? (
              <EmptyFeed text="No members yet." />
            ) : (
              <ul className="divide-y">
                {recentMembers.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/reception/members/${m.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {m.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">{m.member_code} · {m.phone}</p>
                      </div>
                      <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {m.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Payments</CardTitle>
            <Link href="/reception/payments" className={buttonVariants({ variant: "ghost", size: "sm" })}>View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <EmptyFeed text="No payments yet." />
            ) : (
              <ul className="divide-y">
                {recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600">₹</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.members?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {p.payment_method} · {p.paid_at ? format(parseISO(p.paid_at), "dd MMM") : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{formatCurrency(Number(p.amount))}</p>
                      <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                        {p.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Attendance Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Attendance Logs</CardTitle>
            <Link href="/reception/attendance" className={buttonVariants({ variant: "ghost", size: "sm" })}>View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentAttendance.length === 0 ? (
              <EmptyFeed text="No check-ins yet today." />
            ) : (
              <ul className="divide-y">
                {recentAttendance.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#52c7ea]/15 text-xs font-bold text-[#168caf]">✓</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.members?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.members?.member_code} · {format(parseISO(a.attendance_date), "dd MMM yyyy")}
                      </p>
                    </div>
                    {a.entry_time_ist && (
                      <span className="text-xs text-muted-foreground">{a.entry_time_ist}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Latest Renewals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Latest Renewals</CardTitle>
            <Link href="/reception/memberships" className={buttonVariants({ variant: "ghost", size: "sm" })}>View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            {latestRenewals.length === 0 ? (
              <EmptyFeed text="No renewals yet." />
            ) : (
              <ul className="divide-y">
                {latestRenewals.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">↻</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.members?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.membership_plans?.name ?? "Plan"} · expires {format(parseISO(r.end_date), "dd MMM yyyy")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">×{r.times_renewed}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {activities.length ? (
            <div className="divide-y">
              {activities.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <span className="size-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.description ?? item.action}</p>
                    <p className="text-xs capitalize text-muted-foreground">{item.entity_type}</p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("en-IN")}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <EmptyFeed text="Activity will appear here as your team works." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyFeed({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{text}</div>;
}
