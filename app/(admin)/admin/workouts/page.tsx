import Link from "next/link";
import { Dumbbell, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Workouts" };

const SORTABLE_COLUMNS = [
  { label: "Workout", column: "workout" as const },
  { label: "Member", column: "member" as const },
  { label: "Exercise", column: "exercise" as const },
  { label: "Trainer", column: "trainer" as const },
  { label: "Scheduled", column: "scheduled" as const },
  { label: "Status", column: "status" as const },
];

export default async function AdminWorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();
  let query = supabase
    .from("workouts")
    .select("id,name,exercise_name,sets,reps,weight_kg,scheduled_date,status,members(full_name,member_code),trainers!workouts_trainer_id_fkey(users!trainers_user_id_fkey(full_name))")
    .order("created_at", { ascending: false })
    .limit(100);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let workouts = data ?? [];

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (workout: (typeof workouts)[number]): string => {
      const member = workout.members as unknown as { full_name: string; member_code: string } | null;
      const trainer = workout.trainers as unknown as { users: { full_name: string } | null } | null;
      switch (colSort) {
        case "workout": return workout.name ?? "";
        case "member": return member?.full_name ?? "";
        case "exercise": return workout.exercise_name ?? "";
        case "trainer": return trainer?.users?.full_name ?? "";
        case "scheduled": return workout.scheduled_date ?? "";
        case "status": return workout.status ?? "";
        default: return "";
      }
    };
    workouts = [...workouts].sort((a, b) => sortValue(a).localeCompare(sortValue(b)) * dirMul);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold">Workouts</h1><p className="text-sm text-muted-foreground">Workout plans assigned to members.</p></div>
        <Link href="/admin/workouts/new" className={buttonVariants({ className: "ml-auto" })}><Plus className="size-4" />Create workout</Link>
      </div>
      <Card>
        <CardHeader><CardTitle>{workouts.length} workout{workouts.length === 1 ? "" : "s"}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {workouts.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40">{SORTABLE_COLUMNS.map(({ label, column }) => <SortableTh key={column} label={label} column={column} basePath="/admin/workouts" searchParams={sp as Record<string, string | undefined>} currentSort={colSort} currentDir={colDir} paramNames={{ sort: "colSort", dir: "colDir" }} className="px-4 py-3 text-left font-medium text-muted-foreground" />)}</tr></thead><tbody className="divide-y">{workouts.map((workout) => <tr key={workout.id} className="hover:bg-muted/30"><td className="px-4 py-3 font-medium"><Link className="hover:underline" href={`/admin/workouts/${workout.id}`}>{workout.name}</Link></td><td className="px-4 py-3">{(workout.members as unknown as { full_name: string; member_code: string } | null)?.full_name ?? "—"}</td><td className="px-4 py-3">{workout.exercise_name}{workout.sets && workout.reps ? ` · ${workout.sets}×${workout.reps}` : ""}</td><td className="px-4 py-3">{(workout.trainers as unknown as { users: { full_name: string } | null } | null)?.users?.full_name ?? "—"}</td><td className="px-4 py-3">{workout.scheduled_date ?? "—"}</td><td className="px-4 py-3"><Badge variant={workout.status === "active" ? "success" : "outline"}>{workout.status}</Badge></td></tr>)}</tbody></table></div> : <div className="grid min-h-56 place-items-center text-center"><div><Dumbbell className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No workouts yet</p><Link href="/admin/workouts/new" className="mt-2 inline-block text-sm text-primary hover:underline">Create the first workout</Link></div></div>}
        </CardContent>
      </Card>
    </div>
  );
}
