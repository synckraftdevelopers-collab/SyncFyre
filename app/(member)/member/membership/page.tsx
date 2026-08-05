import { ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "My Membership" };

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  active: "success", pending: "warning", expired: "danger", cancelled: "outline", paused: "outline",
};

export default async function MemberMembershipPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: memberRecord } = await supabase
    .from("members").select("id").eq("user_id", profile?.id ?? "").maybeSingle();
  const memberId = memberRecord?.id ?? null;

  const { data: subscriptions } = memberId
    ? await supabase
        .from("subscriptions")
        .select("id,start_date,end_date,status,total_amount,auto_renew,membership_plans(name,duration_months,features)")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const active = (subscriptions ?? []).find((s) => s.status === "active");
  const daysLeft = active?.end_date
    ? Math.max(0, Math.ceil((new Date(active.end_date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">My Membership</h1>

      {/* Active plan highlight */}
      {active ? (
        <Card className="border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader className="flex-row items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <CardTitle>{(active.membership_plans as unknown as { name: string } | null)?.name ?? "Membership"}</CardTitle>
              <p className="text-sm text-muted-foreground">Active · {daysLeft} day{daysLeft === 1 ? "" : "s"} remaining</p>
            </div>
            <Badge variant="success" className="ml-auto">Active</Badge>
          </CardHeader>
          <CardContent className="grid gap-3 border-t pt-5 sm:grid-cols-3 text-sm">
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Start date</p><p className="mt-1 font-medium">{active.start_date}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">End date</p><p className="mt-1 font-medium">{active.end_date}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Amount paid</p><p className="mt-1 font-medium">{formatCurrency(Number(active.total_amount))}</p></div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid min-h-40 place-items-center text-center p-8">
            <div>
              <ShieldX className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No active membership</p>
              <p className="text-sm text-muted-foreground">Contact the reception desk to purchase or renew your membership.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription history */}
      {(subscriptions ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Subscription history</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {(subscriptions ?? []).map((s) => (
              <div key={s.id} className="flex items-center gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{(s.membership_plans as unknown as { name: string } | null)?.name ?? "Plan"}</p>
                  <p className="text-xs text-muted-foreground">{s.start_date} → {s.end_date ?? "—"}</p>
                </div>
                <p className="font-semibold tabular-nums">{formatCurrency(Number(s.total_amount))}</p>
                <Badge variant={statusVariant[s.status] ?? "outline"}>{s.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
