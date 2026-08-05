import Link from "next/link";
import { Plus, Utensils } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Diet Plans" };

export default async function TrainerDietPlansPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: trainerRecord } = await supabase
    .from("trainers").select("id").eq("user_id", profile?.id ?? "").single();
  const trainerId = trainerRecord?.id ?? "";

  const { data } = await supabase
    .from("diet_plans")
    .select("id,name,start_date,end_date,calories,status,members(full_name)")
    .eq("staff_id", trainerId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Diet Plans</h1>
          <p className="text-sm text-muted-foreground">Nutrition plans assigned to your members.</p>
        </div>
        <Link href="/trainer/diet-plans/new" className={buttonVariants({ className: "ml-auto" })}>
          <Plus className="size-4" />Create diet plan
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>{data?.length ?? 0} diet plan{(data?.length ?? 0) === 1 ? "" : "s"}</CardTitle></CardHeader>
        <CardContent>
          {data?.length ? (
            <div className="divide-y">
              {data.map((plan) => (
                <div key={plan.id} className="flex items-center gap-4 py-4">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Utensils className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(plan.members as unknown as { full_name: string } | null)?.full_name ?? "—"}
                      {plan.calories ? ` · ${plan.calories} kcal` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{plan.start_date}{plan.end_date ? ` → ${plan.end_date}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div><Utensils className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No diet plans yet</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
