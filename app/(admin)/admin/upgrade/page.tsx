import { requirePortalContext } from "@/lib/auth";
import { UpgradeCenter } from "@/components/upgrade/upgrade-center";
import { PlanComparison } from "@/components/upgrade/plan-comparison";
import { getPlanConfig, type CommercialPlanKey } from "@/lib/plans/config";
import { normalizePlan } from "@/lib/entitlements/evaluate";

export const metadata = { title: "Upgrade Plan — SyncFyre" };

/** Sanitize the `next` param to prevent open redirects. */
function sanitizeNext(next: string | undefined): string {
  const raw = (next ?? "").trim();
  if (!raw) return "/admin/dashboard";
  // Only allow relative paths that start with /admin
  if (raw.startsWith("/admin/") || raw === "/admin") return raw;
  return "/admin/dashboard";
}

/** Map stored plan → commercial plan key */
function planKeyFromProfile(tenantPlan: string | null | undefined): CommercialPlanKey {
  const normalized = normalizePlan(tenantPlan as Parameters<typeof normalizePlan>[0]);
  if (normalized === "plan_2") return "growth";
  if (normalized === "plan_3") return "scale";
  return "essential";
}

export default async function AdminUpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string; next?: string }>;
}) {
  const profile = await requirePortalContext(["owner", "admin", "manager"]);
  const params = await searchParams;

  const featureLabel = params.feature?.trim() || undefined;
  const nextHref = sanitizeNext(params.next);
  const currentPlanKey = planKeyFromProfile(profile.tenant_plan);
  const currentPlanConfig = getPlanConfig(
    currentPlanKey === "growth" ? "plan_2" : currentPlanKey === "scale" ? "plan_3" : "plan_1",
  );

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10">
      {/* Page heading */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Upgrade Center
        </p>
        <h1 className="text-3xl font-extrabold">
          {featureLabel ? `Unlock ${featureLabel}` : "Choose your plan"}
        </h1>
        {featureLabel && (
          <p className="text-muted-foreground">
            {featureLabel} requires a higher plan. Review your options below.
          </p>
        )}
      </div>

      {/* Upgrade center — plan cards + request flow */}
      <UpgradeCenter
        currentPlanKey={currentPlanKey}
        featureLabel={featureLabel}
        nextHref={nextHref}
      />

      {/* Plan comparison table */}
      <PlanComparison currentPlanKey={currentPlanKey} />

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground">
        Signed in as{" "}
        <span className="font-semibold text-foreground">{profile.full_name}</span>{" "}
        &middot; Currently on the{" "}
        <span className="font-semibold text-foreground">{currentPlanConfig.name}</span> plan
        &middot; All prices in INR, billed annually
      </p>
    </div>
  );
}
