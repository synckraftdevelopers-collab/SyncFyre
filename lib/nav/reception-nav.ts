import { Activity, CalendarDays, CircleDollarSign, LayoutDashboard, ShieldCheck, UsersRound } from "lucide-react";
import type { NavItem } from "@/lib/nav/types";

export const receptionNav: NavItem[] = [
  { label: "Dashboard",    href: "/reception/dashboard",    icon: LayoutDashboard },
  { label: "Members",      href: "/reception/members",      icon: UsersRound },
  { label: "Memberships",  href: "/reception/memberships",  icon: ShieldCheck },
  { label: "Attendance",   href: "/reception/attendance",   icon: Activity, featureKey: "attendance" },
  { label: "Appointments", href: "/reception/appointments", icon: CalendarDays, featureKey: "appointments" },
  { label: "Payments",     href: "/reception/payments",     icon: CircleDollarSign, featureKey: "payments" },
];
