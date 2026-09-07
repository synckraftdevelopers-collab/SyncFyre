import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/modules/resource-create-form";
import { BackButton } from "@/components/ui/back-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Create Diet Plan" };

export default async function AdminNewDietPlanPage() {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();

  let membersQuery = supabase
    .from("members")
    .select("id, full_name, member_code")
    .eq("status", "active")
    .order("full_name");
  if (profile.branch_id) membersQuery = membersQuery.eq("branch_id", profile.branch_id);

  let trainersQuery = supabase
    .from("trainers")
    .select("staff_id, users!trainers_user_id_fkey(full_name)")
    .eq("status", "active")
    .not("staff_id", "is", null)
    .order("staff_id");
  if (profile.branch_id) trainersQuery = trainersQuery.eq("branch_id", profile.branch_id);

  const [{ data: membersData }, { data: trainersData }] = await Promise.all([membersQuery, trainersQuery]);

  const members = (membersData ?? []).map((member) => ({
    value: member.id,
    label: `${member.full_name} (${member.member_code})`,
  }));
  const trainers = (trainersData ?? []).map((trainer) => ({
    value: trainer.staff_id as string,
    label: (trainer.users as unknown as { full_name: string | null } | null)?.full_name ?? "Unnamed trainer",
  }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <BackButton href="/admin/diet-plans" confirmOnLeave />
        <h1 className="mt-2 text-2xl font-bold">Create diet plan</h1>
        <p className="text-sm text-muted-foreground">Design a nutrition plan for a member.</p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <ResourceCreateForm
            resource="diet-plans"
            returnTo="/admin/diet-plans"
            fields={[
              { name: "member_id", label: "Member", type: "select", options: members, required: true },
              { name: "staff_id", label: "Dietician / trainer", type: "select", options: trainers },
              { name: "name", label: "Plan name", required: true },
              { name: "start_date", label: "Start date", type: "date", required: true, defaultValue: today },
              { name: "end_date", label: "End date", type: "date" },
              { name: "breakfast", label: "Breakfast", type: "textarea" },
              { name: "lunch", label: "Lunch", type: "textarea" },
              { name: "dinner", label: "Dinner", type: "textarea" },
              { name: "snacks", label: "Snacks", type: "textarea" },
              { name: "calories", label: "Calories", type: "number" },
              { name: "protein_g", label: "Protein (g)", type: "number" },
              { name: "fat_g", label: "Fat (g)", type: "number" },
              { name: "carbs_g", label: "Carbs (g)", type: "number" },
              { name: "water_liters", label: "Water (L)", type: "number" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
