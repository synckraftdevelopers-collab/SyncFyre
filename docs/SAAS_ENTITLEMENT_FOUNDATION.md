# SyncFyre SaaS Entitlement Foundation

## 1. Existing architecture discovered

SyncFyre is a Next.js multi-tenant application using Supabase, tenant/branch RLS, role-based middleware and `requireUser` action guards. Existing subscription data is held on `tenants.plan` (`trial`, `standard`, `professional`, `enterprise`). `tenant_features` is an RLS-protected per-tenant enabled flag table and `services/config.service.ts` resolves those flags. Before this change, plan values did not map to phases and feature checks were not global.

## 2. Final entitlement architecture

`tenant -> tenants.plan/status -> canonical FEATURE_REGISTRY -> evaluateFeature() -> UI FeatureGate -> middleware/API/action checks -> existing role/RLS checks`. Legacy plan names are mapped without changing existing billing data: trial/standard = Plan 1, professional = Plan 2, enterprise = Plan 3. A `tenant_features.enabled=false` row can disable an included feature; `true` cannot elevate a feature above the plan. Missing/inactive plans deny access.

## 3. Canonical phase and feature list

`lib/entitlements/registry.ts` is the canonical registry. Phase 1 covers dashboard, members, membership, payments, pending payments, expiry, attendance, staff, trainer, equipment, reports, import/export, responsive core and customization. Phase 2 covers CRM, WhatsApp, advanced membership, finance, PT, dietician, biometric, smart alerts, advanced reports, GST and growth permissions. Phase 3 covers multi-branch, enterprise RBAC, accounting, advanced accounting, advanced automation, retention, revenue, advanced CRM, `ai_insights` (AI BI), APIs/webhooks and member portal.

## 4. Plan matrix

| Feature phase | Plan 1 | Plan 2 | Plan 3 |
|---|---|---|---|
| Phase 1 | AVAILABLE | AVAILABLE | AVAILABLE |
| Phase 2 | LOCKED | AVAILABLE | AVAILABLE |
| Phase 3 | LOCKED | LOCKED | AVAILABLE |

## 5. SuperAdmin control and tenant-admin restrictions

The existing SuperAdmin tenant editor still controls legacy plan/status values, so it is PARTIAL: it does not yet expose a Phase 1/2/3 selector, resolved feature list, billing state, or audited override UI. No tenant-admin write path may use `tenant_features` to bypass the resolver; `isFeatureEnabled` now caps the existing flag by the tenant plan. A future migration/UI is required for explicit phase plan labels and SuperAdmin-only override auditing.

## 6. Frontend contract

`components/entitlements/feature-gate.tsx` renders children when available, a visible locked card and upgrade link when locked, and nothing when unavailable. It is a presentation contract only; role restrictions remain separate. Consumers should obtain the same server-resolved entitlement rather than infer access from menu visibility.

## 7. Backend enforcement

`lib/entitlements/evaluate.ts` is pure and reusable. `lib/entitlements/server.ts` resolves the authenticated tenant plan/status and tenant flag under existing Supabase RLS. Middleware now protects representative CRM, finance, accounting, trainer/PT, biometric and related API prefixes: HTML requests redirect with `feature_locked`; API requests receive HTTP 403. Existing role and RLS checks remain in force. Additional action/service families must adopt `getCurrentEntitlement` before those modules are sold as plans.

## 8. RLS and tenant isolation

No RLS policy or schema was changed. The resolver queries the current tenant through the authenticated Supabase client, so entitlement is additive to (never a replacement for) tenant, branch and role authorization. Cross-tenant and branch isolation still require the existing QA gates.

## 9. Demo Gym testing approach

Read-only inspection resolved prefix `052375ac` to `052375ac-f0c8-45f8-91ee-da3e7f3ae71f` (`demo gym`, plan `trial`, status `trial`). It is currently not marked `is_demo` or `is_protected`, so Demo testing is BLOCKED until SuperAdmin governance is corrected. Do not change it in this task. Future tests assign Plan 1/2/3 through approved SuperAdmin controls and exercise UI, direct URL, API and action paths using synthetic data only.

## 10. Talwalkar safety verification

No Talwalkar data, configuration, plan, migration, or client-specific code was changed. No customer-name conditional was added. A generic protected-tenant maintenance guard remains a required future security task because the remote metadata is not currently marked protected.

## 11. Tests executed

- Plan matrix and deny-path tests: PASS (Plan 1/2/3, unknown feature, missing/inactive plan, role restriction, override cap).
- Existing test suite: PASS (55 tests).
- TypeScript typecheck: PASS (non-incremental check).
- ESLint: PASS with six pre-existing warnings, zero errors.
- Production build: PASS after moving the pure membership total calculation out of the server-only plan service; existing lint warnings remain non-fatal.
- Live Demo/Talwalkar mutation, browser bypass and provider/device tests: NOT RUN by safety requirement.

## 12. Files changed

- `lib/entitlements/registry.ts`
- `lib/entitlements/evaluate.ts`
- `lib/entitlements/server.ts`
- `components/entitlements/feature-gate.tsx`
- `services/config.service.ts`
- `lib/rate-limit.ts`
- `lib/membership-plan-calculations.ts`
- `services/plan.service.ts`
- `components/modules/membership-sale-wizard.tsx`
- `middleware.ts`
- `app/actions/lead-actions.ts`
- `app/actions/finance-actions.ts`
- `app/actions/pt-actions.ts`
- `app/actions/biometric-actions.ts`
- `tests/entitlements.test.mts`
- `docs/SAAS_ENTITLEMENT_FOUNDATION.md`

## 13. Database migrations

None created or executed. Existing `tenant_features`, subscriptions and RLS were preserved. The repository has duplicate migration number `0040` files; resolve numbering before any future schema migration.

## 13.5 Backend enforcement coverage

| Boundary | Phase 2/3 coverage | Notes |
|---|---|---|
| Middleware HTML/API | Enforced | CRM, finance, PT, accounting and biometric prefixes deny locked plans. |
| CRM server actions | Enforced | `lead-actions.ts` checks `crm` after existing role/tenant checks. |
| Finance server actions | Enforced | All finance mutations check `finance`; existing validation and roles remain. |
| PT server actions | Enforced | Package, sale, scheduling and completion actions check `pt`. |
| Biometric server action | Enforced | Mapping action checks `biometric`; device ingress remains separately authenticated. |
| Services | Intentional exception | Read/query services rely on authenticated callers, RLS and guarded route/action boundaries; direct service imports require follow-up audit. |
| Other Phase 3 surfaces | Gap | No public Phase 3 mutation boundary currently exists; future module APIs must call `hasCurrentFeature`. |

Automated resolver tests cover matrix, unknown feature, missing/inactive subscription, role restriction, disabled override and above-plan override. Live Demo browser/API tests were not run because Demo Gym remains unchanged and is not safely classified for mutation testing.
## 14. Remaining blockers

1. Add explicit SuperAdmin Phase plan/override controls and audit trail.
2. Correct and protect Demo Gym through generic governance before plan mutation tests.
3. Apply entitlement checks to every feature action/API/service, not only middleware representative routes and the shared config service.
4. Expand route/action/service coverage and add live bypass tests.
5. Complete Phase 1/2/3 module workflow, RLS, branch, provider, mobile and performance QA; existing audit classifies most modules PARTIAL.

## 15. Developer task split

### Developer A — Astha

A-01: maintain the canonical registry and frontend contract; A-02: integrate locked states into navigation/module entry cards without duplicating guards; A-03: add browser tests for Plan 1/2/3 locked UX after Demo governance; A-04: close presentation/mobile/report gaps. Own `lib/entitlements/registry.ts`, `components/entitlements/`, UI tests and presentation directories. Do not edit migrations or shared backend route files concurrently.

### Developer B — Partner

B-01: add explicit SuperAdmin plan/override controls and generic protected-tenant guard; B-02: apply `getCurrentEntitlement` to all remaining actions/APIs/services with route-family ownership; B-03: execute tenant/branch/RLS/API bypass tests; B-04: resolve the build architecture blocker and migration numbering. Own backend authorization, SuperAdmin, migrations (future only), QA API tests and transaction boundaries.

### Parallel work matrix

| Task | Owner | Can parallel? | Dependency | Conflict risk |
|---|---|---|---|---|
| Registry/UI contract | Astha | Yes | Product mapping | Medium |
| SuperAdmin/protected tenant design | Partner | Yes | Product mapping | High |
| Locked UI integration | Astha | After registry | A-01 | Medium |
| API/action enforcement | Partner | After resolver | B-01/A-01 | High |
| Browser matrix tests | Astha | After UI + Demo governance | A-02/B-01 | Low |
| RLS/API/security tests | Partner | After backend checks | B-02 | Medium |

## 16. Definition-of-done gates

Phase 1/2/3 are not commercially READY until module workflows, role/tenant/branch/RLS checks, plan matrix checks, direct URL/API/action denial, mobile/PWA, performance and production build all pass. Plan 1 must allow only Phase 1; Plan 2 must allow Phases 1–2; Plan 3 must allow all three, with tenant-admin overrides unable to exceed the subscription.

## 17. Final SaaS customer flow

Website → Book Demo → SuperAdmin → Demo Gym → Customer Demo → Phase Selection → Requirements → Customization → Development → QA → Client Demo → Approval → Production → Feedback → Generic Core Product Improvement.
## Demo and Protected Tenant Governance

### Classifications

Tenant governance uses the existing `tenants.tenant_type`, `is_demo`, `is_protected`, and `purpose` metadata. `lib/tenants/governance.ts` is the single generic policy surface:

- `customer`: normal tenant; never eligible for Demo/test operations.
- `demo`: eligible only when `is_demo=true` and `is_protected=true`.
- protected customer: real/customer tenant protected from Demo/test workflows, but never treated as Demo.

Names, slugs, purpose text, and tenant IDs are never used for privileged classification. Only `super_admin` may manage classification metadata; tenant roles cannot self-escalate.

### Demo Gym status

The supplied Demo Gym (`052375ac-f0c8-45f8-91ee-da3e7f3ae71f`) was inspected read-only and remains `tenant_type=customer`, `is_demo=false`, `is_protected=false`, with plan/status `trial/trial`. It was deliberately not changed in this task. Consequently future Demo plan mutation testing remains blocked until an explicitly approved governance operation classifies it.

### Protected operation behavior

`canRunDemoOperation` and `assertDemoOperationAllowed` reject normal customers and protected customers. They allow only the explicit protected-Demo combination. No destructive reset, reseed, deletion, migration, or Demo data operation was executed. Existing RLS and role checks remain unchanged.

### Tests and safety

`tests/tenant-governance.test.mts` verifies Demo recognition, protected-customer separation, normal-customer rejection, protected-operation rejection, and tenant-admin classification denial. Talwalkar was not queried for mutation and no Talwalkar-specific code was added. No migration was created or executed.
## Controlled Demo Classification (2026-09-07)

A narrow SuperAdmin-only operation was added at `app/(superadmin)/superadmin/tenants/classification-actions.ts`, backed by `services/tenant-governance.service.ts`. It accepts only `tenant_type`, `is_demo`, and optional `is_protected`, validates coherent customer/demo states, verifies the actor's `super_admin` role server-side, updates only those columns, and records `tenant_classification_changed` in the existing `activity_logs` table. The existing broad tenant update action was not reused.

The exact Demo tenant `052375ac-f0c8-45f8-91ee-da3e7f3ae71f` was preflighted as `customer/false/false`, then classified using the same narrowly scoped, SuperAdmin-verified operation to `demo/true/true`. Plan and subscription values remain `trial/trial`; no business data or related metadata was changed. Post-flight verification confirms the target metadata and confirms both Talwalkar records remain `customer/false/false` with their existing plans/statuses. REST count checks for related business tables were unavailable from the configured endpoint, so row-level business-data preservation beyond the metadata update remains a documented verification limitation.

Governance tests now cover SuperAdmin authorization policy, non-SuperAdmin denial, narrow patch keys, coherent states, Demo eligibility, protected-customer separation, and normalization safety. Full tests (60), typecheck, lint, and production build pass; lint reports only existing warnings. No migration was created or executed. Live Plan 1/2/3 mutation testing remains out of scope.
## Safe SaaS Plan Assignment Foundation

The canonical tenant plan remains `tenants.plan`, constrained by the existing database values. `lib/entitlements/evaluate.ts` provides the single product mapping: `plan_1 → trial`, `plan_2 → professional`, and `plan_3 → enterprise`; legacy `standard` also normalizes to Plan 1. `services/tenant-plan.service.ts` and the SuperAdmin-only `assignTenantPlanAction` update only `tenants.plan`, verify the actor role server-side, and emit the existing `tenant_plan_changed` audit event. No broad tenant update action is reused.

The Demo-only reversible sequence was executed with a pre-verified SuperAdmin actor: Plan 1 (`trial`) → Plan 2 (`professional`) → Plan 3 (`enterprise`) → Plan 2 → Plan 1 (`trial`). Demo classification flags remained `demo/true/true`, status remained `trial`, and the final plan was restored to `trial`. No subscriptions or business tables were written. `tenant_features` had no Demo rows and cannot elevate a plan under the existing evaluator.

Live business-table count verification remains unavailable through the configured REST endpoint (related table requests return 404), so independent preservation is reported as PARTIAL rather than fabricated as complete. Talwalkar metadata was rechecked read-only before/after and remained unchanged. Live route/API/server-action access tests were not run for every phase because underlying Plan 2/3 mutation endpoints are intentionally not part of this foundation task; unit matrix tests and representative middleware/action enforcement remain green.
## Minimal SuperAdmin Plan Control

`components/superadmin/tenant-plan-control.tsx` provides a separate, confirmation-based control on the SuperAdmin tenant page. It displays the current product plan and Plan 1/2/3 choices, invokes only `assignTenantPlanAction`, reports success/errors, and shows the resulting selection. It does not expose or submit tenant, owner, branch, subscription, or business fields. Server-side authorization and `tenant_plan_changed` audit logging remain enforced by the existing action/service. No plan changes were performed automatically during UI implementation.