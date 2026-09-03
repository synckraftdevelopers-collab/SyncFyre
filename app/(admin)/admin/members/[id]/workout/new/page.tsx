import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm, type FormField } from "@/components/modules/resource-create-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMemberWorkoutNewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const profile = await requireUser(["admin", "manager", "reception"]); if (!profile.tenant_id) notFound();
  const supabase = await createClient(); const { data: member } = await supabase.from("members").select("id,full_name,member_code,branch_id").eq("id", id).eq("tenant_id", profile.tenant_id).maybeSingle();
  if (!member || (profile.role?.slug === "reception" && member.branch_id !== profile.branch_id)) notFound();
  const returnTo = `/admin/members/${member.id}?tab=workout`;
  const fields: FormField[] = [{ name: "member_id", label: "Member", type: "select", required: true, defaultValue: member.id, options: [{ value: member.id, label: `${member.full_name} (${member.member_code})` }] }, { name: "name", label: "Workout name", required: true }, { name: "exercise_name", label: "Exercise", required: true }, { name: "sets", label: "Sets", type: "number" }, { name: "reps", label: "Repetitions", type: "number" }, { name: "weight_kg", label: "Weight (kg)", type: "number" }, { name: "cardio_minutes", label: "Cardio minutes", type: "number" }, { name: "rest_seconds", label: "Rest seconds", type: "number" }, { name: "scheduled_date", label: "Scheduled date", type: "date" }, { name: "trainer_notes", label: "Trainer notes", type: "textarea" }];
  return <div className="mx-auto max-w-4xl space-y-5"><div><BackButton href={returnTo} confirmOnLeave /><h1 className="mt-2 text-2xl font-bold">Create workout plan</h1><p className="text-sm text-muted-foreground">Create a workout plan for {member.full_name}.</p></div><Card><CardContent className="p-5 md:p-7"><ResourceCreateForm resource="workouts" fields={fields} returnTo={returnTo} /></CardContent></Card></div>;
}