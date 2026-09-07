/**
 * Central nav registry — imported only by Client Components.
 * Never imported by Server Components or middleware (contains LucideIcon references).
 */
export type { NavItem } from "./types";

import { adminNav } from "./admin-nav";
import { receptionNav } from "./reception-nav";
import { trainerNav } from "./trainer-nav";
import { memberNav } from "./member-nav";
import type { NavItem } from "./types";
import type { UserRole } from "@/types";

export type PortalKey = "admin" | "reception" | "trainer" | "member";

export const navByPortal: Record<PortalKey, NavItem[]> = {
  admin:     adminNav,
  reception: receptionNav,
  trainer:   trainerNav,
  member:    memberNav,
};

export const portalLabel: Record<PortalKey, string> = {
  admin:     "Admin workspace",
  reception: "Reception desk",
  trainer:   "Trainer workspace",
  member:    "My portal",
};

const adminNavLabelsByRole: Record<"owner" | "admin" | "manager" | "reception", string[]> = {
  owner: [
    "Dashboard",
    "Members",
    "Memberships",
    "Subscriptions",
    "Attendance",
    "Appointments",
    "Trainers",
    "Add Staff",
    "Workouts",
    "Diet Plans",
    "Progress",
    "Payments",
    "Finance",
    "Accounting",
    "Equipment",
    "Customization",
    "Reports",
    "Notifications",
    "Settings",
  ],
  admin: [
    "Dashboard",
    "Members",
    "Memberships",
    "Subscriptions",
    "Attendance",
    "Appointments",
    "Trainers",
    "Workouts",
    "Diet Plans",
    "Progress",
    "Payments",
    "Finance",
    "Customization",
    "Reports",
    "Notifications",
    "Settings",
  ],
  manager: [
    "Dashboard",
    "Members",
    "Memberships",
    "Subscriptions",
    "Attendance",
    "Appointments",
    "Trainers",
    "Workouts",
    "Diet Plans",
    "Progress",
    "Payments",
    "Finance",
    "Reports",
    "Notifications",
    "Settings",
  ],
  reception: [
    "Dashboard",
    "Members",
    "Memberships",
    "Attendance",
    "Appointments",
    "Payments",
  ],
};

export function getPortalNavItems(portal: PortalKey, userRole?: UserRole | null): NavItem[] {
  const items = navByPortal[portal];
  if (portal !== "admin") return items;
  if (!userRole) return items;
  const labels = adminNavLabelsByRole[userRole as keyof typeof adminNavLabelsByRole];
  if (!labels) return items;
  const filtered = items.filter((item) => labels.includes(item.label));
  const seen = new Set<string>();
  return filtered.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}
