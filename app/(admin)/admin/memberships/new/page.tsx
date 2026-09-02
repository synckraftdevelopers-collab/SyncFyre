import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { MembershipPlanForm } from "@/components/memberships/membership-plan-form";

export const metadata = { title: "Create Membership Plan" };

export default async function NewMembershipPlanPage() {
  const profile = await requireUser(["admin", "manager"]);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <BackButton href="/admin/memberships" confirmOnLeave />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Membership Plan</h1>
          <p className="text-sm text-muted-foreground">
            Define pricing, duration, GST and features for this plan.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <MembershipPlanForm branchId={profile.branch_id ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
