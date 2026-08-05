import { requireUser } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser(["reception"]);
  return (
    <PortalShell
      name={profile.full_name}
      role={profile.role?.name ?? "Reception"}
      portal="reception"
      settingsHref="/reception/settings"
      notificationsHref="/reception/notifications"
    >
      {children}
    </PortalShell>
  );
}
