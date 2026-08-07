import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { MembershipPlanForm } from "@/components/memberships/membership-plan-form";

export const metadata = { title: "Create Membership Plan" };

export default async function NewMembershipPlanPage() {
  const profile = await requireUser(["admin", "manager"]);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/memberships" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> Plans
        </Link>
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
