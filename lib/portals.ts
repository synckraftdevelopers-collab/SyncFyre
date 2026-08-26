/**
 * Portal definitions - single source of truth for:
 *  - which role maps to which portal
 *  - the default dashboard path per portal
 *  - the base path prefix used in middleware
 */

import type { UserRole } from "@/types";

export const PORTAL_BASE: Record<UserRole, string> = {
  super_admin: "/superadmin",
  owner: "/admin",
  admin: "/admin",
  manager: "/admin",
  reception: "/reception",
  trainer: "/trainer",
  dietician: "/trainer",
  "diet-planner": "/trainer",
  diet_planner: "/trainer",
  member: "/member",
};

export const PORTAL_DASHBOARD: Record<UserRole, string> = {
  super_admin: "/superadmin/dashboard",
  owner: "/admin/dashboard",
  admin: "/admin/dashboard",
  manager: "/admin/dashboard",
  reception: "/reception/dashboard",
  trainer: "/trainer/dashboard",
  dietician: "/trainer/dashboard",
  "diet-planner": "/trainer/dashboard",
  diet_planner: "/trainer/dashboard",
  member: "/member/dashboard",
};

export const PROTECTED_PREFIXES = ["/superadmin", "/admin", "/reception", "/trainer", "/member"];

export const PORTAL_ROLES: Record<string, UserRole[]> = {
  "/superadmin": ["super_admin"],
  "/admin": ["owner", "admin", "manager"],
  "/reception": ["reception"],
  "/trainer": ["trainer", "dietician", "diet-planner", "diet_planner"],
  "/member": ["member"],
};
