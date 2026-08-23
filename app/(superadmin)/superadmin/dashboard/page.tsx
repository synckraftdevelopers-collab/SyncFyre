import Link from "next/link";
import { Building2, Calendar, CreditCard, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Super Admin Dashboard" };

export default async function SuperAdminDashboardPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ count: tenants }, { count: demos }, { count: members }, { data: payments, error: paymentsError }] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }),
    admin.from("book_demo").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
    admin.from("members").select("id", { count: "exact", head: true }),
    admin.from("payments").select("amount").eq("status", "completed").gte("paid_at", monthAgo).limit(1000),
  ]);
  if (paymentsError) throw paymentsError;
  const monthCollection = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const stats = [
    { label: "Organizations", value: tenants ?? 0, icon: Building2, href: "/superadmin/tenants", tone: "blue" },
    { label: "Demo requests (30d)", value: demos ?? 0, icon: Calendar, href: "/superadmin/demos", tone: "amber" },
    { label: "Total members", value: members ?? 0, icon: Users, href: "/superadmin/reports", tone: "green" },
    { label: "Collections (30d)", value: `₹${monthCollection.toLocaleString("en-IN")}`, icon: CreditCard, href: "/superadmin/billing", tone: "purple" },
  ];
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Platform Overview</h1><p className="text-sm text-muted-foreground">Live operational totals across the SyncTyre platform.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <Link key={stat.label} href={stat.href} className="group"><Card className="h-full transition-colors group-hover:border-primary/40"><CardContent className="flex items-center gap-4 p-5"><div className={`grid size-11 place-items-center rounded-xl ${stat.tone === "blue" ? "bg-blue-100 text-blue-600" : stat.tone === "amber" ? "bg-amber-100 text-amber-600" : stat.tone === "green" ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"}`}><stat.icon className="size-5" /></div><div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="text-2xl font-bold">{typeof stat.value === "number" ? stat.value.toLocaleString("en-IN") : stat.value}</p></div></CardContent></Card></Link>)}</div><Card><CardHeader><CardTitle>Platform operations</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-3"><Link className="rounded-xl border p-4 hover:bg-muted" href="/superadmin/demos">Review demo requests</Link><Link className="rounded-xl border p-4 hover:bg-muted" href="/superadmin/devices">Review device integration</Link><Link className="rounded-xl border p-4 hover:bg-muted" href="/superadmin/audit-logs">Review audit activity</Link></CardContent></Card></div>;
}