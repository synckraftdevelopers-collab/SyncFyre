import { UserRound, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My Members" };

export default async function TrainerMembersPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // Find this trainer's record
  const { data: trainerRecord } = await supabase
    .from("trainers")
    .select("id")
    .eq("user_id", profile?.id ?? "")
    .single();

  const trainerId = trainerRecord?.id ?? null;

  const { data: members } = trainerId
    ? await supabase
        .from("members")
        .select("id,member_code,full_name,phone,email,status,fitness_goal,profile_photo_url")
        .eq("assigned_trainer_id", trainerId)
        .order("full_name")
    : { data: [] };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Members</h1>
        <p className="text-sm text-muted-foreground">Members assigned to you for training.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{members?.length ?? 0} assigned member{(members?.length ?? 0) === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent>
          {members?.length ? (
            <div className="divide-y">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-4 py-4">
                  <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                    <UserRound className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{m.member_code} · {m.phone}</p>
                    {m.fitness_goal && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{m.fitness_goal}</p>}
                  </div>
                  <Badge variant={m.status === "active" ? "success" : "outline"}>{m.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div>
                <UsersRound className="mx-auto mb-3 size-10 text-muted-foreground" />
                <p className="font-medium">No members assigned yet</p>
                <p className="text-sm text-muted-foreground">Ask your admin to assign members to your profile.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
