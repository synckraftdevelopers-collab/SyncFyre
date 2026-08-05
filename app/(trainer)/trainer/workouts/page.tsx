import Link from "next/link";
import { Dumbbell, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Workouts" };

export default async function TrainerWorkoutsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: trainerRecord } = await supabase
    .from("trainers").select("id").eq("user_id", profile?.id ?? "").single();
  const trainerId = trainerRecord?.id ?? "";

  const { data } = await supabase
    .from("workouts")
    .select("id,name,exercise_name,sets,reps,weight_kg,status,scheduled_date,members(full_name)")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-sm text-muted-foreground">Workout plans you have created for your members.</p>
        </div>
        <Link href="/trainer/workouts/new" className={buttonVariants({ className: "ml-auto" })}>
          <Plus className="size-4" />Create workout
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>{data?.length ?? 0} workout{(data?.length ?? 0) === 1 ? "" : "s"}</CardTitle></CardHeader>
        <CardContent>
          {data?.length ? (
            <div className="divide-y">
              {data.map((w) => (
                <div key={w.id} className="flex items-center gap-4 py-4">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Dumbbell className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.exercise_name}
                      {w.sets && w.reps ? ` · ${w.sets}×${w.reps}` : ""}
                      {w.weight_kg ? ` · ${w.weight_kg} kg` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{(w.members as unknown as { full_name: string } | null)?.full_name ?? "—"}{w.scheduled_date ? ` · ${w.scheduled_date}` : ""}</p>
                  </div>
                  {w.status && <Badge variant={w.status === "active" ? "success" : "outline"}>{w.status}</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div><Dumbbell className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No workouts yet</p><p className="text-sm text-muted-foreground">Create a workout plan for your members.</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
