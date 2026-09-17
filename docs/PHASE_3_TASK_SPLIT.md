# SyncFyre Phase 3 / Scale — Implementation Task Split

**Date:** September 2026  
**Developers:** Dev A = Astha · Dev B = Shraddha  
**Status:** Approved for execution  

---

## A. Executive Summary

Scale (plan_3) has a correct, tested entitlement infrastructure (System A) but zero production-ready Phase 3 features. The following is true at the start of this sprint:

| Layer | State |
|---|---|
| System A (`lib/entitlements/registry.ts` + `evaluate.ts`) | ✅ Correct and tested — no changes needed |
| System B (`lib/phases/registry.ts`) | ❌ PHASE_3 missing; `multi_branch` wrongly classified as PHASE_2 |
| Sidebar | ❌ Binary "free/paid" — Growth and Scale look identical |
| `createBranchAction` | ❌ No `multi_branch` entitlement gate — any plan can create branches |
| Middleware | ❌ No Phase 3 route guards |
| `/admin/branches` | ❌ Does not exist |
| `/admin/audit-logs` | ❌ Does not exist |
| Revenue intelligence sections | ❌ Do not exist |
| Advanced CRM analytics sections | ❌ Do not exist |

**Scale verdict at start:** ❌ NOT READY

---

## B. Commercial Plan Model

```
Plan 1 = Essential   → Phase 1 features only
Plan 2 = Growth      → Phase 1 + Phase 2 features
Plan 3 = Scale       → Phase 1 + Phase 2 + Phase 3 (implemented features only)
```

No "Free/Paid" binary. No "Free Tier". No automatic activation of unimplemented features.

---

## C. Phase 3 Feature Inventory (Evidence-Based)

All 8 Phase 3 keys from `lib/entitlements/registry.ts`:

### Phase 3 Readiness Matrix

| Feature | Phase | Registry (A) | Backend | Database | UI | Middleware | RLS | Tests | Status | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| `multi_branch` | phase_3 | ✅ | ⚠️ Actions exist, no gate | ✅ branches table | ❌ No /admin/branches | ❌ | ✅ tenant-scoped | ✅ entitlement | PARTIAL | **P0** |
| `enterprise_rbac` | phase_3 | ✅ | ❌ | activity_logs ✅ | ❌ No /admin/audit-logs | ❌ | ⚠️ branch-scoped only | ✅ entitlement | NOT IMPLEMENTED | **P0** |
| `revenue_intelligence` | phase_3 | ✅ | ❌ | ✅ existing tables | ❌ no sections | ❌ | ✅ RLS via phase_2 | ❌ not by name | NOT IMPLEMENTED | **P1** |
| `advanced_crm` | phase_3 | ✅ | ❌ | ✅ existing tables | ❌ no sections | ❌ | ✅ RLS via phase_2 | ❌ not by name | NOT IMPLEMENTED | **P1** |
| `advanced_automation` | phase_3 | ✅ | ❌ | ❌ no tables | ❌ | ❌ | ❌ | ✅ entitlement | NOT IMPLEMENTED | P2 |
| `retention_intelligence` | phase_3 | ✅ | ❌ | ❌ no tables | ❌ empty card | ❌ | ❌ | ❌ not by name | NOT IMPLEMENTED | P2 |
| `ai_insights` | phase_3 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ entitlement | NOT IMPLEMENTED | P2 |
| `api_webhooks` | phase_3 | ✅ | ❌ | ❌ no tables | ❌ | ❌ | ❌ | ✅ entitlement | NOT IMPLEMENTED | P2 |

### Priority Reasoning

**P0 — Mandatory before Scale can be sold:**
- `multi_branch` — Scale's primary differentiator. Without it, Scale = Growth. Backend actions exist; gap is entitlement gate, dedicated UI, and sidebar.
- `enterprise_rbac` (audit log viewer) — `activity_logs` table is already populated by all actions. A viewer is quick to build and is the #1 enterprise expectation.

**P1 — Important differentiators (after P0):**
- `revenue_intelligence` — Phase 2 revenue report exists; Scale sections (forecast, trend, efficiency) add real value without new DB tables.
- `advanced_crm` — Phase 2 CRM exists; Scale analytics sections (conversion funnel, LTV, pipeline velocity) add real value.

**P2 — Future roadmap (do NOT implement this sprint):**
- `advanced_automation` — Requires queue infrastructure, new DB tables. Very high complexity.
- `retention_intelligence` — Requires scoring engine and new tables. High complexity.
- `ai_insights` — Requires LLM vendor selection. External dependency.
- `api_webhooks` — Requires API key management, webhook delivery queue. High complexity.

---

## D. Minimum Scale Launch Features

### 1. Multi-Branch Management (`multi_branch`) — P0

**Why required:** Scale's primary commercial differentiator for gym chains.

**What must exist:**
- Scale tenants can create, edit, deactivate multiple branches
- Essential/Growth tenants blocked from creating a 2nd branch
- `/admin/branches` page: list, create, edit, deactivate
- Branch-level stats (member count, staff count)

**DB work:** None needed. `branches` table exists with `tenant_id`. `finance_settings` auto-created by existing `createBranchAction`. `0037` enforces name uniqueness per tenant.

**Security:** `createBranchAction` must call `hasCurrentFeature("multi_branch")`. Middleware guards `/admin/branches`.

**Acceptance criteria:**
- Essential → `createBranchAction` denied
- Growth → `createBranchAction` denied
- Scale → full branch management
- Tenant A cannot see Tenant B's branches
- Single-branch Essential/Growth tenants fully unaffected

### 2. Enterprise Audit Logs (`enterprise_rbac`) — P0

**Why required:** Enterprise customers expect a comprehensive audit trail. `activity_logs` already has real data.

**What must exist:**
- `/admin/audit-logs` page with real `activity_logs` data
- Filters: date range, action type, entity type, actor
- Pagination (50 rows/page)
- Owner/admin only (not manager, reception, trainer)

**DB work:** None for P0. Consider index migration `0046` as P1 optimization.

**Security:** `hasCurrentFeature("enterprise_rbac")` + `requireUser(["owner", "admin"])`. Query must scope to `profile.tenant_id`.

### 3. Revenue Intelligence (`revenue_intelligence`) — P1

**What must exist:** Scale-exclusive sections on `/admin/reports/revenue`:
- MoM revenue trend chart
- 3-month linear forecast
- Collection efficiency rate
- Revenue per active member

Growth users see locked sections with upgrade prompt.

**DB work:** None. Uses existing `payments`, `members`, `subscriptions`.

### 4. Advanced CRM Analytics (`advanced_crm`) — P1

**What must exist:** Scale-exclusive analytics tab on `/admin/leads`:
- Lead-to-member conversion rate by stage
- Average days to convert
- Pipeline velocity per stage

Growth users see leads page but locked analytics section.

**DB work:** None. Uses existing `leads`, `members`, `subscriptions`.

---

## E. Implementation Order

```
Step 1: P3-A-01  System B PHASE_3 + sidebar three-tier        [Astha]     ← blocks everything
Step 2: P3-A-02  Multi-branch gate + middleware + nav          [Astha]     ← blocks P3-B-01
Step 3: P3-B-01  Branch management UI                          [Shraddha]  ← needs Step 2 done

(After Step 2, these run in parallel)
Step 4a: P3-A-03  Audit log backend                            [Astha]
Step 4b: (Shraddha continues P3-B-01 branch detail pages)

Step 5a: P3-B-02  Audit log UI                                 [Shraddha]  ← needs P3-A-03
Step 5b: P3-A-04  Revenue intelligence backend                 [Astha]

Step 6a: P3-B-03  Revenue intelligence UI                      [Shraddha]  ← needs P3-A-04
Step 6b: P3-A-05  Advanced CRM analytics backend               [Astha]

Step 7:  P3-B-04  Advanced CRM analytics UI                    [Shraddha]  ← needs P3-A-05

Step 8:  Integration testing + full regression                 [Both]
Step 9:  Scale commercial readiness audit                      [Both]
```

---

## F. Dev A — Astha Task List

---

### P3-A-01 — System B PHASE_3 Foundation + Sidebar Three-Tier

**Developer:** Astha  
**Priority:** P0 — blocks all other tasks  
**Feature:** Entitlement foundation  
**Complexity:** Medium  
**Depends on:** Nothing — first task  

**Objective:** Make System B recognise PHASE_3. Fix `multi_branch` classification. Update sidebar to show three-tier locking (Essential / Growth / Scale).

**Key architectural decision:** Do NOT extend the DB `system_phases` table. The `0043` migration has CHECK constraints `check (phase_key ~ '^PHASE_[1-2]$')` and `check (phase_number between 1 and 2)` that would require a migration to relax. Instead, use `currentPlanKey` (already passed from `app/(admin)/layout.tsx` → `PortalShell` → `PortalSidebar`) for Phase 3 locking. System A already correctly evaluates Phase 3 at the backend. System B changes are code-only.

**Existing files:**
- `lib/phases/registry.ts` — PHASE_1/PHASE_2 only, `multi_branch → PHASE_2 → /superadmin/tenants`
- `components/layout/portal-sidebar.tsx` — binary `"free"/"paid"` tier
- `services/phase.service.ts` — `defaultPhaseRecords()` only returns PHASE_1/PHASE_2

**Files to change:**

**`lib/phases/registry.ts`:**
1. Add `"PHASE_3"` to `SYSTEM_PHASE_KEYS`
2. Add `PHASE_3: "Phase 3"` to `SYSTEM_PHASE_NAMES`
3. Add `PHASE_3: 3` to `SYSTEM_PHASE_NUMBERS`
4. Change `multi_branch` entry: `phase: "PHASE_3"`, `pathnames: ["/admin/branches"]`

**`services/phase.service.ts`:**
- `defaultPhaseRecords()` must include PHASE_3 with `status: "locked"` as default
- Update all type constraints from `SystemPhaseKey` to include PHASE_3
- `isPhaseAtOrBelow()` arithmetic already works correctly (numeric comparison)
- `getPhaseSnapshot()` already uses `SYSTEM_PHASE_KEYS.map(...)` — will auto-include PHASE_3

**`components/layout/portal-sidebar.tsx`:**
- Current: only `commercialPlanTier === "free"` vs `"paid"` split
- New: three-tier logic using `currentPlanKey` prop (already available)
  - `isScale = currentPlanKey === "scale"`
  - `isGrowthOrAbove = currentPlanKey === "growth" || currentPlanKey === "scale"`
  - Phase 3 nav items (those with `phase === "PHASE_3"` in System B): locked when `!isScale`
  - Phase 2 nav items: locked when `!isGrowthOrAbove` (existing behaviour, unchanged)
  - Separator labels: "Growth features" (for Essential) and "Scale features" (for Essential + Growth)
  - Growth users see Phase 2 available, Phase 3 locked with "Scale" badge
- The `phaseSnapshot.featureMap[featureKey].status` comparison already handles this — if PHASE_3 is returned as `"locked"` for Growth users, the existing `PhaseLockedMenuItem` component will show the lock UI

**`tests/entitlements.test.mts`:**
- Add test: `multi_branch is PHASE_3 in System B registry`
- Add test: `System B: Scale nav features are PHASE_3`

**`tests/upgrade-ux.test.mts`:**
- Add test: three-tier sidebar — Phase 3 items locked for Essential and Growth
- Add test: three-tier sidebar — Phase 3 items available for Scale

**Database changes:** None.

**Security requirements:** Display change only — no security impact.

**Acceptance criteria:**
- [ ] Essential user: Phase 3 nav items show as locked with "Scale Plan required"
- [ ] Growth user: Phase 2 nav items available; Phase 3 locked with "Scale Plan required"  
- [ ] Scale user: all phases available
- [ ] Clicking locked Phase 3 item opens upgrade modal with correct plan info
- [ ] Upgrade modal for Phase 3 says "Scale Plan required" not "Growth Plan required"
- [ ] Existing Phase 2 locking behaviour unchanged for Essential users
- [ ] `npx tsc --noEmit` 0 errors
- [ ] All tests pass
- [ ] Build succeeds

**Regression tests:**
- Phase 1 items remain unlocked for all plans
- Phase 2 items remain locked for Essential (unchanged)
- Phase 2 items remain unlocked for Growth (unchanged)
- Existing upgrade modal content unchanged

---

### P3-A-02 — Multi-Branch Entitlement Gate + Middleware + Nav

**Developer:** Astha  
**Priority:** P0  
**Feature:** Multi-Branch Management (`multi_branch`)  
**Complexity:** Low  
**Depends on:** P3-A-01 (nav item needs PHASE_3 in System B)

**Objective:** Gate `createBranchAction` behind `multi_branch` entitlement. Add middleware guard. Add nav item.

**Files to change:**

**`app/actions/settings-actions.ts`:**
- Add `import { hasCurrentFeature } from "@/lib/entitlements/server";`
- At top of `createBranchAction`, after role check: `if (!(await hasCurrentFeature("multi_branch"))) return { error: "Multi-branch management requires the Scale plan." };`
- `updateBranchAction` and `deleteBranchAction` remain ungated (all plans can manage their existing branch)

**`middleware.ts`:**
- Add to `FEATURE_ROUTE_PREFIXES`:
  ```ts
  { prefix: "/admin/branches", feature: "multi_branch" },
  { prefix: "/api/branches",   feature: "multi_branch" },
  ```

**`lib/nav/admin-nav.ts`:**
- Add `import { Building2 } from "lucide-react";`
- Add after Members: `{ label: "Branches", href: "/admin/branches", icon: Building2, featureKey: "multi_branch" }`

**`lib/nav/index.ts`:**
- Add `"Branches"` to `adminNavLabelsByRole.owner` (after "Members")
- Add `"Branches"` to `adminNavLabelsByRole.admin` (after "Members")
- Do NOT add to manager — managers cannot create/edit branches

**Database changes:** None.

**Talwalkar Safety:** `standard` → plan_1 → `multi_branch` denied. Talwalkar's existing single branch is untouched. The gate only fires when creating a NEW branch.

**Acceptance criteria:**
- [ ] Essential tenant `createBranchAction` → `{ error: "Multi-branch management requires the Scale plan." }`
- [ ] Growth tenant `createBranchAction` → same error
- [ ] Scale tenant `createBranchAction` → succeeds
- [ ] GET `/admin/branches` by Essential → redirect to `/admin/upgrade?feature=Multi-branch+management`
- [ ] GET `/admin/branches` by Growth → redirect to `/admin/upgrade?feature=Multi-branch+management`
- [ ] GET `/admin/branches` by Scale → allowed
- [ ] `/admin/settings?tab=application` branch list still loads for all plans (not blocked)
- [ ] `updateBranchAction` remains available to all plans
- [ ] `deleteBranchAction` remains available to all plans

**Unit tests:**
```
multi_branch createBranchAction: Essential denied
multi_branch createBranchAction: Growth denied
multi_branch createBranchAction: Scale allowed
middleware /admin/branches: plan_1 → upgrade redirect
middleware /admin/branches: plan_2 → upgrade redirect  
middleware /admin/branches: plan_3 → allowed
```

---

### P3-A-03 — Enterprise Audit Log Backend

**Developer:** Astha  
**Priority:** P0  
**Feature:** Enterprise Audit Logs (`enterprise_rbac`)  
**Complexity:** Low  
**Depends on:** P3-A-02 (middleware pattern established)

**Objective:** Add middleware guard and server action for tenant-admin audit log viewer.

**Files to change:**

**`middleware.ts`:**
- Add `{ prefix: "/admin/audit-logs", feature: "enterprise_rbac" }` to `FEATURE_ROUTE_PREFIXES`

**`app/actions/audit-log-actions.ts`** (NEW file):
```typescript
"use server";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  created_at: string;
  user_id: string | null;
  branch_id: string | null;
};

export type AuditLogParams = {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  action?: string;
  entityType?: string;
};

export async function getAuditLogsAction(params: AuditLogParams = {}): Promise<{
  data: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}> {
  const profile = await requireUser(["owner", "admin"]);
  if (!profile.tenant_id) return { data: [], total: 0, page: 1, pageSize: 50, error: "No organization linked." };
  if (!(await hasCurrentFeature("enterprise_rbac"))) {
    return { data: [], total: 0, page: 1, pageSize: 50, error: "Enterprise audit logs require the Scale plan." };
  }

  const { page = 1, pageSize = 50, from, to, action, entityType } = params;
  const admin = createAdminClient();
  const from_idx = (page - 1) * pageSize;

  // Get branch_ids for this tenant to scope the query
  const { data: branches } = await admin
    .from("branches")
    .select("id")
    .eq("tenant_id", profile.tenant_id);
  const branchIds = (branches ?? []).map((b) => b.id);

  let query = admin
    .from("activity_logs")
    .select("id,action,entity_type,entity_id,description,created_at,user_id,branch_id", { count: "exact" })
    .in("branch_id", branchIds.length > 0 ? branchIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .range(from_idx, from_idx + pageSize - 1);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (action) query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);

  const { data, count, error } = await query;
  if (error) return { data: [], total: 0, page, pageSize, error: error.message };
  return { data: (data ?? []) as AuditLogRow[], total: count ?? 0, page, pageSize };
}
```

**Note on RLS:** The existing `activity_logs` read policy scopes by `branch_id`. We use `createAdminClient()` (service role) and manually enforce tenant isolation by querying `branches` for the tenant's branch IDs first. This is safe because `getAuditLogsAction` is protected by both `hasCurrentFeature("enterprise_rbac")` and `requireUser(["owner", "admin"])`.

**Database changes:** None for P0.

**Acceptance criteria:**
- [ ] Essential → denied (returns error)
- [ ] Growth → denied (returns error)
- [ ] Scale manager → denied (`requireUser(["owner", "admin"])`)
- [ ] Scale owner/admin → returns only that tenant's activity logs
- [ ] Tenant A logs not visible to Tenant B owner

---

### P3-A-04 — Revenue Intelligence Backend

**Developer:** Astha  
**Priority:** P1  
**Feature:** Revenue Intelligence (`revenue_intelligence`)  
**Complexity:** Medium  
**Depends on:** P3-A-02

**Objective:** Add Scale-exclusive revenue intelligence server function.

**Files to change:**

**`services/report.service.ts`:**
Add `getRevenueIntelligence(params: { branchId?: string | null; tenantId?: string | null })`:
- Computes using existing `payments`, `members`, `subscriptions` tables
- Returns: `{ monthlyTrend: MoMEntry[], forecast: ForecastEntry[], collectionEfficiency: number, revenuePerMember: number }`
- MoM trend: group completed payments by month, last 6 months
- 3-month forecast: linear regression on last 6 months
- Collection efficiency: `sum(payments.amount where status=completed) / sum(invoices.total_amount)`
- Revenue per member: `total_revenue / active_member_count`

**`app/actions/report-actions.ts`** (NEW or extend existing):
```typescript
export async function getRevenueIntelligenceAction(params: {...}) {
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (!(await hasCurrentFeature("revenue_intelligence"))) {
    return { error: "Revenue Intelligence requires the Scale plan.", data: null };
  }
  // call getRevenueIntelligence(...)
}
```

**Database changes:** None.

**Talwalkar Safety:** No Talwalkar data modification. Talwalkar is plan_1 — blocked.

**Acceptance criteria:**
- [ ] Essential/Growth → action returns error
- [ ] Scale → returns real computed data (no mock/static)
- [ ] Revenue data scoped to `branchId`/`tenantId`

---

### P3-A-05 — Advanced CRM Analytics Backend

**Developer:** Astha  
**Priority:** P1  
**Feature:** Advanced CRM Analytics (`advanced_crm`)  
**Complexity:** Medium  
**Depends on:** P3-A-02

**Objective:** Add Scale-exclusive CRM analytics server function.

**Files to change:**

**`services/lead.service.ts`:**
Add `getAdvancedCrmAnalytics(branchId: string | null, tenantId: string | null)`:
- Returns: `{ conversionRateByStage, avgDaysToConvert, pipelineVelocity }`
- Uses existing `leads`, `members`, `subscriptions` tables

**`app/actions/lead-actions.ts`:**
Add `getAdvancedCrmAction(params)` with `hasCurrentFeature("advanced_crm")` guard.

**Database changes:** None.

**Acceptance criteria:**
- [ ] Essential/Growth → action returns error
- [ ] Scale → returns real analytics data
- [ ] Data scoped to tenant/branch

---

## G. Dev B — Shraddha Task List

---

### P3-B-01 — Branch Management UI

**Developer:** Shraddha  
**Priority:** P0  
**Feature:** Multi-Branch Management (`multi_branch`)  
**Complexity:** Medium-High  
**Depends on:** P3-A-01 (sidebar shows Branches nav item as Phase 3), P3-A-02 (middleware guard, nav item added)

**Objective:** Build `/admin/branches` page using the already-implemented server actions.

**Existing server actions (already implemented in `app/actions/settings-actions.ts`):**
- `createBranchAction` — creates branch + finance_settings
- `updateBranchAction` — updates branch details
- `deleteBranchAction` — soft-deletes (sets status=inactive)

**Files to create:**

**`services/branch.service.ts`** (NEW):
```typescript
// getBranches(tenantId: string) → Branch[] with member/staff counts
// getBranchById(branchId: string, tenantId: string) → Branch | null
// getBranchStats(branchId: string) → { memberCount, staffCount, machineCount }
```

**`app/(admin)/admin/branches/page.tsx`** (NEW — server component):
- `requirePortalContext(["owner", "admin", "manager"])`
- List all active branches for `profile.tenant_id`
- Create branch form (owner/admin only)
- "Add Branch" button opens inline form or modal
- Table: Name, Code, City, Members, Staff, Status, Actions (Edit, Deactivate)
- Deactivate calls `deleteBranchAction` — disables button if only 1 active branch

**`app/(admin)/admin/branches/[id]/page.tsx`** (NEW — server component):
- Branch detail: name, code, contact info
- Member count (active)
- Staff list (name, role, status)
- Machine count
- "Back to Branches" link
- Edit form for owner/admin

**Design guidance:**
- Reuse existing card/table patterns from `app/(admin)/admin/staff/page.tsx` or `app/(admin)/admin/members/page.tsx`
- Use `Card`, `CardHeader`, `CardContent`, `Badge`, `Button` from `@/components/ui`
- Match existing admin page layout patterns

**Database changes:** None.

**Talwalkar Safety:** `getBranches(profile.tenant_id)` is scoped by tenant — Talwalkar cannot see other tenants.

**Acceptance criteria:**
- [ ] Branch list shows only current tenant's branches
- [ ] Create form creates branch + finance_settings (via existing action, now gated)
- [ ] Edit form updates branch details
- [ ] Deactivate button soft-deletes the branch
- [ ] Cannot deactivate the last active branch (existing action prevents this)
- [ ] Manager can VIEW branches but cannot create/delete (form hidden, actions require owner/admin)
- [ ] Branch detail shows real member and staff counts
- [ ] Branches nav item in sidebar shows locked upgrade modal for Essential/Growth
- [ ] Responsive/mobile layout
- [ ] `npx tsc --noEmit` 0 errors

**Unit tests:**
```
getBranches returns only branches for correct tenant
getBranchStats returns accurate member/staff counts
getBranches does not return other tenants' branches
getBranchById validates branch belongs to tenant
```

**UI tests:**
```
Branch list renders correctly for Scale tenant
Create branch form validates code format
Deactivation button disabled for last active branch
Branch detail shows correct counts
```

**Regression tests:**
- Settings page Application tab still loads for all plans
- Branch listing in Settings still works
- Single-branch Essential/Growth tenants unaffected

---

### P3-B-02 — Enterprise Audit Log UI

**Developer:** Shraddha  
**Priority:** P0  
**Feature:** Enterprise Audit Logs (`enterprise_rbac`)  
**Complexity:** Medium  
**Depends on:** P3-A-03 (backend action + middleware guard)

**Objective:** Build `/admin/audit-logs` page that shows real `activity_logs` data.

**Existing reference:** `app/(superadmin)/superadmin/audit-logs/` — look at this for UI pattern reference.

**Files to create:**

**`app/(admin)/admin/audit-logs/page.tsx`** (NEW — server component):
- `requirePortalContext(["owner", "admin"])` — managers/reception/trainers cannot access
- Calls `getAuditLogsAction` from P3-A-03
- Filter bar: Date from/to (date inputs), Action type (select), Entity type (select)
- Table: Timestamp, Action, Entity Type, Entity ID, Description
- Pagination (50 rows/page)
- Read-only — no mutation controls

**`app/(admin)/admin/audit-logs/audit-log-client.tsx`** (NEW — client component for filter/pagination state)

**Design guidance:**
- Use existing table patterns
- Match the superadmin audit log page layout
- Show "No logs found" empty state

**Database changes:** None.

**Acceptance criteria:**
- [ ] Real data from `activity_logs` is displayed
- [ ] Only current tenant's logs are shown (enforced in action)
- [ ] Filters work (date range, action type, entity type)
- [ ] Pagination works correctly
- [ ] Essential/Growth users are redirected to upgrade page (handled by middleware)
- [ ] Scale manager attempting direct access → redirected (middleware requires Scale, action requires owner/admin)
- [ ] Responsive/mobile layout

**Regression tests:**
- SuperAdmin `/superadmin/audit-logs` page completely unaffected
- All existing admin pages load correctly

---

### P3-B-03 — Revenue Intelligence UI

**Developer:** Shraddha  
**Priority:** P1  
**Feature:** Revenue Intelligence (`revenue_intelligence`)  
**Complexity:** Medium  
**Depends on:** P3-A-04 (backend function + action)

**Objective:** Add Scale-exclusive intelligence sections to the existing `/admin/reports/revenue` page.

**Existing file:** `app/(admin)/admin/reports/revenue/page.tsx` — already has `assertCurrentFeature("advanced_reports")` (phase_2 guard).

**Files to change:**

**`app/(admin)/admin/reports/revenue/page.tsx`:**
- Below the existing revenue summary, add Scale-gated sections
- For Scale users: call `getRevenueIntelligenceAction` and render charts/metrics
- For Growth users: render locked section with lock icon and upgrade CTA
  ```tsx
  {currentPlanKey !== "scale" ? (
    <Card className="border-dashed">
      <CardContent>
        <Lock /> Revenue Intelligence — Scale Plan required
        <Button onClick={() => openUpgradeModal("revenue_intelligence")}>Upgrade to Scale</Button>
      </CardContent>
    </Card>
  ) : (
    // real intelligence sections
  )}
  ```

**Scale sections to build:**
1. Month-over-month revenue trend (bar chart using existing chart components)
2. 3-month forecast (simple line projection)
3. Collection efficiency rate (percentage card)
4. Revenue per active member (metric card)

**Acceptance criteria:**
- [ ] Growth users see the basic revenue report unchanged (no regression)
- [ ] Growth users see locked Scale sections with upgrade CTA
- [ ] Scale users see all sections with real computed data (not static/mock)
- [ ] Clicking upgrade CTA opens scale upgrade modal
- [ ] Responsive layout

**Regression tests:**
- Existing revenue summary still loads for Growth users
- `assertCurrentFeature("advanced_reports")` still in place (not removed)

---

### P3-B-04 — Advanced CRM Analytics UI

**Developer:** Shraddha  
**Priority:** P1  
**Feature:** Advanced CRM Analytics (`advanced_crm`)  
**Complexity:** Medium  
**Depends on:** P3-A-05 (backend function + action)

**Objective:** Add Scale-exclusive analytics to the existing `/admin/leads` page.

**Existing file:** `app/(admin)/admin/leads/page.tsx`

**Files to change:**

**`app/(admin)/admin/leads/page.tsx`:**
- Add analytics tab or collapsible section after the leads pipeline
- For Scale users: render conversion funnel, avg days, pipeline velocity from `getAdvancedCrmAction`
- For Growth users: render locked section with upgrade CTA

**Scale sections to build:**
1. Conversion funnel: leads by stage → how many converted to members
2. Average days to convert (from lead creation to subscription)
3. Stage velocity: average days leads spend in each stage

**Acceptance criteria:**
- [ ] Growth users see leads pipeline unchanged
- [ ] Growth users see locked analytics section with Scale upgrade CTA
- [ ] Scale users see analytics with real data
- [ ] Clicking locked section opens upgrade modal

---

## H. Shared File / Conflict Risk

| File | Primary Owner | Reviewer | When | Conflict Prevention |
|---|---|---|---|---|
| `lib/phases/registry.ts` | **Astha** | Shraddha | P3-A-01 (first) | Astha merges before Shraddha starts any task |
| `components/layout/portal-sidebar.tsx` | **Astha** | Shraddha | P3-A-01 | Astha merges before P3-B-01 |
| `middleware.ts` | **Astha** | Shraddha | P3-A-02 | Astha merges before any UI task |
| `lib/nav/admin-nav.ts` | **Astha** | Shraddha | P3-A-02 | Astha adds item; Shraddha does not touch |
| `lib/nav/index.ts` | **Astha** | Shraddha | P3-A-02 | Astha updates role labels; Shraddha does not touch |
| `app/actions/settings-actions.ts` | **Astha** | Shraddha | P3-A-02 | Astha adds guard; Shraddha only calls action from UI |
| `services/report.service.ts` | **Astha** | Shraddha | P3-A-04 | Astha adds functions; Shraddha calls them |
| `app/actions/lead-actions.ts` | **Astha** | Shraddha | P3-A-05 | Astha adds action; Shraddha calls it |
| `tests/entitlements.test.mts` | **Astha** | Shraddha | P3-A-01 | Astha owns all entitlement tests |
| `tests/upgrade-ux.test.mts` | **Astha** | Shraddha | P3-A-01 | Astha owns all plan/upgrade tests |
| `app/(admin)/admin/reports/revenue/page.tsx` | **Shraddha** | Astha | P3-B-03 | Shraddha modifies; Astha provides server function first |
| `app/(admin)/admin/leads/page.tsx` | **Shraddha** | Astha | P3-B-04 | Shraddha modifies; Astha provides action first |

**Rule:** Astha's P0 tasks (P3-A-01, P3-A-02) must be committed before Shraddha starts P3-B-01. P1 tasks can run in parallel since they touch different files.

---

## I. Database Migration Plan

### Current migration ledger (latest: `0044_machine_rls_tenant_scope.sql`)

No migrations skip 0045. Next available: `0045`.

### Migrations required for P0/P1: NONE

All P0/P1 features use existing tables:
- `branches` — exists with `tenant_id`, correct schema
- `activity_logs` — exists, correct schema  
- `leads` — exists (phase_2)
- `payments`, `members`, `subscriptions` — exist

### Migration 0045 — RESERVED (not needed for P0/P1)

Reserved for System B PHASE_3 DB extension if needed in future. The `system_phases` table has constraints `check (phase_key ~ '^PHASE_[1-2]$')` and `check (phase_number between 1 and 2)` that would need relaxing. Since we use `currentPlanKey` for Phase 3 sidebar locking (code-only change), this migration is deferred.

### Migration 0046 — P2 optimization (after P0/P1 ship)

Performance index for audit log queries:
```sql
create index if not exists activity_logs_tenant_created_idx
  on public.activity_logs (branch_id, created_at desc);
```

### Migration 0047 — P2 (member transfers, after multi-branch ships)

```sql
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
-- Plus RLS, indexes
```

---

## J. Phase 3 Test Matrix

### Plan-Level Entitlement

| Feature | Essential | Growth | Scale |
|---|---|---|---|
| `multi_branch` | ❌ LOCKED | ❌ LOCKED | ✅ AVAILABLE |
| `enterprise_rbac` | ❌ LOCKED | ❌ LOCKED | ✅ AVAILABLE |
| `revenue_intelligence` | ❌ LOCKED | ❌ LOCKED | ✅ AVAILABLE |
| `advanced_crm` | ❌ LOCKED | ❌ LOCKED | ✅ AVAILABLE |
| `advanced_automation` | ❌ LOCKED | ❌ LOCKED | ⚠️ P2 — not yet implemented |
| `retention_intelligence` | ❌ LOCKED | ❌ LOCKED | ⚠️ P2 — not yet implemented |
| `ai_insights` | ❌ LOCKED | ❌ LOCKED | ⚠️ P2 — not yet implemented |
| `api_webhooks` | ❌ LOCKED | ❌ LOCKED | ⚠️ P2 — not yet implemented |

### Legacy Alias Verification

| Stored value | Normalized | multi_branch allowed? |
|---|---|---|
| `trial` | plan_1 | ❌ No |
| `standard` (Talwalkar) | plan_1 | ❌ No |
| `professional` | plan_2 | ❌ No |
| `enterprise` | plan_3 | ✅ Yes |

### Role Permissions

| Action | Owner | Admin | Manager | Reception | Trainer |
|---|---|---|---|---|---|
| Create branch | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit branch | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deactivate branch | ✅ | ✅ | ❌ | ❌ | ❌ |
| View branch list | ✅ | ✅ | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Revenue intelligence | ✅ | ✅ | ✅ | ❌ | ❌ |
| Advanced CRM analytics | ✅ | ✅ | ✅ | ❌ | ❌ |

### Security Tests

```
// Tenant isolation
getBranches(tenantA) must NOT return tenantB branches
getAuditLogs as tenantA owner returns ONLY tenantA logs
getRevenueIntelligence(tenantA) uses ONLY tenantA payments

// Entitlement bypass attempts
POST createBranchAction as Growth → denied at action level
GET /admin/branches as Essential → middleware redirect to /admin/upgrade
GET /admin/audit-logs as Growth → middleware redirect to /admin/upgrade
Direct call to getAuditLogsAction as Scale manager → denied (role check)

// Branch isolation
getBranchStats(branchId) validates branch.tenant_id = requesting user's tenant_id
```

### Regression Tests

```
// Phase 1 unchanged
Essential: /admin/members → loads correctly
Essential: /admin/attendance → loads correctly
Essential: /admin/payments → loads correctly
Essential: /admin/reports → loads correctly

// Phase 2 unchanged  
Growth: /admin/finance → loads correctly
Growth: /admin/leads → loads correctly (without Scale analytics section)
Growth: /admin/trainers → loads correctly
Growth: /admin/reports/revenue → loads basic report (without intelligence sections)

// Existing upgrade flow
Essential clicking Finance → upgrade modal "Growth Plan required"
Growth clicking Branches → upgrade modal "Scale Plan required"
Essential clicking Branches → upgrade modal "Scale Plan required"
```

---

## K. Talwalkar Safety Plan

| Task | Impact on Talwalkar | Verification |
|---|---|---|
| P3-A-01 Sidebar | None — display only | `standard` → plan_1 → no Phase 3 nav items |
| P3-A-02 Branch gate | None — blocks NEW branch creation | Talwalkar's existing branch untouched |
| P3-A-03 Audit log backend | None — plan_1 blocked | `evaluateFeature(standard, enterprise_rbac)` = false |
| P3-A-04 Revenue intelligence | None — plan_1 blocked | `evaluateFeature(standard, revenue_intelligence)` = false |
| P3-A-05 Advanced CRM | None — plan_1 blocked | `evaluateFeature(standard, advanced_crm)` = false |
| P3-B-01 Branch UI | None — Talwalkar never reaches /admin/branches | Middleware blocks plan_1 |
| P3-B-02 Audit log UI | None | Middleware blocks plan_1 |
| P3-B-03 Revenue UI | None | Feature check blocks plan_1 |
| P3-B-04 CRM UI | None | Feature check blocks plan_1 |
| All migrations | None | No migrations modify existing data |

**Explicit confirmation:** No task in this plan modifies Talwalkar tenant records, branches, members, staff, attendance, payments, memberships, biometric records, or machines.

---

## L. Definition of Done

A Phase 3 feature is **COMPLETE** only when ALL of the following are true:

- [ ] Real functionality implemented (no mock, no static, no placeholder)
- [ ] Correct PHASE_3 classification in System A (`lib/entitlements/registry.ts`)
- [ ] Essential tenant blocked at server action level
- [ ] Growth tenant blocked at server action level
- [ ] Scale tenant allowed at server action level
- [ ] Middleware guard present for page and API routes
- [ ] Server action guard present (`hasCurrentFeature` or `assertCurrentFeature`)
- [ ] RLS verified (service-role queries enforce `tenant_id` manually)
- [ ] Tenant isolation verified in all queries
- [ ] Branch isolation verified where applicable
- [ ] Role permissions enforced (wrong role denied)
- [ ] Upgrade UX works: locked feature opens modal with correct plan label
- [ ] No fake/mock/demo functionality
- [ ] Mobile/responsive layout verified
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npx next lint` — 0 errors
- [ ] `npx next build` — all pages build successfully
- [ ] Documentation updated
- [ ] Talwalkar unchanged

---

## M. Scale Commercial Launch Checklist

| Requirement | Status |
|---|---|
| System A entitlement evaluator correct for phase_3 | ✅ READY |
| All 8 phase_3 keys in registry | ✅ READY |
| `storedPlanForProduct("plan_3")` = `"enterprise"` | ✅ READY |
| Legacy alias `enterprise` → plan_3 | ✅ READY |
| SuperAdmin 3-option plan selector (Essential/Growth/Scale) | ✅ READY |
| Upgrade UX opens syncfyre.com/#pricing | ✅ READY |
| Plan comparison table shows Scale features | ✅ READY |
| All 8 phase_3 keys tested by name in entitlements.test.mts | ✅ READY |
| **Sidebar three-tier support (Essential/Growth/Scale)** | ❌ NOT READY |
| **System B `multi_branch` correctly classified as PHASE_3** | ❌ NOT READY |
| **`createBranchAction` gated on `multi_branch` entitlement** | ❌ NOT READY |
| **Middleware guard for `/admin/branches`** | ❌ NOT READY |
| **`/admin/branches` page (list, create, edit, deactivate)** | ❌ NOT READY |
| **Middleware guard for `/admin/audit-logs`** | ❌ NOT READY |
| **`/admin/audit-logs` page with real `activity_logs` data** | ❌ NOT READY |
| Revenue intelligence backend functions | ❌ NOT READY |
| Revenue intelligence UI sections on `/admin/reports/revenue` | ❌ NOT READY |
| Advanced CRM analytics backend functions | ❌ NOT READY |
| Advanced CRM analytics UI sections on `/admin/leads` | ❌ NOT READY |
| All P0 tests passing | ⚠️ PARTIAL |
| Talwalkar unchanged | ✅ READY |

### FINAL VERDICT

```
SCALE: NOT READY FOR COMMERCIAL ACTIVATION

P0 Blockers:
1. Sidebar shows Growth and Scale identically (no three-tier support)
2. System B multi_branch misclassified as PHASE_2 → /superadmin/tenants
3. createBranchAction has no multi_branch gate — any plan can create branches today
4. No /admin/branches route or middleware guard
5. No /admin/branches UI
6. No /admin/audit-logs page (enterprise_rbac feature unimplemented)

Scale can only be commercially activated after all P0 items pass their acceptance criteria.
P1 features (revenue_intelligence, advanced_crm) add commercial value but do not block launch.
P2 features are roadmap only — do NOT advertise as current Scale capabilities.
```

---

## N. P2 Roadmap (Do NOT implement in this sprint)

| Feature | Key | Blocker | Est. Complexity |
|---|---|---|---|
| Custom role creation + permission matrix | `enterprise_rbac` full | New DB schema, role engine | Very High |
| Automation engine (trigger→action) | `advanced_automation` | Queue infra, new tables | Very High |
| Churn scoring / retention dashboard | `retention_intelligence` | Scoring engine, new tables | High |
| AI Business Intelligence | `ai_insights` | LLM vendor selection | High + External |
| Public API + Webhooks | `api_webhooks` | API key mgmt, delivery queue | High |
| Cross-branch member transfer | sub-feature of `multi_branch` | `member_transfers` table (migration 0047) | Medium |

---

*Document created: September 2026*  
*Status: Executing tasks P3-A-01 through P3-B-04 in the specified order.*
