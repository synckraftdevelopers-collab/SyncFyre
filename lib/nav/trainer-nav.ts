import { CalendarDays, Dumbbell, Gauge, LayoutDashboard, UsersRound, Utensils } from "lucide-react";
import type { NavItem } from "@/lib/nav/types";

export const trainerNav: NavItem[] = [
  { label: "Dashboard",    href: "/trainer/dashboard",    icon: LayoutDashboard },
  { label: "My Members",   href: "/trainer/members",      icon: UsersRound },
  { label: "Appointments", href: "/trainer/appointments", icon: CalendarDays },
  { label: "Workouts",     href: "/trainer/workouts",     icon: Dumbbell },
  { label: "Diet Plans",   href: "/trainer/diet-plans",   icon: Utensils },
  { label: "Progress",     href: "/trainer/progress",     icon: Gauge },
];
