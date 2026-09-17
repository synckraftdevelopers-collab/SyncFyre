"use server";

import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import type { RevenueIntelligenceResult } from "@/services/report.service";

/**
 * Scale-exclusive Revenue Intelligence server action.
 *
 * Gates:
 *  - Requires `revenue_intelligence` feature (plan_3 / Scale)
 *  - Requires owner, admin, or manager role
 *
 * Talwalkar Safety: plan_1 → denied immediately by entitlement check.
 */
export async function getRevenueIntelligenceAction(): Promise<{
  data: RevenueIntelligenceResult | null;
  error?: string;
}> {
  const profile = await requireUser(["owner", "admin", "manager"]);

  if (!(await hasCurrentFeature("revenue_intelligence"))) {
    return { data: null, error: "Revenue Intelligence requires the Scale plan." };
  }

  if (!profile.tenant_id) {
    return { data: null, error: "Your account is not linked to an organization." };
  }

  try {
    const { getRevenueIntelligence } = await import("@/services/report.service");
    const data = await getRevenueIntelligence({
      branchId: profile.branch_id,
      tenantId: profile.tenant_id,
    });
    return { data };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unable to compute revenue intelligence.",
    };
  }
}

/**
 * Scale-exclusive Retention Intelligence server action.
 *
 * Gates:
 *  - Requires `retention_intelligence` feature (plan_3 / Scale)
 *  - Requires owner, admin, or manager role
 */
export async function getRetentionIntelligenceAction(limit = 100): Promise<{
  data: import("@/services/report.service").RetentionIntelligenceResult | null;
  error?: string;
}> {
  const profile = await requireUser(["owner", "admin", "manager"]);

  if (!(await hasCurrentFeature("retention_intelligence"))) {
    return { data: null, error: "Retention Intelligence requires the Scale plan." };
  }

  if (!profile.tenant_id) {
    return { data: null, error: "Your account is not linked to an organization." };
  }

  try {
    const { getRetentionIntelligence } = await import("@/services/report.service");
    const data = await getRetentionIntelligence({
      branchId: profile.branch_id,
      tenantId: profile.tenant_id,
      limit,
    });
    return { data };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unable to compute retention intelligence.",
    };
  }
}
