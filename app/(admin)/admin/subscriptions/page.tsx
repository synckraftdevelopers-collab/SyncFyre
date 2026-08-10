import Link from "next/link";
import { Pause, Play, Search, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { updateSubscriptionStatusAction } from "@/app/actions/subscription-actions";

export const metadata = { title: "Subscriptions" };

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  active: "success", paused: "warning", cancelled: "danger", expired: "outline", pending: "warning",
};

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("subscriptions")
    .select("id, member_id, plan_id, start_date, end_date, status, auto_renew, total_amount, members(full_name, member_code), membership_plans(name)")
    .order("end_date", { ascending: true });
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const search = params.q?.trim().toLowerCase() ?? "";
  const subscriptions = (data ?? []).filter((subscription) => {
    const member = subscription.members as unknown as { full_name: string | null; member_code: string | null } | null;
    const plan = subscription.membership_plans as unknown as { name: string | null } | null;
    return !search || member?.full_name?.toLowerCase().includes(search) || member?.member_code?.toLowerCase().includes(search) || plan?.name?.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Review, pause, resume, or cancel member memberships.</p>
      </div>
      <Card>
        <form className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={params.q} className="pl-9" placeholder="Search member, code, or plan" /></div>
          <select name="status" defaultValue={params.status ?? "all"} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select>
          <button className={buttonVariants({ variant: "outline" })}>Apply</button>
        </form>
        {subscriptions.length ? <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr>{["Member", "Plan", "Period", "Amount", "Auto renew", "Status", "Actions"].map((heading) => <th className="px-4 py-3 font-medium" key={heading}>{heading}</th>)}</tr></thead><tbody className="divide-y">{subscriptions.map((subscription) => { const member = subscription.members as unknown as { full_name: string | null; member_code: string | null } | null; const plan = subscription.membership_plans as unknown as { name: string | null } | null; return <tr key={subscription.id} className="hover:bg-muted/30"><td className="px-4 py-3"><Link href={`/admin/members/${subscription.member_id}`} className="font-medium hover:text-primary hover:underline">{member?.full_name ?? "—"}</Link><p className="text-xs text-muted-foreground">{member?.member_code ?? ""}</p></td><td className="px-4 py-3">{plan?.name ?? "—"}</td><td className="px-4 py-3 whitespace-nowrap">{subscription.start_date} → {subscription.end_date}</td><td className="px-4 py-3">{formatCurrency(Number(subscription.total_amount))}</td><td className="px-4 py-3">{subscription.auto_renew ? "Yes" : "No"}</td><td className="px-4 py-3"><Badge variant={statusVariant[subscription.status] ?? "outline"}>{subscription.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2">{subscription.status === "active" && <><form action={updateSubscriptionStatusAction.bind(null, subscription.id, "paused")}><button className={buttonVariants({ variant: "outline", size: "sm" })}><Pause className="size-3.5" />Pause</button></form><form action={updateSubscriptionStatusAction.bind(null, subscription.id, "cancelled")}><button className={buttonVariants({ variant: "destructive", size: "sm" })}><XCircle className="size-3.5" />Cancel</button></form></>}{subscription.status === "paused" && <><form action={updateSubscriptionStatusAction.bind(null, subscription.id, "active")}><button className={buttonVariants({ size: "sm" })}><Play className="size-3.5" />Resume</button></form><form action={updateSubscriptionStatusAction.bind(null, subscription.id, "cancelled")}><button className={buttonVariants({ variant: "destructive", size: "sm" })}><XCircle className="size-3.5" />Cancel</button></form></>}{["pending", "expired", "cancelled"].includes(subscription.status) && <span className="text-xs text-muted-foreground">No action available</span>}</div></td></tr>; })}</tbody></table></div> : <CardContent className="grid min-h-64 place-items-center text-center"><div><p className="font-medium">No subscriptions found</p><p className="text-sm text-muted-foreground">Adjust the filters or create a membership from a member profile.</p></div></CardContent>}
      </Card>
    </div>
  );
}