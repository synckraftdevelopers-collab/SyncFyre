import { Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My Diet Plan" };

export default async function MemberDietPlanPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: memberRecord } = await supabase
    .from("members").select("id").eq("user_id", profile?.id ?? "").maybeSingle();
  const memberId = memberRecord?.id ?? null;

  // Get the most recent active diet plan
  const { data } = memberId
    ? await supabase
        .from("diet_plans")
        .select("id,name,start_date,end_date,breakfast,lunch,dinner,snacks,calories,protein_g,fat_g,carbs_g,water_liters,notes")
        .eq("member_id", memberId)
        .order("start_date", { ascending: false })
        .limit(1)
    : { data: [] };

  const plan = data?.[0] ?? null;

  const macros = plan
    ? [
        ["Calories", plan.calories ? `${plan.calories} kcal` : "—"],
        ["Protein", plan.protein_g ? `${plan.protein_g} g` : "—"],
        ["Carbohydrates", plan.carbs_g ? `${plan.carbs_g} g` : "—"],
        ["Fat", plan.fat_g ? `${plan.fat_g} g` : "—"],
        ["Water", plan.water_liters ? `${plan.water_liters} L` : "—"],
      ] as const
    : [];

  const meals = plan
    ? [
        ["Breakfast", plan.breakfast],
        ["Lunch", plan.lunch],
        ["Dinner", plan.dinner],
        ["Snacks", plan.snacks],
      ].filter(([, value]) => value) as [string, string][]
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">My Diet Plan</h1>

      {plan ? (
        <>
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Utensils className="size-5" />
              </div>
              <div>
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.start_date}{plan.end_date ? ` → ${plan.end_date}` : ""}</p>
              </div>
            </CardHeader>

            {macros.length > 0 && (
              <CardContent className="border-t pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Daily targets</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  {macros.map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-lg font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {meals.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Meal plan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {meals.map(([meal, content]) => (
                  <div key={meal}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{meal}</p>
                    <p className="text-sm whitespace-pre-line">{content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {plan.notes && (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Notes from your trainer</p>
                {plan.notes}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="grid min-h-48 place-items-center text-center p-8">
            <div>
              <Utensils className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No diet plan assigned yet</p>
              <p className="text-sm text-muted-foreground">Your trainer or dietician will create a plan for you.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
