# Plan Expiry & Renewal Architecture — Read-Only Audit + Implementation Plan

Status: **ARCHITECTURE / AUDIT ONLY. No code, schema, migration, or tenant data was changed to produce this document.** Every file, table, and line reference below was confirmed by reading the actual repository (staged read-only from the connected `SyncTyre` folder) and the live `supabase/migrations/` directory listing on 2026-09-17. Talwalkar, Demo Gym, and every other existing tenant's plan, status, and dates were not touched.

---

## 1. Current architecture

SyncFyre is a Next.js (App Router) multi-tenant SaaS on Supabase/Postgres. Route groups `(admin)`, `(reception)`, `(superadmin)`, `(trainer)`, `(member)` map to roles; `middleware.ts` is the single edge gate for auth, onboarding, portal-role access, and commercial-feature locking on every request. Server Actions (`app/actions/*.ts`, `app/(superadmin)/**/actions.ts`) and Server Components read/write through `@supabase/ssr` with RLS scoped by `tenant_id`/`branch_id`, plus an admin (service-role) client for privileged SuperAdmin operations (`lib/supabase/admin.ts`). Migrations live in `supabase/migrations/`, numbered sequentially and applied by the user via `supabase db push` — this audit had no database access and worked entirely from migration source and application code.

The live migration sequence (confirmed directly from the connected device, not from a stale mirror) runs **0001 → 0051**, with two intentional numbering gaps: 0027 and 0041. Both gaps correspond to files that were renumbered and moved to `supabase/migrations/_excluded/` rather than edited in place — `_excluded/0008_member_form_configurations.sql`, `_excluded/0022_role_based_notifications.sql`, and `_excluded/0041_phase_gating.sql` are superseded drafts, kept for history but never applied. **This is the existing precedent for correcting a migration mistake in this repo: exclude and renumber forward, never edit or delete an applied migration.** The next new migration this project creates, whenever implementation is authorized, must be `0052_...`.

## 2. Existing plan system

There are **two completely separate "plan" concepts** in this codebase. Confusing them would corrupt the audit, so they are named distinctly for the rest of this document:

- **Member plan** — `membership_plans` / `subscriptions` (with `subscription_history`) — what a *gym member* buys from *the gym* (e.g., "1-month plan", "Couple plan"). Owned by `services/plan.service.ts`, `services/membership-plan.service.ts`, `services/subscription.service.ts`, `app/actions/subscription-actions.ts`. **Not in scope for this task.**
- **Tenant plan** (the subject of this task) — the *SaaS commercial plan* a *gym (tenant)* buys from SyncFyre: Essential / Growth / Scale. This is what sections 4–23 below are about.

### 2.1 Storage — `public.tenants`

Confirmed columns relevant to commercial plan/subscription state, across `0009_multi_tenancy.sql`, `0017_owner_registration_onboarding.sql`, and `0038_demo_tenant_support.sql`:

| Column | Type | Constraint / default | Added in |
|---|---|---|---|
| `plan` | text | `not null default 'standard'`, `check (plan in ('trial','standard','professional','enterprise'))` | 0009 |
| `status` | text | `not null default 'active'`, `check (status in ('active','suspended','trial','cancelled'))` | 0009 |
| `trial_ends_at` | timestamptz | nullable | 0009 |
| `trial_starts_at` | **date** | nullable | 0017 (note: type mismatch with `trial_ends_at`'s `timestamptz` — pre-existing, out of scope to fix here) |
| `onboarding_completed_at` | timestamptz | nullable | 0017 |
| `tenant_type` | text | `default 'customer'`, check `('customer','demo')` | 0038 |
| `is_demo`, `is_protected` | boolean | `default false` | 0038 |
| `purpose` | text | nullable | 0038 |

There is **no `end_date`, `billing_cycle`, `amount`, `provider`, or `next_renewal_date` column anywhere on `tenants` or any other table for the tenant-level commercial plan.** The only date fields that exist (`trial_starts_at`/`trial_ends_at`) are wired into the onboarding flow and displayed as read-only "days remaining" on the SuperAdmin Tenants page — they are **never read by the entitlement evaluator** (confirmed: `evaluateFeature()` takes only `plan` and `status`, never a date). A tenant whose trial date has passed keeps full access to whatever `tenants.plan` says, until a human changes `status` by hand.

### 2.2 Mapping and source of truth

`lib/entitlements/registry.ts` defines the canonical product IDs:

```
PLAN_IDS = ["plan_1", "plan_2", "plan_3"]   // Essential, Growth, Scale
PHASE_IDS = ["phase_1", "phase_2", "phase_3"]
```

`lib/entitlements/evaluate.ts` maps the DB's legacy-named `tenants.plan` values onto these product IDs and back, preserving the existing check constraint instead of changing it:

```
storedPlanForProduct: plan_1 → "trial", plan_2 → "professional", plan_3 → "enterprise"
normalizePlan:        "trial"/"standard" → plan_1, "professional" → plan_2, "enterprise" → plan_3
```

`lib/plans/config.ts` is the **display/pricing** source of truth — Essential ₹9,999/yr, Growth ₹15,999/yr, Scale ₹29,999/yr, matching the user's brief exactly — and is explicitly documented in-file as containing no entitlement logic ("Do NOT add entitlement logic here... Do NOT read tenants.plan from this file"). This existing separation of *display config* from *entitlement evaluation* is good prior art and this task's new subscription model follows the same split.

### 2.3 Assignment path

`assignTenantPlanAction` (`app/(superadmin)/superadmin/tenants/plan-actions.ts`) → `assignTenantPlan()` (`services/tenant-plan.service.ts`): verifies the actor is `super_admin` server-side (re-checked against the DB, not trusted from the session), updates **only** `tenants.plan`, writes `activity_logs` with `action: "tenant_plan_changed"` and a `changes` JSON of `{previous_plan, new_plan, stored_plan}`, then revalidates every portal layout. Driven by `components/superadmin/tenant-plan-control.tsx` (a 3-button Essential/Growth/Scale selector with a native `confirm()` dialog) on `app/(superadmin)/superadmin/tenants/page.tsx`. **The previously-hardcoded `locked={tenant.slug === "talwalkar"}` prop on this component has already been removed** (confirmed: `tenants/page.tsx` no longer passes a `locked` prop to `TenantPlanControl` at all).

A **second, older** path also exists and still writes `tenants.plan`: `updateTenantAction` (`app/(superadmin)/superadmin/tenants/actions.ts`), reached from the tenant "Edit" dialog. It accepts a free-text `plan` field, normalizes legacy aliases, and **explicitly blocks Talwalkar** (`if (currentTenant.slug === "talwalkar") return { error: "..." }`) — a hardcoded, name-based guard that is a pre-existing pattern in this codebase (not introduced by this audit) and is **out of scope to change here**, since Section 23 forbids relying on tenant names for authorization in *new* code, but this audit does not touch existing code. **Both actions can change `tenants.plan` today; any new subscription-aware plan assignment must account for both, not just `assignTenantPlanAction`.**

## 3. Existing entitlement system

### 3.1 The canonical evaluator (per-tenant, plan-driven)

`evaluateFeature()` in `lib/entitlements/evaluate.ts` is the single, pure, canonical function:

```ts
evaluateFeature({ plan, status, featureKey, override?, roleAllowed? })
```

Logic (exact, read from source): `active = status === undefined || status === "active" || status === "trial"`. `planAllows = feature.phase's rank <= plan's numeral` (e.g. `plan_2` allows `phase_1` and `phase_2`). `allowed = active && planAllows && override !== false && roleAllowed !== false`. **This function today has no concept of a subscription period — `status` is the tenant's static `tenants.status` field, not a date-derived state.** `FEATURE_REGISTRY` in `lib/entitlements/registry.ts` maps ~30 feature keys (members, membership, attendance, crm, finance, pt, biometric, multi_branch, advanced_automation, ai_insights, …) to `phase_1`/`phase_2`/`phase_3`, matching the Essential→P1, Growth→P1+P2, Scale→P1+P2+P3 mapping the user specified almost exactly (confirmed against `docs/SAAS_ENTITLEMENT_FOUNDATION.md`'s section 3 table, which documents the same mapping).

Resolution and enforcement layers, in order of where `evaluateFeature()`/its wrappers are actually called:

1. **`middleware.ts`** — the primary, real-time enforcement boundary. On every request it loads `tenant.plan` and `tenant.status` fresh from Supabase (no caching), matches the pathname against `FEATURE_ROUTE_PREFIXES` (`/admin/leads`→crm, `/admin/finance`→finance, `/admin/machines`→biometric, `/admin/branches`→multi_branch, `/admin/audit-logs`→enterprise_rbac, etc.), and calls `evaluateFeature()` directly. HTML requests redirect to `/admin/upgrade`; API requests get HTTP 403. **This means the architecture already evaluates entitlement live, per-request, from current DB state — it is not a cached or cron-dependent check today**, which is directly favorable to Section 9's security requirement.
2. **`lib/entitlements/server.ts`** — `getCurrentEntitlement()` / `hasCurrentFeature()` / `assertCurrentFeature()`, used inside Server Actions/Components for defense-in-depth beyond middleware (confirmed used in `lead-actions.ts`, `finance-actions.ts`, `pt-actions.ts`, `biometric-actions.ts` per `docs/SAAS_ENTITLEMENT_FOUNDATION.md` §7/§13.5). This also reads a `tenant_features` override table (`enabled: boolean`, per tenant/feature) which can only *disable* an included feature, never elevate above plan.
3. Per `docs/SAAS_ENTITLEMENT_FOUNDATION.md` §14 ("Remaining blockers"), coverage is **not** complete: only middleware + four action families are enforced; most services/actions are not yet wired. This is a pre-existing, documented gap, unrelated to subscription expiry, and out of scope for this task to fix — but it means adding subscription-based gating to `evaluateFeature()` will inherit the same partial coverage until that separate blocker is closed.

### 3.2 A second, unrelated "phase" system — do not confuse with the above

`lib/phases/registry.ts` + `services/phase.service.ts` + migration `0043_phase_gating_corrected.sql` implement a **global, platform-wide rollout switch** — `system_phases` / `feature_phases` tables, `PHASE_1`/`PHASE_2`/`PHASE_3` keys, activated *once for the entire platform* by `activateSystemPhaseAction` (`app/actions/phase-actions.ts`, SuperAdmin → Settings) via the `activate_system_phase()` Postgres function. This has **nothing to do with which commercial plan a given tenant bought** — it is a dev/rollout gate (has this platform enabled Phase 2 features at all yet?), evaluated by `canAccessFeature()`/`isPhaseEnabled()`, and is **not** called from `middleware.ts`. Two important, verified facts:

- The DB check constraint in `0043_phase_gating_corrected.sql` only allows `phase_key ~ '^PHASE_[1-2]$'` and `phase_number between 1 and 2` — **there is no PHASE_3 row seeded in `system_phases` today**, even though the TypeScript registry declares three phases. This is a pre-existing gap unrelated to this task; it must not be assumed fixed, and the new subscription-expiry work must not depend on this global-phase system at all.
- `FEATURE_REGISTRY` in this file (`PhaseFeatureKey`) is a **different key set** from `SaaSFeatureKey` in `lib/entitlements/registry.ts`, despite overlapping names like `"biometric"` and `"finance"`. Any future code touching "entitlements" must be careful which registry it means.

**Conclusion for Section 7's instruction to "extend the existing canonical evaluator, not create a second one":** the canonical evaluator is unambiguously `evaluateFeature()` in `lib/entitlements/evaluate.ts`, consumed by `middleware.ts` and `lib/entitlements/server.ts`. This is the one function this task's subscription-expiry logic must extend. The global `system_phases` mechanism is orthogonal and must be left alone.

## 4. Existing billing/subscription capability (tenant level)

**None exists today.** Specifically, confirmed by direct inspection:

- No `tenant_subscriptions`, `tenant_billing`, `tenant_invoices`, `tenant_orders`, or any tenant-level payment/order table in any of the 51 active migrations.
- `app/(superadmin)/superadmin/subscriptions/page.tsx` and `app/(superadmin)/superadmin/billing/page.tsx` **already exist but are not what their names suggest for this task** — they query `subscriptions`/`invoices`/`payments`, which are **member-level** tables (a gym member's membership subscription and invoice), joined to `members`/`membership_plans`/`branches`. They give SuperAdmin a platform-wide view of *gym members'* billing across all tenants, not of *tenants'* SaaS billing to SyncFyre. Building tenant-level subscription/billing screens under these same routes would be actively misleading; a new, separately-named SuperAdmin surface is required (Section 11).
- `app/actions/subscription-actions.ts` (`updateSubscriptionStatusAction`, `renewSubscriptionAction`) and `services/workflow.service.ts`'s `updateSubscriptionWithHistory()` are likewise **member-level** membership lifecycle actions (they call `update_subscription_with_history()`, whose target table is the member `subscriptions` table). Not reusable directly, but structurally the single best precedent in this repo for how a subscription-with-history model should behave (see §5, §16).
- No grep hit anywhere in the repo for Razorpay, Cashfree, Stripe, `PaymentProvider`, or `webhook` except two mentions of "Payment Gateway Integration" as a **marketing add-on line item** in `lib/plans/config.ts`'s `ADDITIONAL_OFFERINGS` list — i.e., explicitly not-yet-built, consistent with what this task must also do (design only).
- No `middleware.ts` (or anywhere else) reference to a subscription end date, grace period, or renewal date.

**Do not build tenant billing infrastructure from scratch as if nothing existed** — the member-level `subscriptions` + `subscription_history` + `update_subscription_with_history()` pattern (Postgres RPC that atomically updates the live row *and* appends a history row, used consistently since migration 0001/0003 and extended as recently as 0050) is the proven, idiomatic shape for this codebase and is the direct model for the new `tenant_subscriptions`/`tenant_subscription_history` tables proposed in §6.

## 5. Notifications infrastructure

`notifications` table (`tenant_id`, `member_id` nullable, `branch_id`, `type`, `title`, `message`, `channels`, `target_roles`, `scheduled_for`, `sent_at`, `read_at`, `metadata` jsonb) is tenant-scoped and already generic enough for a tenant-level (non-member) event: `member_id` is nullable and `target_roles` already supports targeting `owner`/`admin`/`manager`/`reception` as a group rather than one member.

**Idempotency is already solved and battle-tested**, not something to invent: `0020_notification_fingerprint_unique.sql` creates a unique index on `notifications ((metadata->>'fingerprint')) where metadata ? 'fingerprint'`, and every notification-producing function (`generate_membership_reminders()`, `notify_subscription_history_created()`, `notify_invoice_balance()`, all in `0028_notification_membership_window_and_cleanup.sql`) passes a deterministic fingerprint string like `'membership_expiry_reminder:staff:' || subscription_id || ':' || end_date` through `queue_business_notification()`. Inserting the same fact twice is a no-op at the database level, not something the calling code has to remember to check.

**The exact 30/7/1-day pattern the user asked for already exists at the member level** and is the direct template to extend: `generate_membership_reminders()` selects `subscriptions where status = 'active' and end_date between current_date+1 and current_date+10`, computes `d := end_date - current_date` per row, and branches the copy ("expires in 1 day" vs "expires in N days"). A tenant-level version narrows the window to exactly `{1, 7, 30}` and fingerprints by `tenant_id + subscription_id + days_before` so a tenant is never notified twice for the same milestone.

**Automation wiring**: `services/notification.service.ts`'s `runNotificationAutomation()` = `queueSubscriptionReminders()` (calls `generate_membership_reminders()` via `admin.rpc()`) + `dispatchPendingNotificationDeliveries()`. This runs nightly via the existing Vercel Cron (`vercel.json`: `"/api/cron/reminders"` at `30 2 * * *` UTC = 08:00 IST), protected by `CRON_SECRET` with a timing-safe comparison and a per-IP rate limit (`app/api/cron/reminders/route.ts`). **This is the one nightly job in the system; the correct design is to extend it, not add a second cron entry**, per the user's own preference to avoid duplicate scheduled infrastructure.

**Direct precedent for the expiry-flip itself**: migration `0050_expire_overdue_subscriptions.sql` (added earlier in this engagement, for member subscriptions) is line-for-line the pattern to mirror at the tenant level — a `security definer` function that sweeps `status = 'active' and end_date < current_date`, flips to `'expired'`, inserts one `subscription_history` row per flip, is explicitly documented as "safe to call any time (no-op when nothing is overdue)," and is wired into the same nightly cron. §9 below proposes `expire_overdue_tenant_subscriptions()` as its direct analog.

## 6. SuperAdmin

- `app/(superadmin)/superadmin/tenants/page.tsx` — the main tenant table: owner, status badge, `TenantPlanControl` (plan toggle), trial start/end + "days remaining" (trial only, not billing), member/staff/branch counts, machine integration status, `EditTenantDialog`. **No subscription status, payment status, or billing-period column exists here today.**
- `app/(superadmin)/superadmin/dashboard/page.tsx`, `app/(superadmin)/superadmin/demos/page.tsx` — platform overview and demo-tenant management; not billing-related.
- `app/(superadmin)/superadmin/audit-logs/page.tsx` reads the existing `activity_logs` table, which is already the audit trail every privileged tenant action writes to (`tenant_plan_changed`, `tenant_updated`, `tenant_classification_changed`, all confirmed with a consistent `{user_id, branch_id, action, entity_type, entity_id, description, changes}` shape). **This is the existing audit-log system Section 11's audit requirement should write into — no new audit table is needed.**
- Tenant governance (`lib/tenants/governance.ts` + `services/tenant-governance.service.ts`, migration `0038`) already gives a generic, non-name-based way to mark a tenant `is_demo`/`is_protected` and gate destructive/demo-only operations through `assertDemoOperationAllowed()`. Talwalkar and Demo Gym are governed through this mechanism (Talwalkar: `customer/false/false`, i.e. an ordinary protected-by-convention customer tenant; Demo Gym: `demo/true/true` since 2026-09-07 per `docs/SAAS_ENTITLEMENT_FOUNDATION.md`). **Any new SuperAdmin subscription-management action should reuse this governance layer** rather than inventing new tenant-name checks, and specifically should never special-case Talwalkar or Demo Gym by name.

## 7. Gap analysis

| Area | Exists today | Gap |
|---|---|---|
| Commercial plan label | `tenants.plan` (Essential/Growth/Scale via legacy alias) | No time-bound period attached to it |
| Plan assignment | `assignTenantPlanAction` (+ legacy `updateTenantAction`) | Neither creates or touches any subscription/period record |
| Entitlement evaluation | `evaluateFeature(plan, status)`, called live in middleware + 4 action families | No expiry/grace-aware status; `status` is a static flag, not date-derived |
| Trial dates | `trial_starts_at`/`trial_ends_at` exist on `tenants` | Never read by the evaluator; purely cosmetic today |
| Tenant-level billing/orders/invoices | None | Full gap — needs new tables (design only, §8) |
| Subscription history | Pattern exists at member level (`subscription_history` + RPC) | No tenant-level equivalent |
| Notifications infra | Generic, tenant-scoped, idempotent, cron-wired | No tenant-subscription event types yet |
| SuperAdmin subscription visibility | None (existing `/superadmin/subscriptions`,`/billing` are member-level) | Needs a new, distinctly-named surface |
| Payment gateway | None, not even a stub | Full gap — interface design only, per explicit instruction not to build one |
| Webhook idempotency | Pattern exists (`metadata->>'fingerprint'` unique index) | No `provider_event_id` equivalent yet (none needed until a gateway exists) |
| Global system-phase rollout | Exists (`system_phases`), orthogonal | Must not be conflated with tenant billing; leave untouched |

## 8. Proposed canonical subscription model (design only — no migration executed)

Two new tables, both additive — nothing existing is altered, renamed, or dropped:

**`public.tenant_subscriptions`** — current + historical subscription periods, one row per billing period (not just "the current one" — see §16):

```
id                    uuid primary key default gen_random_uuid()
tenant_id             uuid not null references public.tenants(id) on delete cascade
plan_id               text not null check (plan_id in ('plan_1','plan_2','plan_3'))
status                text not null check (status in
                        ('trial','pending_payment','active','past_due','expired','cancelled'))
                      -- see §6 below for why this list, not a copy of tenants.status
start_date            date not null
end_date              date not null
grace_period_days     integer not null default 0        -- see §9
renewal_date          date                                -- next scheduled renewal, if auto-renew
auto_renew            boolean not null default false
payment_status        text not null default 'unpaid'
                        check (payment_status in ('unpaid','pending','paid','refunded','failed'))
provider              text                                -- 'razorpay' | 'cashfree' | 'manual' | null
provider_subscription_id text                              -- provider's subscription/order id, if any
amount                numeric(12,2)
currency              text not null default 'INR'
billing_cycle         text not null default 'annual' check (billing_cycle in ('annual','monthly'))
created_by            uuid references public.users(id)     -- superadmin who created it manually, if manual
created_at            timestamptz not null default now()
updated_at            timestamptz not null default now()
```

Indexes: `(tenant_id, status)`, `(status, end_date)` for the nightly sweep, partial unique index ensuring **at most one `status in ('trial','pending_payment','active','past_due')` row per tenant at a time** (a tenant cannot have two "current" periods simultaneously — this is the safety rail that prevents the duplicate-tenant/duplicate-subscription failure mode called out in Sections 13 and 15).

**`public.tenant_subscription_history`** — append-only audit trail, one row per state transition, modeled directly on the existing `subscription_history` + `update_subscription_with_history()` pattern from §4:

```
id                 uuid primary key default gen_random_uuid()
subscription_id    uuid not null references public.tenant_subscriptions(id) on delete cascade
tenant_id          uuid not null references public.tenants(id) on delete cascade
action             text not null check (action in
                     ('created','activated','renewed','plan_changed','payment_verified',
                      'expired','grace_started','cancelled','reactivated'))
previous_status    text
new_status         text
previous_plan_id   text
new_plan_id        text
previous_end_date  date
new_end_date       date
performed_by       uuid references public.users(id)   -- null for system/cron actions
notes              text
metadata           jsonb
performed_at       timestamptz not null default now()
```

A single Postgres function, `update_tenant_subscription_with_history()`, mirrors `update_subscription_with_history()`: it is the **only** write path to `tenant_subscriptions`, and every call also inserts a `tenant_subscription_history` row in the same transaction — so it is structurally impossible to change a subscription without a history record, closing the exact loophole ("do not store only the current expiry date") the user's Section 5 warns about.

`tenants.plan` and `tenants.status` are **not renamed, repurposed, or removed.** `tenants.plan` keeps meaning "the commercial plan this tenant is on" (unchanged: still driven by `assignTenantPlanAction`); `tenants.status` keeps meaning the tenant's coarse account lifecycle (`active`/`suspended`/`trial`/`cancelled`) and is not overloaded to also mean "subscription period expired" — that distinction now lives in `tenant_subscriptions.status`, which is the correct place per the model in §9.

## 9. Plan vs subscription separation

**PLAN** answers "what is this tenant commercially entitled to" — unchanged, still `tenants.plan`. **SUBSCRIPTION** answers "is that entitlement currently active, and until when" — new, `tenant_subscriptions`. After a Growth subscription expires, `tenants.plan` **stays `'professional'` (Growth)** — it is the tenant's purchase history/commercial record, not something the system silently downgrades — while `tenant_subscriptions.status` becomes `'expired'`. Per the user's explicit instruction, **expiry is never solved by changing `tenants.plan` to a lower tier.** Effective entitlement is computed from *both*:

```
effective_phase_access = f(tenants.plan, effective_subscription_status(tenant_subscriptions, now()))
```

where `effective_subscription_status()` (§10) derives a live status from the stored row + current timestamp, not merely the stored `status` column, so a subscription is correctly seen as expired even if no cron has run yet.

## 10. Entitlement enforcement matrix

Extends `evaluateFeature()` with a new, backward-compatible parameter — existing callers that don't pass a subscription keep today's exact behavior (this preserves the four already-enforced action families and middleware without requiring them to change on day one):

```ts
evaluateFeature({ plan, status, featureKey, override?, roleAllowed?, subscription? })
// subscription?: { status: TenantSubscriptionStatus; endDate: string; gracePeriodDays: number } | null
```

When `subscription` is provided, its derived effective status replaces the old boolean `active` check for the *paid-phase* (phase_2/phase_3) portion of the decision; Phase 1 is governed only by `tenants.status` as today (see the matrix below — Phase 1 never locks on subscription expiry). Exact required matrix, confirmed against the user's brief and implemented as:

| State | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| ACTIVE Essential | allow | lock | lock |
| ACTIVE Growth | allow | allow | lock |
| ACTIVE Scale | allow | allow | allow |
| EXPIRED Essential | allow | lock | lock |
| EXPIRED Growth | allow | lock | lock |
| EXPIRED Scale | allow | lock | lock |
| TRIAL (any plan) | allow | *per existing trial policy* | *per existing trial policy* |

**Trial policy, as it exists today** (not proposed — documented as found): `evaluateFeature()`'s `active` check already treats `status === "trial"` identically to `status === "active"` — i.e., a tenant in trial gets full access to whatever `tenants.plan` says, with no separate trial feature cap. This audit does not change that; it is out of scope. If a future task wants trial to behave differently (e.g., trial = Essential-only regardless of assigned plan), that is a separate, explicit product decision, not something this expiry work should silently introduce.

## 11. Grace period

**Recommendation: no grace period by default (`grace_period_days = 0`)** for the initial implementation. Rationale: introducing undefined "soft" access windows without an existing business rule to base them on is exactly the kind of assumption Section 8 warns against ("do not assume"). The column exists in the schema (§8) specifically so a grace period can be turned on later, per tenant or globally, **without another migration** — but it defaults to zero, meaning `EXPIRED` takes effect exactly at `end_date + 1 day` with no ambiguity. If/when a grace period is explicitly approved, its behavior must be documented exactly like the rest of this matrix (e.g., "expires 2027-09-30, 7-day grace → Phase 2/3 remain allowed through 2027-10-07 with a persistent 'renew now' banner, then lock") — never assumed, per the user's own instruction.

## 12. Expiry detection

**Hybrid — the same shape the codebase already uses at the member level, and the same shape middleware already uses for plan/status.** Two cooperating mechanisms, with an explicit precedence rule:

1. **Real-time (authoritative for access control).** `effective_subscription_status(row, now)` is computed at evaluation time from the stored row, not trusted from the stored `status` alone: `now() > end_date + grace_period_days` ⇒ effectively `expired` regardless of what the `status` column currently says. This is evaluated inside `evaluateFeature()` on every middleware pass and every `getCurrentEntitlement()` call — i.e., **access is never granted merely because a cron job hasn't run yet**, directly satisfying the user's explicit security requirement in Section 9.
2. **Scheduled (for correctness of stored state, dashboards, and notifications only).** `expire_overdue_tenant_subscriptions()` — the tenant-level mirror of the existing `expire_overdue_subscriptions()` (§5) — runs nightly inside the same `/api/cron/reminders` job, flips `tenant_subscriptions.status` from `active`/`past_due` to `expired` for anything overdue, and writes history. Its purpose is to keep the *stored* status consistent with reality for SuperAdmin reporting and notification triggers, not to be the thing access control depends on.

Precedence, explicit: **the real-time check always wins.** If the cron fails for a night, paid access is still correctly locked in real time; the only symptom of a missed cron run is a stale `status` value shown on the SuperAdmin dashboard until the next run (a display-only staleness, not a security gap) and a delayed expiry notification.

## 13. Expiry notifications

Extends the existing `notifications` table, `queue_business_notification()` pattern, and the nightly cron — no new table, no new cron entry. New `type` values and exact copy, as specified:

| Event | `type` | Copy (exact) |
|---|---|---|
| 30 days before | `tenant_subscription_expiring_30d` | "Your Growth plan expires in 30 days." |
| 7 days before | `tenant_subscription_expiring_7d` | "Your Growth plan expires in 7 days." |
| 1 day before | `tenant_subscription_expiring_1d` | "Your Growth plan expires tomorrow." |
| At expiry | `tenant_subscription_expired` | "Your Growth plan has expired." |
| After renewal | `tenant_subscription_renewed` | "Your Growth plan has been renewed." |

(Plan name is interpolated from `tenant_subscriptions.plan_id` via `getPlanConfig()`, already in `lib/plans/config.ts`.) **Idempotency**: fingerprint each notification as `` 'tenant_subscription_expiring:' || tenant_id || ':' || subscription_id || ':' || days_before `` (or `expired`/`renewed` in place of the day count), relying on the existing unique index on `metadata->>'fingerprint'` (§5) — inserting the same milestone twice for the same subscription is a database-level no-op, so the job is safe to re-run and safe to call from more than one place without a duplicate ever reaching a tenant. Target roles: `owner`, `admin`, `manager` (mirrors the existing staff-notification role set in `generate_membership_reminders()`).

## 14. SuperAdmin subscription management

A **new** route, distinctly named to avoid the member-level naming collision identified in §4 — recommend `/superadmin/tenant-subscriptions` (leaving the existing `/superadmin/subscriptions` and `/superadmin/billing` member-level pages exactly as they are). Table columns, matching the user's spec: Tenant, Plan, Subscription status, Start date, Expiry date, Payment status, Days remaining, Provider, Last payment, Next renewal, with a drill-down to that tenant's `tenant_subscription_history`.

Manual actions (activate / renew / change plan / mark payment verified / cancel) are each a separate Server Action, all of which:

- Re-verify `super_admin` role server-side against the DB (same pattern as `assignTenantPlan()` and `classifyTenant()` — never trust the session role claim alone).
- Validate all input server-side (plan id, dates, amounts) before calling `update_tenant_subscription_with_history()`.
- Write to `activity_logs` with the same `{action, entity_type: 'tenant', entity_id, description, changes}` shape already used for `tenant_plan_changed`/`tenant_classification_changed` — no new audit table.
- Never overwrite a `tenant_subscription_history` row — every action is a new row.
- "Mark payment verified" is explicitly a **manual, audited SuperAdmin action** for the current no-gateway state, not a stand-in for real verification — see §15's explicit warning against trusting a frontend success signal, which this action does not touch (it is a human, in an authenticated SuperAdmin session, over server-validated input).

## 15. Customer-side experience

Reuses the existing `/admin/upgrade` locked-feature page and its "`{Feature}` is available on the Growth Plan" pattern (already built, per `docs/FREE_PAID_ENTITLEMENT_IMPLEMENTATION.md`) rather than inventing a second locked-feature UX. New, additive pieces only:

- **Active**: a small status readout (current plan, expiry date, days remaining) — e.g., on `/admin/dashboard` or `/admin/settings`, sourced from `tenant_subscriptions`.
- **Approaching expiry** (≤30 days): a dismissible-but-recurring banner, same visual language as existing `Badge`/`Card` components.
- **Expired**: "Plan expired" state with expiry date and "Renew Plan" / "Contact Support" CTAs. Per the user's explicit instruction, this **never** blocks login, Essential/Phase-1 features, or existing data (members, attendance, payments, reports, documents, biometric mappings) — those all remain reachable per the matrix in §10.
- Terminology: the user explicitly asked not to reuse old "Free/Paid Plan" wording. Note for implementers: `lib/entitlements.ts`'s `getCommercialPlanTier()` (a **different, older** file from the canonical `lib/entitlements/` directory, still used by `services/entitlements.service.ts` and `ensurePaidCommercialPlan()`) still returns a `"free"|"paid"` tier and produces the message `"{feature} is available on the Paid Plan."` This is pre-existing legacy language, not introduced by this task, and is a candidate cleanup item — flagged here, not fixed, since fixing it is outside a read-only audit.

## 16. Renewal flow (future-ready pipeline — interfaces only)

```
Customer → "Renew Plan" → select plan/cycle
  → create tenant_subscriptions row (status: pending_payment) + tenant_subscription_history ('created')
  → PaymentProvider.createOrder() [interface only, §17]
  → redirect to gateway [not built]
  → gateway webhook → PaymentProvider.verifyWebhookSignature() [interface only]
  → on verified success: mark tenant_subscriptions.payment_status='paid', status='active',
    set start_date/end_date/renewal_date, history action 'payment_verified' + 'activated'
  → notify 'tenant_subscription_renewed'
  → entitlement re-evaluated on next request (real-time, no cache to bust)
```

The existing manual path (`assignTenantPlanAction`) **continues to work unchanged** as the only path until a gateway exists — see §21 for exactly how it should (and should not) touch `tenant_subscriptions`.

## 17. Payment gateway boundary

**No gateway is added.** Per the explicit instruction, this section is interface design only, matching the "not yet built" state confirmed in §4:

```ts
interface PaymentProvider {
  createOrder(input: { tenantId: string; planId: PlanId; amount: number; currency: string }): Promise<{ providerOrderId: string; checkoutUrl?: string }>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  parseWebhookEvent(rawBody: string): { providerEventId: string; type: string; providerSubscriptionId?: string; status: string };
}
```

Hard rule, stated explicitly because the user called it out twice: **paid access is never activated from a frontend success callback, a query parameter, or a client claim that payment succeeded** — only from `verifyWebhookSignature()` returning true inside a server-side webhook handler (or the existing manual SuperAdmin "mark payment verified" action in §14). No implementation of `PaymentProvider` is written until a specific gateway (Razorpay/Cashfree, per the existing `ADDITIONAL_OFFERINGS` marketing copy) is explicitly chosen.

## 18. Webhook idempotency (design only — no webhook exists yet)

When a gateway is eventually added, its handler must store the provider's event id and reject replays before doing anything else:

```
provider_event_id  text not null unique   -- new column, on tenant_subscriptions or a small tenant_payment_events table
```

Mirrors the exact mechanism already proven for notifications (§5's `metadata->>'fingerprint'` unique index): insert-or-ignore on `provider_event_id` first; only proceed to mutate `tenant_subscriptions` if the insert succeeded. A repeated webhook for the same event then provably cannot create a duplicate payment, duplicate subscription, or extend a subscription twice, because the duplicate insert fails before any subscription mutation runs.

## 19. Subscription history

Directly satisfies the user's example ("Subscription #1 Essential 2026-01-01→2026-12-31 expired; Subscription #2 Growth 2027-01-01→2027-12-31 active — do not overwrite #1"): because `tenant_subscriptions` allows multiple historical rows per tenant (only one *current* row is constrained, via the partial unique index in §8) and every transition is also appended to `tenant_subscription_history`, both the row-level history (what periods existed) and the event-level history (what happened and when, and who did it) are preserved permanently. Nothing is ever `UPDATE`d over a closed-out subscription row's identity — a renewal or plan change creates a **new** `tenant_subscriptions` row rather than mutating the expired one's plan/dates in place.

## 20. Plan-change policy

Simplest safe policy, deliberately avoiding proration (per explicit instruction not to build proration unless existing billing supports it — it doesn't):

| Change | Policy |
|---|---|
| Essential → Growth / Growth → Scale (upgrade) | Immediate: new `tenant_subscriptions` row starts today, same `end_date` cadence continues from the *original* purchase anniversary is **not** assumed — a manual SuperAdmin upgrade simply starts a fresh 12-month period from today, recorded as `plan_changed` in history. No refund/credit calculation. |
| Growth → Essential / Scale → Essential (downgrade) | **Scheduled, not immediate**: takes effect at the *current* period's `end_date`, not mid-cycle — the tenant keeps what they already paid for until it naturally expires, then the next period is created at the lower plan. Recorded as `plan_changed` in history at the time it's requested, with `new_plan_id` only taking effect on the next period. |
| Scale → Growth | Same as above — scheduled at period end. |

This is presented as the recommended default, explicitly flagged as a policy choice (not a technical constraint) for the user/product owner to confirm before implementation, per Section 17's instruction to propose rather than assume.

## 21. Data safety guarantees

Explicit, and mechanically enforced by the schema design in §8, not just promised in prose: `tenant_subscriptions`/`tenant_subscription_history` are **new, additive tables only**. No existing table (`tenants`, `members`, `attendance`, `payments`, `invoices`, `member_documents`, biometric mapping/event tables, `branches`, `staff`, any report view) is altered, and no foreign key from the new tables ever cascades onto them. Expiry is purely a `status` flip on a `tenant_subscriptions` row plus a feature-gating decision in `evaluateFeature()` — it is not, and structurally cannot become, a data deletion or downgrade of `tenants.plan`. Renewal reuses the same `tenant_id`; nothing about this design creates or requires a new tenant record.

## 22. Migration safety, existing tenants, and backfill (design only)

- Continue the live numbering sequence: the next migration is **`0052_...`** (confirmed live sequence ends at `0051_allow_concurrent_different_plans.sql`), following the `_excluded/` precedent for any future correction rather than editing an applied file.
- New tables only; `create table if not exists` for safety, matching the existing convention seen throughout (e.g., `0043`'s "identical structure to 0041; CREATE TABLE IF NOT EXISTS is safe" comment).
- **Backward compatibility for tenants with no `tenant_subscriptions` row at all** (i.e., every existing tenant, on day one after the migration): `evaluateFeature()`'s new `subscription` parameter must be **optional**, and when absent or when a tenant has zero subscription rows, behavior must fall back exactly to today's plan/status-only logic — no tenant silently loses access the moment this migration is applied. This mirrors the existing `insertWithSchemaFallback`/`selectWithSchemaFallback` convention (`lib/supabase/insert-fallback.ts`, `lib/supabase/select-fallback.ts`) already used in this codebase for exactly this kind of pre-migration-safe rollout.
- **Talwalkar, Demo Gym, and every other existing tenant**: this audit read but did not write any tenant row. A backfill (creating one `tenant_subscriptions` row per existing tenant, `status='active'`, `start_date` = tenant `created_at`, `end_date` = one year out, so existing tenants are not suddenly "expired" the moment the feature ships) is a **separate, explicit, future action** requiring its own sign-off — not something a migration should do silently as a side effect, and specifically not something this audit performs. Until that backfill runs, the fallback behavior above (no subscription row ⇒ legacy plan/status-only evaluation) keeps every existing tenant's access exactly as it is today.

## 23. Backward compatibility — `assignTenantPlanAction`

Must keep working exactly as today (it is the only plan-assignment path that exists right now, and per §2.3, `updateTenantAction` is a second path that also still needs to work). Recommended policy, matching the user's own suggested approach: `assignTenantPlanAction` continues to update `tenants.plan` **only** by default — it does **not** implicitly create or modify a `tenant_subscriptions` row, so today's exact behavior (a plan toggle with no billing period) is fully preserved for as long as the SuperAdmin doesn't opt in. A new, separate, explicit action (or an additional confirmed checkbox on the existing UI, e.g. "...and start a 12-month subscription period") is what creates/extends a `tenant_subscriptions` row and its history entry. This keeps the two concerns (§9's plan vs. subscription separation) honest at the UI level too: changing the label of what a tenant is entitled to, and starting a billed period for it, are explicitly two different actions unless the SuperAdmin says otherwise.

## 24. Security model

Subscription expiry is treated as an **authorization boundary**, not a UI concern, consistent with how plan/status is already enforced:

- Server-side only, at the same three points already used for plan/status: `middleware.ts` (edge, real-time), `lib/entitlements/server.ts` (action/component layer), and any future direct API route.
- Never trusts client-supplied plan, expiry date, `localStorage`, or a URL/query parameter — none of those are read by `evaluateFeature()` today, and the subscription extension does not introduce any (subscription state is always loaded server-side from `tenant_subscriptions`).
- `update_tenant_subscription_with_history()` is the only write path, callable only from server code that has already re-verified `super_admin` (manual path) or a verified webhook signature (future gateway path) — mirroring `assignTenantPlan()`'s existing re-verification pattern rather than trusting `requireUser()` alone.
- Tenant isolation: every new table carries `tenant_id` and would get the same RLS treatment (`tenant_id = current tenant`, SuperAdmin via service-role client) as every other tenant-scoped table in this schema — no new isolation model needed, no new pattern invented.

## 25. Test matrix (design — not yet written)

Planned coverage, mapped onto the existing test file convention (`tests/entitlements.test.mts`, `tests/tenant-governance.test.mts`):

- **Plan × subscription-state matrix**: all 9 cells of the table in §10 (3 plans × active/expired, plus trial), asserting exact phase 1/2/3 allow/lock.
- **Expiry boundary**: one day before `end_date`, exactly at `end_date` (midnight boundary), one second after, and (once approved) inside vs. just past a configured grace window.
- **Renewal / reactivation**: expired → renewed → immediately re-evaluates as active in the same request (no caching lag).
- **Plan change**: upgrade takes effect immediately; downgrade takes effect only at existing period end (per §20).
- **Cancel**: cancelled subscription behaves identically to expired for entitlement purposes, distinctly labeled in SuperAdmin/history.
- **Duplicate webhook** (once a gateway exists): same `provider_event_id` twice → one subscription mutation, one history row.
- **Duplicate notification**: firing the 30-day check twice for the same subscription → one notification row (fingerprint uniqueness).
- **Timezone**: expiry date comparisons use `date` (not `timestamptz`) consistently with the existing member-subscription pattern, avoiding the `trial_starts_at`(date)/`trial_ends_at`(timestamptz) mismatch noted in §2.1.
- **Tenant isolation / branch isolation**: a tenant's subscription state never leaks into another tenant's `evaluateFeature()` call; SuperAdmin-only tables are unreadable to tenant-role users.
- **SuperAdmin authorization**: every new action rejects a non-`super_admin` actor server-side, independent of what the UI shows.
- **No-subscription-row fallback**: a tenant with zero `tenant_subscriptions` rows evaluates exactly as it does today (§22).

## 26. Rollback strategy

Because both new tables are additive with no foreign keys pointing *into* existing tables and `evaluateFeature()`'s new parameter is optional, rollback at any implementation phase is a `drop table` of the two new tables (or simply never populating them) with **zero impact** on `tenants`, `evaluateFeature()`'s existing plan/status behavior, or any existing data — the system reverts to exactly today's plan-only gating. No existing migration needs to be reverted because none is touched.

## 27. Implementation phases and order

**What already exists and needs no work**: `tenants.plan`/`status`, `assignTenantPlanAction`, `evaluateFeature()`/middleware/`lib/entitlements/server.ts`, `lib/plans/config.ts` pricing/display, `activity_logs` audit pattern, `notifications` table + idempotent fingerprinting, nightly `/api/cron/reminders` job, tenant governance (`is_demo`/`is_protected`).

**What must be added, and what requires a migration**:

| Priority | Item | Migration? |
|---|---|---|
| P0 | `tenant_subscriptions` + `tenant_subscription_history` tables, `update_tenant_subscription_with_history()` RPC | Yes (0052) |
| P0 | `evaluateFeature()` extended with optional `subscription` param, backward-compatible fallback | No |
| P0 | `expire_overdue_tenant_subscriptions()` function, wired into existing nightly cron | Yes (same migration or 0053) |
| P0 | Manual SuperAdmin subscription actions (activate/renew/change plan/mark paid/cancel), re-verified server-side, audited | No (app code only, once P0 tables exist) |
| P1 | New SuperAdmin `/superadmin/tenant-subscriptions` surface | No |
| P1 | Tenant-subscription notification types (30/7/1/expired/renewed), extending `queue_business_notification` call sites | Possibly (new RPC or extend existing one) |
| P1 | Customer-side status banner + expired state on `/admin` | No |
| P2 | Explicit backfill of `tenant_subscriptions` for existing tenants (separate sign-off required, per §22) | Data-only migration, run deliberately, never silently |
| P2 | Plan-change policy (§20) implementation | No |
| P3 | `PaymentProvider` interface + webhook idempotency table | Yes, only when a gateway is chosen |
| P3 | Real gateway integration (Razorpay/Cashfree) | Yes, only when explicitly requested |
| Remains manual until P3 | All payment verification — "mark payment verified" stays a human SuperAdmin action until a real gateway exists | — |

**What must NOT be changed, at any phase, without a separate explicit instruction**: `tenants.plan`/`status` semantics, the existing `assignTenantPlanAction`/`updateTenantAction` default behavior, any existing tenant's current plan/trial dates (Talwalkar, Demo Gym, or any other), the global `system_phases` rollout mechanism, and the member-level `subscriptions`/`subscription_history`/`/superadmin/subscriptions`/`/superadmin/billing` surfaces.

---

*Produced as a read-only audit on 2026-09-17. No database write, migration, deployment, or tenant data change was performed to produce this document.*
