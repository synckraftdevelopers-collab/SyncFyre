export const PLAN_IDS = ["plan_1", "plan_2", "plan_3"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PHASE_IDS = ["phase_1", "phase_2", "phase_3"] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

/** The single product feature registry. Existing feature keys are reused where available. */
export const FEATURE_REGISTRY = {
  customization_engine_enabled: { phase: "phase_1", label: "Customization engine" },
  dashboard: { phase: "phase_1", label: "Dashboard" },
  members: { phase: "phase_1", label: "Member management" },
  membership: { phase: "phase_1", label: "Membership management" },
  payments: { phase: "phase_1", label: "Payments" },
  pending_payments: { phase: "phase_1", label: "Pending payments" },
  expiry: { phase: "phase_1", label: "Membership expiry" },
  attendance: { phase: "phase_1", label: "Attendance" },
  staff: { phase: "phase_1", label: "Staff and basic roles" },
  trainer: { phase: "phase_1", label: "Trainer foundation" },
  equipment: { phase: "phase_1", label: "Equipment" },
  reports: { phase: "phase_1", label: "Basic reports" },
  import_export: { phase: "phase_1", label: "Import and export" },
  responsive_core: { phase: "phase_1", label: "Responsive core experience" },
  crm: { phase: "phase_2", label: "CRM and lead pipeline" },
  whatsapp: { phase: "phase_2", label: "WhatsApp and communications" },
  advanced_membership: { phase: "phase_2", label: "Advanced membership operations" },
  finance: { phase: "phase_2", label: "Finance management" },
  pt: { phase: "phase_2", label: "PT and trainer management" },
  dietician: { phase: "phase_2", label: "Dietician workflows" },
  biometric: { phase: "phase_2", label: "Biometric attendance" },
  smart_alerts: { phase: "phase_2", label: "Smart alerts and automation" },
  advanced_reports: { phase: "phase_2", label: "Advanced reports and exports" },
  gst: { phase: "phase_2", label: "GST finance" },
  growth_permissions: { phase: "phase_2", label: "Growth permissions" },
  multi_branch: { phase: "phase_3", label: "Multi-branch management" },
  enterprise_rbac: { phase: "phase_3", label: "Enterprise roles and approvals" },
  advanced_accounting: { phase: "phase_3", label: "Advanced accounting" },
  accounting: { phase: "phase_3", label: "Accounting" },
  advanced_automation: { phase: "phase_3", label: "Advanced automation engine" },
  retention_intelligence: { phase: "phase_3", label: "Retention intelligence" },
  revenue_intelligence: { phase: "phase_3", label: "Revenue intelligence" },
  advanced_crm: { phase: "phase_3", label: "Advanced CRM analytics" },
  ai_insights: { phase: "phase_3", label: "AI business intelligence" },
  api_webhooks: { phase: "phase_3", label: "APIs and webhooks" },
  member_portal: { phase: "phase_3", label: "Premium member self-service" },
} as const satisfies Record<string, { phase: PhaseId; label: string }>;

export type SaaSFeatureKey = keyof typeof FEATURE_REGISTRY;
export const FEATURE_KEYS = Object.keys(FEATURE_REGISTRY) as SaaSFeatureKey[];

export function phaseRank(phase: PhaseId) {
  return Number(phase.slice(-1));
}