import { FEATURE_REGISTRY, phaseRank, type PlanId, type SaaSFeatureKey } from "./registry.ts";
export type { SaaSFeatureKey } from "./registry.ts";

export type TenantPlan = PlanId | "trial" | "standard" | "professional" | "enterprise" | null | undefined;
export type SubscriptionState = "active" | "trial" | "suspended" | "cancelled" | null | undefined;

const LEGACY_PLAN_MAP: Record<Exclude<TenantPlan, PlanId | null | undefined>, PlanId> = {
  trial: "plan_1",
  standard: "plan_1",
  professional: "plan_2",
  enterprise: "plan_3",
};

export type ProductPlanId = PlanId;
export type StoredPlan = "trial" | "standard" | "professional" | "enterprise";

/** Storage mapping preserves the existing tenants.plan constraint. */
export function storedPlanForProduct(plan: ProductPlanId): StoredPlan {
  return plan === "plan_1" ? "trial" : plan === "plan_2" ? "professional" : "enterprise";
}
export function normalizePlan(plan: TenantPlan): PlanId | null {
  if (!plan) return null;
  if (plan === "plan_1" || plan === "plan_2" || plan === "plan_3") return plan;
  return LEGACY_PLAN_MAP[plan];
}

export function evaluateFeature(input: {
  plan: TenantPlan;
  status?: SubscriptionState;
  featureKey: string;
  override?: boolean | null;
  roleAllowed?: boolean;
}) {
  const feature = FEATURE_REGISTRY[input.featureKey as SaaSFeatureKey];
  const normalizedPlan = normalizePlan(input.plan);
  const active = input.status === undefined || input.status === "active" || input.status === "trial";
  const planAllows = Boolean(normalizedPlan && feature && phaseRank(feature.phase) <= Number(normalizedPlan.slice(-1)));
  const allowed = active && planAllows && input.override !== false && input.roleAllowed !== false;

  return {
    allowed,
    locked: Boolean(feature && normalizedPlan && active && !planAllows),
    unavailable: !feature || !normalizedPlan || !active,
    feature: feature ?? null,
    plan: normalizedPlan,
    reason: !feature
      ? "Unknown feature."
      : !normalizedPlan
        ? "No SaaS plan is assigned."
        : !active
          ? "Tenant subscription is inactive."
          : !planAllows
            ? "Available in " + feature.phase.replace("phase_", "Phase ") + "."
            : input.override === false
              ? "Disabled by a SuperAdmin override."
              : input.roleAllowed === false
                ? "Your role is not permitted to use this feature."
                : null,
  };
}

export function planAllowsFeature(plan: TenantPlan, featureKey: string, status?: SubscriptionState) {
  return evaluateFeature({ plan, status, featureKey }).allowed;
}