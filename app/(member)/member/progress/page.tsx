import { Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My Progress" };

export default async function MemberProgressPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: memberRecord } = await supabase
    .from("members").select("id").eq("user_id", profile?.id ?? "").maybeSingle();
  const memberId = memberRecord?.id ?? null;

  const { data } = memberId
    ? await supabase
        .from("progress")
        .select("id,measured_at,weight_kg,bmi,body_fat_percent,muscle_mass_kg,waist_cm,chest_cm,arms_cm,legs_cm,notes")
        .eq("member_id", memberId)
        .order("measured_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const latest = data?.[0] ?? null;

  const metrics = latest
    ? [
        ["Weight", latest.weight_kg ? `${latest.weight_kg} kg` : "—"],
        ["BMI", latest.bmi ? String(latest.bmi) : "—"],
        ["Body fat", latest.body_fat_percent ? `${latest.body_fat_percent}%` : "—"],
        ["Muscle mass", latest.muscle_mass_kg ? `${latest.muscle_mass_kg} kg` : "—"],
        ["Waist", latest.waist_cm ? `${latest.waist_cm} cm` : "—"],
        ["Chest", latest.chest_cm ? `${latest.chest_cm} cm` : "—"],
        ["Arms", latest.arms_cm ? `${latest.arms_cm} cm` : "—"],
        ["Legs", latest.legs_cm ? `${latest.legs_cm} cm` : "—"],
      ] as const
    : [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">My Progress</h1>

      {latest ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Latest check-in · {latest.measured_at}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold">{value}</p>
                </div>
              ))}
            </CardContent>
            {latest.notes && (
              <CardContent className="border-t pt-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Notes</p>{latest.notes}
              </CardContent>
            )}
          </Card>

          {data && data.length > 1 && (
            <Card>
              <CardHeader><CardTitle>History</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                    <tr>{["Date", "Weight", "BMI", "Body fat", "Notes"].map((h) => <th key={h} className="pb-3 pr-4 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 pr-4 font-medium">{r.measured_at}</td>
                        <td className="pr-4">{r.weight_kg ? `${r.weight_kg} kg` : "—"}</td>
                        <td className="pr-4">{r.bmi ?? "—"}</td>
                        <td className="pr-4">{r.body_fat_percent ? `${r.body_fat_percent}%` : "—"}</td>
                        <td className="pr-4 text-muted-foreground max-w-40 truncate">{r.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="grid min-h-48 place-items-center text-center p-8">
            <div>
              <Gauge className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No progress records yet</p>
              <p className="text-sm text-muted-foreground">Your trainer will record your measurements at each check-in.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
