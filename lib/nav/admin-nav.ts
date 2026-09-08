import {
  Activity, Bell, BookOpen, CalendarDays, ChartNoAxesCombined, CircleDollarSign,
  Dumbbell, Gauge, IndianRupee, LayoutDashboard, Settings, ShieldCheck,
  UserPlus, UserRoundCog, UsersRound, Utensils, Wrench,
} from "lucide-react";
import type { NavItem } from "@/lib/nav/types";

export const adminNav: NavItem[] = [
  { label: "Dashboard",     href: "/admin/dashboard",              icon: LayoutDashboard },
  { label: "Members",       href: "/admin/members",                icon: UsersRound },
  { label: "Memberships",   href: "/admin/memberships",            icon: ShieldCheck },
  { label: "Subscriptions", href: "/admin/subscriptions",           icon: ShieldCheck },
  { label: "Attendance",    href: "/admin/attendance",             icon: Activity, featureKey: "attendance" },
  { label: "Appointments",  href: "/admin/appointments",           icon: CalendarDays, featureKey: "appointments" },
  { label: "Trainers",      href: "/admin/trainers",               icon: UserRoundCog, featureKey: "trainers" },
  { label: "Add Staff",     href: "/admin/staff/new",              icon: UserPlus },
  { label: "Workouts",      href: "/admin/workouts",               icon: Dumbbell, featureKey: "workouts" },
  { label: "Diet Plans",    href: "/admin/diet-plans",             icon: Utensils, featureKey: "diet_plans" },
  { label: "Progress",      href: "/admin/progress",               icon: Gauge, featureKey: "progress" },
  { label: "Payments",      href: "/admin/payments",               icon: CircleDollarSign, featureKey: "payments" },
  { label: "Finance",       href: "/admin/finance",                icon: IndianRupee, exact: true, featureKey: "finance" },
  { label: "Accounting",    href: "/admin/finance/accounting",     icon: BookOpen, featureKey: "accounting" },
  { label: "Equipment",     href: "/admin/equipment",              icon: Wrench, featureKey: "equipment" },
  { label: "Customization", href: "/admin/customization",          icon: Settings },
  { label: "Reports",       href: "/admin/reports",                icon: ChartNoAxesCombined, featureKey: "reports" },
  { label: "Notifications", href: "/admin/notifications",          icon: Bell, featureKey: "notifications" },
  { label: "Settings",      href: "/admin/settings",               icon: Settings },
];
