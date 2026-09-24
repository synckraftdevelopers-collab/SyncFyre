import { requirePortalContext } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";
import { getResolvedSetting } from "@/services/config.service";
import { getUnreadNotificationCount } from "@/services/notification.service";
import { getCommercialPlanTier } from "@/lib/entitlements";
import { getPhaseSnapshot } from "@/services/phase.service";
import { normalizePlan } from "@/lib/entitlements/evaluate";
import { createClient } from "@/lib/supabase/server";
import { getPortalNavItems } from "@/lib/nav";
import type { CommercialPlanKey } from "@/lib/plans/config";
import type { UserRole } from "@/types";

function planKeyFromTenantPlan(tenantPlan: string | null | undefined): CommercialPlanKey {
  const normalized = normalizePlan(tenantPlan as Parameters<typeof normalizePlan>[0]);
  if (normalized === "plan_2") return "growth";
  if (normalized === "plan_3") return "scale";
  return "essential";
}

/**
 * Builds the visible nav href list for a tenant, accounting for
 * tenant_features overrides (enabled=false rows).
 *
 * Without overrides, returns null (meaning "show all items according to
 * plan/phase"). When a tenant has feature keys explicitly disabled in
 * tenant_features, returns an explicit allowlist that omits the hrefs
 * of every nav item whose featureKey is overridden to false.
 *
 * This is the only sidebar layer that reads tenant_features — the sidebar
 * component itself is a client component that never touches the DB, and
 * the phase/plan logic it uses does not consult per-tenant overrides.
 */
async function computeVisibleNavHrefs(
  tenantId: string | null | undefined,
  userRole: UserRole | null | undefined,
  customSidebarHrefs: string[] | null,
): Promise<string[] | null> {
  // No tenant — nothing to filter
  if (!tenantId) return customSidebarHrefs ?? null;

  // Fetch only disabled overrides (enabled=false) — a single narrow query
  const supabase = await createClient();
  const { data: disabledRows } = await supabase
    .from("tenant_features")
    .select("feature_key")
    .eq("tenant_id", tenantId)
    .eq("enabled", false);

  const disabledKeys = new Set((disabledRows ?? []).map((r) => r.feature_key as string));

  // No overrides — respect the custom sidebar setting (or null = show all)
  if (disabledKeys.size === 0) return customSidebarHrefs ?? null;

  // Get the full nav for this role — same list the sidebar builds from
  const allNavItems = getPortalNavItems("admin", userRole);

  // Start from the custom hrefs if set, otherwise use all items
  const baseHrefs = customSidebarHrefs ?? allNavItems.map((item) => item.href);

  // Build a set of hrefs that belong to disabled features so we can exclude them.
  // A nav item is excluded when its featureKey appears in the disabled set.
  const disabledHrefs = new Set(
    allNavItems
      .filter((item) => item.featureKey && disabledKeys.has(item.featureKey))
      .map((item) => item.href),
  );

  if (disabledHrefs.size === 0) return customSidebarHrefs ?? null;

  return baseHrefs.filter((href) => !disabledHrefs.has(href));
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requirePortalContext(["owner", "admin", "manager"]);
  const sidebarSetting = profile.tenant_id ? await getResolvedSetting(profile.tenant_id, null, "sidebar.admin_items") : null;
  const customSidebarHrefs = sidebarSetting?.source === "default" ? null : (sidebarSetting?.value ?? null);

  const [unreadCount, phaseSnapshot, visibleNavHrefs] = await Promise.all([
    getUnreadNotificationCount({ userId: profile.id, branchId: profile.branch_id, tenantId: profile.tenant_id, role: profile.role?.slug }),
    getPhaseSnapshot(),
    computeVisibleNavHrefs(profile.tenant_id, profile.role?.slug ?? null, customSidebarHrefs),
  ]);

  const currentPlanKey = planKeyFromTenantPlan(profile.tenant_plan);
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
      visibleNavHrefs={visibleNavHrefs}
      phaseSnapshot={phaseSnapshot}
      currentPlanKey={currentPlanKey}
      gymName={profile.branch_name}
    >
      {children}
    </PortalShell>
  );
}
