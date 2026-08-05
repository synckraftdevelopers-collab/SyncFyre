import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/modules/resource-create-form";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Create Workout" };

export default async function TrainerNewWorkoutPage() {
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
      <div><h1 className="text-2xl font-bold">Create workout</h1><p className="text-sm text-muted-foreground">Add a workout plan for one of your members.</p></div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <ResourceCreateForm
            resource="workouts"
            returnTo="/trainer/workouts"
            fields={[
              { name: "member_id", label: "Member", type: "select", options: members, required: true },
              { name: "name", label: "Workout name", required: true },
              { name: "exercise_name", label: "Exercise", required: true },
              { name: "sets", label: "Sets", type: "number" },
              { name: "reps", label: "Repetitions", type: "number" },
              { name: "weight_kg", label: "Weight (kg)", type: "number" },
              { name: "cardio_minutes", label: "Cardio (min)", type: "number" },
              { name: "rest_seconds", label: "Rest (sec)", type: "number" },
              { name: "scheduled_date", label: "Scheduled date", type: "date", defaultValue: today },
              { name: "trainer_notes", label: "Notes", type: "textarea" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
