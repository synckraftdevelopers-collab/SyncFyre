import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/modules/resource-create-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/ui/back-button";

export const metadata = { title: "Add Trainer" };

export default async function NewTrainerPage() {
  await requireUser(["admin", "manager"]);
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email")
    .order("full_name");

  const userOptions = (users ?? []).map((user) => ({
    value: user.id,
    label: user.full_name || user.email || user.id,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <BackButton href="/admin/trainers" confirmOnLeave />
        <h1 className="mt-2 text-2xl font-bold">Add trainer</h1>
        <p className="text-sm text-muted-foreground">Create a trainer profile for an existing user account.</p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <ResourceCreateForm
            resource="trainers"
            returnTo="/admin/trainers"
            fields={[
              { name: "user_id", label: "User account", type: "select", options: userOptions, required: true },
              { name: "specializations", label: "Specializations", type: "tags" },
              { name: "experience_years", label: "Experience (years)", type: "number", defaultValue: 0 },
              { name: "certifications", label: "Certifications", type: "tags" },
              { name: "bio", label: "Biography", type: "textarea" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}