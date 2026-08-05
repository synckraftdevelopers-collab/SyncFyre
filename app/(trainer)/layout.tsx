import { requireUser } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser(["trainer", "dietician"]);
  return (
    <PortalShell
      name={profile.full_name}
      role={profile.role?.name ?? "Trainer"}
      portal="trainer"
      settingsHref="/trainer/settings"
      notificationsHref="/trainer/notifications"
    >
      {children}
    </PortalShell>
  );
}
