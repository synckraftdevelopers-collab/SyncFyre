import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffAccountForm } from "@/components/staff/staff-account-form";

export const metadata = { title: "Add Staff" };

export default async function NewStaffPage() {
  await requireUser(["admin", "manager"]);
  const supabase = await createClient();
  const [{ data: branches }, { data: roles }] = await Promise.all([
    supabase.from("branches").select("id, name").eq("status", "active").order("name"),
    supabase.from("roles").select("id, name, slug").in("slug", ["reception", "trainer", "dietician", "manager"]).order("name"),
  ]);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return <div className="mx-auto max-w-3xl space-y-5"><div><h1 className="text-2xl font-bold">Add staff account</h1><p className="text-sm text-muted-foreground">Assign a role and branch. Reception staff can access only records from their assigned branch.</p></div>{!hasServiceRoleKey && <Card><CardContent className="p-5 text-sm text-amber-700">Staff account creation is unavailable because <code>SUPABASE_SERVICE_ROLE_KEY</code> is not configured in <code>.env.local</code>.</CardContent></Card>}<Card><CardContent className="p-5 md:p-7"><StaffAccountForm branches={branches ?? []} roles={roles ?? []} disabled={!hasServiceRoleKey} /></CardContent></Card></div>;
}
