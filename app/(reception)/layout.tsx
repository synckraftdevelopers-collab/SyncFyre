import { requirePortalContext } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";
import { getCommercialPlanTier } from "@/lib/entitlements";
import { getUnreadNotificationCount } from "@/services/notification.service";
import { getPhaseSnapshot } from "@/services/phase.service";

export default async function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const profile = await requirePortalContext(["reception"]);
  const unreadCount = await getUnreadNotificationCount({ userId: profile.id, branchId: profile.branch_id, tenantId: profile.tenant_id, role: profile.role?.slug });
  const phaseSnapshot = await getPhaseSnapshot();
  return (
    <PortalShell
      name={profile.full_name}
      role={profile.role?.name ?? "Reception"}
      portal="reception"
      settingsHref="/reception/settings"
      notificationsHref="/reception/notifications"
      initialUnreadCount={unreadCount}
      userId={profile.id}
      branchId={profile.branch_id}
      tenantId={profile.tenant_id}
      tenantTimezone={profile.tenant_timezone}
      branchTimezone={profile.branch_timezone}
      userRole={profile.role?.slug ?? null}
      commercialPlanTier={getCommercialPlanTier(profile.tenant_plan)}
      phaseSnapshot={phaseSnapshot}
    >
      {children}
    </PortalShell>
  );
}
