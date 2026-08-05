import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { calculateAge, calculateBmi } from "@/lib/utils";
import { DeleteMemberDialog } from "@/components/members/delete-member-dialog";
import { PhotoUpload } from "@/components/members/photo-upload";

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const profile = await requireUser(["admin", "manager"]);
  const supabase = await createClient();

  const { data: member } = await supabase.from("members").select("*").eq("id", id).single();
  if (!member) notFound();

  const isEditMode = edit === "1";
  const canDelete = profile.role?.slug === "admin";

  let branches: { id: string; name: string }[] = [];
  let trainers: { id: string; name: string }[] = [];
  if (isEditMode) {
    const [branchRes, trainerRes] = await Promise.all([
      supabase.from("branches").select("id, name").eq("status", "active").order("name"),
      supabase.from("trainers").select("id, users(full_name)").eq("status", "active"),
    ]);
    branches = branchRes.data ?? [];
    trainers = (trainerRes.data ?? []).map((t) => ({
      id: t.id,
      name: (t.users as unknown as { full_name: string } | null)?.full_name ?? "Trainer",
    }));
  }

  const details = [
    ["Phone", member.phone], ["Email", member.email ?? "—"],
    ["Gender", member.gender ?? "—"],
    ["Age", member.date_of_birth ? String(calculateAge(member.date_of_birth)) : "—"],
    ["Height", member.height_cm ? `${member.height_cm} cm` : "—"],
    ["Weight", member.weight_kg ? `${member.weight_kg} kg` : "—"],
    ["BMI", String(calculateBmi(member.height_cm, member.weight_kg) ?? "—")],
    ["Blood group", member.blood_group ?? "—"],
    ["Fitness goal", member.fitness_goal ?? "—"],
    ["Medical conditions", member.medical_conditions ?? "—"],
    ["Emergency contact", member.emergency_contact_name ?? "—"],
    ["Emergency phone", member.emergency_contact_phone ?? "—"],
  ] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/members" className={buttonVariants({ variant: "ghost" })}>
          <ArrowLeft className="size-4" />Members
        </Link>
        <div className="ml-auto flex gap-2">
          {!isEditMode && (
            <Link href={`/admin/members/${id}?edit=1`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil className="size-4" />Edit
            </Link>
          )}
          {canDelete && <DeleteMemberDialog memberId={id} memberName={member.full_name} />}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-start gap-5">
          <PhotoUpload memberId={id} currentPhotoUrl={member.profile_photo_url} memberName={member.full_name} />
          <div className="flex-1">
            <CardTitle className="text-xl">{member.full_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{member.member_code}</p>
            <Badge className="mt-2" variant={member.status === "active" ? "success" : "outline"}>{member.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="border-t pt-5">
          {isEditMode ? (
            <EditSection memberId={id} branches={branches} trainers={trainers} member={member} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function EditSection({ memberId, branches, trainers, member }: {
  memberId: string;
  branches: { id: string; name: string }[];
  trainers: { id: string; name: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  member: any;
}) {
  const { MemberEditForm } = await import("@/components/members/member-edit-form");
  return <MemberEditForm member={member} branches={branches} trainers={trainers} />;
}
