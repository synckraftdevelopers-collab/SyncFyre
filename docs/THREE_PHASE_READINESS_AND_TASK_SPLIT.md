# SyncFyre Three-Phase Readiness + Task Split

## 1. Executive Summary

Audit date: 2026-09-07. This was a read-only repository and Demo Gym metadata audit. This document is the only file created.

SyncFyre is one multi-tenant product with substantial operational implementation. It is not ready to be sold as Phase 1, Phase 2, and Phase 3 SaaS plans because tenant plan data, tenant feature rows, UI, routes, APIs, server actions, and RLS do not yet use one enforced entitlement policy.

- Phase 1: NOT READY.
- Phase 2: NOT READY.
- Phase 3: NOT READY.
- Plan entitlement: PARTIAL data model; MISSING product enforcement.
- Feature locking: MISSING as a security boundary.
- Demo Gym: BLOCKED for plan testing.
- Talwalkar protection: NOT READY technically; untouched by this audit.

Do not rebuild module UIs first. Build the plan entitlement and protected-tenant foundations, then close the listed workflow and QA gaps.

## 2. Current Verified Project State

| Area | Verified state |
|---|---|
| App | Next.js portals exist for SuperAdmin, admin, reception, trainer, and member users. |
| Tenancy | Tenant IDs, branches, multi-tenant migrations, RLS helpers, and many tenant/branch policy checks exist. |
| Roles | Middleware protects portal prefixes; actions and APIs commonly use role checks. |
| Modules | Members, plans, subscriptions, payments/invoices, attendance, reports, finance, CRM leads, PT, biometric, notifications, and member portal surfaces exist. |
| Feature data | Tenant settings, branch settings, and tenant feature tables are created in migration 0025. |
| Feature registry | lib/config/schema.ts defines feature keys; lib/config/defaults.ts provides defaults. |
| Feature service | services/config.service.ts provides isFeatureEnabled and getTenantFeatures. |
| Actual use | Visible feature enforcement is confined to customization actions; generic APIs, most actions, and middleware use roles rather than features. |
| Plan data | tenants.plan supports trial, standard, professional, enterprise. It is not a Phase 1/2/3 model. |
| SuperAdmin | Tenant page can edit generic plan/status/trial, but cannot resolve or control a Phase entitlement matrix. |
| QA | Unit tests and a two-branch role runbook exist; live database, provider, device, and browser QA remain unproven. |
| Migration safety | Two migration files use number 0040. Resolve this before more migration work. |

## 3. Talwalkar Protection Status

Status: NOT READY technically; untouched operationally.

Read-only tenant metadata showed Talwalkar records with is_protected false and tenant_type customer. Repository work supports generic demo/protection columns, but there is no verified generic maintenance guard that blocks destructive reset, seed, or plan tooling for protected tenants.

No Talwalkar data, configuration, plan, migration, or schema was changed.

Required future rule: build a generic protected-tenant operation guard. Never use a tenant-name condition.

## 4. Demo Gym Status

Status: BLOCKED for safe plan testing.

The supplied prefix resolves to Demo Gym tenant 052375ac-f0c8-45f8-91ee-da3e7f3ae71f.

| Field | Read-only observed value |
|---|---|
| Name / slug | demo gym / fitness |
| Plan / status | trial / trial |
| Tenant type | customer |
| is_demo | false |
| is_protected | false |
| Purpose | null |

This conflicts with the required safe Demo Gym posture. No correction was made. It has no Phase 1/2/3 entitlement assignment.

## 5. Phase 1 Readiness Audit

| Module | Status | Evidence | Remaining Work |
|---|---|---|---|
| Dashboard | PARTIAL | Admin/reception dashboards, live service queries, chart components. | Tenant/branch regression QA, activity scope review, plan gating. |
| Members | PARTIAL | CRUD, import/export, photos, profiles, actions/services. | End-to-end CRUD, storage scope, RLS, mobile QA. |
| Memberships | PARTIAL | Plans, subscriptions, renew/history actions and pages. | Lifecycle/payment verification and entitlement checks. |
| Payments / pending / expiry | PARTIAL | Invoices, payment lists, outstanding UI, expiry/reminder logic. | Transaction, scheduled-job, refund, provider, and RLS QA. |
| Attendance | PARTIAL | Manual attendance, filters, sync routes, exceptions UI. | Real device workflow, idempotency, role/branch QA. |
| Staff/basic roles | PARTIAL | Middleware, requireUser, RLS, permission document, staff pages. | Execute role matrix and prevent role/policy drift. |
| Trainer foundation | PARTIAL | Trainer portal, assignments, workouts, diet/progress. | Assigned-member and branch workflow QA. |
| Basic reports | PARTIAL | Report views/pages and export route. | Reconcile totals, filtering, scope, export QA. |
| Import/export | PARTIAL | Member import and export code/UI. | Invalid data, duplicate, rollback, tenant/branch QA. |
| Responsive/PWA | PARTIAL | Mobile nav, responsive UI, manifest/service worker. | Browser, install, offline, device QA. |

Phase 1 decision: NOT READY.

## 6. Phase 2 Readiness Audit

| Module | Status | Evidence | Remaining Work |
|---|---|---|---|
| CRM / lead pipeline | PARTIAL | CRM migration, lead service/actions/page. | Lifecycle/assignment QA, entitlement, reporting linkage. |
| WhatsApp / communications | PARTIAL | Templates, delivery service, reminder links. | Provider delivery, retries, consent/audit, entitlement. |
| Advanced membership | PARTIAL | Pause/cancel/renew/history and sale wizard. | Atomic sale transaction and lifecycle QA. |
| Finance | PARTIAL | Income/expense/cash/bank/GST/receivables services/pages. | Reconciliation, storage, authorization, plan gating. |
| PT / trainer management | PARTIAL | PT migrations/actions/page. | Credit/session, role/branch, entitlement QA. |
| Biometric / face attendance | PARTIAL | Device/mapping/diagnostic/mocking code. | Real-device certification and sync recovery QA. |
| Smart alerts | PARTIAL | Reminder cron and business notifications. | Scheduler reliability, provider monitoring, entitlement. |
| Advanced reports | PARTIAL | Analytics/finance/revenue/report exports. | Reconciliation, large export, entitlement QA. |
| Growth permissions | PARTIAL | Role and RLS work. | Separate commercial entitlement layer. |

Phase 2 decision: NOT READY.

## 7. Phase 3 Readiness Audit

| Module | Status | Evidence | Remaining Work |
|---|---|---|---|
| Multi-Branch Management | PARTIAL | Branch/tenant model and branch settings. | Controlled multi-branch UX and cross-branch QA. |
| Enterprise RBAC / approvals | PARTIAL | Roles, middleware, RLS, permission matrix. | Granular permissions, approvals, audit enforcement. |
| Advanced accounting | PARTIAL | Accounts, journals, ledger, trial balance pages. | Reconciliation, posting controls, accountant QA. |
| Automation engine | PARTIAL | Reminder cron and notifications. | Rule builder, queue/retry/observability. |
| Retention intelligence | MISSING | Expiry reminders/metrics only. | Cohorts, churn risk, interventions. |
| Revenue intelligence | PARTIAL | Finance/revenue reports. | Forecasting, variance, reliable drill-downs. |
| Advanced CRM/sales analytics | PARTIAL | Lead pipeline foundation. | Funnel/attribution/SLA/conversion analytics. |
| AI BI | MISSING | ai_insights feature key only. | Governed AI workflow, permissions, audit, UX. |
| APIs/webhooks | PARTIAL | Internal APIs and adapters. | Customer keys/scopes/webhooks/versioning/audit. |
| Member self-service | PARTIAL | Member portal pages. | Full workflow and premium entitlement QA. |

Phase 3 decision: NOT READY.

## 8. Plan Entitlement Architecture Audit

### Current plan model

The tenants.plan field supports trial, standard, professional, enterprise. SuperAdmin can edit it through the tenant UI and action. There is no mapping to Phase 1, Phase 2, or Phase 3.

### Current feature model

The tenant_features table stores enabled flags. Existing registry keys include members, membership, payments, finance, accounting, gst, trainer, dietician, equipment, biometric, whatsapp, reports, advanced_reports, member_portal, ai_insights, and customization_engine_enabled.

FEATURE_DEFAULTS enables almost every feature. Missing catalog keys include CRM, automation, multi-branch, enterprise RBAC, retention intelligence, revenue intelligence, and public API/webhooks.

### Current permissions and enforcement

- Middleware enforces portal role prefixes.
- requireUser protects many actions.
- APIs use local role checks.
- RLS provides important tenant/branch controls.
- Only customization-engine logic visibly calls isFeatureEnabled.
- This is role authorization, not product-plan entitlement authorization.

### Current SuperAdmin control

SuperAdmin can view/edit tenant plan, status, trial, and metadata. It cannot assign Phase 1/2/3, view resolved plan features, manage controlled overrides, or prepare safe Demo plan scenarios.

### Audit answers

| Question | Result |
|---|---|
| What controls plan access now? | Generic tenant plan field; it does not control feature access. |
| Can tenant have Phase 1/2/3? | No canonical tier values or mapping. |
| Can it calculate hasFeature for CRM/finance/AI? | Finance has a key; CRM does not. Existing helper is partial. |
| Is access enforced server-side? | Only customization engine; not catalog-wide. |
| Is there one source of truth? | No. Plan, defaults, overrides, roles, and routes are disconnected. |
| Can SuperAdmin change a plan? | Generic plan text only, not an entitlement contract. |
| Can upgrades/downgrades work? | Field can change, but features do not recalculate/enforce. |
| Can temporary overrides work? | Data rows support flags, but tenant management can modify them and most modules ignore them. |
| Can Demo test Phase 1/2/3? | No. |
| Can Talwalkar be protected? | Not with verified technical controls yet. |

### Recommended architecture

Do not implement during this audit. Future work should:

1. Define canonical product tiers and a Phase-to-feature mapping using existing keys where valid.
2. Add missing feature keys only after product approval.
3. Build a single server-only entitlement resolver returning plan features, overrides, source, and deny reason.
4. Restrict override writes to SuperAdmin and audit every change.
5. Require the resolver in middleware/route layouts, APIs, actions, and sensitive services.
6. Keep RLS for tenant/branch isolation; entitlement is additive.
7. Make UI use the same resolver for locked states, never as enforcement.
8. Add a generic protected-tenant guard for maintenance tooling.
9. Add plan-matrix and bypass tests before selling plans.

## 9. Feature Locking Matrix

| Feature | Phase 1 | Phase 2 | Phase 3 | Current Enforcement |
|---|---|---|---|---|
| Members, memberships, payments, attendance, basic reports | AVAILABLE | AVAILABLE | AVAILABLE | Roles/RLS partial; no plan enforcement |
| CRM | LOCKED | AVAILABLE | AVAILABLE | Module exists; no entitlement |
| WhatsApp workflows | LOCKED | AVAILABLE | AVAILABLE | Partial provider workflow; no entitlement |
| Finance/GST | LOCKED | AVAILABLE | AVAILABLE | Module exists; no entitlement |
| PT/trainer commercial workflow | LOCKED | AVAILABLE | AVAILABLE | Module exists; no entitlement |
| Biometric | LOCKED | AVAILABLE | AVAILABLE | Partial device workflow; no entitlement |
| Smart automation | LOCKED | AVAILABLE | AVAILABLE | Partial reminders only; no entitlement |
| Advanced reports | LOCKED | AVAILABLE | AVAILABLE | Partial reports; no entitlement |
| Multi-branch | LOCKED | LOCKED | AVAILABLE | Foundation only; no entitlement |
| Enterprise RBAC/approvals | LOCKED | LOCKED | AVAILABLE | Roles/RLS partial; no entitlement |
| Advanced accounting | LOCKED | LOCKED | AVAILABLE | Partial module; no entitlement |
| Retention/revenue intelligence | LOCKED | LOCKED | AVAILABLE | Missing/partial; no entitlement |
| AI BI | LOCKED | LOCKED | AVAILABLE | Feature key only |
| APIs/webhooks | LOCKED | LOCKED | AVAILABLE | Internal routes only |
| Premium member portal | LOCKED | LOCKED | AVAILABLE | Portal exists; no entitlement |

## 10. P2-01 to P2-19 Status

| ID | Status | Exists | Remaining Work / Dependencies |
|---|---|---|---|
| P2-01 | PARTIAL | Member deactivation action/service/dialog/API. | Role, tenant, branch, RLS QA; reuse existing soft-delete. |
| P2-02 | PARTIAL | Photo component and upload action. | Storage content/scope/cleanup QA. |
| P2-03 | PASS in code / PARTIAL release | Paginated admin/reception member lists and service. | Browser/data-volume/scope QA. |
| P2-04 | PARTIAL | Membership-plan pages/actions/service. | Lifecycle/RLS QA and entitlement decision. |
| P2-05 | PARTIAL | Workflow subscription creation and reception action. | Transaction/scope QA. |
| P2-06 | PARTIAL | Subscription list/detail/new pages. | Filter/mobile/history QA. |
| P2-07 | PARTIAL | Renew action and history RPC. | Overlap, invoice/payment, authorization QA. |
| P2-08 | PARTIAL | Status action supports pause. | Billing/reminder policy and audit QA. |
| P2-09 | PARTIAL | Status action supports cancel. | Refund/cancellation relationship QA. |
| P2-10 | PARTIAL | Expiry consistency and notification migrations/jobs. | Safe scheduler/provider test. |
| P2-11 | PARTIAL | Subscription detail/history data. | Render and role-scope QA. |
| P2-12 | PARTIAL | Membership sale wizard and sequential APIs. | Replace sequential calls with atomic idempotent backend transaction; likely DB/RPC work. |
| P2-13 | PARTIAL | Payment lists and invoice details. | Scope/receipt/payment workflow QA. |
| P2-14 | PARTIAL | Pending payment and outstanding UI/service. | Reconcile invoice/payment amounts and reminders. |
| P2-15 | PARTIAL | Balance helpers and payment/invoice fields. | Explicit partial collection, accounting, concurrency tests. |
| P2-16 | PARTIAL | Refund schema/status/report fields. | Dedicated refund action, approval, ledger reversal, receipt, idempotency contract. |
| P2-17 | PARTIAL | Invoice detail/print surfaces. | Receipt generation/storage/payment-refund consistency QA. |
| P2-18 | PARTIAL | Live dashboard charts for fixed windows. | Date/branch controls, scoped activity query, reconciliation tests. |
| P2-19 | PASS in code / PARTIAL release | Logout action, profile dropdown, unread badge. | Session/back-navigation/browser QA. |

## 11. Remaining Demo Work

1. After approval, mark Demo with generic demo/protected controls through SuperAdmin only.
2. Use synthetic Demo accounts/data only; never Talwalkar accounts/data.
3. Test Phase 1, 2, 3 solely through the future entitlement control.
4. Add a guarded, reversible Demo reset procedure only after protected-tenant rules exist.
5. Test UI locks, direct URLs, APIs, actions, request parameters, and browser-state bypasses.

## 12. Security Tasks

| Area | Task |
|---|---|
| Tenant | Prove QA Tenant A cannot read/write QA Tenant B. |
| Branch | Prove reception/trainer/manager/export branch isolation. |
| RLS | Review broad membership-plan/subscription/equipment policies and storage policies. |
| Role | Turn permissions matrix into repeatable tests; prevent documentation drift. |
| Entitlement | Add resolver, SuperAdmin-only overrides, route/API/action/service checks. |
| Storage | Fix finance attachment scope before use; re-evaluate public photo policy. |
| API/actions | Test direct request and parameter bypasses. |
| Protected tenants | Add generic destructive-operation guard. |
| Migration governance | Resolve duplicate 0040 before schema changes. |

## 13. Developer A — Astha

| Task ID | Task | Owner | Backup Owner | Files/Directories | Dependencies | Database Impact | Testing | Conflict Risk |
|---|---|---|---|---|---|---|---|---|
| A-01 | Define Phase-to-existing-feature mapping and resolver contract; document missing keys. | Astha | Partner | lib/entitlements new; lib/config/schema.ts; lib/config/defaults.ts | Product tier decision | No | Unit matrix/resolver tests | Medium; Astha exclusively edits config |
| A-02 | Create entitlement UI context and locked feature presentation. | Astha | Partner | components/entitlements new; portal nav/sidebar files | A-01 | No | Locked UI/mobile tests | Medium |
| A-03 | Complete P2 presentation gaps: dashboard date/branch controls, subscription history, receipt presentation. | Astha | Partner | components/dashboard, components/members, components/payments, admin reports pages | A-02 | No expected | Browser/functional tests | Low |
| A-04 | Add Phase matrix UI and locked-route browser tests after safe environment setup. | Astha | Partner | e2e/entitlements and tests | A-01/A-02 and Demo setup | No | Phase 1/2/3 UI/direct-nav tests | Low |

## 14. Developer B — Partner

| Task ID | Task | Owner | Backup Owner | Files/Directories | Dependencies | Database Impact | Testing | Conflict Risk |
|---|---|---|---|---|---|---|---|---|
| B-01 | Resolve migration numbering; model canonical tier assignment, SuperAdmin override authority, protected tenant guard, audit records. | Partner | Astha | supabase/migrations new unique files | Product decision | Yes | QA migration/RLS/rollback review | High; Partner owns migrations |
| B-02 | Build SuperAdmin tier/override and Demo-safe control surfaces. | Partner | Astha | superadmin pages/actions/components | B-01 | Uses B-01 schema | SuperAdmin/audit tests | Medium |
| B-03 | Enforce entitlement in API routes, actions, and service boundaries using Astha contract. | Partner | Astha | app/api, app/actions, entitlement guard new | A-01/B-01 | No expected | Direct URL/API/action bypass tests | High; partition route families |
| B-04 | Make sale atomic/idempotent; define partial-payment/refund contracts. | Partner | Astha | workflow/payment services, actions, migration/RPC files | B-03 guard | Likely yes | Transaction/concurrency/refund tests | High |
| B-05 | Execute tenant/branch/RLS/storage QA on QA tenants. | Partner | Astha | tests/api, docs/qa | B-01/B-03 | No production changes | QA Tenant A/B automation | Medium |

## 15. Parallel Work Matrix

| Task | Owner | Can Parallel? | Dependency | Conflict Risk |
|---|---|---|---|---|
| A-01 entitlement contract | Astha | Yes with B-01 design review | Product decision | Medium |
| B-01 schema/protection | Partner | Yes with A-01 | Product decision | High |
| A-02 locked UX | Astha | After A-01 | Resolver contract | Medium |
| B-02 SuperAdmin controls | Partner | After B-01 | QA schema | Medium |
| B-03 backend enforcement | Partner | After A-01/B-01 | Stable guard/schema | High |
| A-03 P2 UI polish | Astha | After A-02 | UI context | Low |
| B-04 sale/refund | Partner | After guard contract | Workflow ownership | High |
| A-04 browser matrix | Astha | After UI/backend controls | Demo safe setup | Low |
| B-05 RLS/API QA | Partner | After B-01/B-03 | QA accounts/data | Medium |

## 16. File Ownership Matrix

| Area | Primary Owner | Concurrent Edit Rule |
|---|---|---|
| Feature registry, defaults, entitlement resolver contract | Astha | Partner consumes merged contract only |
| Locked UI, nav/sidebar, presentation tests | Astha | Partner does not edit concurrently |
| Entitlement/protection migrations | Partner | Astha does not edit migrations |
| SuperAdmin tier controls | Partner | Astha does not edit concurrently |
| APIs/actions/service enforcement | Partner | Partition route families before work |
| Sale/payment/refund transaction logic | Partner | Partner exclusive |
| UI Phase matrix tests | Astha | Separate from Partner API/RLS tests |
| QA isolation tests | Partner | Separate directory ownership |

## 17. Execution Waves

### Wave 0

Approve tier vocabulary and feature matrix. Resolve duplicate migration numbering. Establish QA and Demo governance; do not touch Talwalkar.

### Wave 1

Astha A-01 and Partner B-01 run in parallel, with a joint contract review.

### Wave 2

Partner B-02/B-03 and Astha A-02 begin after Wave 1 merge.

### Wave 3

Partner B-04 and Astha A-03 complete Phase 2 workflow/presentation gaps.

### Wave 4

Astha A-04 and Partner B-05 run all entitlement, role, tenant, branch, browser, and RLS gates.

### Wave 5

Start Phase 3 work only after Phase 1 and Phase 2 gates pass.

## 18. Testing Gates

1. Approved Phase-feature matrix and feature ownership.
2. QA migration success, no duplicate identifiers, recovery documented.
3. SuperAdmin-only plan/override writes and audit trail.
4. Phase 1/2/3 backend entitlement checks pass.
5. Direct URL, API, action, parameter, local-storage, and UI bypass tests fail safely.
6. QA Tenant A/B and branch isolation tests pass.
7. Sale/payment/refund totals reconcile under concurrency.
8. Notification and biometric controlled integration tests pass.
9. Mobile/PWA, performance, production build, and regression gates pass.

## 19. Demo Gym Plan Testing

### Phase 1 test

Assign Demo to Phase 1 only through future SuperAdmin entitlement controls. Confirm Phase 1 allowed; Phase 2 and 3 locked in UI and denied by direct URL, API, and server action.

### Phase 2 test

Assign Demo to Phase 2. Confirm Phase 1 and 2 allowed; Phase 3 locked and denied everywhere.

### Phase 3 test

Assign Demo to Phase 3. Confirm all approved features allowed while role, tenant, and branch protections still apply.

All testing must use synthetic Demo/QA data and reversible procedures. Do not use Talwalkar.

## 20. Phase 1 Definition of Done

- Core workflows pass safe end-to-end QA.
- Tenant, branch, role, RLS, payment, expiry, attendance, reports, import/export, mobile, and PWA gates pass.
- Phase 1 features are the only features enabled for a Phase 1 tenant at all backend boundaries.
- Production build and monitoring checks pass.

## 21. Phase 2 Definition of Done

- All Phase 1 gates remain green.
- CRM, communications, finance, PT, biometric, automation, and advanced reports pass controlled workflow tests.
- Membership sale is atomic/idempotent.
- Partial-payment and refund contracts reconcile.
- Phase 2 enables Phase 1+2 and denies Phase 3 everywhere.

## 22. Phase 3 Definition of Done

- All Phase 1 and 2 gates remain green.
- Multi-branch, enterprise permissions/approvals, accounting, automation, intelligence, APIs/webhooks, and premium member flows meet security, audit, and operational acceptance.
- Phase 3 entitlement is enforced while roles/RLS still constrain access.

## 23. Final SaaS Customer Flow

Website
→ Book Demo
→ SuperAdmin
→ Demo Gym
→ Customer Demo
→ Phase Selection
→ Requirements
→ Generic Core Customization Approval
→ Development
→ QA
→ Client Demo
→ Approval
→ Production
→ Feedback
→ Generic Core Product Improvement

No customer-specific entitlement logic or Talwalkar-specific logic is permitted.

## 24. Final Task Checklist

- [ ] Approve canonical Phase feature matrix.
- [ ] Resolve duplicate migration number 0040.
- [ ] Add generic protected-tenant guard.
- [ ] Correct Demo generic demo/protected classification after approval.
- [ ] Build central entitlement resolver.
- [ ] Restrict plan/override authority to SuperAdmin.
- [ ] Enforce entitlements in routes, APIs, actions, and services.
- [ ] Add locked feature UX based on resolved backend data.
- [ ] Make membership sale atomic and close partial/refund gaps.
- [ ] Close RLS/storage/role gaps.
- [ ] Run tenant/branch/plan bypass tests.
- [ ] Run approved Demo Phase scenarios.
- [ ] Verify provider/device integrations.
- [ ] Start Phase 3 only after earlier gates pass.
