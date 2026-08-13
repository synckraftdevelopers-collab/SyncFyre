import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateOwnProfileAction } from "@/app/actions/notification-actions";

export function PersonalSettingsForm({
  title = "Profile",
  description,
  fullName,
  phone,
  roleNote = "Role, branch, and permissions are managed by your administrator.",
}: {
  title?: string;
  description?: string;
  fullName: string;
  phone?: string | null;
  roleNote?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>
        <form action={updateOwnProfileAction} className="space-y-4">
          <label className="block text-sm font-medium">
            Full name
            <input name="full_name" required defaultValue={fullName} className="mt-1.5 h-10 w-full rounded border px-3" />
          </label>
          <label className="block text-sm font-medium">
            Phone
            <input name="phone" defaultValue={phone ?? ""} className="mt-1.5 h-10 w-full rounded border px-3" />
          </label>
          <p className="text-xs text-muted-foreground">{roleNote}</p>
          <button className="rounded bg-primary px-4 py-2 text-primary-foreground">Save changes</button>
        </form>
      </CardContent>
    </Card>
  );
}
