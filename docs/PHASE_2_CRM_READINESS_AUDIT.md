# Phase 2 CRM Readiness Audit

Audit date: 2026-09-08. Read-only repository audit. No application code, database, migrations, Demo Gym, plans, seeds/resets, or Talwalkar were changed.

## Executive Summary

**CRM status: PARTIAL (B), and it exists under another route (D).** The working CRM / Lead Pipeline foundation is at **/admin/leads**, not /admin/crm. It includes a page, components, server actions, service methods, a tenant/branch RLS migration, and Phase 2 entitlements.

The reported /admin/crm is a 404 because the generic /admin/[module] handler receives crm, has no matching module entry, and calls notFound(). This is not a plan lock.

Plan 1 direct access to the actual route redirects to /admin/dashboard?error=feature_locked&feature=crm. The dashboard does not render this state, there is no CRM navigation item, and FeatureGate has no consumer. Thus backend denial exists, but the required locked/upgrade UX does not.

## Actual CRM Implementation Status

| Area | Evidence | Status |
|---|---|---|
| Route/page | app/(admin)/admin/leads/page.tsx | Creates leads; shows pipeline, history, actions, conversion. |
| Components | components/leads/lead-actions.tsx | Stage, activity, and conversion controls. |
| Server actions | app/actions/lead-actions.ts | Create/update/convert/activity all call hasCurrentFeature("crm"). |
| Services | services/lead.service.ts | Tenant/branch-scoped lead and activity reads/writes. |
| APIs | No CRM route handler found | middleware reserves /api/leads, but app/api/leads does not exist. |
| Tables | supabase/migrations/0030_crm_lead_pipeline.sql | leads, lead_activities, indexes, RLS, trigger. Deployment was not verified. |
| Navigation | lib/nav/admin-nav.ts | No CRM/Leads entry. |
| Registry | lib/entitlements/registry.ts | crm is Phase 2. |

Classification:
- **A:** partly true; implementation exists but expected route/navigation/visible UX are missing.
- **B:** **true, primary**; functional foundation is incomplete.
- **C:** false; it is not missing.
- **D:** **true**; actual route is /admin/leads.

## Actual CRM Route

**/admin/leads**.

It is within the Admin portal, whose layout allows owner, admin, and manager. Actions also list reception, but reception cannot enter /admin/leads because portal middleware redirects that role to the reception dashboard. This role/path mismatch needs a product decision.

## Why /admin/crm Returns 404

/admin/crm is neither a declared CRM route nor redirect. It matches app/(admin)/admin/[module]/page.tsx, whose module map omits crm and calls notFound().

Middleware only maps /admin/leads and /api/leads to crm. Therefore the 404 comes from a nonexistent path, not hidden navigation or entitlement behavior.

## Navigation Status

No Admin sidebar item targets /admin/leads. PortalSidebar renders a static admin-nav list without resolving entitlements. CRM is undiscoverable for every plan - it is not intentionally hidden/locked based on plan.

## Entitlement Status

crm is Phase 2. evaluateFeature() maps trial/standard to Plan 1, professional to Plan 2, and enterprise to Plan 3. It allows only active/trial subscriptions with adequate phase and without a tenant_features.enabled=false override. A true override cannot elevate Plan 1.

- Middleware locks /admin/leads and redirects locked HTML users with error=feature_locked and feature=crm.
- A locked /api/leads request would return 403, though no API route exists.
- Four lead mutations independently check hasCurrentFeature("crm").
- The page does not render an entitlement state itself.
- tests/entitlements.test.mts asserts Plan 1 denies CRM and Plans 2/3 allow it. No CRM browser/direct-route test was found.

## Existing Locked Feature Pattern

Finance is the closest existing locked feature. It is Phase 2, visible in navigation, and /admin/finance is middleware-gated. Plan 1 redirects to /admin/dashboard?error=feature_locked&feature=finance.

The destination dashboard does not render feature_locked, so this is a silent redirect, not a visible lock or upgrade CTA. components/entitlements/feature-gate.tsx contains a locked card and "View upgrade options" link, but it is unused. It is a component contract, not an existing customer UX to reuse unchanged.

## Plan 1 Expected vs Actual

| Requirement | Expected | Actual |
|---|---|---|
| Phase 1 | Available | Evaluator allows it; all Phase 1 workflows were outside this audit. |
| Phase 2 CRM | Locked with upgrade experience | /admin/leads redirects, but no visible explanation/CTA appears and no nav item exists. **UX fail.** |
| Phase 3 | Locked | Evaluator locks it; no advanced-CRM route exists. |

## Plan 2 Expected vs Actual

| Requirement | Expected | Actual |
|---|---|---|
| Phase 2 CRM | Accessible if implemented | Evaluator/middleware permit /admin/leads. Page/actions/services/schema exist, but navigation, browser proof, and migration deployment confirmation are absent. **Partial.** |

## Plan 3 Expected vs Actual

| Requirement | Expected | Actual |
|---|---|---|
| Phase 2 CRM | Accessible if implemented | Same as Plan 2, subject to authentication, Admin role, and schema availability. **Partial.** |

## Direct URL Behavior

No live browser or tenant-plan mutation test was performed.

| URL / condition | Static code-path result |
|---|---|
| /admin/crm, authenticated Admin | 404 from generic module notFound(). |
| /admin/leads, Plan 1 active/trial | Redirect to dashboard with feature_locked; no visible lock/upgrade UI. |
| /admin/leads, Plan 2/3 active/trial, Admin role | Middleware allows and page attempts to open; it can fail if migration 0030 is absent. |
| /admin/leads, unauthenticated | Redirect to login. |
| /admin/leads, reception | Redirect to reception dashboard. |

## Phase 2 Specification Comparison

Requirement: **CRM / Lead Pipeline**.

This is not merely tables/registry: the repository supports lead capture, tenant/branch persistence, seven stages, activity history, follow-up, lost reason, and conversion to an existing member. It is a genuine CRM pipeline foundation.

It is **not PASS/ready**. Existing Phase 2 readiness documentation labels CRM / lead pipeline PARTIAL. Current code supplies entitlement enforcement, but visible lock UX, canonical route/navigation, workflow surface, and verification are incomplete.

## Exact Gaps

**Five implementation gaps:**

1. **Canonical path:** /admin/crm does not exist or redirect; it 404s.
2. **Navigation:** /admin/leads is absent for every plan, including Plans 2/3.
3. **Locked UX:** Plan 1 silently redirects; no message/card/CTA. FeatureGate is unused.
4. **Workflow surface:** schema has assignment and trial timing, but UI has no assignment or trial_at control; no CRM funnel/reporting linkage was found.
5. **Verification:** no CRM browser matrix covers lock UX, Plans 2/3 access, direct route, roles, branch/RLS, and migration availability.

## Recommended Implementation Tasks

1. Decide canonical path; retain /admin/leads with /admin/crm alias/redirect, or rename consistently, and update middleware.
2. Add server-entitlement-driven CRM navigation: accessible for Plans 2/3 and visibly locked for Plan 1.
3. Use FeatureGate or render feature_locked on the dashboard with Phase 2 messaging and upgrade link.
4. Complete product/UI decisions for assignment, trial scheduling, and funnel/reporting.
5. Add unit/integration/browser coverage and verify migration 0030 in approved non-production.

## Dependencies

- Product decision on route and CRM roles.
- Server entitlement available to presentation/navigation; client visibility must not replace middleware/actions.
- Approved upgrade destination at /admin/settings?tab=subscription.
- Confirmation that migration 0030_crm_lead_pipeline.sql is deployed.
- Protected Demo/QA governance and synthetic test data. No Demo plan change is required for this audit.

## Owner Recommendation

- Frontend/entitlement UX: route presentation, navigation, locked state, browser UX.
- CRM workflow: assignment/trial/reporting and workflow acceptance.
- Backend/QA: route/action/API, tenant/branch/RLS, migration availability.
- SuperAdmin: existing TenantPlanControl already offers Plan 1/2/3 via SuperAdmin-only action/service, writes tenants.plan, and logs audit activity. No plan changed.

## Acceptance Criteria

- One documented CRM route resolves; /admin/crm never 404s.
- Plans 2/3 can discover/open CRM after auth and role checks.
- Plan 1 gets visible Phase 2 lock state plus upgrade CTA on navigation and direct URL.
- Middleware and all CRM mutations remain denied for Plan 1.
- Assignment, trial scheduling, conversion, activity history, and reporting scope are explicit.
- Migration, tenant/branch isolation, roles, mobile, and plan matrix pass approved synthetic QA/Demo tests.

## Testing Matrix

| Scenario | Expected result | Level |
|---|---|---|
| Plan 1 opens CRM navigation | Locked item/card and upgrade CTA | Browser |
| Plan 1 opens /admin/crm | Canonical redirect/locked response; never 404 | Browser |
| Plan 1 opens /admin/leads | Visible lock; no data/mutations | Browser + route |
| Plan 1 submits lead actions | Entitlement rejection | Action/integration |
| Plan 2 Owner/Admin/Manager | Discovery and working /admin/leads | Browser |
| Plan 3 Owner/Admin/Manager | Same Phase 2 access | Browser |
| Reception | Explicit, consistent route/action behavior | Browser + integration |
| Tenant/branch isolation | No cross-tenant/branch lead/activity access | RLS/integration |
| Missing migration | Controlled deployment gate | Deployment/integration |
| CRM lifecycle | Create, assign/trial if supported, stage/activity/convert/close | Browser + integration |
| Responsive layout | Form, pipeline, lock, CTA usable on mobile/PWA | Browser |
