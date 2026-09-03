import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutEditForm } from "@/components/modules/workout-edit-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMemberWorkoutEditPage({ params }: { params: Promise<{ id: string; workoutId: string }> }) {
  const { id: memberId, workoutId } = await params;
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!profile.tenant_id) notFound();
  const supabase = await createClient();
  const { data: member } = await supabase.from("members").select("id,full_name,member_code,branch_id,phone,email,status,fitness_goal,profile_photo_url").eq("id", memberId).eq("tenant_id", profile.tenant_id).maybeSingle();
  if (!member || (profile.role?.slug === "reception" && member.branch_id !== profile.branch_id)) notFound();
  const { data: workout } = await supabase.from("workouts").select("id,member_id,name,exercise_name,sets,reps,weight_kg,cardio_minutes,rest_seconds,trainer_notes,scheduled_date,status,branch_id").eq("id", workoutId).eq("member_id", member.id).eq("branch_id", member.branch_id).maybeSingle();
  if (!workout) notFound();
  const returnTo = `/admin/members/${member.id}?tab=workout`;
  return <div className="mx-auto max-w-3xl space-y-5"><div><BackButton href={returnTo} confirmOnLeave /><h1 className="mt-2 text-2xl font-bold">Edit workout plan</h1><p className="text-sm text-muted-foreground">Update the workout plan for {member.full_name}.</p></div><Card><CardContent className="p-5 md:p-7"><WorkoutEditForm workout={workout} members={[member]} returnTo={returnTo} /></CardContent></Card></div>;
}