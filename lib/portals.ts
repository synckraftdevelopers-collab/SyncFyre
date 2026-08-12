/**
 * Portal definitions â€” single source of truth for:
 *  - which role maps to which portal
 *  - the default dashboard path per portal
 *  - the base path prefix used in middleware
 *
 * Never import from components or Next.js here â€” this file is used in
 * middleware (Edge runtime) as well as server components.
 */

import type { UserRole } from "@/types";

export const PORTAL_BASE: Record<UserRole, string> = {
  admin: "/admin",
  manager: "/admin",       // manager shares the admin portal
  reception: "/reception",
  trainer: "/trainer",
  dietician: "/trainer",   // dietician shares the trainer portal
  "diet-planner": "/trainer",
  diet_planner: "/trainer",
  member: "/member",
};

export const PORTAL_DASHBOARD: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  manager: "/admin/dashboard",
  reception: "/reception/dashboard",
  trainer: "/trainer/dashboard",
  dietician: "/trainer/dashboard",
  "diet-planner": "/trainer/dashboard",
  diet_planner: "/trainer/dashboard",
  member: "/member/dashboard",
};

/** All authenticated portal prefixes â€” used in middleware to guard routes */
export const PROTECTED_PREFIXES = ["/admin", "/reception", "/trainer", "/member"];

/** Roles allowed in each portal */
export const PORTAL_ROLES: Record<string, UserRole[]> = {
  "/admin": ["admin", "manager"],
  "/reception": ["reception"],
  "/trainer": ["trainer", "dietician", "diet-planner", "diet_planner"],
  "/member": ["member"],
};
