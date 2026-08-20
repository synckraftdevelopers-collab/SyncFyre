import { Building2, Calendar, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Super Admin Dashboard" };

export default async function SuperAdminDashboardPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();

  const [{ count: tenants }, { count: demos }, { count: totalMembers }] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }),
    admin.from("book_demo").select("id", { count: "exact", head: true }).gte(
      "created_at",
      new Date(Date.now() - 30 * 86400000).toISOString()
    ),
    admin.from("members").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Active Gyms",         value: tenants ?? 0,      icon: Building2,  tone: "blue"   },
    { label: "Demo Requests (30d)",  value: demos ?? 0,        icon: Calendar,   tone: "amber"  },
    { label: "Total Members",        value: totalMembers ?? 0, icon: Users,      tone: "green"  },
    { label: "Platform Revenue",     value: "—",               icon: TrendingUp, tone: "purple" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">All gyms, demo requests, and platform health.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`grid size-11 place-items-center rounded-xl ${
                s.tone === "blue"   ? "bg-blue-100 text-blue-600"     :
                s.tone === "amber"  ? "bg-amber-100 text-amber-600"   :
                s.tone === "green"  ? "bg-emerald-100 text-emerald-600":
                "bg-purple-100 text-purple-600"
              }`}>
                <s.icon className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">
                  {typeof s.value === "number" ? s.value.toLocaleString("en-IN") : s.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Demo Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Visit <Link href="/superadmin/demos" className="text-primary underline-offset-2 hover:underline">Demo Bookings</Link> for the full table.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
