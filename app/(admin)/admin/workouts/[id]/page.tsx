import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WorkoutEditForm } from "@/components/modules/workout-edit-form";

export const metadata = { title: "Edit Workout" };

export default async function AdminWorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const { id } = await params;
  const supabase = await createClient();

  let workoutQuery = supabase
    .from("workouts")
    .select(
      "id,name,exercise_name,sets,reps,weight_kg,cardio_minutes,rest_seconds,trainer_notes,scheduled_date,status,member_id,branch_id",
    )
    .eq("id", id);
  if (profile.branch_id) workoutQuery = workoutQuery.eq("branch_id", profile.branch_id);
  const { data: workout, error } = await workoutQuery.maybeSingle();
  if (error || !workout) notFound();

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, member_code")
    .eq("branch_id", workout.branch_id)
    .eq("status", "active")
    .order("full_name");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <BackButton href="/admin/workouts" />
        <h1 className="mt-2 text-2xl font-bold">Edit workout</h1>
        <p className="text-sm text-muted-foreground">Update the workout or archive it when it is no longer active.</p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <WorkoutEditForm workout={workout} members={members ?? []} returnTo="/admin/workouts" />
        </CardContent>
      </Card>
    </div>
  );
}
