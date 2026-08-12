import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAssignedMembers, getTrainerPortalContext } from "@/services/trainer-portal.service";
import { WorkoutEditForm } from "@/components/modules/workout-edit-form";

export default async function TrainerWorkoutEditPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireUser(["trainer", "dietician", "diet-planner", "diet_planner"]);
  const { id } = await params;
  const context = await getTrainerPortalContext(profile);
  if (!context.data) notFound();
  const supabase = await createClient();
  const { data: workout, error } = await supabase.from("workouts").select("id,name,exercise_name,sets,reps,weight_kg,cardio_minutes,rest_seconds,trainer_notes,scheduled_date,status,member_id").eq("id", id).eq("trainer_id", context.data.trainerId).eq("branch_id", context.data.branchId).maybeSingle();
  if (error || !workout) notFound();
  const members = await getAssignedMembers(context.data);
  return <div className="mx-auto max-w-3xl space-y-5"><div><h1 className="text-2xl font-bold">Edit workout</h1><p className="text-sm text-muted-foreground">Update the workout or archive it when it is no longer active.</p></div><Card><CardContent className="p-5 md:p-7"><WorkoutEditForm workout={workout} members={members.data} /></CardContent></Card></div>;
}