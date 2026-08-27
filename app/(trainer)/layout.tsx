import { requirePortalContext } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";
import { getUnreadNotificationCount } from "@/services/notification.service";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requirePortalContext(["trainer", "dietician", "diet-planner", "diet_planner"]);
  const unreadCount = await getUnreadNotificationCount({ userId: profile.id, branchId: profile.branch_id, tenantId: profile.tenant_id, role: profile.role?.slug });
  return (
    <PortalShell
      name={profile.full_name}
      role={profile.role?.name ?? "Trainer"}
      portal="trainer"
      settingsHref="/trainer/settings"
      notificationsHref="/trainer/notifications"
      initialUnreadCount={unreadCount}
      userId={profile.id}
      branchId={profile.branch_id}
      tenantId={profile.tenant_id}
      tenantTimezone={profile.tenant_timezone}
      branchTimezone={profile.branch_timezone}
      userRole={profile.role?.slug ?? null}
    >
      {children}
    </PortalShell>
  );
}
