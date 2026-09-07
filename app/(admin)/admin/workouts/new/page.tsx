import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/modules/resource-create-form";
import { BackButton } from "@/components/ui/back-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Create Workout" };

export default async function AdminNewWorkoutPage() {
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
    .select("id, users!trainers_user_id_fkey(full_name)")
    .eq("status", "active")
    .order("id");
  if (profile.branch_id) trainersQuery = trainersQuery.eq("branch_id", profile.branch_id);

  const [{ data: membersData }, { data: trainersData }] = await Promise.all([membersQuery, trainersQuery]);

  const members = (membersData ?? []).map((member) => ({
    value: member.id,
    label: `${member.full_name} (${member.member_code})`,
  }));
  const trainers = (trainersData ?? []).map((trainer) => ({
    value: trainer.id,
    label: (trainer.users as unknown as { full_name: string | null } | null)?.full_name ?? "Unnamed trainer",
  }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <BackButton href="/admin/workouts" confirmOnLeave />
        <h1 className="mt-2 text-2xl font-bold">Create workout</h1>
        <p className="text-sm text-muted-foreground">Assign a workout plan to a member.</p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <ResourceCreateForm
            resource="workouts"
            returnTo="/admin/workouts"
            fields={[
              { name: "member_id", label: "Member", type: "select", options: members, required: true },
              { name: "trainer_id", label: "Trainer", type: "select", options: trainers },
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
