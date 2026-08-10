import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffAccountForm } from "@/components/staff/staff-account-form";

export const metadata = { title: "Add Staff" };

export default async function NewStaffPage() {
  await requireUser(["admin"]);
  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("id, name").eq("status", "active").order("name");
  return <div className="mx-auto max-w-3xl space-y-5"><div><h1 className="text-2xl font-bold">Add staff account</h1><p className="text-sm text-muted-foreground">Assign a role and branch. Reception staff can access only records from their assigned branch.</p></div><Card><CardContent className="p-5 md:p-7"><StaffAccountForm branches={branches ?? []} /></CardContent></Card></div>;
}
