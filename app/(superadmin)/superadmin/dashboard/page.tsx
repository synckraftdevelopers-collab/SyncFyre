import Link from "next/link";
import { addDays, differenceInCalendarDays, isAfter, isBefore, startOfDay } from "date-fns";
import { Activity, Building2, Calendar, CreditCard, GitBranch, UserCog, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Super Admin Dashboard" };

export default async function SuperAdminDashboardPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const monthAgo = addDays(new Date(), -30).toISOString();
  const today = startOfDay(new Date());

  const [
    { data: tenants, error: tenantsError },
    { count: demos },
    { count: totalUsers },
    { count: totalMembers },
    { count: totalBranches },
    { count: connectedMachines },
    { data: payments, error: paymentsError },
    { data: owners, error: ownersError },
  ] = await Promise.all([
    admin.from("tenants").select("id,status,plan,trial_starts_at,trial_ends_at"),
    admin.from("demo_bookings").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
    admin.from("users").select("id", { count: "exact", head: true }).not("tenant_id", "is", null),
    admin.from("members").select("id", { count: "exact", head: true }),
    admin.from("branches").select("id", { count: "exact", head: true }),
    admin.from("face_machine_settings").select("id", { count: "exact", head: true }).eq("connection_status", "online"),
    admin.from("payments").select("amount").eq("status", "completed").gte("paid_at", monthAgo).limit(1000),
    admin.from("users").select("id, role:roles(slug)").not("tenant_id", "is", null),
  ]);

  if (tenantsError) throw tenantsError;
  if (paymentsError) throw paymentsError;
  if (ownersError) throw ownersError;

  const tenantRows = tenants ?? [];
  const monthCollection = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalGyms = tenantRows.length;
  const activeGyms = tenantRows.filter((tenant) => tenant.status === "active").length;
  const trialGyms = tenantRows.filter((tenant) => tenant.status === "trial").length;
  const expiredTrials = tenantRows.filter((tenant) => tenant.status === "trial" && tenant.trial_ends_at && isBefore(new Date(tenant.trial_ends_at), today)).length;
  const suspendedGyms = tenantRows.filter((tenant) => tenant.status === "suspended").length;
  const totalOwners = (owners ?? []).filter((row) => {
    const roleValue = row.role as { slug?: string } | { slug?: string }[] | null;
    const role = Array.isArray(roleValue) ? roleValue[0] : roleValue;
    return role?.slug === "owner";
  }).length;

  const stats = [
    { label: "Total gyms", value: totalGyms, icon: Building2, href: "/superadmin/tenants", tone: "blue" },
    { label: "Active gyms", value: activeGyms, icon: Building2, href: "/superadmin/tenants", tone: "green" },
    { label: "Trial gyms", value: trialGyms, icon: Calendar, href: "/superadmin/tenants", tone: "amber" },
    { label: "Expired trials", value: expiredTrials, icon: Calendar, href: "/superadmin/tenants", tone: "red" },
    { label: "Suspended gyms", value: suspendedGyms, icon: Building2, href: "/superadmin/tenants", tone: "slate" },
    { label: "Total owners", value: totalOwners, icon: UserCog, href: "/superadmin/users", tone: "blue" },
    { label: "Total users", value: totalUsers ?? 0, icon: Users, href: "/superadmin/users", tone: "slate" },
    { label: "Total members", value: totalMembers ?? 0, icon: Users, href: "/superadmin/reports", tone: "green" },
    { label: "Total branches", value: totalBranches ?? 0, icon: GitBranch, href: "/superadmin/tenants", tone: "blue" },
    { label: "Connected machines", value: connectedMachines ?? 0, icon: Activity, href: "/superadmin/devices", tone: "amber" },
  ];

  const toneClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-rose-100 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };

  const trialSnapshot = tenantRows
    .filter((tenant) => tenant.status === "trial")
    .map((tenant) => ({
      ...tenant,
      daysRemaining: tenant.trial_ends_at ? differenceInCalendarDays(new Date(tenant.trial_ends_at), today) : null,
    }))
    .sort((a, b) => (a.daysRemaining ?? 99999) - (b.daysRemaining ?? 99999))
    .slice(0, 5);

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Platform Overview</h1><p className="text-sm text-muted-foreground">Live operational totals across the SyncFyre gym SaaS platform.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{stats.map((stat) => <Link key={stat.label} href={stat.href} className="group"><Card className="h-full transition-colors group-hover:border-primary/40"><CardContent className="flex items-center gap-4 p-5"><div className={`grid size-11 place-items-center rounded-xl ${toneClasses[stat.tone] ?? toneClasses.slate}`}><stat.icon className="size-5" /></div><div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="text-2xl font-bold">{typeof stat.value === "number" ? stat.value.toLocaleString("en-IN") : stat.value}</p></div></CardContent></Card></Link>)}</div><div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]"><Card><CardHeader><CardTitle>Platform operations</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2"><Link className="rounded-xl border p-4 hover:bg-muted" href="/superadmin/tenants">Review gym tenants</Link><Link className="rounded-xl border p-4 hover:bg-muted" href="/superadmin/users">Create owner accounts</Link><Link className="rounded-xl border p-4 hover:bg-muted" href="/superadmin/devices">Review machine integration</Link><Link className="rounded-xl border p-4 hover:bg-muted" href="/superadmin/audit-logs">Review audit activity</Link><Link className="rounded-xl border p-4 hover:bg-muted" href="/superadmin/demos">Review demo requests</Link><Link className="rounded-xl border p-4 hover:bg-muted" href="/superadmin/billing">Review billing activity</Link></CardContent></Card><Card><CardHeader><CardTitle>Trial watch</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{trialSnapshot.length ? trialSnapshot.map((tenant) => <div key={tenant.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><p className="font-medium capitalize">{tenant.plan.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{tenant.trial_starts_at ?? "-"} to {tenant.trial_ends_at ?? "-"}</p></div><p className="mt-1 text-xs text-muted-foreground">{tenant.status === "trial" && tenant.trial_ends_at && isAfter(new Date(tenant.trial_ends_at), today) ? `${tenant.daysRemaining} days remaining` : "Trial expired"}</p></div>) : <p className="text-muted-foreground">No trial gyms to review.</p>}<div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Collections (30d)</p><p className="mt-1 text-2xl font-bold">Rs {monthCollection.toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">Demo requests (30d): {demos ?? 0}</p></div></CardContent></Card></div></div>;
}
