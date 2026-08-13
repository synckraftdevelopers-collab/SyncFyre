import { requireUser } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser(["admin", "manager"]);
  return (
    <PortalShell
      name={profile.full_name}
      role={profile.role?.name ?? "Admin"}
      portal="admin"
      settingsHref="/admin/settings?tab=application"
      notificationsHref="/admin/notifications"
    >
      {children}
    </PortalShell>
  );
}

