import { createClient } from "@/lib/supabase/server";

export type WorkoutRow = {
  id: string;
  name: string;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  cardio_minutes: number | null;
  rest_seconds: number | null;
  trainer_notes: string | null;
  scheduled_date: string | null;
  status: string;
  member_id: string;
  branch_id: string;
  members: { full_name: string | null; member_code: string | null } | null;
  trainers: { users: { full_name: string | null } | null } | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listWorkouts(branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("workouts")
    .select("id,name,exercise_name,sets,reps,weight_kg,cardio_minutes,rest_seconds,trainer_notes,scheduled_date,status,member_id,branch_id,members(full_name,member_code),trainers!workouts_trainer_id_fkey(users!trainers_user_id_fkey(full_name))")
    .order("created_at", { ascending: false })
    .limit(100);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const raw = row as any;
    return {
      ...raw,
      members: firstRelation(raw.members),
      trainers: firstRelation(raw.trainers),
    };
  }) as WorkoutRow[];
}

export async function getWorkoutById(id: string, branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("workouts")
    .select("id,name,exercise_name,sets,reps,weight_kg,cardio_minutes,rest_seconds,trainer_notes,scheduled_date,status,member_id,branch_id,members(full_name,member_code),trainers!workouts_trainer_id_fkey(users!trainers_user_id_fkey(full_name))")
    .eq("id", id);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const raw = data as any;
  return {
    ...raw,
    members: firstRelation(raw.members),
    trainers: firstRelation(raw.trainers),
  } as WorkoutRow;
}
