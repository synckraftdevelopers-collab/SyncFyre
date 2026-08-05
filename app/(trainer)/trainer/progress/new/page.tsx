import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/modules/resource-create-form";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Record Progress" };

export default async function TrainerNewProgressPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: trainerRecord } = await supabase
    .from("trainers").select("id").eq("user_id", profile?.id ?? "").single();
  const trainerId = trainerRecord?.id ?? "";

  const { data: membersData } = await supabase
    .from("members").select("id,full_name,member_code")
    .eq("assigned_trainer_id", trainerId).eq("status", "active").order("full_name");

  const members = (membersData ?? []).map((m) => ({ value: m.id, label: `${m.full_name} (${m.member_code})` }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-2xl font-bold">Record progress</h1><p className="text-sm text-muted-foreground">Log a measurement check-in for a member.</p></div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <ResourceCreateForm
            resource="progress"
            returnTo="/trainer/progress"
            fields={[
              { name: "member_id", label: "Member", type: "select", options: members, required: true },
              { name: "measured_at", label: "Date", type: "date", required: true, defaultValue: today },
              { name: "weight_kg", label: "Weight (kg)", type: "number" },
              { name: "bmi", label: "BMI", type: "number" },
              { name: "body_fat_percent", label: "Body fat (%)", type: "number" },
              { name: "muscle_mass_kg", label: "Muscle mass (kg)", type: "number" },
              { name: "waist_cm", label: "Waist (cm)", type: "number" },
              { name: "chest_cm", label: "Chest (cm)", type: "number" },
              { name: "arms_cm", label: "Arms (cm)", type: "number" },
              { name: "legs_cm", label: "Legs (cm)", type: "number" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
