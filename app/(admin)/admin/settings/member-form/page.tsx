import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { getMemberFormConfiguration } from "@/services/member-form-config.service";
import { MemberFormCustomizationPage } from "@/components/settings/member-form-customization-page";

export const metadata = { title: "Member Form Customization" };

export default async function AdminMemberFormSettingsPage() {
  const profile = await requireUser(["owner", "admin"]);
  if (!profile.tenant_id) return null;
  const configuration = await getMemberFormConfiguration(profile.tenant_id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Tenant-specific member form controls for registration and edit flows.</p>
        </div>
        <Link href="/admin/members" className={buttonVariants({ variant: "outline", size: "sm" })}>Back to Members</Link>
      </div>
      <MemberFormCustomizationPage initialConfiguration={configuration} />
    </div>
  );
}
