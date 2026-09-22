"use server";

import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import type {
  RevenueIntelligenceResult,
  ConsolidatedRevenueSummary,
  ConsolidatedMemberStats,
} from "@/services/report.service";

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

/**
 * Consolidated Cross-Branch Reports server action (P3-11).
 *
 * Gates:
 *  - Requires `multi_branch` feature (plan_3 / Scale) — the same billing key
 *    the existing "Branches" nav item and /admin/branches route already use.
 *  - Requires owner, admin, or manager role
 *
 * Returns tenant-wide revenue and member totals, each with a per-branch
 * breakdown, for the /admin/reports/consolidated page.
 */
export async function getConsolidatedReportAction(params: { dateFrom?: string; dateTo?: string } = {}): Promise<{
  data: { revenue: ConsolidatedRevenueSummary; members: ConsolidatedMemberStats } | null;
  error?: string;
}> {
  const profile = await requireUser(["owner", "admin", "manager"]);

  if (!(await hasCurrentFeature("multi_branch"))) {
    return { data: null, error: "Consolidated cross-branch reports require the Scale plan." };
  }

  if (!profile.tenant_id) {
    return { data: null, error: "Your account is not linked to an organization." };
  }

  try {
    const { getConsolidatedRevenueSummary, getConsolidatedMemberStats } = await import("@/services/report.service");
    const [revenue, members] = await Promise.all([
      getConsolidatedRevenueSummary(profile.tenant_id, params),
      getConsolidatedMemberStats(profile.tenant_id, params),
    ]);
    return { data: { revenue, members } };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unable to compute the consolidated report.",
    };
  }
}
