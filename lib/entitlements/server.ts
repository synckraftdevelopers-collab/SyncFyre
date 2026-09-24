import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { evaluateFeature, type SaaSFeatureKey } from "./evaluate";
import { evaluateFrozenTenant, getFrozenSnapshot } from "./frozen-tenants";

export async function getCurrentEntitlement(featureKey: SaaSFeatureKey) {
  const profile = await getCurrentProfile();
  if (!profile?.tenant_id) return evaluateFeature({ plan: null, featureKey });

  const supabase = await createClient();
  const [{ data: tenant, error: tenantError }, { data: override, error: overrideError }] = await Promise.all([
    // Select features_frozen along with plan/status so we can route frozen tenants
    supabase.from("tenants").select("plan,status,features_frozen").eq("id", profile.tenant_id).maybeSingle(),
    supabase.from("tenant_features").select("enabled").eq("tenant_id", profile.tenant_id).eq("feature_key", featureKey).maybeSingle(),
  ]);
  if (tenantError) throw new Error("Unable to resolve tenant plan: " + tenantError.message);
  if (overrideError && overrideError.code !== "42P01") throw new Error("Unable to resolve feature override: " + overrideError.message);

  const overrideValue = override?.enabled ?? null;
  const isFrozen = Boolean((tenant as { features_frozen?: boolean | null } | null)?.features_frozen);

  // ── Frozen-tenant path ───────────────────────────────────────────────────
  // When features_frozen=true, the tenant's entitlements are determined
  // entirely by their explicit frozen snapshot in frozen-tenants.ts.
  // This insulates them from all future Growth/Scale plan changes.
  if (isFrozen && getFrozenSnapshot(profile.tenant_id)) {
    const frozenResult = evaluateFrozenTenant({
      tenantId: profile.tenant_id,
      featureKey,
      plan: tenant?.plan,
      status: tenant?.status,
      override: overrideValue,
    });

    // Return a shape compatible with the normal evaluateFeature() result.
    return {
      allowed: frozenResult.allowed,
      locked: false,   // frozen tenants are not "locked" — they're frozen
      unavailable: false,
      feature: null,
      plan: null,
      reason: frozenResult.reason,
    };
  }

  // ── Normal plan-based path ───────────────────────────────────────────────
  return evaluateFeature({
    plan: tenant?.plan,
    status: tenant?.status,
    featureKey,
    override: overrideValue,
  });
}

export async function hasCurrentFeature(featureKey: SaaSFeatureKey) {
  return (await getCurrentEntitlement(featureKey)).allowed;
}

export async function assertCurrentFeature(featureKey: SaaSFeatureKey) {
  const entitlement = await getCurrentEntitlement(featureKey);
  if (!entitlement.allowed) throw new Error(entitlement.reason ?? "Feature is not included in the current plan.");
  return entitlement;
}
