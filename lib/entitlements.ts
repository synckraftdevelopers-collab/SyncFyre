export const COMMERCIAL_PLAN_TIERS = ["free", "paid"] as const;
export type CommercialPlanTier = (typeof COMMERCIAL_PLAN_TIERS)[number];

const FREE_PLAN_ALIASES = new Set(["free", "phase1", "phase_1", "phase-1", "trial"]);
const PAID_PLAN_ALIASES = new Set(["paid", "phase2", "phase_2", "phase-2", "standard", "professional", "enterprise"]);

export type CommercialRouteRule = {
  featureKey: string;
  featureLabel: string;
  matches: (pathname: string) => boolean;
};

export const COMMERCIAL_ROUTE_RULES: CommercialRouteRule[] = [
  {
    featureKey: "crm",
    featureLabel: "CRM & Lead Pipeline",
    matches: (pathname) => pathname === "/admin/leads" || pathname.startsWith("/admin/leads/"),
  },
  {
    featureKey: "finance",
    featureLabel: "Finance Management",
    matches: (pathname) => pathname === "/admin/finance" || pathname.startsWith("/admin/finance/") || pathname === "/api/finance" || pathname.startsWith("/api/finance/"),
  },
  {
    featureKey: "pt",
    featureLabel: "PT & Trainer Management",
    matches: (pathname) => pathname === "/admin/pt" || pathname.startsWith("/admin/pt/"),
  },
  {
    featureKey: "biometric",
    featureLabel: "Biometric / Face Attendance",
    matches: (pathname) =>
      pathname === "/admin/machines" ||
      pathname.startsWith("/admin/machines/") ||
      pathname === "/machine" ||
      pathname.startsWith("/machine/") ||
      pathname.startsWith("/api/face-machines") ||
      pathname.startsWith("/api/biometric") ||
      pathname.startsWith("/api/machine"),
  },
  {
    featureKey: "advanced_reports",
    featureLabel: "Advanced Reports & Exports",
    matches: (pathname) => pathname.startsWith("/admin/reports/") || pathname === "/api/reports",
  },
];

export function getCommercialPlanTier(plan: string | null | undefined): CommercialPlanTier {
  const normalized = String(plan ?? "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (FREE_PLAN_ALIASES.has(normalized)) return "free";
  if (PAID_PLAN_ALIASES.has(normalized) || normalized) return "paid";
  return "paid";
}

export function isCommercialPlanFree(plan: string | null | undefined) {
  return getCommercialPlanTier(plan) === "free";
}

export function getCommercialRouteRule(pathname: string) {
  return COMMERCIAL_ROUTE_RULES.find((rule) => rule.matches(pathname)) ?? null;
}

export function isCommercialRouteLocked(pathname: string) {
  return Boolean(getCommercialRouteRule(pathname));
}

export function buildCommercialUpgradeUrl(pathname: string, featureLabel?: string | null) {
  const params = new URLSearchParams();
  params.set("next", pathname);
  if (featureLabel) params.set("feature", featureLabel);
  return `/admin/upgrade?${params.toString()}`;
}
