import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/ui/back-button";
import { AddTrainerForm } from "@/components/trainers/add-trainer-form";

export const metadata = { title: "Add Trainer" };

export default async function NewTrainerPage() {
  const profile = await requireUser(["owner", "admin", "manager"]);
  const supabase = await createClient();

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active")
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <BackButton href="/admin/trainers" confirmOnLeave />
        <h1 className="mt-2 text-2xl font-bold">Add trainer</h1>
        <p className="text-sm text-muted-foreground">
          Create a new trainer account. They will be able to log in immediately.
        </p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <AddTrainerForm
            branches={branches ?? []}
            defaultBranchId={profile.branch_id ?? ""}
            hasServiceKey={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
