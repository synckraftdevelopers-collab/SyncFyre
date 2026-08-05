import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { calculateAge, calculateBmi } from "@/lib/utils";
import { PhotoUpload } from "@/components/members/photo-upload";

export const metadata = { title: "My Profile" };

export default async function MemberProfilePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", profile?.id ?? "")
    .maybeSingle();

  if (!member) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <Card>
          <CardContent className="grid min-h-48 place-items-center text-center p-8">
            <div>
              <UserRound className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">Profile not linked</p>
              <p className="text-sm text-muted-foreground">Ask your gym administrator to link your account to a member profile.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const details = [
    ["Member ID", member.member_code],
    ["Phone", member.phone],
    ["Email", member.email ?? "—"],
    ["Gender", member.gender ?? "—"],
    ["Age", member.date_of_birth ? String(calculateAge(member.date_of_birth)) : "—"],
    ["Height", member.height_cm ? `${member.height_cm} cm` : "—"],
    ["Weight", member.weight_kg ? `${member.weight_kg} kg` : "—"],
    ["BMI", String(calculateBmi(member.height_cm, member.weight_kg) ?? "—")],
    ["Blood group", member.blood_group ?? "—"],
    ["Fitness goal", member.fitness_goal ?? "—"],
    ["Medical conditions", member.medical_conditions ?? "—"],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <Card>
        <CardHeader className="flex-row items-start gap-5">
          <PhotoUpload memberId={member.id} currentPhotoUrl={member.profile_photo_url} memberName={member.full_name} />
          <div className="flex-1">
            <CardTitle className="text-xl">{member.full_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{member.member_code}</p>
            <Badge className="mt-2" variant={member.status === "active" ? "success" : "outline"}>{member.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="border-t pt-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
