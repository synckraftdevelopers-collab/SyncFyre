import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleAssignmentForm } from "@/components/staff/role-assignment-form";

export const metadata = { title: "Assign Staff Role" };

export default async function AssignStaffRolePage() {
  await requireUser(["admin"]);
  const supabase = await createClient();
  const [usersResult, rolesResult, branchesResult] = await Promise.all([
    supabase.from("users").select("id, full_name, email").order("full_name"),
    supabase.from("roles").select("id, name").in("slug", ["reception", "trainer", "dietician", "manager"]).order("name"),
    supabase.from("branches").select("id, name").eq("status", "active").order("name"),
  ]);
  return <div className="mx-auto max-w-3xl space-y-5"><div><h1 className="text-2xl font-bold">Assign staff role</h1><p className="text-sm text-muted-foreground">Assign an existing login account to a role and branch.</p></div><Card><CardContent className="p-5 md:p-7"><RoleAssignmentForm users={usersResult.data ?? []} roles={rolesResult.data ?? []} branches={branchesResult.data ?? []} /></CardContent></Card></div>;
}
