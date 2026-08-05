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
