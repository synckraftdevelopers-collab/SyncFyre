# PHASE 3 / SCALE IMPLEMENTATION PLAN

**Date:** September 2026  
**Status:** Pre-implementation planning  
**Prerequisite:** PHASE_3_SCALE_READINESS_AUDIT.md must be reviewed first  

---

## Guiding Principles

1. **No fake Scale** — Every feature listed here must be end-to-end functional before being
   commercially advertised.
2. **Cumulative plan model** — Scale = Phase 1 + Phase 2 + Phase 3. Never break Phase 1 or
   Phase 2 functionality.
3. **Talwalkar safety** — No data writes to Talwalkar tenant at any point.
4. **Migration safety** — Next migration is `0045`. Never reuse or edit applied migrations.
   All new migrations are forward-only and idempotent.
5. **Middleware-first** — Every Phase 3 route must be added to `FEATURE_ROUTE_PREFIXES`
   in `middleware.ts` before that route goes live.
6. **Server-action guards** — Every Phase 3 mutation must call `hasCurrentFeature()` before
   any business logic.
7. **Tests required** — No Phase 3 feature is production-ready without passing tests covering
   entitlement enforcement, tenant isolation, and role permissions.

---

## P0 — Prerequisites (must complete before ANY Scale feature ships)

These are infrastructure items that unblock all subsequent Phase 3 work.

---

### P0.1 — Fix System B: Extend `lib/phases/registry.ts` to support PHASE_3

**Why:** The sidebar phase registry only supports `"PHASE_1"` and `"PHASE_2"`. Phase 3 nav
items cannot be locked/shown correctly without PHASE_3 support.

**Files to modify:**
- `lib/phases/registry.ts` — add `"PHASE_3"` to `SYSTEM_PHASE_KEYS`, `SYSTEM_PHASE_NAMES`,
  `SYSTEM_PHASE_NUMBERS`. Update constraint check in `system_phases` to allow `PHASE_[1-3]`.

**Frontend work:**
- `components/layout/portal-sidebar.tsx` — update `navGroups` logic to handle three-tier
  phase separation (Phase 1 available, Phase 2 locked for Essential, Phase 3 locked for
  Essential + Growth).
- Separator label currently says "Growth features" — needs to become context-aware:
  Essential user sees "Growth features" then "Scale features" separators.
  Growth user sees only "Scale features" separator.

**Backend work:** None (config-only change).

**Database:** None.

**Tests:**
- Add assertions for `PHASE_3` in `tests/entitlements.test.mts`
- Sidebar ordering test for three-tier separation

**Acceptance criteria:**
- Scale tenant sees all Phase 3 nav items (locked, visible)
- Growth tenant sees Phase 3 nav items as locked
- Essential tenant sees Phase 3 nav items as locked
- Clicking a locked Phase 3 item shows the correct upgrade modal ("Scale Plan required")

---

### P0.2 — Fix System B `multi_branch` classification

**Current state:** `multi_branch → PHASE_2 → pathnames: ["/superadmin/tenants"]`  
**Required state:** `multi_branch → PHASE_3 → pathnames: ["/admin/branches"]`

**Files to modify:**
- `lib/phases/registry.ts` — change `multi_branch` phase from `"PHASE_2"` to `"PHASE_3"`,
  update pathnames to `["/admin/branches"]`

**Tests:** Update any existing assertion that checks `multi_branch` is `PHASE_2`.

---

### P0.3 — Add missing Phase 3 keys to entitlement test coverage

**Files to modify:**
- `tests/entitlements.test.mts` — add `"retention_intelligence"`, `"revenue_intelligence"`,
  `"advanced_crm"` to the `scaleKeys` array in the Scale phase_3 test.

**Acceptance criteria:** All 8 Phase 3 keys tested explicitly by name.

---

### P0.4 — Add Phase 3 middleware guard template

**Files to modify:**
- `middleware.ts` — document the required pattern so each Phase 3 feature can be added
  to `FEATURE_ROUTE_PREFIXES` as it ships. Example:
  ```typescript
  { prefix: "/admin/branches",   feature: "multi_branch" },
  { prefix: "/admin/audit-logs", feature: "enterprise_rbac" },
  ```

Each feature PR must include its middleware guard entry. CI should enforce this.

---

## P1 — Required for Scale Launch

These are the minimum features that justify a paying Scale customer.

---

### P1.1 — Multi-Branch Management (`multi_branch`)

**Commercial value:** Multi-location gyms (the primary Scale customer) need to manage
multiple branches from one admin account with consolidated visibility.

**Scope:**

#### Frontend
- `/admin/branches` — Branch list page (all branches for this tenant)
  - List: name, city, member count, staff count, status
  - Create new branch form
  - Edit branch (name, address, contact)
  - Deactivate branch
- Branch selector in admin header — switch active branch context
- `/admin/branches/[id]` — Branch detail: members, staff, machine count
- `/admin/reports` — "Consolidated" report mode showing aggregated data across branches

#### Backend / Server Actions
- `app/actions/branch-actions.ts` — `createBranchAction`, `updateBranchAction`, `deactivateBranchAction`
  - Guard: `hasCurrentFeature("multi_branch")` on every action
  - Role check: `requireUser(["owner", "admin"])`
  - Tenant isolation: all queries scoped to `profile.tenant_id`
- `app/actions/member-management-actions.ts` — add `transferMemberAction`
  - Guard: `hasCurrentFeature("multi_branch")`
  - Validates source branch and target branch belong to same tenant

#### API Routes
- None required initially (server actions sufficient)

#### Database (migration `0045_multi_branch_management.sql`)
```sql
-- member_transfers: audit trail for cross-branch moves
create table if not exists public.member_transfers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  from_branch_id uuid not null references public.branches(id),
  to_branch_id uuid not null references public.branches(id),
  tenant_id uuid not null references public.tenants(id),
  transferred_by uuid references public.users(id),
  reason text,
  transferred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
-- RLS, indexes, tenant isolation
```

No changes to `branches` table itself (already sufficient for management).

#### Middleware
```typescript
{ prefix: "/admin/branches", feature: "multi_branch" },
{ prefix: "/api/branches",   feature: "multi_branch" },
```

#### RLS / Tenant Isolation
- `member_transfers`: `tenant_id = current_tenant_id()` for all reads
- `branches` table: existing RLS already scopes to tenant (verify in audit)
- Write policy: owner/admin + matching `tenant_id`
- Super admin: `is_super_admin()` bypass

#### Role Permissions
| Action | Owner | Admin | Manager | Reception | Trainer |
|---|---|---|---|---|---|
| View all branches | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create branch | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit branch | ✅ | ✅ | ❌ | ❌ | ❌ |
| Transfer member | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Tests
- `multi_branch` entitlement: plan_1 → denied, plan_2 → denied, plan_3 → allowed
- Essential cannot POST to `/api/branches` (middleware returns 403)
- Growth cannot POST to `/api/branches` (middleware returns 403)
- Scale can POST to `/api/branches`
- `transferMemberAction` denied for Essential/Growth tenants
- Tenant A cannot transfer to Tenant B's branch
- Branch creation creates branch under correct `tenant_id`

#### Acceptance Criteria
- [ ] Branch list shows only branches belonging to current tenant
- [ ] Creating a branch assigns `tenant_id` correctly
- [ ] Member transfer moves member to target branch and creates audit record
- [ ] Essential and Growth users see `/admin/branches` as a locked nav item
- [ ] Essential cannot POST `createBranchAction` even without the UI
- [ ] Middleware blocks `/admin/branches` for plan_1 and plan_2
- [ ] All tests pass, typecheck clean, lint 0 errors, build 152/152

---

### P1.2 — Tenant Admin Audit Logs (`enterprise_rbac`)

**Commercial value:** Enterprise customers expect to see a comprehensive audit trail of
all changes made in their account. This is the most requested enterprise feature.

**Scope (focused on audit log viewer — NOT full RBAC engine):**

The `activity_logs` table already exists and is written to by all Phase 2 actions.
This feature exposes a tenant-admin-facing viewer.

#### Frontend
- `/admin/audit-logs` — Audit log page
  - Filter by: date range, actor (staff member), action type, entity type
  - Export to CSV/Excel
  - Pagination (50 rows per page)
  - Shows: timestamp, actor, action, entity, description

#### Backend / Server Actions
- `app/actions/audit-log-actions.ts` — `getAuditLogsAction`
  - Guard: `hasCurrentFeature("enterprise_rbac")`
  - Role check: `requireUser(["owner", "admin"])`
  - Scoped to `profile.tenant_id` always

#### Database
No new table needed — `activity_logs` already exists. New index may be needed:
```sql
-- migration 0046_audit_log_tenant_index.sql
create index if not exists activity_logs_tenant_created_idx
  on public.activity_logs (tenant_id, created_at desc)
  where tenant_id is not null;
```

#### Middleware
```typescript
{ prefix: "/admin/audit-logs", feature: "enterprise_rbac" },
```

#### RLS / Tenant Isolation
Verify existing `activity_logs` RLS scopes reads to `tenant_id`. Add if missing.

#### Role Permissions
| Action | Owner | Admin | Manager | Reception | Trainer |
|---|---|---|---|---|---|
| View audit logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export logs | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Tests
- `enterprise_rbac` entitlement: plan_1 → denied, plan_2 → denied, plan_3 → allowed
- Essential and Growth cannot access `/admin/audit-logs` (middleware 403)
- Tenant A cannot read Tenant B's audit logs
- Receptionist cannot call `getAuditLogsAction`

#### Acceptance Criteria
- [ ] Audit log shows real data from `activity_logs`
- [ ] Only tenant's own logs appear — no cross-tenant data
- [ ] Essential/Growth see locked nav item with Scale plan upgrade modal
- [ ] Middleware blocks `/admin/audit-logs` for plan_1 and plan_2
- [ ] Export works
- [ ] Pagination works

---

### P1.3 — Revenue Intelligence (`revenue_intelligence`)

**Commercial value:** Scale customers managing larger volumes need actionable revenue
forecasting beyond the basic Growth revenue report.

**Scope:**

#### Frontend
- Extend `/admin/reports/revenue` with Scale-exclusive sections:
  - Month-over-month revenue trend (chart)
  - 3-month revenue forecast (linear projection based on trailing 6 months)
  - Collection efficiency rate (collected / billed)
  - Revenue per member (RPM) trend
  - Top revenue-generating membership plans

These sections must be gated — visible only on Scale, hidden (with upgrade prompt) on Growth.

#### Backend / Server Actions
- `services/report.service.ts` — add `getRevenueIntelligence(tenantId, branchId)` function
- `app/actions/report-actions.ts` or a new `app/actions/revenue-intelligence-actions.ts`
  - Guard: `hasCurrentFeature("revenue_intelligence")`
  - Role check: owner, admin only
  - All queries scoped to `tenant_id`

#### Database
No new table needed. Uses existing `payments`, `invoices`, `membership_plans` tables.

#### Middleware
No new prefix needed — `/admin/reports/revenue` already guarded by `advanced_reports`
(phase_2). The revenue intelligence sections are rendered conditionally within that page
based on the plan check.

#### Tests
- `revenue_intelligence`: plan_1 → denied, plan_2 → denied, plan_3 → allowed
- Growth users can see basic revenue report but not intelligence sections
- Server action returns 403-equivalent error for non-Scale tenants

#### Acceptance Criteria
- [ ] Forecast and trend sections only appear for Scale tenants
- [ ] Growth users see the basic revenue report but locked intelligence sections
- [ ] Server action enforces plan check independently of UI

---

### P1.4 — Advanced CRM Analytics (`advanced_crm`)

**Commercial value:** Scale customers with active sales teams need conversion funnel
analytics and lifetime value data beyond the Growth CRM.

**Scope:**

#### Frontend
- Extend `/admin/leads` with Scale-exclusive analytics tab:
  - Lead-to-member conversion rate by source/stage
  - Average days to convert
  - Lifetime value (LTV) calculation per converted lead
  - Pipeline velocity (average deal age per stage)

#### Backend / Server Actions
- `services/lead.service.ts` — add `getAdvancedCrmAnalytics(branchId, tenantId)`
- `app/actions/lead-actions.ts` — add `getAdvancedCrmAction`
  - Guard: `hasCurrentFeature("advanced_crm")`
  - Role check: owner, admin, manager

#### Database
No new table — uses existing `leads`, `members`, `invoices`, `payments`.

#### Middleware
No new prefix — `/admin/leads` already guarded by `crm` (phase_2).

#### Tests
- `advanced_crm`: plan_1 → denied, plan_2 → denied, plan_3 → allowed
- Server action enforces plan check for Growth tenants

---

## P2 — Future Scale Enhancements

These features require significant additional work or external dependencies and should be
scoped as separate milestones after P1 ships.

---

### P2.1 — Enterprise RBAC: Custom Role Creation

**Blocked by:** Requires redesigning the role system. Currently 7 hardcoded roles.

**Scope (future):**
- Custom role creation UI
- Permission matrix editor (feature-level permissions)
- Custom role assignment to staff members
- DB: `custom_roles`, `role_permissions` tables

**DB migration:** `0047_custom_roles.sql` (to be designed)

**Acceptance criteria (future):**
- [ ] Owners can create custom roles with selected feature permissions
- [ ] Staff members can be assigned custom roles
- [ ] Permissions are enforced at action level

---

### P2.2 — Automation Engine

**Blocked by:** Requires queue/job runner infrastructure.

**Scope (future):**
- Trigger → Condition → Action rule builder
- Built-in triggers: membership expiry, payment overdue, inactivity, birthday
- Built-in actions: WhatsApp message, email, notification, webhook call
- Campaign templates
- DB: `automation_rules`, `automation_triggers`, `automation_actions`, `campaign_templates`

---

### P2.3 — Retention Intelligence / Churn Scoring

**Scope (future):**
- Server-side engagement scoring engine (replaces/extends `getEngagement()` in member-360)
- `member_risk_scores` table — persisted scores, updated nightly by cron
- At-risk member dashboard
- Reactivation campaign integration with automation engine

**Note:** The current `getEngagement()` in `member-360.tsx` is Phase 2 member-level detail.
When this feature is built, the Phase 3 version should be a population-level view showing
all at-risk members, not just per-member score.

---

### P2.4 — AI Business Intelligence

**Blocked by:** LLM vendor selection and API cost model required.

**Scope (future):**
- LLM API integration (OpenAI / Gemini / similar)
- Natural language query interface for reports
- AI daily business summary
- Revenue and member behavior predictions

---

### P2.5 — Public REST API & Webhooks

**Scope (future):**
- API key management UI (owner/admin only)
- `api_keys` table with hashed keys
- Webhook subscription management UI
- `webhook_subscriptions` table
- Webhook delivery queue with retry logic
- `webhook_delivery_log` table
- Public API documentation

---

## Implementation Sequence

The recommended order preserving safety and delivering commercial value quickly:

```
STEP 1  P0.1 — Extend System B to PHASE_3
STEP 2  P0.2 — Fix multi_branch System B classification
STEP 3  P0.3 — Add missing scale key tests
STEP 4  P0.4 — Document middleware guard pattern

STEP 5  P1.1 — Multi-Branch Management (migration 0045)
STEP 6  P1.2 — Tenant Admin Audit Logs (migration 0046)
STEP 7  P1.3 — Revenue Intelligence (no new migration)
STEP 8  P1.4 — Advanced CRM Analytics (no new migration)

>>> SCALE COMMERCIAL LAUNCH (with P1.1 + P1.2 minimum) <<<

STEP 9  P2.1 — Enterprise RBAC custom roles (migration 0047)
STEP 10 P2.2 — Automation Engine (migration 0048-0050)
STEP 11 P2.3 — Retention Intelligence (migration 0051)
STEP 12 P2.4 — AI Insights
STEP 13 P2.5 — Public APIs & Webhooks
```

---

## Test Plan Summary

| Test | File | Covers |
|---|---|---|
| Phase 3 keys all locked on plan_1, plan_2 | `tests/entitlements.test.mts` | Entitlement matrix |
| Phase 3 keys all allowed on plan_3 | `tests/entitlements.test.mts` | Entitlement matrix |
| `multi_branch` blocked by middleware for plan_1/2 | `tests/middleware.test.mts` (new) | Middleware enforcement |
| `enterprise_rbac` blocked by middleware for plan_1/2 | `tests/middleware.test.mts` (new) | Middleware enforcement |
| Server action denies Essential/Growth for Phase 3 | `tests/scale-actions.test.mts` (new) | Server-action enforcement |
| Tenant isolation for `member_transfers` | `tests/tenant-isolation.test.mts` (new) | RLS / isolation |
| Tenant isolation for `audit_logs` viewer | `tests/tenant-isolation.test.mts` (new) | RLS / isolation |
| Sidebar shows Phase 3 as locked for Growth | `tests/upgrade-ux.test.mts` | Sidebar state |
| Upgrade modal shows "Scale Plan required" for Phase 3 | `tests/upgrade-ux.test.mts` | Upgrade UX |
| Next URL sanitization | `tests/upgrade-ux.test.mts` | Security |

---

## Migration Safety Rules

Before writing any migration:
1. Check highest existing migration number (`0044`). Next is `0045`.
2. Never reuse, edit, or rename an applied migration.
3. Every new migration must begin with `begin;` and end with `commit;`.
4. Include idempotent `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
5. Include a verification `DO $$ ... $$` block that raises on failure.
6. Never `UPDATE`, `DELETE`, or `INSERT` business data for Talwalkar or Demo Gym.
7. RLS policies must be `DROP POLICY IF EXISTS` before `CREATE POLICY`.

---

## Files That Will Need Modification

### P0 (infrastructure)

| File | Change |
|---|---|
| `lib/phases/registry.ts` | Add PHASE_3 support; fix `multi_branch` classification |
| `tests/entitlements.test.mts` | Add 3 missing scale key assertions |
| `middleware.ts` | Add Phase 3 route prefix entries as features ship |
| `components/layout/portal-sidebar.tsx` | Three-tier separator logic |

### P1.1 (multi-branch)

| File | Change |
|---|---|
| `app/(admin)/admin/branches/page.tsx` | New — branch list page |
| `app/(admin)/admin/branches/[id]/page.tsx` | New — branch detail page |
| `app/actions/branch-actions.ts` | New — CRUD server actions |
| `app/actions/member-management-actions.ts` | Add `transferMemberAction` |
| `lib/nav/admin-nav.ts` | Add Branches nav item with `featureKey: "multi_branch"` |
| `supabase/migrations/0045_multi_branch_management.sql` | New — member_transfers table |

### P1.2 (audit logs)

| File | Change |
|---|---|
| `app/(admin)/admin/audit-logs/page.tsx` | New — audit log viewer |
| `app/actions/audit-log-actions.ts` | New — `getAuditLogsAction` |
| `lib/nav/admin-nav.ts` | Add Audit Logs nav item with `featureKey: "enterprise_rbac"` |
| `supabase/migrations/0046_audit_log_tenant_index.sql` | New — performance index |

### P1.3 (revenue intelligence)

| File | Change |
|---|---|
| `app/(admin)/admin/reports/revenue/page.tsx` | Extend with Scale-gated sections |
| `services/report.service.ts` | Add `getRevenueIntelligence()` |
| `app/actions/report-actions.ts` | Add `getRevenueIntelligenceAction` |

### P1.4 (advanced CRM)

| File | Change |
|---|---|
| `app/(admin)/admin/leads/page.tsx` | Extend with Scale-gated analytics tab |
| `services/lead.service.ts` | Add `getAdvancedCrmAnalytics()` |
| `app/actions/lead-actions.ts` | Add `getAdvancedCrmAction` |

---

## Final Checklist Before Scale Commercial Activation

- [ ] P0.1 — System B supports PHASE_3
- [ ] P0.2 — `multi_branch` correctly classified in System B
- [ ] P0.3 — All 8 Phase 3 keys tested by name
- [ ] P0.4 — Middleware guard pattern documented and enforced
- [ ] P1.1 — Multi-branch management: route, actions, migration, tests passing
- [ ] P1.2 — Tenant admin audit logs: route, actions, tests passing
- [ ] P1.3 — Revenue intelligence: gated sections, server guard, tests passing
- [ ] P1.4 — Advanced CRM analytics: gated sections, server guard, tests passing
- [ ] All `npm test` pass
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — 152/152 pages, 0 errors
- [ ] Talwalkar unchanged (stored plan = `standard`, no data modified)
- [ ] Scale plan shows only actually-implemented features in upgrade modal
