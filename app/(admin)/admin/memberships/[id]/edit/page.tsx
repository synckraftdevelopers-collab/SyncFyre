import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MembershipPlanForm } from "@/components/memberships/membership-plan-form";

export const metadata = { title: "Edit Membership Plan" };

export default async function EditMembershipPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireUser(["admin", "manager"]);

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (!plan) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/memberships" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> Plans
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Plan</h1>
          <p className="text-sm text-muted-foreground">{plan.name}</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <MembershipPlanForm
            branchId={profile.branch_id ?? ""}
            plan={plan}
          />
        </CardContent>
      </Card>
    </div>
  );
}
