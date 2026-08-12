import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/modules/resource-create-form";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Create Diet Plan" };

export default async function TrainerNewDietPlanPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: trainerRecord } = await supabase
    .from("trainers").select("id").eq("user_id", profile?.id ?? "").single();
  const trainerId = trainerRecord?.id ?? "";

  const { data: membersData } = await supabase
    .from("members").select("id,full_name,member_code")
    .eq("assigned_trainer_id", trainerId).eq("branch_id", profile?.branch_id ?? "").eq("status", "active").order("full_name");

  const members = (membersData ?? []).map((m) => ({ value: m.id, label: `${m.full_name} (${m.member_code})` }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-2xl font-bold">Create diet plan</h1><p className="text-sm text-muted-foreground">Design a nutrition plan for a member.</p></div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <ResourceCreateForm
            resource="diet-plans"
            returnTo="/trainer/diet-plans"
            fields={[
              { name: "member_id", label: "Member", type: "select", options: members, required: true },
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
