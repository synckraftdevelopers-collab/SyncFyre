import { requirePortalContext } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";
import { getResolvedSetting } from "@/services/config.service";
import { getUnreadNotificationCount } from "@/services/notification.service";
import { getCommercialPlanTier } from "@/lib/entitlements";
import { getPhaseSnapshot } from "@/services/phase.service";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requirePortalContext(["owner", "admin", "manager"]);
  const sidebarSetting = profile.tenant_id ? await getResolvedSetting(profile.tenant_id, null, "sidebar.admin_items") : null;
  const unreadCount = await getUnreadNotificationCount({ userId: profile.id, branchId: profile.branch_id, tenantId: profile.tenant_id, role: profile.role?.slug });
  const phaseSnapshot = await getPhaseSnapshot();
  return (
    <PortalShell
      name={profile.full_name}
      role={profile.role?.name ?? "Admin"}
      portal="admin"
      settingsHref="/admin/settings?tab=application"
      notificationsHref="/admin/notifications"
      initialUnreadCount={unreadCount}
      userId={profile.id}
      branchId={profile.branch_id}
      tenantId={profile.tenant_id}
      tenantTimezone={profile.tenant_timezone}
      branchTimezone={profile.branch_timezone}
      userRole={profile.role?.slug ?? null}
      commercialPlanTier={getCommercialPlanTier(profile.tenant_plan)}
      visibleNavHrefs={sidebarSetting?.source === "default" ? null : (sidebarSetting?.value ?? null)}
      phaseSnapshot={phaseSnapshot}
    >
      {children}
    </PortalShell>
  );
}
