/**
 * SyncFyre commercial plan display configuration.
 *
 * This file is the single source of truth for:
 *   - plan names, descriptions, and pricing shown in the upgrade UX
 *   - which user-facing features belong to each commercial plan
 *   - additional/add-on offerings (never plan-gated in the entitlement system)
 *
 * IMPORTANT:
 *   - Do NOT add entitlement logic here. Entitlements live in lib/entitlements/.
 *   - Do NOT read tenants.plan from this file. Use evaluateFeature() for that.
 *   - Feature keys here are display-only — they map to the canonical
 *     SaaSFeatureKey registry in lib/entitlements/registry.ts.
 */

import type { SaaSFeatureKey } from "@/lib/entitlements/registry";

export type CommercialPlanKey = "essential" | "growth" | "scale";

export type PlanDisplayFeature = {
  /** Canonical SaaS feature key for entitlement checks */
  featureKey: SaaSFeatureKey;
  /** User-facing label */
  label: string;
  /** Short value proposition shown in the upgrade modal */
  description?: string;
  /** Bullet points shown in contextual upgrade modal */
  bullets?: string[];
};

export type CommercialPlanConfig = {
  key: CommercialPlanKey;
  /** Display name — use this everywhere in the UI */
  name: string;
  /** Internal product plan ID used by the entitlement evaluator */
  planId: "plan_1" | "plan_2" | "plan_3";
  /** Annual price in INR */
  priceInr: number;
  /** Formatted price string */
  price: string;
  /** Billing period label */
  period: string;
  /** Short positioning tagline */
  tagline: string;
  /** Target customer description */
  targetCustomer: string;
  /** Features included in this plan (cumulative — includes lower tiers) */
  features: PlanDisplayFeature[];
  /** Features added on top of the previous plan (delta) */
  deltaFeatures: PlanDisplayFeature[];
};

// ─── Essential Plan ─────────────────────────────────────────────────────────

const ESSENTIAL_FEATURES: PlanDisplayFeature[] = [
  {
    featureKey: "members",
    label: "Member Management",
    description: "Complete member profiles, history, and lifecycle",
    bullets: ["Member profiles & documents", "Membership history", "Member import/export"],
  },
  {
    featureKey: "membership",
    label: "Membership & Billing",
    description: "Membership plans, payments, and renewals",
    bullets: ["Custom membership plans", "Payment recording", "Renewal reminders"],
  },
  {
    featureKey: "attendance",
    label: "Attendance Tracking",
    description: "Daily attendance with check-in/out records",
    bullets: ["Manual check-in/out", "Attendance history", "Absent member alerts"],
  },
  {
    featureKey: "payments",
    label: "Payments & Dues",
    description: "Collect and track all payments and pending dues",
    bullets: ["Payment collection", "Pending dues view", "Invoice generation"],
  },
  {
    featureKey: "expiry",
    label: "Membership Expiry",
    description: "Track and act on expiring memberships",
    bullets: ["Expiry dashboard", "Bulk renewal", "Expiry notifications"],
  },
  {
    featureKey: "reports",
    label: "Dashboard & Basic Reports",
    description: "Business overview and essential reports",
    bullets: ["Daily/weekly/monthly summaries", "Collection reports", "Member growth"],
  },
  {
    featureKey: "staff",
    label: "Staff & Roles",
    description: "Multi-user access with role-based permissions",
    bullets: ["Role-based access", "Staff accounts", "Activity tracking"],
  },
  {
    featureKey: "equipment",
    label: "Equipment Management",
    description: "Track gym equipment inventory and maintenance",
    bullets: ["Equipment catalog", "Maintenance schedule"],
  },
];

// ─── Growth Plan ─────────────────────────────────────────────────────────────

const GROWTH_DELTA_FEATURES: PlanDisplayFeature[] = [
  {
    featureKey: "crm",
    label: "CRM & Sales",
    description: "Turn leads into members with a complete sales pipeline",
    bullets: [
      "Lead management & pipeline",
      "Follow-ups & reminders",
      "Trial management",
      "Lead conversion tracking",
      "Sales reports",
    ],
  },
  {
    featureKey: "finance",
    label: "Finance & Accounts",
    description: "Full financial management — P&L, expenses, and revenue",
    bullets: [
      "Expense tracking",
      "Revenue & P&L reports",
      "GST-ready invoicing",
      "Finance dashboard",
      "Accounting module",
    ],
  },
  {
    featureKey: "pt",
    label: "Trainer & PT Management",
    description: "Assign trainers, track PT sessions, and manage packages",
    bullets: [
      "Trainer assignment",
      "PT session tracking",
      "Package management",
      "Diet plans",
      "Progress tracking",
    ],
  },
  {
    featureKey: "whatsapp",
    label: "WhatsApp Messaging",
    description: "Automated WhatsApp communication with members",
    bullets: [
      "Renewal reminders",
      "Birthday & anniversary messages",
      "Payment due alerts",
      "Broadcast messages",
    ],
  },
  {
    featureKey: "smart_alerts",
    label: "Automation & Alerts",
    description: "Smart automations that run without manual effort",
    bullets: [
      "Auto renewal reminders",
      "Expiry alerts",
      "Payment due notifications",
      "Inactivity alerts",
    ],
  },
  {
    featureKey: "biometric",
    label: "Biometric Attendance",
    description: "Face/fingerprint attendance with automatic sync",
    bullets: [
      "Face recognition devices",
      "Automatic attendance sync",
      "Device management",
      "Biometric reports",
    ],
  },
  {
    featureKey: "advanced_reports",
    label: "Advanced Reports",
    description: "Deep business analytics and exportable reports",
    bullets: [
      "Revenue intelligence",
      "Member analytics",
      "Attendance patterns",
      "Custom date ranges",
      "Export to Excel/PDF",
    ],
  },
  {
    featureKey: "advanced_accounting",
    label: "Advanced Accounting",
    description: "Full accounting with GST, ledgers, and multi-category expenses",
    bullets: [
      "Ledger management",
      "GST-ready reports",
      "Advanced expense categories",
      "Financial statements",
    ],
  },
];

const GROWTH_FEATURES: PlanDisplayFeature[] = [...ESSENTIAL_FEATURES, ...GROWTH_DELTA_FEATURES];

// ─── Scale Plan ──────────────────────────────────────────────────────────────

const SCALE_DELTA_FEATURES: PlanDisplayFeature[] = [
  {
    featureKey: "multi_branch",
    label: "Multi-Branch Management",
    description: "Manage multiple locations from one account",
    bullets: ["Centralized dashboard", "Branch-level reports", "Cross-branch member transfer"],
  },
  {
    featureKey: "enterprise_rbac",
    label: "Enterprise Access Control",
    description: "Advanced role hierarchies and approvals",
    bullets: ["Custom role creation", "Approval workflows", "Audit logs"],
  },
  {
    featureKey: "advanced_automation",
    label: "Automation Engine",
    description: "Build complex automated workflows",
    bullets: ["Custom trigger-action workflows", "Multi-step automations", "Webhook integrations"],
  },
  {
    featureKey: "retention_intelligence",
    label: "Retention Intelligence",
    description: "AI-powered member retention and churn prevention",
    bullets: ["Churn risk scoring", "Retention playbooks", "At-risk member alerts"],
  },
  {
    featureKey: "ai_insights",
    label: "AI Business Intelligence",
    description: "AI-driven insights and revenue predictions",
    bullets: ["Revenue forecasting", "Member behavior analysis", "Growth opportunities"],
  },
  {
    featureKey: "api_webhooks",
    label: "Integrations & Member App",
    description: "Connect SyncFyre with your other tools",
    bullets: ["REST API access", "Webhook support", "Premium member self-service portal"],
  },
];

const SCALE_FEATURES: PlanDisplayFeature[] = [...GROWTH_FEATURES, ...SCALE_DELTA_FEATURES];

// ─── Plan Configs ────────────────────────────────────────────────────────────

export const COMMERCIAL_PLANS: Record<CommercialPlanKey, CommercialPlanConfig> = {
  essential: {
    key: "essential",
    name: "Essential",
    planId: "plan_1",
    priceInr: 9999,
    price: "₹9,999",
    period: "/year",
    tagline: "Everything you need to run your gym",
    targetCustomer: "For independent gyms",
    features: ESSENTIAL_FEATURES,
    deltaFeatures: ESSENTIAL_FEATURES,
  },
  growth: {
    key: "growth",
    name: "Growth",
    planId: "plan_2",
    priceInr: 15999,
    price: "₹15,999",
    period: "/year",
    tagline: "Grow faster with CRM, finance & automation",
    targetCustomer: "For growing gyms & fitness centres",
    features: GROWTH_FEATURES,
    deltaFeatures: GROWTH_DELTA_FEATURES,
  },
  scale: {
    key: "scale",
    name: "Scale",
    planId: "plan_3",
    priceInr: 29999,
    price: "₹29,999",
    period: "/year",
    tagline: "Enterprise power for premium & multi-location gyms",
    targetCustomer: "For premium & multi-location gyms",
    features: SCALE_FEATURES,
    deltaFeatures: SCALE_DELTA_FEATURES,
  },
};

export const COMMERCIAL_PLAN_ORDER: CommercialPlanKey[] = ["essential", "growth", "scale"];

/** Map from plan_1/plan_2/plan_3 to the display config */
export const PLAN_ID_TO_CONFIG: Record<"plan_1" | "plan_2" | "plan_3", CommercialPlanConfig> = {
  plan_1: COMMERCIAL_PLANS.essential,
  plan_2: COMMERCIAL_PLANS.growth,
  plan_3: COMMERCIAL_PLANS.scale,
};

/** Get the display config for a given plan ID (handles null gracefully) */
export function getPlanConfig(planId: string | null | undefined): CommercialPlanConfig {
  if (planId === "plan_2") return COMMERCIAL_PLANS.growth;
  if (planId === "plan_3") return COMMERCIAL_PLANS.scale;
  // trial, standard, plan_1, null → Essential
  return COMMERCIAL_PLANS.essential;
}

/** Get the next plan above the current one */
export function getNextPlan(currentKey: CommercialPlanKey): CommercialPlanConfig | null {
  const idx = COMMERCIAL_PLAN_ORDER.indexOf(currentKey);
  const nextKey = COMMERCIAL_PLAN_ORDER[idx + 1];
  return nextKey ? COMMERCIAL_PLANS[nextKey] : null;
}

/** Find which plan a feature belongs to (for contextual modal) */
export function getPlanForFeature(featureKey: SaaSFeatureKey): CommercialPlanConfig | null {
  for (const key of COMMERCIAL_PLAN_ORDER) {
    const plan = COMMERCIAL_PLANS[key];
    if (plan.deltaFeatures.some((f) => f.featureKey === featureKey)) return plan;
  }
  return null;
}

/** Get display feature info for a specific feature key */
export function getFeatureDisplay(featureKey: SaaSFeatureKey): PlanDisplayFeature | null {
  for (const key of COMMERCIAL_PLAN_ORDER) {
    const found = COMMERCIAL_PLANS[key].deltaFeatures.find((f) => f.featureKey === featureKey);
    if (found) return found;
  }
  return null;
}

// ─── Additional Offerings (not plan-gated) ───────────────────────────────────

export const ADDITIONAL_OFFERINGS = [
  {
    label: "Data Migration Assistance",
    description: "We import your existing member and payment data",
  },
  {
    label: "WhatsApp API Integration",
    description: "Connect your own WhatsApp Business API account",
  },
  {
    label: "Payment Gateway Integration",
    description: "Accept online payments via Razorpay or Cashfree",
  },
  {
    label: "Custom Reports",
    description: "Bespoke reports tailored to your business needs",
  },
  {
    label: "On-site Training & Implementation",
    description: "Hands-on training for your staff at your location",
  },
  {
    label: "Priority Support & Onboarding",
    description: "Dedicated onboarding manager and priority helpdesk",
  },
] as const;
