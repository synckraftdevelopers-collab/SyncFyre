import { Database, ShieldCheck, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Platform Settings" };

export default async function SuperAdminSettingsPage() {
  const profile = await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const [{ count: tenants }, { count: users }] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }),
    admin.from("users").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Platform access and system overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" />Your access</CardTitle>
            <CardDescription>Current platform administrator account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><p className="text-muted-foreground">Name</p><p className="font-medium">{profile.full_name || "Super Admin"}</p></div>
            <div><p className="text-muted-foreground">Email</p><p className="font-medium">{profile.email || "Not available"}</p></div>
            <Badge variant="success">Super Admin</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="size-5 text-primary" />Platform overview</CardTitle>
            <CardDescription>Live totals from the configured platform database.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">Tenants</p><p className="mt-1 text-2xl font-bold">{tenants ?? 0}</p></div>
            <div className="rounded-xl bg-muted/60 p-4"><p className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3" />Users</p><p className="mt-1 text-2xl font-bold">{users ?? 0}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
