import {
  Activity, BarChart2, Bell, BookOpen, Building2, CalendarDays, ChartNoAxesCombined,
  CircleDollarSign, ClipboardList, Dumbbell, Flame, Gauge, History, IndianRupee, KeyRound, LineChart,
  LayoutDashboard, MessageCircle, Settings, ShieldCheck, TrendingUp, UserMinus, UserPlus, UserRoundCog, UsersRound,
  Utensils, Wrench,
} from "lucide-react";
import type { NavItem } from "@/lib/nav/types";

export const adminNav: NavItem[] = [
  { label: "Dashboard",              href: "/admin/dashboard",            icon: LayoutDashboard },
  { label: "Members",                href: "/admin/members",              icon: UsersRound },
  { label: "Memberships",            href: "/admin/memberships",          icon: ShieldCheck },
  { label: "Subscriptions",          href: "/admin/subscriptions",        icon: ShieldCheck },
  { label: "Attendance",             href: "/admin/attendance",           icon: Activity,            featureKey: "attendance" },
  { label: "Appointments",           href: "/admin/appointments",         icon: CalendarDays,        featureKey: "appointments" },
  { label: "Trainers",               href: "/admin/trainers",             icon: UserRoundCog,        featureKey: "trainers" },
  { label: "Add Staff",              href: "/admin/staff/new",            icon: UserPlus },
  { label: "Workouts",               href: "/admin/workouts",             icon: Dumbbell,            featureKey: "workouts" },
  { label: "Diet Plans",             href: "/admin/diet-plans",           icon: Utensils,            featureKey: "diet_plans" },
  { label: "Progress",               href: "/admin/progress",             icon: Gauge,               featureKey: "progress" },
  { label: "Payments",               href: "/admin/payments",             icon: CircleDollarSign,    featureKey: "payments" },
  { label: "Finance",                href: "/admin/finance",              icon: IndianRupee,         exact: true, featureKey: "finance" },
  { label: "Accounting",             href: "/admin/finance/accounting",   icon: BookOpen,            featureKey: "accounting" },
  { label: "Equipment",              href: "/admin/equipment",            icon: Wrench,              featureKey: "equipment" },
  { label: "Customization",          href: "/admin/customization",        icon: Settings },
  { label: "Reports",                href: "/admin/reports",              icon: ChartNoAxesCombined, featureKey: "reports" },
  { label: "Notifications",          href: "/admin/notifications",        icon: Bell,                featureKey: "notifications" },
  { label: "Settings",               href: "/admin/settings",             icon: Settings },
  // CRM & Leads is a Growth-tier feature (see lib/plans/config.ts's
  // GROWTH_DELTA_FEATURES "CRM & Sales" bullet and lib/phases/registry.ts's
  // "crm" = PHASE_2). It must use the "crm" featureKey, not "advanced_crm"
  // (PHASE_3/Scale) — using the latter hid this page from Growth-plan
  // tenants entirely, even though CRM is included starting at Growth.
  { label: "CRM & Leads",            href: "/admin/leads",                icon: BarChart2,           featureKey: "crm" },
  // Sales-by-staff report, companion to CRM & Leads — same Growth-tier gate.
  { label: "Sales Report",           href: "/admin/reports/sales",        icon: LineChart,           featureKey: "crm" },
  // PT revenue + trainer performance, by trainer — same Growth-tier gate as PT itself.
  { label: "PT Report",              href: "/admin/reports/pt",           icon: Flame,               featureKey: "pt" },
  // WhatsApp quick-send (P2-R1) — Growth-tier, same "whatsapp" featureKey as
  // the real billing gate in lib/entitlements/registry.ts.
  { label: "WhatsApp Templates",     href: "/admin/whatsapp/templates",   icon: MessageCircle,       featureKey: "whatsapp" },
  { label: "Communication History",  href: "/admin/communications",       icon: History,             featureKey: "whatsapp" },
  // ── Phase 3 / Scale features ─────────────────────────────────────────────
  { label: "Branches",               href: "/admin/branches",             icon: Building2,           featureKey: "multi_branch" },
  { label: "Audit Logs",             href: "/admin/audit-logs",           icon: ClipboardList,       featureKey: "audit_logs" },
  { label: "Revenue Intelligence",   href: "/admin/reports/revenue",      icon: TrendingUp,          featureKey: "revenue_intelligence" },
  { label: "Retention Intelligence", href: "/admin/retention",            icon: UserMinus,           featureKey: "retention_intelligence" },
  // Developer: API keys + webhooks (P3-12) — Scale only. Real gate is
  // hasCurrentFeature("api_webhooks") (lib/entitlements/registry.ts).
  // featureKey here uses "api_webhooks" (System B, PHASE_3) so the sidebar
  // correctly hides this item for Growth tenants instead of showing it as
  // an accessible nav link.
  { label: "Developer",              href: "/admin/developer",            icon: KeyRound,            featureKey: "api_webhooks" },
];
