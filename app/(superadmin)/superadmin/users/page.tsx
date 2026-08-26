import { ShieldCheck, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGymAdminForm } from "@/components/superadmin/create-gym-admin-form";

export const metadata = { title: "All Users" };

type Role = { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;

function roleOf(role: Role) {
  return Array.isArray(role) ? role[0] : role;
}

export default async function SuperAdminUsersPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const { data: users, error } = await admin
    .from("users")
    .select("id, full_name, email, phone, status, created_at, tenant_id, role:roles(name, slug)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Users className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">All Users</h1>
          <p className="text-sm text-muted-foreground">Platform accounts, owner provisioning, and cross-tenant role visibility.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Create gym owner</CardTitle></CardHeader>
        <CardContent><CreateGymAdminForm /></CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>User accounts</CardTitle>
          <Badge variant="secondary">{users?.length ?? 0} total</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {users?.length ? (
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Scope</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => {
                  const role = roleOf(user.role as Role);
                  return (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{user.full_name || "Unnamed user"}</p>
                        <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                        <p className="text-xs text-muted-foreground">{user.phone || "No mobile"}</p>
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline">{role?.name || role?.slug || "Unassigned"}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={user.status === "active" ? "success" : "outline"}>{user.status}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{user.tenant_id ? "Tenant user" : "Platform user"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="grid min-h-52 place-items-center text-center text-sm text-muted-foreground">
              <div><ShieldCheck className="mx-auto mb-3 size-9" />No user accounts found.</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
