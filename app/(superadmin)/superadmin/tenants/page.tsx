import { differenceInCalendarDays, isBefore, startOfDay } from "date-fns";
import { Building2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditTenantDialog } from "@/components/superadmin/edit-tenant-dialog";

export const metadata = { title: "Tenants" };

type RoleValue = { slug: string | null } | { slug: string | null }[] | null;
type TenantRow = {
  id: string;
  name: string;
  slug: string;
  owner_email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  tenant_type: string | null;
  purpose: string | null;
  is_demo: boolean | null;
  is_protected: boolean | null;
  plan: string;
  status: string;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  branches: { id: string; name: string }[] | null;
  members: { id: string }[] | null;
  staff: { id: string }[] | null;
  users: { id: string; full_name: string | null; email: string | null; phone: string | null; role: RoleValue }[] | null;
  face_machine_settings: { id: string; connection_status: string | null }[] | null;
};

function roleOf(role: RoleValue) {
  return Array.isArray(role) ? role[0] : role;
}

export default async function SuperAdminTenantsPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select("id,name,slug,owner_email,phone,city,state,tenant_type,purpose,is_demo,is_protected,plan,status,trial_starts_at,trial_ends_at,created_at,branches(id,name),members(id),staff(id),users(id,full_name,email,phone,role:roles(slug)),face_machine_settings(id,connection_status)")
    .order("created_at", { ascending: false });

  const migrationMissing = isMissingSchemaError(error);
  if (error && !migrationMissing) throw error;

  const today = startOfDay(new Date());
  const tenants = ((data ?? []) as TenantRow[]).map((tenant) => {
    const owner = (tenant.users ?? []).find((user) => roleOf(user.role)?.slug === "owner") ?? null;
    const primaryBranch = tenant.branches?.[0] ?? null;
    const membersCount = tenant.members?.length ?? 0;
    const staffCount = tenant.staff?.length ?? 0;
    const branchesCount = tenant.branches?.length ?? 0;
    const machineCount = tenant.face_machine_settings?.length ?? 0;
    const connectedMachineCount = (tenant.face_machine_settings ?? []).filter((machine) => machine.connection_status === "online").length;
    const trialExpired = tenant.trial_ends_at ? isBefore(new Date(tenant.trial_ends_at), today) : false;
    const daysRemaining = tenant.trial_ends_at ? differenceInCalendarDays(new Date(tenant.trial_ends_at), today) : null;

    return {
      ...tenant,
      owner,
      primaryBranch,
      membersCount,
      staffCount,
      branchesCount,
      machineCount,
      connectedMachineCount,
      trialExpired,
      daysRemaining,
    };
  });

  return <div className="space-y-6">
    <div className="flex items-start gap-3">
      <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-5" /></div>
      <div><h1 className="text-2xl font-bold">Gyms / Tenants</h1><p className="text-sm text-muted-foreground">Platform-level gym view with owner, trial, branch, staff, member, and machine status.</p></div>
    </div>
    {migrationMissing ? <Card>
      <CardHeader><CardTitle>Multi-tenancy setup required</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground"><p>This Supabase project does not yet have the tenant schema applied.</p><p>Apply the Supabase migrations, including <code>supabase/migrations/0018_superadmin_saas_extensions.sql</code>, then reload this page.</p></CardContent>
    </Card> : <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle>Gym tenants</CardTitle><Badge variant="secondary">{tenants.length} total</Badge></CardHeader>
      <CardContent className="overflow-x-auto">
        {tenants.length ? <table className="w-full min-w-[1700px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Gym</th><th className="px-4 py-3 font-medium">Owner</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 font-medium">Trial</th><th className="px-4 py-3 font-medium">Members</th><th className="px-4 py-3 font-medium">Staff</th><th className="px-4 py-3 font-medium">Branches</th><th className="px-4 py-3 font-medium">Machine Integration</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3 font-medium">Actions</th></tr></thead><tbody className="divide-y">{tenants.map((tenant) => <tr key={tenant.id} className="align-top hover:bg-muted/30"><td className="px-4 py-3"><div className="space-y-1"><p className="font-medium">{tenant.name}</p><p className="text-xs text-muted-foreground">{tenant.slug}{tenant.city ? ` - ${tenant.city}` : ""}{tenant.state ? `, ${tenant.state}` : ""}</p><div className="flex flex-wrap gap-2">{tenant.tenant_type ? <Badge variant={tenant.tenant_type === "demo" ? "secondary" : "outline"} className="capitalize">{tenant.tenant_type}</Badge> : null}{tenant.is_protected ? <Badge variant="outline">Protected</Badge> : null}</div><p className="text-xs text-muted-foreground">{tenant.purpose ?? "No purpose set"}</p></div></td><td className="px-4 py-3"><p className="font-medium">{tenant.owner?.full_name ?? "Owner pending"}</p><p className="text-xs text-muted-foreground">{tenant.owner?.email ?? tenant.owner_email ?? "No email"}</p><p className="text-xs text-muted-foreground">{tenant.owner?.phone ?? tenant.phone ?? "No mobile"}</p></td><td className="px-4 py-3"><Badge variant={tenant.status === "active" ? "success" : tenant.status === "trial" ? "warning" : tenant.status === "suspended" ? "danger" : "outline"} className="capitalize">{tenant.status}</Badge></td><td className="px-4 py-3"><p className="font-medium capitalize">{tenant.plan.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">Subscription: {tenant.status === "trial" ? (tenant.trialExpired ? "Expired trial" : "Trialing") : tenant.status}</p></td><td className="px-4 py-3"><p className="text-xs text-muted-foreground">Start: {tenant.trial_starts_at ?? "-"}</p><p className="text-xs text-muted-foreground">End: {tenant.trial_ends_at ?? "-"}</p><p className="text-xs text-muted-foreground">{tenant.daysRemaining === null ? "Days remaining: -" : tenant.trialExpired ? "Days remaining: 0" : `Days remaining: ${tenant.daysRemaining}`}</p></td><td className="px-4 py-3 font-medium">{tenant.membersCount}</td><td className="px-4 py-3 font-medium">{tenant.staffCount}</td><td className="px-4 py-3"><p className="font-medium">{tenant.branchesCount}</p><p className="text-xs text-muted-foreground">{tenant.primaryBranch?.name ?? "Main Branch pending"}</p></td><td className="px-4 py-3"><p className="font-medium">{tenant.connectedMachineCount > 0 ? "Connected" : tenant.machineCount > 0 ? "Configured" : "Not connected"}</p><p className="text-xs text-muted-foreground">{tenant.connectedMachineCount}/{tenant.machineCount} online</p></td><td className="px-4 py-3 text-muted-foreground">{new Date(tenant.created_at).toLocaleDateString("en-IN")}</td><td className="px-4 py-3"><EditTenantDialog tenant={{ id: tenant.id, name: tenant.name, slug: tenant.slug, owner_email: tenant.owner?.email ?? tenant.owner_email, phone: tenant.phone, city: tenant.city, state: tenant.state, tenant_type: tenant.tenant_type ?? (tenant.is_demo ? "demo" : "customer"), purpose: tenant.purpose, plan: tenant.plan, status: tenant.status, trial_starts_at: tenant.trial_starts_at, trial_ends_at: tenant.trial_ends_at, branch_id: tenant.primaryBranch?.id ?? null, branch_name: tenant.primaryBranch?.name ?? "Main Branch", owner_user_id: tenant.owner?.id ?? null, owner_name: tenant.owner?.full_name ?? null, owner_phone: tenant.owner?.phone ?? tenant.phone ?? null }} /></td></tr>)}</tbody></table> : <div className="grid min-h-52 place-items-center text-center text-sm text-muted-foreground">No gyms have been created yet.</div>}
      </CardContent>
    </Card>}
  </div>;
}
