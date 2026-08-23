import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Platform Reports" };

type Payment = { amount: number; paid_at: string | null };
type Member = { created_at: string; status: string };

export default async function SuperAdminReportsPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const [{ data: payments, error: paymentsError }, { data: members, error: membersError }] = await Promise.all([
    admin.from("payments").select("amount,paid_at").eq("status", "completed").order("paid_at", { ascending: false }).limit(1000),
    admin.from("members").select("created_at,status").order("created_at", { ascending: false }).limit(1000),
  ]);
  if (paymentsError) throw paymentsError;
  if (membersError) throw membersError;
  const completed = (payments ?? []) as Payment[];
  const memberRows = (members ?? []) as Member[];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthCollection = completed.filter((payment) => payment.paid_at && new Date(payment.paid_at).getTime() >= startOfMonth).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalCollection = completed.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const activeMembers = memberRows.filter((member) => member.status === "active").length;
  const newMembers = memberRows.filter((member) => new Date(member.created_at).getTime() >= startOfMonth).length;
  const metrics = [["Completed collections", `₹${totalCollection.toLocaleString("en-IN")}`], ["This month", `₹${monthCollection.toLocaleString("en-IN")}`], ["Active members", activeMembers.toLocaleString("en-IN")], ["New members this month", newMembers.toLocaleString("en-IN")]];
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Platform Reports</h1><p className="text-sm text-muted-foreground">Live collection and member indicators across all gyms.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Report scope</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>Collections use completed records from the existing payments table. Membership indicators use the existing members table.</p><p>Platform recurring-billing reporting will be available after a platform subscription data model is connected; the current subscriptions table represents gym-member memberships.</p></CardContent></Card></div>;
}