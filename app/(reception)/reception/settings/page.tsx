import { PersonalSettingsForm } from "@/components/settings/personal-settings-form";
import { requireUser } from "@/lib/auth";

export default async function ReceptionSettingsPage() {
  const profile = await requireUser(["reception"]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Personal settings</h1>
        <p className="text-sm text-muted-foreground">Update your contact details and profile information.</p>
      </div>
      <PersonalSettingsForm
        title="Basic information"
        description="Update the reception portal profile shown in the header and account menus."
        fullName={profile.full_name}
        phone={profile.phone}
      />
    </div>
  );
}
