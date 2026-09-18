# Plan-Tier Sidebar Lock Fix (Essential / Growth / Scale)

## Symptom reported

"When I change a tenant's plan on the SuperAdmin Tenants page, the sidebar
doesn't lock/unlock correctly": Essential-tier tenants could still see
Growth-tier menu items as fully available, and Growth-tier tenants were
missing menu items (CRM) that should have been unlocked for them.

## Root cause

The codebase has **two independent, never-reconciled feature-gating
systems**:

- **System A** (`lib/entitlements/registry.ts` + `evaluate.ts`) — the
  canonical, per-tenant plan resolver. `tenants.plan` → `plan_1/2/3`
  (Essential/Growth/Scale) → `evaluateFeature()`. This is what
  `middleware.ts` actually uses to allow/redirect requests, and it is
  correct — it already reacts immediately to a plan change.
- **System B** (`lib/phases/registry.ts` + `services/phase.service.ts`) — a
  **platform-wide** feature-rollout flag (`system_phases` table: "has Phase
  2/3 been turned on for the product yet"), the same for every tenant
  regardless of their individual plan.

The sidebar (`components/layout/portal-sidebar.tsx`,
`components/layout/mobile-bottom-nav.tsx`) was using System B's
tenant-agnostic `phaseSnapshot.featureMap[key].status` — not the tenant's
own plan — to decide whether a nav item shows locked. Once a phase is
marked "active" platform-wide (the normal state for a fully built,
already-functioning product), every tenant sees that tier's features as
unlocked, no matter what plan they're actually on. The only thing providing
any real per-tenant locking was a narrow, incomplete, hardcoded 5-route list
(`COMMERCIAL_ROUTE_RULES` in `lib/entitlements.ts`: crm, finance, pt,
biometric, advanced_reports) — leaving items like Trainers, Appointments,
Workouts, Diet Plans, Progress, and every Scale-tier item effectively
un-gated in the UI.

Separately, the sidebar's only nav item pointing at `/admin/leads` ("Advanced
CRM Analytics") was tagged with `featureKey: "advanced_crm"` (Scale/Phase 3),
even though CRM (`crm`, Phase 2) is a **Growth**-tier feature per
`lib/plans/config.ts`'s own `GROWTH_DELTA_FEATURES`. That mislabeling hid the
CRM page from Growth-tier tenants entirely.

## Fix

1. **`lib/nav/admin-nav.ts`** — renamed "Advanced CRM Analytics" →
   "CRM & Leads" and corrected its `featureKey` from `advanced_crm` to `crm`,
   moving it out of the Phase-3/Scale block into the Growth-tier features.
   (`lib/nav/index.ts`'s per-role label allow-lists updated to match the new
   label.)
2. **`components/phase/phase-locked-menu-item.tsx`** — added an optional
   `locked?: boolean` prop. When a caller passes it explicitly, it takes
   precedence over the old internal `phaseSnapshot`-derived calculation.
   Backward compatible: no existing behavior changes for a caller that
   doesn't pass it.
3. **`components/layout/portal-sidebar.tsx`** and
   **`components/layout/mobile-bottom-nav.tsx`** — the lock/hide decision
   for every nav item now comes from comparing the item's required phase
   (read statically from `lib/phases/registry.ts`'s `FEATURE_REGISTRY` — no
   DB call, always available) against the tenant's actual
   `currentPlanKey` (Essential/Growth/Scale, already correctly computed
   per-request in each portal layout from `tenants.plan`). The
   `phaseSnapshot`/global-rollout signal and the old
   `COMMERCIAL_ROUTE_RULES`-based fallback (`CommercialLockedNavItem`, now
   removed) are no longer part of this decision. `phaseSnapshot` is still
   accepted and passed through (used only for its display name/number in
   the locked-item's URL and the platform's own `/superadmin` phase
   management, which this change does not touch).

This makes the sidebar's visual lock state consistent with what
`middleware.ts` already enforces server-side for every route — the same
source of truth, not two disagreeing ones.

## What was NOT changed (out of scope)

- `services/phase.service.ts`, the `system_phases` table, and the
  SuperAdmin's platform-phase machinery are untouched — they may still serve
  a legitimate "has this phase been built/rolled out at all" purpose
  elsewhere; this fix just stops them from being the authority for a
  specific tenant's commercial-plan gating in the sidebar.
- `lib/entitlements.ts`'s `getCommercialPlanTier()` (binary free/paid) and
  its 5-route `COMMERCIAL_ROUTE_RULES` list are untouched — still used
  elsewhere (e.g. `services/entitlements.service.ts`,
  `components/layout/sidebar.tsx` — confirmed dead/unused code from an
  earlier build) and not proven broken; changing them was out of scope for
  this fix.
- Middleware (`middleware.ts`) — already correct, not touched.
- No database changes, no RLS changes, no changes to other portals'
  (reception/trainer/member) nav item feature keys — they use the same
  `PhaseFeatureKey` vocabulary and now benefit from the same
  static-classification fix automatically through the shared
  `PhaseLockedMenuItem`/`MobileBottomNav` components, without needing their
  own nav files edited.

## Verification performed

- Scoped TypeScript check of all 5 changed files plus their real dependency
  closure (`lib/nav/*`, `lib/phases/*`, `lib/plans/config.ts`,
  `lib/entitlements.ts`, `lib/entitlements/*`, `services/phase.service.ts`,
  `services/entitlements.service.ts`, `components/upgrade/feature-upgrade-modal.tsx`,
  `types/index.ts`, `lib/supabase/server.ts`, `lib/utils.ts`), with narrow
  stubs only for shadcn UI primitives (`Button`/`Badge`/`Dialog`) and two
  server-only service modules unrelated to this change. Result: **0
  errors**.
- Unused-locals/params check (lint-equivalent proxy): 0 new issues — the two
  flagged items (`commercialPlanTier` unused prop in both nav components,
  an unused `Json` type in `phase.service.ts`) are pre-existing, not
  introduced by this change.
- Esbuild syntax check on all 5 changed files: clean.
- **Not performed**: `npm run build`, `npm test`, `npm run lint` (no shell
  access on this device), and no live browser verification (would require
  toggling a real tenant's plan and watching the sidebar update, which needs
  signing in).

## What to verify live

1. As SuperAdmin, set a test tenant to **Essential** → sign in as that
   tenant's owner/admin → Trainers, Appointments, Workouts, Diet Plans,
   Progress, Finance, CRM & Leads, PT, Biometric should all show in the
   dashed "Growth features" locked section; Branches/Audit
   Logs/Revenue Intelligence/Retention Intelligence should show in "Scale
   features".
2. Set the same tenant to **Growth** → reload → all of the above (except
   the Scale-only items) should become normal, clickable nav items,
   including "CRM & Leads".
3. Set the same tenant to **Scale** → reload → everything should be
   unlocked, no separators.
4. No re-login should be required — a page reload after the SuperAdmin
   toggle should be enough, since `currentPlanKey` is computed fresh on
   every portal layout render from `tenants.plan`.
