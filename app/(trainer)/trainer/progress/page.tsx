import Link from "next/link";
import { Gauge, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Progress" };

export default async function TrainerProgressPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: trainerRecord } = await supabase
    .from("trainers").select("id").eq("user_id", profile?.id ?? "").single();
  const trainerId = trainerRecord?.id ?? "";

  // Get members assigned to this trainer then their progress
  const { data: membersData } = await supabase
    .from("members").select("id,full_name").eq("assigned_trainer_id", trainerId);
  const memberIds = (membersData ?? []).map((m) => m.id);

  const { data } = memberIds.length
    ? await supabase
        .from("progress")
        .select("id,measured_at,weight_kg,bmi,body_fat_percent,notes,members(full_name)")
        .in("member_id", memberIds)
        .order("measured_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Progress</h1>
          <p className="text-sm text-muted-foreground">Measurement records for your assigned members.</p>
        </div>
        <Link href="/trainer/progress/new" className={buttonVariants({ className: "ml-auto" })}>
          <Plus className="size-4" />Record progress
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>{data?.length ?? 0} record{(data?.length ?? 0) === 1 ? "" : "s"}</CardTitle></CardHeader>
        <CardContent>
          {data?.length ? (
            <div className="divide-y">
              {data.map((p) => (
                <div key={p.id} className="flex items-center gap-4 py-4">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Gauge className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{(p.members as unknown as { full_name: string } | null)?.full_name ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.measured_at}
                      {p.weight_kg ? ` - ${p.weight_kg} kg` : ""}
                      {p.bmi ? ` - BMI ${p.bmi}` : ""}
                      {p.body_fat_percent ? ` - ${p.body_fat_percent}% fat` : ""}
                    </p>
                    {p.notes && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{p.notes}</p>}<Link href={`/trainer/progress/${p.id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div><Gauge className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No progress records yet</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
