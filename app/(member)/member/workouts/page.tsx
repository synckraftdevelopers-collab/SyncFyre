import { Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My Workouts" };

export default async function MemberWorkoutsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: memberRecord } = await supabase
    .from("members").select("id").eq("user_id", profile?.id ?? "").maybeSingle();
  const memberId = memberRecord?.id ?? null;

  const { data } = memberId
    ? await supabase
        .from("workouts")
        .select("id,name,exercise_name,sets,reps,weight_kg,cardio_minutes,rest_seconds,trainer_notes,scheduled_date,status")
        .eq("member_id", memberId)
        .order("scheduled_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">My Workouts</h1>

      <Card>
        <CardHeader><CardTitle>{data?.length ?? 0} workout plan{(data?.length ?? 0) === 1 ? "" : "s"}</CardTitle></CardHeader>
        <CardContent>
          {data?.length ? (
            <div className="divide-y">
              {data.map((w) => (
                <div key={w.id} className="py-4 space-y-1">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="size-4 shrink-0 text-primary" />
                    <p className="font-semibold">{w.name}</p>
                    {w.scheduled_date && <span className="ml-auto text-xs text-muted-foreground">{w.scheduled_date}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground pl-7">
                    {w.exercise_name}
                    {w.sets && w.reps ? ` · ${w.sets} sets × ${w.reps} reps` : ""}
                    {w.weight_kg ? ` · ${w.weight_kg} kg` : ""}
                    {w.cardio_minutes ? ` · ${w.cardio_minutes} min cardio` : ""}
                    {w.rest_seconds ? ` · ${w.rest_seconds}s rest` : ""}
                  </p>
                  {w.trainer_notes && <p className="text-xs text-muted-foreground pl-7 italic">{w.trainer_notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div><Dumbbell className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No workout plans yet</p><p className="text-sm text-muted-foreground">Your trainer will add workout plans for you.</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
