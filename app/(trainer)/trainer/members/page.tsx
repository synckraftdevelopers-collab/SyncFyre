import { UserRound, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getAssignedMembers, getTrainerPortalContext } from "@/services/trainer-portal.service";

export const metadata = { title: "My Members" };

export default async function TrainerMembersPage() {
  const profile = await requireUser(["trainer", "dietician", "diet-planner", "diet_planner"]);
  const context = await getTrainerPortalContext(profile);
  const result = context.data ? await getAssignedMembers(context.data) : { data: [], error: context.error };
  const members = result.data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Members</h1>
        <p className="text-sm text-muted-foreground">Members assigned to you for training.</p>
      </div>
      {result.error && <Card className="border-destructive/40"><CardContent className="py-4 text-sm text-destructive">{result.error}</CardContent></Card>}
      <Card>
        <CardHeader>
          <CardTitle>{members.length} assigned member{members.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length ? (
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-4 py-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserRound className="size-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.member_code} ï¿½ {member.phone}</p>
                    {member.fitness_goal && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{member.fitness_goal}</p>}
                  </div>
                  <Badge variant={member.status === "active" ? "success" : "outline"}>{member.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center text-center"><div><UsersRound className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No members assigned yet</p><p className="text-sm text-muted-foreground">Ask your admin to assign members to your profile.</p></div></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}