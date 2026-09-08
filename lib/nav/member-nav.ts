import { Activity, CalendarDays, Dumbbell, Gauge, LayoutDashboard, ShieldCheck, UserRound, Utensils } from "lucide-react";
import type { NavItem } from "@/lib/nav/types";

export const memberNav: NavItem[] = [
  { label: "Dashboard",    href: "/member/dashboard",    icon: LayoutDashboard },
  { label: "My Profile",   href: "/member/profile",      icon: UserRound },
  { label: "Membership",   href: "/member/membership",   icon: ShieldCheck },
  { label: "Attendance",   href: "/member/attendance",   icon: Activity, featureKey: "attendance" },
  { label: "Appointments", href: "/member/appointments", icon: CalendarDays, featureKey: "appointments" },
  { label: "My Workouts",  href: "/member/workouts",     icon: Dumbbell, featureKey: "workouts" },
  { label: "Diet Plan",    href: "/member/diet-plan",    icon: Utensils, featureKey: "diet_plans" },
  { label: "Progress",     href: "/member/progress",     icon: Gauge, featureKey: "progress" },
];
