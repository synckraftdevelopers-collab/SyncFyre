export const SYSTEM_PHASE_KEYS = ["PHASE_1", "PHASE_2"] as const;
export type SystemPhaseKey = (typeof SYSTEM_PHASE_KEYS)[number];

export const SYSTEM_PHASE_NAMES: Record<SystemPhaseKey, string> = {
  PHASE_1: "Phase 1",
  PHASE_2: "Phase 2",
};

export const SYSTEM_PHASE_NUMBERS: Record<SystemPhaseKey, number> = {
  PHASE_1: 1,
  PHASE_2: 2,
};

export type PhaseRecordStatus = "active" | "locked";

export type PhaseFeatureKey =
  | "dashboard"
  | "members"
  | "memberships"
  | "subscriptions"
  | "attendance"
  | "appointments"
  | "trainers"
  | "classes"
  | "workouts"
  | "diet_plans"
  | "progress"
  | "payments"
  | "notifications"
  | "finance"
  | "accounting"
  | "equipment"
  | "biometric"
  | "reports"
  | "advanced_reports"
  | "multi_branch"
  | "advanced_analytics"
  | "whatsapp"
  | "api"
  | "enterprise_features"
  | "crm"
  | "pt"
  | "inventory"
  | "classes_management"
  | "member_portal"
  | "settings_biometric"
  | "machine_access";

export type PhaseFeatureDefinition = {
  feature_key: PhaseFeatureKey;
  name: string;
  phase: SystemPhaseKey;
  pathnames?: readonly string[];
  apiPrefixes?: readonly string[];
  status?: PhaseRecordStatus;
};

export const FEATURE_REGISTRY: Record<PhaseFeatureKey, PhaseFeatureDefinition> = {
  dashboard: { feature_key: "dashboard", name: "Dashboard", phase: "PHASE_1", pathnames: ["/admin/dashboard", "/reception/dashboard", "/trainer/dashboard", "/member/dashboard"] },
  members: { feature_key: "members", name: "Members", phase: "PHASE_1", pathnames: ["/admin/members", "/reception/members", "/trainer/members", "/member/profile"] },
  memberships: { feature_key: "memberships", name: "Memberships", phase: "PHASE_1", pathnames: ["/admin/memberships", "/reception/memberships", "/member/membership"] },
  subscriptions: { feature_key: "subscriptions", name: "Subscriptions", phase: "PHASE_1", pathnames: ["/admin/subscriptions", "/admin/subscriptions/new"] },
  attendance: {
    feature_key: "attendance",
    name: "Attendance",
    phase: "PHASE_2",
    pathnames: ["/admin/attendance", "/reception/attendance", "/member/attendance"],
    apiPrefixes: ["/api/attendance", "/api/machine/attendance", "/api/attendance/sync"],
  },
  appointments: {
    feature_key: "appointments",
    name: "Appointments",
    phase: "PHASE_2",
    pathnames: ["/admin/appointments", "/reception/appointments", "/trainer/appointments", "/member/appointments"],
  },
  trainers: { feature_key: "trainers", name: "Trainers", phase: "PHASE_2", pathnames: ["/admin/trainers", "/admin/trainers/new"] },
  classes: { feature_key: "classes", name: "Classes", phase: "PHASE_2", pathnames: ["/admin/classes", "/trainer/classes"] },
  workouts: { feature_key: "workouts", name: "Workouts", phase: "PHASE_2", pathnames: ["/admin/workouts", "/trainer/workouts", "/member/workouts"] },
  diet_plans: { feature_key: "diet_plans", name: "Diet Plans", phase: "PHASE_2", pathnames: ["/admin/diet-plans", "/trainer/diet-plans", "/member/diet-plan"] },
  progress: { feature_key: "progress", name: "Progress", phase: "PHASE_2", pathnames: ["/admin/progress", "/trainer/progress", "/member/progress"] },
  payments: {
    feature_key: "payments",
    name: "Payments",
    phase: "PHASE_2",
    pathnames: ["/admin/payments", "/admin/payments/pending", "/reception/payments", "/reception/payments/pending"],
    apiPrefixes: ["/api/payments"],
  },
  notifications: {
    feature_key: "notifications",
    name: "Notifications",
    phase: "PHASE_2",
    pathnames: ["/admin/notifications", "/admin/notifications/new", "/reception/notifications", "/trainer/notifications", "/member/notifications"],
    apiPrefixes: ["/api/cron/reminders"],
  },
  finance: { feature_key: "finance", name: "Finance", phase: "PHASE_2", pathnames: ["/admin/finance"], apiPrefixes: ["/api/finance"] },
  accounting: { feature_key: "accounting", name: "Accounting", phase: "PHASE_2", pathnames: ["/admin/finance/accounting"] },
  equipment: { feature_key: "equipment", name: "Equipment", phase: "PHASE_2", pathnames: ["/admin/equipment"] },
  biometric: {
    feature_key: "biometric",
    name: "Biometric Attendance",
    phase: "PHASE_2",
    pathnames: ["/admin/machines", "/machine", "/machine/connect"],
    apiPrefixes: ["/api/biometric", "/api/face-machines", "/api/machine"],
  },
  reports: { feature_key: "reports", name: "Reports", phase: "PHASE_2", pathnames: ["/admin/reports"], apiPrefixes: ["/api/reports"] },
  advanced_reports: { feature_key: "advanced_reports", name: "Advanced Reports", phase: "PHASE_2", pathnames: ["/admin/reports/attendance", "/admin/reports/members", "/admin/reports/payments", "/admin/reports/revenue"] },
  multi_branch: { feature_key: "multi_branch", name: "Multi Branch", phase: "PHASE_2", pathnames: ["/superadmin/tenants"] },
  advanced_analytics: { feature_key: "advanced_analytics", name: "Advanced Analytics", phase: "PHASE_2", pathnames: ["/superadmin/reports"] },
  whatsapp: { feature_key: "whatsapp", name: "WhatsApp", phase: "PHASE_2", pathnames: [], apiPrefixes: ["/api/whatsapp"] },
  api: { feature_key: "api", name: "API", phase: "PHASE_2", pathnames: [] },
  enterprise_features: { feature_key: "enterprise_features", name: "Enterprise Features", phase: "PHASE_2", pathnames: ["/superadmin/subscriptions", "/superadmin/billing", "/superadmin/devices"] },
  crm: { feature_key: "crm", name: "CRM & Leads", phase: "PHASE_2", pathnames: ["/admin/leads"] },
  pt: { feature_key: "pt", name: "PT Management", phase: "PHASE_2", pathnames: ["/admin/pt"] },
  inventory: { feature_key: "inventory", name: "Inventory", phase: "PHASE_2", pathnames: ["/admin/inventory"] },
  classes_management: { feature_key: "classes_management", name: "Classes", phase: "PHASE_2", pathnames: ["/admin/classes"] },
  member_portal: { feature_key: "member_portal", name: "Member Portal", phase: "PHASE_1", pathnames: ["/member"] },
  settings_biometric: { feature_key: "settings_biometric", name: "Biometric Settings", phase: "PHASE_2", pathnames: [], apiPrefixes: [] },
  machine_access: { feature_key: "machine_access", name: "Machine Access", phase: "PHASE_2", pathnames: ["/machine", "/machine/connect", "/iclock"], apiPrefixes: ["/iclock"] },
};

export const SYSTEM_PHASE_ORDER = SYSTEM_PHASE_KEYS.reduce<Record<SystemPhaseKey, number>>((acc, phase) => {
  acc[phase] = SYSTEM_PHASE_NUMBERS[phase];
  return acc;
}, {} as Record<SystemPhaseKey, number>);

export const FEATURE_PHASES = Object.fromEntries(
  Object.entries(FEATURE_REGISTRY).map(([featureKey, definition]) => [featureKey, definition.phase]),
) as Record<PhaseFeatureKey, SystemPhaseKey>;

export function isSystemPhaseKey(value: string): value is SystemPhaseKey {
  return (SYSTEM_PHASE_KEYS as readonly string[]).includes(value);
}

export function isPhaseAtOrBelow(currentPhase: SystemPhaseKey, candidatePhase: SystemPhaseKey) {
  return SYSTEM_PHASE_ORDER[currentPhase] >= SYSTEM_PHASE_ORDER[candidatePhase];
}

export function getFeatureDefinition(featureKey: string) {
  return (FEATURE_REGISTRY as Record<string, PhaseFeatureDefinition | undefined>)[featureKey] ?? null;
}

export function getFeaturePhase(featureKey: string) {
  return getFeatureDefinition(featureKey)?.phase ?? null;
}
