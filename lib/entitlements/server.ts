import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { evaluateFeature, type SaaSFeatureKey } from "./evaluate";

export async function getCurrentEntitlement(featureKey: SaaSFeatureKey) {
  const profile = await getCurrentProfile();
  if (!profile?.tenant_id) return evaluateFeature({ plan: null, featureKey });

  const supabase = await createClient();
  const [{ data: tenant, error: tenantError }, { data: override, error: overrideError }] = await Promise.all([
    supabase.from("tenants").select("plan,status").eq("id", profile.tenant_id).maybeSingle(),
    supabase.from("tenant_features").select("enabled").eq("tenant_id", profile.tenant_id).eq("feature_key", featureKey).maybeSingle(),
  ]);
  if (tenantError) throw new Error("Unable to resolve tenant plan: " + tenantError.message);
  if (overrideError && overrideError.code !== "42P01") throw new Error("Unable to resolve feature override: " + overrideError.message);

  return evaluateFeature({
    plan: tenant?.plan,
    status: tenant?.status,
    featureKey,
    override: override?.enabled ?? null,
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