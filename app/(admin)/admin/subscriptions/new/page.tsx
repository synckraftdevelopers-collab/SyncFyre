import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMembershipPlans } from "@/services/plan.service";
import { MembershipSaleWizard } from "@/components/modules/membership-sale-wizard";

export const metadata = { title: "New Membership Sale" };

export default async function AdminNewSubscriptionSalePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();

  const [membersRes, plansRes] = await Promise.all([
    supabase.from("members").select("id, full_name, member_code").eq("status", "active").order("full_name"),
    listMembershipPlans({ branchId: profile.branch_id, status: "active" }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <BackButton href={params.returnTo ?? "/admin/subscriptions"} confirmOnLeave />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New membership sale</h1>
          <p className="text-sm text-muted-foreground">Create the subscription, invoice, and payment in one step.</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <MembershipSaleWizard
            members={(membersRes.data ?? []).map((member) => ({
              id: member.id,
              full_name: member.full_name ?? "Unknown member",
              member_code: member.member_code ?? "",
            }))}
            plans={plansRes}
            branchId={profile.branch_id}
            returnTo={params.returnTo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
