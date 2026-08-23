import { Building2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Tenants" };

export default async function SuperAdminTenantsPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const { data: tenants, error } = await admin
    .from("tenants")
    .select("id, name, slug, owner_email, city, state, plan, status, created_at")
    .order("created_at", { ascending: false });
  const migrationMissing = error?.code === "PGRST205";
  if (error && !migrationMissing) throw error;

  return <div className="space-y-6">
    <div className="flex items-start gap-3">
      <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-5" /></div>
      <div><h1 className="text-2xl font-bold">Gyms</h1><p className="text-sm text-muted-foreground">All gym tenants on the SyncFyre platform.</p></div>
    </div>
    {migrationMissing ? <Card>
      <CardHeader><CardTitle>Multi-tenancy setup required</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground"><p>This Supabase project does not yet have the <code>tenants</code> table.</p><p>Apply <code>supabase/migrations/0007_multi_tenancy.sql</code> in the Supabase SQL Editor, then reload this page.</p></CardContent>
    </Card> : <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle>Gym tenants</CardTitle><Badge variant="secondary">{tenants?.length ?? 0} total</Badge></CardHeader>
      <CardContent className="overflow-x-auto">
        {tenants?.length ? <table className="w-full min-w-[760px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Gym</th><th className="px-4 py-3 font-medium">Owner</th><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Created</th></tr></thead><tbody className="divide-y">{tenants.map((tenant) => <tr key={tenant.id} className="hover:bg-muted/30"><td className="px-4 py-3"><p className="font-medium">{tenant.name}</p><p className="text-xs text-muted-foreground">{tenant.slug}{tenant.city ? ` · ${tenant.city}` : ""}</p></td><td className="px-4 py-3 text-muted-foreground">{tenant.owner_email || "Not assigned"}</td><td className="px-4 py-3"><Badge variant="outline" className="capitalize">{tenant.plan}</Badge></td><td className="px-4 py-3"><Badge variant={tenant.status === "active" ? "success" : tenant.status === "trial" ? "warning" : "outline"} className="capitalize">{tenant.status}</Badge></td><td className="px-4 py-3 text-muted-foreground">{new Date(tenant.created_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table> : <div className="grid min-h-52 place-items-center text-center text-sm text-muted-foreground">No gyms have been created yet.</div>}
      </CardContent>
    </Card>}
  </div>;
}