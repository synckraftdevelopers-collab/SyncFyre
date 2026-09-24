/**
 * frozen-tenants.ts
 *
 * Frozen feature snapshots for specific tenants that must be insulated
 * from future global plan changes.
 *
 * HOW IT WORKS
 * ─────────────
 * When a tenant has `features_frozen = true` in the `tenants` table AND
 * their tenant_id appears in FROZEN_TENANT_SNAPSHOTS, feature access is
 * decided exclusively by this allowlist — not by the global plan/phase
 * registry. The tenant's plan (Growth/Scale) remains unchanged in the DB;
 * only entitlement evaluation is redirected here.
 *
 * DECISION LOGIC (see evaluateFrozenTenant below):
 *   allowed = featureKey IN snapshot.allowedFeatures
 *             AND override !== false   ← explicit DB false still wins
 *             AND status === active
 *
 * WHY A CODE-SIDE ALLOWLIST
 * ─────────────────────────
 * - Auditable: every snapshot change is a git commit, reviewable in PR.
 * - Safe: adding new features to Growth/Scale never silently reaches a
 *   frozen tenant — they must be explicitly added to the snapshot.
 * - No ongoing DB migrations: the allowlist is updated in code, not by
 *   inserting rows into tenant_features for every new platform feature.
 * - Rollback: revert the git commit.
 *
 * UPDATING A FROZEN SNAPSHOT
 * ───────────────────────────
 * 1. Get explicit developer approval to change Talwalkar's entitlements.
 * 2. Edit the snapshot below — add or remove feature keys as approved.
 * 3. Commit with a message like "feat(freeze): add crm_v2 to Talwalkar snapshot".
 * 4. Run tests: npm test — the freeze simulation tests will catch regressions.
 *
 * IMPORTANT
 * ─────────
 * - Do NOT add feature keys here that aren't in lib/entitlements/registry.ts.
 * - Do NOT remove this file or its exports without explicit approval.
 * - Do NOT set features_frozen=true for any tenant without a snapshot entry here.
 */

import type { SaaSFeatureKey } from "./registry";
import type { SubscriptionState } from "./evaluate";

export type FrozenTenantSnapshot = {
  /**
   * Human-readable name for audit logs and error messages.
   */
  tenantName: string;

  /**
   * The exact set of feature keys this tenant is approved to use.
   * Features NOT in this set are blocked — even if Growth/Scale plan
   * adds them in the future.
   *
   * Snapshot captured: 2026-09-23
   * Approved by: developer (pre-flight verified)
   * Frozen plan context: Growth / professional
   */
  allowedFeatures: ReadonlySet<SaaSFeatureKey>;
};

/**
 * Talwalkar Gym — frozen feature snapshot.
 *
 * Approved feature set as of 2026-09-23:
 *
 * PHASE 1 (Essential — all approved):
 *   customization_engine_enabled, dashboard, members, membership,
 *   payments, pending_payments, expiry, attendance, staff, trainer,
 *   equipment, reports, import_export, responsive_core, member_portal
 *
 * PHASE 2 (Growth — approved subset):
 *   crm, advanced_membership, finance, dietician, biometric,
 *   smart_alerts, advanced_reports, gst, growth_permissions,
 *   advanced_accounting, accounting
 *
 * PHASE 2 (Growth — EXPLICITLY EXCLUDED):
 *   pt            → disabled (PT Reports, PT Sessions)
 *   whatsapp      → disabled (WhatsApp Templates, Communication History)
 *
 * PHASE 3 (Scale — ALL EXCLUDED):
 *   multi_branch, enterprise_rbac, advanced_automation,
 *   retention_intelligence, revenue_intelligence, advanced_crm,
 *   ai_insights, api_webhooks  → disabled (Developer)
 *
 * NOTE: The existing tenant_features DB rows (pt=false, whatsapp=false,
 * api_webhooks=false) remain in place as a secondary reinforcement layer.
 * The snapshot is the primary gate; DB overrides are belt-and-suspenders.
 */
const TALWALKAR_ALLOWED_FEATURES: ReadonlySet<SaaSFeatureKey> = new Set<SaaSFeatureKey>([
  // ── Phase 1: Essential — all approved ───────────────────────────────────
  "customization_engine_enabled",
  "dashboard",
  "members",
  "membership",
  "payments",
  "pending_payments",
  "expiry",
  "attendance",
  "staff",
  "trainer",
  "equipment",
  "reports",
  "import_export",
  "responsive_core",
  "member_portal",
  // ── Phase 2: Growth — approved subset ───────────────────────────────────
  "crm",
  "advanced_membership",
  "finance",
  "dietician",
  "biometric",
  "smart_alerts",
  "advanced_reports",
  "gst",
  "growth_permissions",
  "advanced_accounting",
  "accounting",
  // ── Excluded (not in this set = blocked) ────────────────────────────────
  // "pt"                 → EXCLUDED: PT Reports and PT Sessions disabled
  // "whatsapp"           → EXCLUDED: WhatsApp Templates + Communication History disabled
  // "multi_branch"       → EXCLUDED: Scale feature, Growth tenant
  // "enterprise_rbac"    → EXCLUDED: Scale feature
  // "advanced_automation"→ EXCLUDED: Scale feature
  // "retention_intelligence" → EXCLUDED: Scale feature
  // "revenue_intelligence"   → EXCLUDED: Scale feature
  // "advanced_crm"       → EXCLUDED: Scale feature
  // "ai_insights"        → EXCLUDED: Scale feature
  // "api_webhooks"       → EXCLUDED: Developer disabled
]);

/**
 * Map from tenant_id → frozen snapshot.
 *
 * Only tenants listed here AND with features_frozen=true in the DB
 * are subject to snapshot-based entitlement evaluation.
 *
 * Adding a new entry here requires:
 * 1. Setting features_frozen=true for that tenant in the DB.
 * 2. Capturing the snapshot at the approved point in time.
 * 3. Explicit developer approval.
 */
export const FROZEN_TENANT_SNAPSHOTS: Readonly<Record<string, FrozenTenantSnapshot>> = {
  "11111111-0001-0000-0000-000000000001": {
    tenantName: "Talwalkar Gym",
    allowedFeatures: TALWALKAR_ALLOWED_FEATURES,
  },
} as const;

/**
 * Evaluates feature access for a frozen tenant using their snapshot.
 *
 * Called by getCurrentEntitlement() in server.ts when the tenant's
 * features_frozen flag is true. Never called for non-frozen tenants.
 *
 * Decision:
 *   allowed = featureKey IN allowedFeatures
 *             AND override !== false
 *             AND subscription is active/trial
 *
 * The plan argument is passed through so the return shape matches
 * evaluateFeature() — callers don't need a separate code path.
 */
export function evaluateFrozenTenant(input: {
  tenantId: string;
  featureKey: SaaSFeatureKey;
  plan: string | null | undefined;
  status?: SubscriptionState;
  override?: boolean | null;
}): {
  allowed: boolean;
  frozen: true;
  reason: string | null;
} {
  const snapshot = FROZEN_TENANT_SNAPSHOTS[input.tenantId];
  const active =
    input.status === undefined ||
    input.status === "active" ||
    input.status === "trial";

  if (!active) {
    return {
      allowed: false,
      frozen: true,
      reason: "Tenant subscription is inactive.",
    };
  }

  if (!snapshot) {
    // features_frozen=true but no snapshot defined — fail closed (deny all)
    return {
      allowed: false,
      frozen: true,
      reason: "Frozen tenant has no approved feature snapshot.",
    };
  }

  // Explicit DB override=false always wins, even inside a frozen snapshot.
  if (input.override === false) {
    return {
      allowed: false,
      frozen: true,
      reason: "Disabled by a SuperAdmin override.",
    };
  }

  const inSnapshot = snapshot.allowedFeatures.has(input.featureKey);
  return {
    allowed: inSnapshot,
    frozen: true,
    reason: inSnapshot
      ? null
      : "Feature is not included in this tenant's approved feature snapshot.",
  };
}

/**
 * Returns the frozen snapshot for a tenant, or null if not frozen.
 * Used by server.ts to decide which evaluation path to take.
 */
export function getFrozenSnapshot(tenantId: string): FrozenTenantSnapshot | null {
  return FROZEN_TENANT_SNAPSHOTS[tenantId] ?? null;
}
