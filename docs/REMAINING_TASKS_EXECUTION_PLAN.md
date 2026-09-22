# SyncFyre — Remaining Tasks Execution Plan
**Document Owner:** Intern Team  
**Last Updated:** September 2026  
**Source:** SYNCFYRE FINAL INTERN PRODUCT, PRICING & WEBSITE HANDOFF  
**Scope:** Phase 2 remaining gaps + all Phase 3 remaining tasks  

> **Ground rule:** Complete each task fully (code + test + build passing) before moving to the next.  
> Do NOT skip ahead. Each task either unblocks the next or is independent.

---

## HOW TO USE THIS DOCUMENT

1. Pick the next unchecked task in order.
2. Read the **What to build**, **Files to touch**, and **Done when** sections.
3. Implement, verify (`npx tsc --noEmit` + build + tests pass).
4. Check the box `[x]`.
5. Move to the next task.

---

## PHASE 2 — Remaining Gaps

Phase 2 is mostly complete. Two gaps remain before Growth plan can be sold confidently.

---

### P2-R1 — WhatsApp Frontend (Send UI + Template Management + History)

- **Priority:** HIGH — Growth plan's #1 visible feature gap  
- **Status:** Backend wired, frontend missing  
- **Depends on:** Nothing (backend already exists)

#### What to build

1. **Template Management Screen** — `/admin/settings?tab=whatsapp` or `/admin/whatsapp/templates`
   - List existing templates (from `communication_templates` table)
   - Create / edit / delete templates
   - Fields: template key, channel (whatsapp/sms/email), name, content, active toggle
   - Use existing `saveCommunicationTemplateAction` and `deleteCommunicationTemplateAction` (already in `customization-actions.ts`)

2. **WhatsApp Send UI** — Quick-send button on:
   - Member detail page (`/admin/members/[id]`) — "Send WhatsApp" button
   - Leads page (`/admin/leads`) — already has WhatsApp URL builder; add send confirmation UI
   - Pending payments page (`/admin/payments/pending`) — "Send reminder" button
   - Expiry list — "Send renewal reminder" button
   - Each button opens a modal: select template → preview message → confirm send

3. **Communication History Page** — `/admin/communications` or tab on member detail
   - List sent messages from `communication_logs` table (if exists) or `notification_logs`
   - Columns: date, recipient (member name), channel, template used, status
   - Filter by date range, channel, status

#### Files to touch
```
app/(admin)/admin/whatsapp/templates/page.tsx        — NEW
app/(admin)/admin/communications/page.tsx            — NEW (or add tab to member detail)
components/whatsapp/send-whatsapp-modal.tsx          — NEW
components/whatsapp/template-list.tsx                — NEW
app/actions/whatsapp-actions.ts                      — NEW (sendWhatsAppAction)
```

#### Content rules from handoff doc
- Do NOT claim WhatsApp delivery until provider delivery is confirmed
- Show delivery status as "Sent" not "Delivered" unless webhook confirms delivery
- Keep WhatsApp Business API as "where configured" — do not claim it works without setup

#### Done when
- [ ] Templates can be created, edited, deleted via UI
- [ ] Send button appears on member/lead/payment/expiry screens
- [ ] Send modal shows template preview before confirming
- [ ] Communication history page shows sent messages
- [ ] `npx tsc --noEmit` passes
- [ ] Feature is gated behind `hasCurrentFeature("whatsapp")` — Essential plan users see locked state

---

### P2-R2 — Sales Targets UI (CRM)

- **Priority:** MEDIUM — Sales Executive role needs this  
- **Status:** Not built  
- **Depends on:** Nothing

#### What to build

1. **Sales Targets Page** — `/admin/crm/targets` or section on `/admin/leads`
   - Set monthly targets per salesperson (staff member with Sales Executive role)
   - Fields: staff member, month, target (number of conversions or revenue amount)
   - Progress bar: actual conversions vs target this month
   - Uses existing `leads` and `members` tables — no new DB tables needed

2. **Target summary on CRM dashboard** — small card showing team target vs actual

#### Files to touch
```
app/(admin)/admin/leads/page.tsx                     — ADD targets section/tab
app/(admin)/admin/crm/targets/page.tsx               — NEW (optional separate page)
app/actions/lead-actions.ts                          — ADD setSalesTargetAction, getSalesTargetsAction
services/lead.service.ts                             — ADD getSalesTargets, setSalesTarget
supabase/migrations/XXXX_sales_targets.sql           — NEW (sales_targets table)
```

#### DB schema (new table)
```sql
create table sales_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  branch_id uuid references branches(id),
  staff_id uuid references staff(id),
  target_month date,              -- first day of month e.g. 2026-09-01
  target_conversions int,         -- target number of leads to convert
  target_revenue numeric,         -- optional revenue target
  created_at timestamptz default now()
);
```

#### Done when
- [ ] Targets can be set per salesperson per month
- [ ] Progress (actual vs target) shows on CRM page
- [ ] Gated behind `hasCurrentFeature("crm")`
- [ ] `npx tsc --noEmit` passes

---

## PHASE 3 — Remaining Tasks

Execute these in order. Tasks marked **BLOCKS NEXT** must be fully done before proceeding.

---

### P3-01 — System B Phase 3 Foundation + Sidebar Three-Tier ⚠️ BLOCKS ALL PHASE 3

- **Priority:** CRITICAL — nothing else in Phase 3 works without this  
- **Status:** Not done  
- **Depends on:** Nothing — do this first

#### What to build

**`lib/phases/registry.ts`:**
- Add `"PHASE_3"` to `SYSTEM_PHASE_KEYS`
- Add `PHASE_3: "Phase 3"` to `SYSTEM_PHASE_NAMES`
- Add `PHASE_3: 3` to `SYSTEM_PHASE_NUMBERS`
- Change `multi_branch` → `phase: "PHASE_3"`, `pathnames: ["/admin/branches"]`
- Add `audit_logs`, `revenue_intelligence`, `retention_intelligence`, `advanced_crm` as `PHASE_3`

**`services/phase.service.ts`:**
- `defaultPhaseRecords()` must include PHASE_3 with `status: "locked"` as default
- All type references need updating to include PHASE_3

**`components/layout/portal-sidebar.tsx`:**
- Replace binary `free/paid` with three-tier logic:
  - `isScale = currentPlanKey === "scale"` (plan_3)
  - `isGrowthOrAbove = ["growth", "scale"].includes(currentPlanKey)`
  - Phase 3 nav items: locked with "Scale Plan required" badge when `!isScale`
  - Phase 2 nav items: unchanged (locked for Essential only)
  - Add separator label "Scale features" for Essential + Growth users

#### Files to touch
```
lib/phases/registry.ts
services/phase.service.ts
components/layout/portal-sidebar.tsx
tests/entitlements.test.mts                          — ADD PHASE_3 tests
```

#### Done when
- [ ] Essential user: Phase 3 nav items locked with "Scale Plan required"
- [ ] Growth user: Phase 2 available, Phase 3 locked
- [ ] Scale user: all phases available
- [ ] Upgrade modal says "Scale Plan required" for Phase 3 items
- [ ] Existing Phase 2 locking for Essential unchanged
- [ ] `npx tsc --noEmit` passes, all tests pass

---

### P3-02 — Multi-Branch Entitlement Gate + Middleware ⚠️ BLOCKS P3-03

- **Priority:** CRITICAL  
- **Status:** Branch actions exist but no entitlement gate  
- **Depends on:** P3-01

#### What to build

**`app/actions/settings-actions.ts`:**
- Add to `createBranchAction` (at top, after role check):
  ```typescript
  if (!(await hasCurrentFeature("multi_branch"))) {
    return { error: "Multi-branch management requires the Scale plan." };
  }
  ```
- `updateBranchAction` and `deleteBranchAction` — NO gate (all plans can manage existing branch)

**`middleware.ts`:**
- Add to `FEATURE_ROUTE_PREFIXES`:
  ```typescript
  { prefix: "/admin/branches", feature: "multi_branch" },
  ```

**`lib/nav/admin-nav.ts`:**
- Add nav item: `{ label: "Branches", href: "/admin/branches", icon: Building2, featureKey: "multi_branch" }`

#### Files to touch
```
app/actions/settings-actions.ts
middleware.ts
lib/nav/admin-nav.ts
lib/nav/index.ts                                     — add "Branches" to owner/admin nav labels
```

#### Done when
- [ ] Essential + Growth: `createBranchAction` returns plan error
- [ ] Scale: `createBranchAction` succeeds
- [ ] GET `/admin/branches` by Essential/Growth → redirects to upgrade page
- [ ] GET `/admin/branches` by Scale → allowed
- [ ] Settings page branch tab still works for all plans (not blocked)
- [ ] `npx tsc --noEmit` passes

---

### P3-03 — Branch Management UI (`/admin/branches`)

- **Priority:** HIGH — Scale's primary commercial differentiator  
- **Status:** Not built  
- **Depends on:** P3-01, P3-02

#### What to build

**`services/branch.service.ts`** (NEW or extend existing):
```typescript
getBranches(tenantId: string): Promise<Branch[]>           // with member + staff counts
getBranchById(branchId: string, tenantId: string)
getBranchStats(branchId: string): { memberCount, staffCount, machineCount }
```

**`app/(admin)/admin/branches/page.tsx`** (NEW — Server Component):
- List all active branches for `profile.tenant_id`
- Table: Name, Code, City, Active Members, Staff, Status, Actions
- "Add Branch" form (owner/admin only) using existing `createBranchAction`
- Deactivate button using existing `deleteBranchAction`
- Disable deactivate if only 1 active branch remains

**`app/(admin)/admin/branches/[id]/page.tsx`** (NEW — Server Component):
- Branch detail: name, code, contact info, GST
- Member count (active), staff list, machine count
- Edit form for owner/admin using existing `updateBranchAction`
- "Back to Branches" link

#### Design guidance
- Reuse card/table patterns from `/admin/staff/page.tsx` or `/admin/members/page.tsx`
- Use `Card`, `CardHeader`, `CardContent`, `Badge`, `Button` from `@/components/ui`
- Mobile-first responsive layout

#### Files to touch
```
services/branch.service.ts                           — NEW / extend
app/(admin)/admin/branches/page.tsx                  — NEW
app/(admin)/admin/branches/[id]/page.tsx             — NEW
```

#### Done when
- [ ] Branch list shows only current tenant's branches
- [ ] Create form works (and is blocked for Essential/Growth by gate in P3-02)
- [ ] Edit form updates branch details
- [ ] Deactivate soft-deletes branch
- [ ] Cannot deactivate last active branch
- [ ] Branch detail shows real member/staff counts
- [ ] Manager can VIEW but not create/delete
- [ ] Responsive layout
- [ ] `npx tsc --noEmit` passes

---

### P3-04 — Enterprise Audit Log Backend

- **Priority:** HIGH  
- **Status:** `activity_logs` table populated but no viewer  
- **Depends on:** P3-01, P3-02 (middleware pattern)

#### What to build

**`middleware.ts`:**
- Add `{ prefix: "/admin/audit-logs", feature: "enterprise_rbac" }`

**`app/actions/audit-log-actions.ts`** (NEW):
```typescript
"use server";
// getAuditLogsAction(params: { page, pageSize, from, to, action, entityType })
// - requireUser(["owner", "admin"])
// - hasCurrentFeature("enterprise_rbac") check
// - scope to tenant's branch IDs
// - return paginated activity_logs rows
```

Key points:
- Use `createAdminClient()` (service role) + manual tenant scoping via branch IDs
- Page size: 50 rows
- Essential/Growth → return error
- Scale manager → denied (owner/admin only)
- Tenant A logs never visible to Tenant B

#### Files to touch
```
middleware.ts                                        — add audit-logs route guard
app/actions/audit-log-actions.ts                    — NEW
```

#### Done when
- [ ] Essential/Growth → action returns plan error
- [ ] Scale + manager role → action denied
- [ ] Scale + owner/admin → returns only that tenant's logs
- [ ] Pagination works (page, pageSize params)
- [ ] Filters work (date range, action type, entity type)
- [ ] Tenant isolation verified
- [ ] `npx tsc --noEmit` passes

---

### P3-05 — Enterprise Audit Log UI (`/admin/audit-logs`)

- **Priority:** HIGH  
- **Status:** Not built  
- **Depends on:** P3-04

#### What to build

**`app/(admin)/admin/audit-logs/page.tsx`** (NEW — Server Component):
- `requireUser(["owner", "admin"])`
- Filter bar: date from/to, action type (select), entity type (select)
- Table: Timestamp, Action, Entity Type, Entity ID, Description, Actor
- Pagination (50 rows/page, prev/next links)
- Read-only — no mutation controls
- Empty state: "No audit logs found for this filter"

**`app/(admin)/admin/audit-logs/audit-log-client.tsx`** (NEW — Client Component):
- Handles filter state and pagination client-side if using URL params, otherwise keep server-side with `searchParams`

#### Reference
- Look at `app/(superadmin)/superadmin/audit-logs/` for UI pattern

#### Files to touch
```
app/(admin)/admin/audit-logs/page.tsx               — NEW
app/(admin)/admin/audit-logs/audit-log-client.tsx   — NEW (optional, if client state needed)
```

#### Done when
- [ ] Real data from `activity_logs` shown
- [ ] Only current tenant's logs visible
- [ ] Date range filter works
- [ ] Action type filter works
- [ ] Pagination works
- [ ] Essential/Growth → redirected to upgrade page (by middleware from P3-04)
- [ ] Scale manager → redirected (action requires owner/admin)
- [ ] Responsive layout
- [ ] SuperAdmin audit log page unaffected
- [ ] `npx tsc --noEmit` passes

---

### P3-06 — Revenue Intelligence Backend

- **Priority:** MEDIUM  
- **Status:** Not built  
- **Depends on:** P3-01, P3-02

#### What to build

**`services/report.service.ts`** — add `getRevenueIntelligence(params)`:
- Returns using existing `payments`, `members`, `subscriptions` tables:
  - `monthlyTrend`: group completed payments by month, last 6 months → `[{ month: "2026-03", revenue: 45000 }, ...]`
  - `forecast`: linear regression on last 6 months → next 3 months projected
  - `collectionEfficiency`: `sum(paid) / sum(total_invoiced)` as percentage
  - `revenuePerMember`: `total_revenue_this_month / active_member_count`

**`app/actions/report-actions.ts`** — add `getRevenueIntelligenceAction(params)`:
```typescript
// requireUser(["owner", "admin", "manager"])
// hasCurrentFeature("revenue_intelligence") check → error if not Scale
// call getRevenueIntelligence(...)
```

#### Files to touch
```
services/report.service.ts                          — ADD getRevenueIntelligence
app/actions/report-actions.ts                       — ADD getRevenueIntelligenceAction
```

#### Done when
- [ ] Essential/Growth → action returns plan error
- [ ] Scale → returns real computed data (no mock/static values)
- [ ] Revenue data scoped to `branchId`
- [ ] `npx tsc --noEmit` passes

---

### P3-07 — Revenue Intelligence UI (on `/admin/reports/revenue`)

- **Priority:** MEDIUM  
- **Status:** Not built  
- **Depends on:** P3-06

#### What to build

**`app/(admin)/admin/reports/revenue/page.tsx`** — EXTEND existing page:

Below the existing revenue summary, add Scale-gated section:

```tsx
{!isScale ? (
  // Locked card with upgrade CTA for Growth users
  <Card className="border-dashed">
    <CardContent>
      <Lock className="size-4" />
      <p>Revenue Intelligence — Scale Plan required</p>
      <Button>Upgrade to Scale</Button>
    </CardContent>
  </Card>
) : (
  // Real Scale intelligence sections
  <>
    <RevenueMonthlyTrendChart data={intelligence.monthlyTrend} />
    <RevenueForecastChart data={intelligence.forecast} />
    <MetricCard label="Collection Efficiency" value={`${intelligence.collectionEfficiency}%`} />
    <MetricCard label="Revenue per Active Member" value={formatCurrency(intelligence.revenuePerMember)} />
  </>
)}
```

#### Files to touch
```
app/(admin)/admin/reports/revenue/page.tsx          — EXTEND (do not break Growth users)
components/reports/revenue-trend-chart.tsx          — NEW (or reuse existing chart components)
components/reports/revenue-forecast-chart.tsx       — NEW
```

#### Done when
- [ ] Growth users: existing revenue report unchanged (no regression)
- [ ] Growth users: see locked Scale section with upgrade CTA
- [ ] Scale users: see all 4 intelligence sections with real data
- [ ] Clicking upgrade CTA opens correct upgrade modal
- [ ] `assertCurrentFeature("advanced_reports")` gate still in place
- [ ] `npx tsc --noEmit` passes

---

### P3-08 — Advanced CRM Analytics Backend

- **Priority:** MEDIUM  
- **Status:** Not built  
- **Depends on:** P3-01, P3-02

#### What to build

**`services/lead.service.ts`** — add `getAdvancedCrmAnalytics(branchId, tenantId)`:
- Returns using existing `leads`, `members`, `subscriptions` tables:
  - `conversionRateByStage`: count of leads per stage → % that became members
  - `avgDaysToConvert`: avg days from lead creation to subscription start_date
  - `pipelineVelocity`: avg days leads spend in each stage before moving

**`app/actions/lead-actions.ts`** — add `getAdvancedCrmAction(params)`:
```typescript
// requireUser(["owner", "admin", "manager"])
// hasCurrentFeature("advanced_crm") check → error if not Scale
// call getAdvancedCrmAnalytics(...)
```

#### Files to touch
```
services/lead.service.ts                            — ADD getAdvancedCrmAnalytics
app/actions/lead-actions.ts                         — ADD getAdvancedCrmAction
```

#### Done when
- [ ] Essential/Growth → action returns plan error
- [ ] Scale → returns real computed data
- [ ] Data scoped to tenant/branch
- [ ] `npx tsc --noEmit` passes

---

### P3-09 — Advanced CRM Analytics UI (on `/admin/leads`)

- **Priority:** MEDIUM  
- **Status:** Not built  
- **Depends on:** P3-08

#### What to build

**`app/(admin)/admin/leads/page.tsx`** — EXTEND existing page:

Add Scale-gated analytics section below the leads pipeline:

```tsx
{!isScale ? (
  <Card className="border-dashed">
    <CardContent>
      <Lock className="size-4" />
      <p>CRM Analytics — Scale Plan required</p>
      <Button>Upgrade to Scale</Button>
    </CardContent>
  </Card>
) : (
  <>
    <ConversionFunnelChart data={analytics.conversionRateByStage} />
    <MetricCard label="Avg Days to Convert" value={`${analytics.avgDaysToConvert} days`} />
    <PipelineVelocityTable data={analytics.pipelineVelocity} />
  </>
)}
```

#### Files to touch
```
app/(admin)/admin/leads/page.tsx                    — EXTEND (do not break Growth users)
components/crm/conversion-funnel-chart.tsx          — NEW
components/crm/pipeline-velocity-table.tsx          — NEW
```

#### Done when
- [ ] Growth users: existing leads pipeline unchanged (no regression)
- [ ] Growth users: see locked analytics section with Scale upgrade CTA
- [ ] Scale users: see conversion funnel, avg days, and pipeline velocity with real data
- [ ] `npx tsc --noEmit` passes

---

### P3-10 — Member Transfer Between Branches

- **Priority:** MEDIUM  
- **Status:** Not built (multi-branch UI exists after P3-03, but transfer is separate)  
- **Depends on:** P3-03

#### What to build

**DB migration** — `XXXX_member_transfer_log.sql`:
```sql
create table member_transfer_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  member_id uuid references members(id),
  from_branch_id uuid references branches(id),
  to_branch_id uuid references branches(id),
  transferred_by uuid references users(id),
  reason text,
  transferred_at timestamptz default now()
);
```

**`app/actions/member-management-actions.ts`** — add `transferMemberAction`:
```typescript
// requireUser(["owner", "admin"])
// hasCurrentFeature("multi_branch") check
// validate both branches belong to same tenant
// update members.branch_id
// update active subscription.branch_id (if applicable)
// insert member_transfer_log row
// revalidatePath
```

**UI — Transfer button on member detail page** (`/admin/members/[id]`):
- "Transfer to branch" button → modal: select target branch → confirm
- Shows transfer history from `member_transfer_log`

#### Files to touch
```
supabase/migrations/XXXX_member_transfer_log.sql    — NEW
app/actions/member-management-actions.ts            — ADD transferMemberAction
app/(admin)/admin/members/[id]/page.tsx             — ADD transfer UI (or separate component)
components/members/transfer-member-modal.tsx        — NEW
```

#### Done when
- [ ] Transfer moves member and active subscription to target branch
- [ ] Both branches must belong to same tenant (validated server-side)
- [ ] Transfer log records every transfer
- [ ] Member detail shows transfer history
- [ ] Essential/Growth: transfer button hidden / action denied
- [ ] `npx tsc --noEmit` passes

---

### P3-11 — Consolidated Cross-Branch Reports

- **Priority:** MEDIUM  
- **Status:** Reports are per-branch only  
- **Depends on:** P3-03

#### What to build

**`app/(admin)/admin/reports/page.tsx`** — EXTEND:
- Add "All Branches" option to branch filter (owner/admin only)
- When "All Branches" selected: aggregate data across all tenant branches

**`services/report.service.ts`** — extend existing report functions:
- Accept `branchId: string | null` — when `null`, aggregate all tenant branches
- Add `getConsolidatedRevenueSummary(tenantId)`, `getConsolidatedMemberStats(tenantId)` etc.

**New page: `/admin/reports/consolidated`** (owner/admin only):
- Side-by-side branch comparison table
- Columns: Branch Name, Active Members, Revenue MTD, Pending Dues, Staff Count
- "Export all branches" CSV

#### Files to touch
```
app/(admin)/admin/reports/page.tsx                  — EXTEND with all-branches filter
app/(admin)/admin/reports/consolidated/page.tsx     — NEW
services/report.service.ts                          — EXTEND for multi-branch aggregation
app/actions/report-actions.ts                       — ADD getConsolidatedReportAction
```

#### Done when
- [ ] "All Branches" filter works on main reports page
- [ ] Consolidated report page shows branch comparison
- [ ] Data scoped to `profile.tenant_id` — cannot see other tenants' branches
- [ ] Gated behind `hasCurrentFeature("multi_branch")`
- [ ] Single-branch Essential/Growth users: no change to their reports
- [ ] `npx tsc --noEmit` passes

---

### P3-12 — Webhook Management UI + API Key Management

- **Priority:** LOW (Scale differentiator but complex)  
- **Status:** REST API routes exist, no webhook/key management  
- **Depends on:** P3-01

#### What to build

**DB migrations:**
```sql
-- api_keys table
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  name text not null,
  key_hash text not null,           -- store bcrypt hash, never plain
  key_prefix text not null,         -- show first 8 chars e.g. "sfk_live_"
  scopes text[] default '{}',       -- e.g. ["members:read", "payments:read"]
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  revoked_at timestamptz
);

-- webhook_endpoints table
create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  url text not null,
  events text[] not null,           -- e.g. ["member.created", "payment.completed"]
  is_active boolean default true,
  secret_hash text,
  created_at timestamptz default now()
);
```

**`app/(admin)/admin/developer/page.tsx`** (NEW):
- Tabs: "API Keys" and "Webhooks"
- API Keys tab: list keys (name, prefix, scopes, last used, expiry), create new key (shows full key ONCE on creation), revoke
- Webhooks tab: list endpoints (URL, events, status), create, edit, delete
- Gated behind `hasCurrentFeature("api_webhooks")`

#### Files to touch
```
supabase/migrations/XXXX_api_keys.sql               — NEW
supabase/migrations/XXXX_webhook_endpoints.sql       — NEW
app/(admin)/admin/developer/page.tsx                — NEW
app/actions/api-key-actions.ts                      — NEW
app/actions/webhook-actions.ts                      — NEW
middleware.ts                                       — add /admin/developer route guard
lib/nav/admin-nav.ts                                — add Developer nav item
```

#### Done when
- [ ] API key can be created (full key shown once, then only prefix)
- [ ] API key can be revoked
- [ ] Webhook endpoint can be created with event selection
- [ ] Webhook endpoint can be toggled active/inactive
- [ ] All gated behind `hasCurrentFeature("api_webhooks")`
- [ ] Keys stored as hashes — plain key never persisted
- [ ] `npx tsc --noEmit` passes

---

### P3-13 — Advanced Automation Engine

- **Priority:** LOW (high complexity — do last)  
- **Status:** Feature key registered, zero implementation  
- **Depends on:** P3-01, P3-05 (audit logs pattern), all P2 features complete

#### What to build

This is the largest remaining task. Break it into sub-tasks internally.

**DB migrations:**
```sql
-- automation_rules table
create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  branch_id uuid references branches(id),
  name text not null,
  trigger_type text not null,       -- 'membership_expiry', 'payment_due', 'inactivity', 'birthday', 'lead_followup', 'pt_sessions_low'
  trigger_config jsonb default '{}',-- e.g. { "days_before": 7 }
  condition_config jsonb default '{}',-- e.g. { "status": "active" }
  action_type text not null,        -- 'send_whatsapp', 'send_notification', 'create_task'
  action_config jsonb default '{}', -- template_key, message etc.
  is_active boolean default true,
  created_at timestamptz default now()
);

-- automation_run_log table
create table automation_run_log (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references automation_rules(id),
  triggered_at timestamptz default now(),
  entity_type text,                 -- 'member', 'lead', etc.
  entity_id uuid,
  status text,                      -- 'success', 'failed', 'skipped'
  error_message text
);
```

**`app/(admin)/admin/automation/page.tsx`** (NEW):
- List automation rules: name, trigger, action, status (active/paused), last run, run count
- Create/edit rule form: trigger type → trigger config → condition → action → template
- Enable/disable toggle per rule
- Run log tab: history of rule executions

**`services/automation.service.ts`** (NEW):
- `evaluateAndRunRules(tenantId, branchId)` — called by cron
- Per trigger type: query relevant entities → check conditions → execute action
- Log every run to `automation_run_log`

**`app/api/cron/automation/route.ts`** (NEW):
- Secured cron endpoint
- Calls `evaluateAndRunRules` for all active tenants

#### Key templates to support (from handoff doc)
- Renewal reminder (N days before expiry)
- Payment due reminder
- Failed payment follow-up
- Inactivity alert (N days since last check-in)
- Lead follow-up (N days since last activity)
- Trial expiry reminder
- PT sessions running low
- Birthday greeting
- Welcome message (new member)
- Reactivation (N days since membership expired)

#### Files to touch
```
supabase/migrations/XXXX_automation_rules.sql       — NEW
supabase/migrations/XXXX_automation_run_log.sql     — NEW
app/(admin)/admin/automation/page.tsx               — NEW
app/(admin)/admin/automation/[id]/page.tsx          — NEW (rule detail + run log)
app/actions/automation-actions.ts                   — NEW
services/automation.service.ts                      — NEW
app/api/cron/automation/route.ts                    — NEW
middleware.ts                                       — add /admin/automation route guard
lib/nav/admin-nav.ts                                — add Automation nav item
```

#### Done when
- [ ] Automation rules can be created for all 10 trigger types
- [ ] Rules can be enabled/disabled
- [ ] Cron runs rules and logs results to `automation_run_log`
- [ ] Run log shows per-rule execution history (status, entity, timestamp)
- [ ] Gated behind `hasCurrentFeature("advanced_automation")`
- [ ] Does NOT double-fire with existing cron reminders (coordinate/replace)
- [ ] `npx tsc --noEmit` passes

---

### P3-14 — AI Business Intelligence

- **Priority:** LOWEST (external dependency — LLM vendor needed)  
- **Status:** Feature key registered, zero implementation  
- **Depends on:** All other Phase 3 tasks complete, LLM vendor selected

#### What to build

> ⚠️ **Do not start this until an LLM vendor/API key is confirmed and approved.**

**Architecture:**
- Natural language input → server-side query translation → read-only DB queries → formatted response
- Must respect tenant/branch/role permissions — query only authorized data
- No write operations from AI queries ever

**`app/(admin)/admin/intelligence/page.tsx`** (NEW):
- Text input: "Ask about your gym..." 
- Response area: formatted answer with cited source data
- Suggested questions (e.g. "How many members expired this month?", "What's my top-selling plan?")
- Gated behind `hasCurrentFeature("ai_insights")`

**`app/api/intelligence/route.ts`** (NEW):
- POST endpoint receiving natural language query
- Validates tenant/branch/role before any query
- Calls LLM with system prompt containing schema context
- Translates to safe read-only SQL / Supabase queries
- Returns formatted answer

#### Files to touch
```
app/(admin)/admin/intelligence/page.tsx             — NEW
app/api/intelligence/route.ts                       — NEW
services/intelligence.service.ts                    — NEW
middleware.ts                                       — add /admin/intelligence route guard
lib/nav/admin-nav.ts                                — add Intelligence nav item
```

#### Done when
- [ ] Natural language question returns grounded answer from real DB data
- [ ] Queries are read-only — no mutations possible via AI
- [ ] All queries scoped to authenticated tenant/branch
- [ ] Role permissions respected (e.g. receptionist cannot query finance data)
- [ ] Gated behind `hasCurrentFeature("ai_insights")`
- [ ] `npx tsc --noEmit` passes

---

## EXECUTION CHECKLIST

### Phase 2 Remaining

- [ ] **P2-R1** — WhatsApp Frontend (send UI, templates, history)
- [ ] **P2-R2** — Sales Targets UI (CRM)

### Phase 3 (in order)

- [ ] **P3-01** — System B Phase 3 Foundation + Sidebar Three-Tier ⚠️ DO FIRST
- [ ] **P3-02** — Multi-Branch Entitlement Gate + Middleware ⚠️ DO SECOND
- [ ] **P3-03** — Branch Management UI (`/admin/branches`)
- [ ] **P3-04** — Enterprise Audit Log Backend
- [ ] **P3-05** — Enterprise Audit Log UI (`/admin/audit-logs`)
- [ ] **P3-06** — Revenue Intelligence Backend
- [ ] **P3-07** — Revenue Intelligence UI (on `/admin/reports/revenue`)
- [ ] **P3-08** — Advanced CRM Analytics Backend
- [ ] **P3-09** — Advanced CRM Analytics UI (on `/admin/leads`)
- [ ] **P3-10** — Member Transfer Between Branches
- [ ] **P3-11** — Consolidated Cross-Branch Reports
- [ ] **P3-12** — Webhook Management + API Key Management
- [ ] **P3-13** — Advanced Automation Engine
- [ ] **P3-14** — AI Business Intelligence *(needs LLM vendor first)*

---

## QUALITY GATES (apply to every task)

Before checking off any task, verify ALL of these:

1. `npx tsc --noEmit` — zero TypeScript errors
2. `npm run build` — production build succeeds
3. Feature is gated behind correct `hasCurrentFeature(...)` — Essential/Growth blocked where required
4. Tenant isolation — tenant A cannot see tenant B's data
5. Branch isolation — branch-scoped queries use `profile.branch_id`
6. Role check — `requireUser([...])` is the first call in every server action
7. No mock/static data — all values come from real DB queries
8. Responsive layout — tested at mobile (375px), tablet (768px), desktop (1280px)
9. No new `any` types introduced without justification
10. Financial figures reconcile to source transactions (for finance-touching tasks)

---

## BRAND CONSTANTS (for any UI copy)

| Field | Value |
|---|---|
| Product name | SyncFyre |
| Company | Synckraft Technologies |
| Phone | +91 90044 02006 |
| Email | syncfyre26@gmail.com |
| Essential price | ₹9,999/year |
| Growth price | ₹15,999/year |
| Scale price | ₹29,999/year |

> If any old price, old contact detail, or old feature name appears anywhere, stop and correct it before publishing.
