import {
  Activity, Bell, BookOpen, CalendarDays, ChartNoAxesCombined, CircleDollarSign,
  Dumbbell, Gauge, IndianRupee, LayoutDashboard, Settings, ShieldCheck,
  UserRoundCog, UsersRound, Utensils, Wrench,
} from "lucide-react";
import type { NavItem } from "@/lib/nav/types";

export const adminNav: NavItem[] = [
  { label: "Dashboard",     href: "/admin/dashboard",      icon: LayoutDashboard },
  { label: "Members",       href: "/admin/members",         icon: UsersRound },
  { label: "Memberships",   href: "/admin/memberships",     icon: ShieldCheck },
  { label: "Attendance",    href: "/admin/attendance",      icon: Activity },
  { label: "Appointments",  href: "/admin/appointments",    icon: CalendarDays },
  { label: "Trainers",      href: "/admin/trainers",        icon: UserRoundCog },
  { label: "Workouts",      href: "/admin/workouts",        icon: Dumbbell },
  { label: "Diet Plans",    href: "/admin/diet-plans",      icon: Utensils },
  { label: "Progress",      href: "/admin/progress",        icon: Gauge },
  { label: "Payments",      href: "/admin/payments",        icon: CircleDollarSign },
  { label: "Finance",       href: "/admin/finance",         icon: IndianRupee },
  { label: "Accounting",    href: "/admin/finance/accounting", icon: BookOpen },
  { label: "Staff",         href: "/admin/staff",           icon: UsersRound },
  { label: "Equipment",     href: "/admin/equipment",       icon: Wrench },
  { label: "Reports",       href: "/admin/reports",         icon: ChartNoAxesCombined },
  { label: "Notifications", href: "/admin/notifications",   icon: Bell },
  { label: "Settings",      href: "/admin/settings",        icon: Settings },
];
