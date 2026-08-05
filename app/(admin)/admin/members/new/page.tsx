import { MemberForm } from "@/components/members/member-form";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Register Member" };

export default async function AdminNewMemberPage() {
  await requireUser(["admin", "manager"]);
  const supabase = await createClient();
  const [branches, trainers] = await Promise.all([
    supabase.from("branches").select("id, name").eq("status", "active").order("name"),
    supabase.from("trainers").select("id, users(full_name)").eq("status", "active"),
  ]);
  const trainerOptions = (trainers.data ?? []).map((t) => ({
    id: t.id,
    name: (t.users as unknown as { full_name: string } | null)?.full_name ?? "Trainer",
  }));
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Register member</h1>
        <p className="text-sm text-muted-foreground">Create a complete member profile. A member ID is generated automatically.</p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <MemberForm branches={branches.data ?? []} trainers={trainerOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
