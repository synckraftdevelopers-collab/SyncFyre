import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Subscriptions" };

type Subscription = { id: string; start_date: string; end_date: string; status: string; total_amount: number; members: { full_name: string; member_code: string } | null; membership_plans: { name: string } | null; branches: { name: string } | null };

export default async function SuperAdminSubscriptionsPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const { data, error } = await admin.from("subscriptions").select("id,start_date,end_date,status,total_amount,members(full_name,member_code),membership_plans(name),branches(name)").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  const subscriptions = (data ?? []) as unknown as Subscription[];

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Subscriptions</h1><p className="text-sm text-muted-foreground">Live member membership subscriptions across all gyms.</p></div><Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Membership subscriptions</CardTitle><Badge variant="secondary">{subscriptions.length} shown</Badge></CardHeader><CardContent className="overflow-x-auto">{subscriptions.length ? <table className="w-full min-w-[760px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Gym branch</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{subscriptions.map((subscription) => <tr key={subscription.id}><td className="px-4 py-3"><p className="font-medium">{subscription.members?.full_name ?? "Unknown member"}</p><p className="text-xs text-muted-foreground">{subscription.members?.member_code ?? ""}</p></td><td className="px-4 py-3 text-muted-foreground">{subscription.branches?.name ?? "Unassigned"}</td><td className="px-4 py-3">{subscription.membership_plans?.name ?? "Unknown plan"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{subscription.start_date} – {subscription.end_date}</td><td className="px-4 py-3">₹{Number(subscription.total_amount).toLocaleString("en-IN")}</td><td className="px-4 py-3"><Badge variant={subscription.status === "active" ? "success" : subscription.status === "cancelled" ? "danger" : "outline"}>{subscription.status}</Badge></td></tr>)}</tbody></table> : <p className="py-12 text-center text-sm text-muted-foreground">No subscriptions found.</p>}</CardContent></Card></div>;
}