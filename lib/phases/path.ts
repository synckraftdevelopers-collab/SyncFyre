import { FEATURE_REGISTRY, type PhaseFeatureKey } from "@/lib/phases/registry";

export type PhaseLockedTarget = {
  featureKey: PhaseFeatureKey;
  featureName: string;
  requiredPhase: string;
};

function matchesPathname(pathname: string, target: readonly string[] | undefined) {
  if (!target?.length) return false;
  return target.some((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
}

export function getPhaseLockedTarget(pathname: string, searchParams?: URLSearchParams) {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (normalized === "/admin/settings" && searchParams?.get("tab") === "biometric") {
    return {
      featureKey: "biometric" as PhaseFeatureKey,
      featureName: "Biometric Attendance",
      requiredPhase: "PHASE_2",
    } satisfies PhaseLockedTarget;
  }

  for (const feature of Object.values(FEATURE_REGISTRY)) {
    if (matchesPathname(normalized, feature.pathnames)) {
      return {
        featureKey: feature.feature_key,
        featureName: feature.name,
        requiredPhase: feature.phase,
      } satisfies PhaseLockedTarget;
    }
    if (feature.apiPrefixes?.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
      return {
        featureKey: feature.feature_key,
        featureName: feature.name,
        requiredPhase: feature.phase,
      } satisfies PhaseLockedTarget;
    }
  }

  return null;
}
