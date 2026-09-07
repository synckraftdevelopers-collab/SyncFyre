import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DietPlanEditForm } from "@/components/modules/diet-plan-edit-form";

export const metadata = { title: "Edit Diet Plan" };

export default async function AdminDietPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const { id } = await params;
  const supabase = await createClient();

  let planQuery = supabase
    .from("diet_plans")
    .select(
      "id,member_id,branch_id,name,start_date,end_date,breakfast,lunch,dinner,snacks,calories,protein_g,fat_g,carbs_g,water_liters,notes,status",
    )
    .eq("id", id);
  if (profile.branch_id) planQuery = planQuery.eq("branch_id", profile.branch_id);
  const { data: plan, error } = await planQuery.maybeSingle();
  if (error || !plan) notFound();

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, member_code")
    .eq("branch_id", plan.branch_id)
    .eq("status", "active")
    .order("full_name");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <BackButton href="/admin/diet-plans" />
        <h1 className="mt-2 text-2xl font-bold">Edit diet plan</h1>
        <p className="text-sm text-muted-foreground">Update the plan or archive it when it is no longer active.</p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <DietPlanEditForm plan={plan} members={members ?? []} returnTo="/admin/diet-plans" />
        </CardContent>
      </Card>
    </div>
  );
}
