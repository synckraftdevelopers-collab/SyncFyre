import Link from "next/link";
import { Dumbbell, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Workouts" };

export default async function AdminWorkoutsPage() {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();
  let query = supabase
    .from("workouts")
    .select("id,name,exercise_name,sets,reps,weight_kg,scheduled_date,status,members(full_name,member_code),trainers!workouts_trainer_id_fkey(users!trainers_user_id_fkey(full_name))")
    .order("created_at", { ascending: false })
    .limit(100);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data: workouts, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold">Workouts</h1><p className="text-sm text-muted-foreground">Workout plans assigned to members.</p></div>
        <Link href="/admin/workouts/new" className={buttonVariants({ className: "ml-auto" })}><Plus className="size-4" />Create workout</Link>
      </div>
      <Card>
        <CardHeader><CardTitle>{workouts?.length ?? 0} workout{(workouts?.length ?? 0) === 1 ? "" : "s"}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {workouts?.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40"><th className="px-4 py-3 text-left font-medium text-muted-foreground">Workout</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Exercise</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Trainer</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Scheduled</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th></tr></thead><tbody className="divide-y">{workouts.map((workout) => <tr key={workout.id} className="hover:bg-muted/30"><td className="px-4 py-3 font-medium">{workout.name}</td><td className="px-4 py-3">{(workout.members as unknown as { full_name: string; member_code: string } | null)?.full_name ?? "—"}</td><td className="px-4 py-3">{workout.exercise_name}{workout.sets && workout.reps ? ` · ${workout.sets}×${workout.reps}` : ""}</td><td className="px-4 py-3">{(workout.trainers as unknown as { users: { full_name: string } | null } | null)?.users?.full_name ?? "—"}</td><td className="px-4 py-3">{workout.scheduled_date ?? "—"}</td><td className="px-4 py-3"><Badge variant={workout.status === "active" ? "success" : "outline"}>{workout.status}</Badge></td></tr>)}</tbody></table></div> : <div className="grid min-h-56 place-items-center text-center"><div><Dumbbell className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No workouts yet</p><Link href="/admin/workouts/new" className="mt-2 inline-block text-sm text-primary hover:underline">Create the first workout</Link></div></div>}
        </CardContent>
      </Card>
    </div>
  );
}