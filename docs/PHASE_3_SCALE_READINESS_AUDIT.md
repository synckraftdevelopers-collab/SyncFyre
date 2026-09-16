# PHASE 3 / SCALE READINESS AUDIT

**Date:** September 2026  
**Status:** NOT READY FOR COMMERCIAL ACTIVATION  
**Auditor:** Read-only codebase inspection  

---

## 1. Executive Summary

Scale (Plan 3) has a complete, production-quality entitlement infrastructure — the registry,
evaluator, plan assignment service, upgrade UX, and test suite are all correct. However,
**every Phase 3 product feature is unimplemented**. No admin routes, no server actions, no
backend services, and no database tables exist for any Scale-exclusive feature.

A Scale tenant assigned by a SuperAdmin today receives identical product functionality to
Growth. Scale must not be commercially activated until at least the P0 features listed in
Section 11 are implemented and verified.

---

## 2. Entitlement Architecture

### System A — Canonical backend (`lib/entitlements/`)

| File | Role |
|---|---|
| `lib/entitlements/registry.ts` | Feature key → phase assignment. Single source of truth. |
| `lib/entitlements/evaluate.ts` | `evaluateFeature()` — arithmetic phase-rank comparison. `normalizePlan()` for legacy aliases. |
| `lib/entitlements/server.ts` | `hasCurrentFeature()` / `assertCurrentFeature()` — server-side guards for server actions and pages. |
| `lib/entitlements.ts` | `getCommercialPlanTier()` — legacy binary "free"/"paid" used only by sidebar. `COMMERCIAL_ROUTE_RULES` for middleware-adjacent locking. |

**Plan normalization (evaluate.ts):**

| Stored DB value | `normalizePlan()` | Plan |
|---|---|---|
| `trial` | `plan_1` | Essential |
| `standard` | `plan_1` | Essential |
| `professional` | `plan_2` | Growth |
| `enterprise` | `plan_3` | Scale |

**`storedPlanForProduct()` mapping:**

| Product plan | Written to `tenants.plan` |
|---|---|
| `plan_1` | `"trial"` |
| `plan_2` | `"professional"` |
| `plan_3` | `"enterprise"` |

**Evaluator logic:** `phaseRank(feature.phase) <= Number(plan.slice(-1))`  
Phase 3 features require `plan_3` (rank 3). Essential (rank 1) and Growth (rank 2) are denied.

### System B — Sidebar phase registry (`lib/phases/registry.ts`)

Binary PHASE_1 / PHASE_2 only. PHASE_3 does not exist in System B. Phase 3 features
have no sidebar entries in `adminNav` — they are invisible to all users today (not locked,
simply absent).

### System C — Commercial plan config (`lib/plans/config.ts`)

Defines the display-only Scale delta features for the upgrade modal and plan comparison
page. All 8 Phase 3 keys are listed in `SCALE_DELTA_FEATURES`.

---

## 3. Plan Matrix Verification

### Backend (System A)

| Phase | Essential (plan_1) | Growth (plan_2) | Scale (plan_3) |
|---|---|---|---|
| Phase 1 | ✅ ALLOWED | ✅ ALLOWED | ✅ ALLOWED |
| Phase 2 | ❌ LOCKED | ✅ ALLOWED | ✅ ALLOWED |
| Phase 3 | ❌ LOCKED | ❌ LOCKED | ✅ ALLOWED |

**Test evidence:** `tests/entitlements.test.mts` — "plan matrix exposes cumulative phase
entitlements" and "Scale phase_3 features are locked on Essential and Growth" — all pass.

### Middleware (`middleware.ts`)

`FEATURE_ROUTE_PREFIXES` contains only Phase 2 routes. Zero Phase 3 routes are listed.
This is currently safe because no Phase 3 routes exist. Each Phase 3 feature, when built,
**must** be added here before going live.

### Sidebar (System B + `getCommercialPlanTier`)

`getCommercialPlanTier()` returns binary `"free"` or `"paid"`. Both Growth (`professional`)
and Scale (`enterprise`) return `"paid"`. The sidebar renders identically for Growth and Scale
users. Phase 3 features don't appear because `adminNav` has no Phase 3 entries.

### Server Actions

`hasCurrentFeature()` / `assertCurrentFeature()` are called for Phase 2 features only
(finance, crm, pt, biometric, advanced_reports). Zero calls exist for any Phase 3 feature key.

---

## 4. Phase 3 Feature Inventory

Phase 3 keys from `lib/entitlements/registry.ts`:

| # | Feature Key | Label | In Scale Config | Admin Route | Server Action | API Route | DB Tables | Middleware Guard | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `multi_branch` | Multi-branch management | ✅ | ❌ | ❌ | ❌ | Partial | ❌ | NOT_IMPLEMENTED |
| 2 | `enterprise_rbac` | Enterprise roles and approvals | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT_IMPLEMENTED |
| 3 | `advanced_automation` | Advanced automation engine | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT_IMPLEMENTED |
| 4 | `retention_intelligence` | Retention intelligence | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT_IMPLEMENTED |
| 5 | `revenue_intelligence` | Revenue intelligence | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT_IMPLEMENTED |
| 6 | `advanced_crm` | Advanced CRM analytics | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT_IMPLEMENTED |
| 7 | `ai_insights` | AI business intelligence | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT_IMPLEMENTED |
| 8 | `api_webhooks` | APIs and webhooks | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT_IMPLEMENTED |

---

## 5. Feature-by-Feature Detail

---

### 5.1 `multi_branch` — Multi-Branch Management

**Commercial name:** Multi-Branch Management  
**Phase:** phase_3  
**Scale config:** ✅ "Centralized dashboard, Branch-level reports, Cross-branch member transfer"

**What exists:**
- `branches` table in DB (multi-tenancy foundation, migration `0009`)
- `0037_enforce_tenant_branch_name_uniqueness.sql` — unique branch names per tenant
- SuperAdmin can see multiple branches per tenant in `/superadmin/tenants`
- System B: `multi_branch → PHASE_2 → pathnames:["/superadmin/tenants"]` — **wrong phase and wrong path**

**What is missing:**
- No `/admin/branches` route
- No tenant-admin branch management UI
- No branch creation/edit server action for tenant admins
- No branch-level dashboard switching
- No cross-branch member transfer service or action
- No consolidated multi-branch report
- No middleware guard (no route to guard yet)
- No `hasCurrentFeature("multi_branch")` in any server action

**Security concerns:** None currently (no route exists). When built: all queries must scope by `tenant_id`.

**DB dependency:** `branches` table exists. New columns or FK tables may be needed for transfer history.

**Migration required:** None yet. A new migration will be required for member_transfers table when built.

**Tenant isolation:** Not applicable yet.

**Role permissions:** Should be accessible to owner, admin, manager only.

**Tests:** Registry tests pass. No feature-level tests.

**Mobile/responsive:** Not applicable.

**Safe to expose commercially:** ❌ NO

**Status: NOT_IMPLEMENTED**

---

### 5.2 `enterprise_rbac` — Enterprise Roles & Approvals

**Commercial name:** Enterprise Access Control  
**Phase:** phase_3  
**Scale config:** ✅ "Custom role creation, Approval workflows, Audit logs"

**What exists:**
- 7 fixed roles: `owner, admin, manager, reception, trainer, dietician, member`
- `activity_logs` table (audit trail, written to by all Phase 2 actions)
- `/superadmin/audit-logs` page — superadmin-only, not tenant-admin accessible
- Expense approve/reject in `finance.service` + `finance-actions.ts` — **but gated on `finance` (phase_2), not `enterprise_rbac`**. This is a Phase 2 finance feature, not a Phase 3 enterprise feature.

**What is missing:**
- No custom role creation (roles are hardcoded)
- No permission matrix editor
- No multi-level approval engine beyond single-step expense approve/reject
- No discount/refund approval system
- No `/admin/audit-logs` route for tenant admins (viewing their own activity log)
- No `hasCurrentFeature("enterprise_rbac")` guard anywhere

**DB dependency:** `roles` table exists (fixed). New tables needed: `custom_roles`, `role_permissions`, `approval_workflows`.

**Status: NOT_IMPLEMENTED**

---

### 5.3 `advanced_automation` — Automation Engine

**Commercial name:** Automation Engine  
**Phase:** phase_3  
**Scale config:** ✅ "Custom trigger-action workflows, Multi-step automations, Webhook integrations"

**What exists:**
- `services/workflow.service.ts` — `logActivity()` only. This is an audit log utility, not an automation engine.
- `/api/cron/reminders` — hardcoded cron for membership renewal reminders. Not configurable.
- `lib/env.ts` has `WHATSAPP_PROVIDER_URL` / `EMAIL_PROVIDER_URL` for outbound delivery

**What is missing:**
- No automation rule builder UI
- No trigger/condition/action schema or DB table
- No campaign builder
- No multi-step workflow execution
- No queue/job runner for async workflow execution
- No configurable webhook delivery system for customers

**DB dependency:** Requires new tables: `automation_rules`, `automation_triggers`, `automation_actions`, `campaign_templates`.

**Status: NOT_IMPLEMENTED**

---

### 5.4 `retention_intelligence` — Churn Scoring / At-Risk Members

**Commercial name:** Retention Intelligence  
**Phase:** phase_3  
**Scale config:** ✅ "Churn risk scoring, Retention playbooks, At-risk member alerts"

**What exists:**
- `components/members/member-360.tsx` — `getEngagement()` computes a weighted engagement score
  per-member (attendance 28%, payments 24%, workouts 22%, trainer 14%, app activity 12%).
  This produces a real numerical score displayed on the member detail page.
- **BUT:** This is frontend-only local computation. Not persisted, not queryable at scale,
  not guarded by any plan check. It is part of the Growth-plan member detail view (phase_2),
  not a Phase 3 retention intelligence product.

**What is missing:**
- No server-side churn risk scoring engine
- No `member_risk_scores` table
- No at-risk member dashboard
- No churn monitoring across all members
- No reactivation campaigns
- No plan guard — engagement score is accessible to all plans today via member-360

**DB dependency:** Requires: `member_risk_scores`, `member_engagement_events` tables.

**Entitlement gap:** The `getEngagement()` calculation in member-360 should eventually be
guarded or replaced with a proper server-side score when `retention_intelligence` is built.
Currently it is unguarded and available to all plans.

**Status: NOT_IMPLEMENTED** *(engagement score in member-360 is a Growth member-detail metric, not the Scale retention intelligence feature)*

---

### 5.5 `revenue_intelligence` — Revenue Analytics / Forecasting

**Commercial name:** Revenue Intelligence  
**Phase:** phase_3  
**Scale config:** ✅ "Revenue trend analysis, Forecasting & projections, Collection performance insights"

**What exists:**
- `/admin/reports/revenue` route — exists and is guarded by `assertCurrentFeature("advanced_reports")` (Phase 2).
  Shows a monthly revenue summary from `getMonthlyRevenueSummary()` in `report.service`.
- This is a Phase 2 `advanced_reports` feature, not a separate `revenue_intelligence` product.

**What is missing:**
- `revenue_intelligence` key never used in any server action, route, service, or component
- No revenue forecasting, trend prediction, or ML-based analytics
- No `hasCurrentFeature("revenue_intelligence")` guard anywhere
- No tests for this key by name

**Status: NOT_IMPLEMENTED**

---

### 5.6 `advanced_crm` — Advanced CRM Analytics

**Commercial name:** Advanced CRM Analytics  
**Phase:** phase_3  
**Scale config:** ✅ "Lead conversion analytics, Lifetime value scoring, Pipeline performance dashboards"

**What exists:**
- CRM module (`/admin/leads`) is Phase 2, fully implemented, guarded by `hasCurrentFeature("crm")`
- Lead pipeline, stages, activities, conversion tracking all work

**What is missing:**
- `advanced_crm` key never used in any server action, route, service, or component
- No lifetime value calculation, no AI-assisted pipeline analytics, no advanced conversion scoring
- No `hasCurrentFeature("advanced_crm")` guard anywhere
- No tests for this key by name

**Status: NOT_IMPLEMENTED**

---

### 5.7 `ai_insights` — AI Business Intelligence

**Commercial name:** AI Business Intelligence  
**Phase:** phase_3  
**Scale config:** ✅ "Revenue forecasting, Member behavior analysis, Growth opportunities"

**What exists:**
- `lib/config/defaults.ts`: `ai_insights: false` — a config flag. Default off.
- `lib/config/schema.ts`: `ai_insights` in `FEATURE_KEYS` — schema declaration only.

**What is missing:**
- No AI route, no AI component, no LLM API integration
- No natural language query interface
- No daily business summary generation
- No `/admin/ai` route
- No LLM vendor configured in `lib/env.ts`
- `ai_insights: false` — disabled even at config level

**External dependency:** Requires LLM API (OpenAI, Gemini, etc.) — not selected, not integrated.

**Status: NOT_IMPLEMENTED**

---

### 5.8 `api_webhooks` — REST APIs & Webhooks for Customers

**Commercial name:** Integrations & Member App  
**Phase:** phase_3  
**Scale config:** ✅ "REST API access, Webhook support, Premium member self-service portal"

**What exists:**
- `services/notification-delivery.service.ts` — `sendViaWebhook()` is an **internal** notification
  delivery mechanism. Not a customer-facing webhook system.
- Internal Next.js API routes (`/api/*`) serve the SyncFyre application. Not a documented
  public REST API for external developers.

**What is missing:**
- No API key management UI or table
- No webhook subscription management
- No `webhook_subscriptions` table
- No public API documentation
- No customer-facing authentication layer for API keys
- No `hasCurrentFeature("api_webhooks")` guard anywhere

**DB dependency:** Requires: `api_keys`, `webhook_subscriptions`, `webhook_delivery_log` tables.

**Status: NOT_IMPLEMENTED**

---

## 6. Upgrade UX Verification

### Essential → locked Phase 3 feature

Phase 3 features are **not in the sidebar nav** (not in `adminNav`, not in System B).
A user on Essential cannot click a Phase 3 feature — they don't exist in the nav.

The upgrade page (`/admin/upgrade`) shows the plan comparison table with all 8 Scale delta
features marked as locked for Essential and Growth. The CTA opens `https://syncfyre.com/#pricing`.

### Growth → locked Phase 3 feature

Same as Essential. Phase 3 nav items don't exist yet.

### Upgrade destination

- `sanitizeNext()` only allows paths starting with `/admin/`. ✅
- "Upgrade" CTAs open `https://syncfyre.com/#pricing` externally — no self-serve activation. ✅
- SuperAdmin `assignTenantPlanAction` is the only plan change path. ✅

### Dead-end / 404 risk

Currently none — Phase 3 routes don't exist, so there are no 404-producing locked links.
When Phase 3 routes are added: each must be added to `FEATURE_ROUTE_PREFIXES` in middleware
AND listed in `adminNav` with a `featureKey` for sidebar locking before being merged.

---

## 7. Database / Migration Status

### Applied migrations relevant to Phase 3

| Migration | Relevance |
|---|---|
| `0009_multi_tenancy.sql` | `branches`, `tenants` tables — foundation |
| `0018_superadmin_saas_extensions.sql` | `tenant_features`, `activity_logs`, plan fields, `provision_superadmin_tenant_owner` RPC |
| `0043_phase_gating_corrected.sql` | `system_phases`, `feature_phases`, `system_phase_audit_logs` — phase gating tables |
| `0044_machine_rls_tenant_scope.sql` | Machine RLS fix — not Phase 3 related |

### Missing DB tables for Phase 3

| Missing table | Required for |
|---|---|
| `member_transfers` | Multi-branch member transfer history |
| `custom_roles` | Enterprise RBAC |
| `role_permissions` | Enterprise RBAC |
| `approval_workflows` | Enterprise RBAC |
| `automation_rules` | Automation engine |
| `automation_triggers` | Automation engine |
| `automation_actions` | Automation engine |
| `campaign_templates` | Campaigns |
| `member_risk_scores` | Retention intelligence |
| `member_engagement_events` | Retention intelligence |
| `api_keys` | API & webhooks |
| `webhook_subscriptions` | API & webhooks |
| `webhook_delivery_log` | API & webhooks |

**Migration gap:** `0041_phase_gating.sql` was excluded (in `_excluded/`). `0043` supersedes it.
Migration numbers 0027 and 0041 are intentionally skipped. Next migration must be `0045`.

---

## 8. Security / RLS Gaps

### Current state
No Phase 3 routes exist, so no RLS gaps exist specifically for Phase 3 today.

### Required before each Phase 3 feature is launched

For every new Phase 3 table:
- RLS must be enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- Tenant isolation policy: `tenant_id = current_tenant_id()`
- Write policy: management role + matching `tenant_id`
- Super admin bypass: `is_super_admin()`

### Existing gap — System B `multi_branch` classification

`lib/phases/registry.ts` maps `multi_branch → PHASE_2 → pathnames: ["/superadmin/tenants"]`.
This is incorrect on two counts: (1) it's Phase 3 in System A, (2) `/superadmin/tenants`
is a superadmin-only portal. This must be corrected when multi-branch admin UI is built.

---

## 9. Test Coverage Gaps

| Gap | Priority |
|---|---|
| `retention_intelligence`, `revenue_intelligence`, `advanced_crm` not in scale key test array | P1 |
| No test asserting that a Scale-plan server action correctly allows Phase 3 access | P1 |
| No test asserting Essential cannot call a (future) Phase 3 server action | P1 |
| No test asserting Growth cannot call a (future) Phase 3 server action | P1 |
| No tenant isolation test for Phase 3 data | P1 (when data exists) |
| No middleware test for Phase 3 route blocking | P1 (when routes exist) |
| System B `multi_branch` phase mismatch not asserted | P2 |

---

## 10. Talwalkar Safety Check

- Stored plan: `standard` → `normalizePlan("standard")` → `plan_1` (Essential) ✅
- Protected by: `locked={tenant.slug === "talwalkar"}` in `TenantPlanControl` ✅
- Protected by: server-side guard `if (currentTenant.slug === "talwalkar") return { error: ... }` in `tenants/actions.ts` ✅
- **No changes made to Talwalkar** ✅

---

## 11. Phase 3 Priority Classification

### P0 — Must complete before Scale can be commercially activated

| # | Item | Reason |
|---|---|---|
| P0.1 | Add Phase 3 middleware guards for every Phase 3 route when created | Without this, any Scale-only page is accessible to Essential/Growth tenants |
| P0.2 | Implement `multi_branch` — tenant admin branch management UI, service, migration | First and most valuable Scale differentiator |
| P0.3 | Implement `/admin/audit-logs` (tenant-admin accessible audit log) | Core enterprise expectation for Scale customers |
| P0.4 | Add `retention_intelligence`, `revenue_intelligence`, `advanced_crm` to the explicit scale key test array in `tests/entitlements.test.mts` | Registry entries untested by name |
| P0.5 | Fix System B: `multi_branch → PHASE_3` with correct admin pathname | Sidebar gating will be wrong when multi-branch nav item is added |
| P0.6 | Extend System B (`lib/phases/registry.ts`) to support `"PHASE_3"` | Required for sidebar to correctly lock/show Phase 3 nav items |
| P0.7 | Scale plan must not be marketed with all 8 features until each is individually production-ready | Commercial honesty — no fake Scale |

### P1 — Important Scale differentiators (implement for Scale launch)

| # | Item |
|---|---|
| P1.1 | Multi-branch consolidated dashboard (branch switching for admins) |
| P1.2 | Cross-branch member transfer |
| P1.3 | Enterprise audit log with filter, search, export |
| P1.4 | Revenue intelligence dashboard (upgrade from `advanced_reports`) |
| P1.5 | Advanced CRM analytics (LTV scoring, pipeline conversion rates) |
| P1.6 | DB migrations for multi-branch, audit-logs extensions |

### P2 — Future Scale enhancements

| # | Item |
|---|---|
| P2.1 | Custom role creation and permission matrix |
| P2.2 | Automation engine (trigger → condition → action) |
| P2.3 | Retention intelligence / churn scoring engine |
| P2.4 | AI insights integration (LLM vendor selection required) |
| P2.5 | Public REST API + webhook subscription management |

---

## 12. Final Verdict

```
SCALE STATUS: NOT READY FOR COMMERCIAL ACTIVATION
```

### Blockers

| Blocker | Priority |
|---|---|
| Zero Phase 3 features implemented | P0 |
| No middleware guards for Phase 3 routes | P0 |
| No sidebar entries for Phase 3 features | P0 |
| Scale delivers no value over Growth today | P0 |
| System B has no PHASE_3 concept | P0 |
| System B `multi_branch` misclassified as PHASE_2 → /superadmin/tenants | P0 |
| 3 Phase 3 registry keys untested by name | P0 |

---

## 13. Safety Confirmation

- **Application code changed:** NO  
- **Database writes executed:** NO  
- **Migrations executed:** NO  
- **Talwalkar modified:** NO  
- **Demo Gym modified:** NO  
- **QA tenant modified:** NO  
