# Syncfyre — Commercial Plan Alignment Audit

**Audit date:** September 2026  
**Method:** Read-only static code inspection + migration ledger check  
**Talwalkar modified:** NO. Demo Gym modified: NO. Database writes: NONE.

---

## PART 1 — How the Current Plan Architecture Actually Works

### Three-plan commercial mapping (final source of truth)

| Commercial Name | Price | Internal ID | DB stored value | Phase access |
|---|---|---|---|---|
| **Essential** | ₹9,999/yr | `plan_1` | `trial` or `standard` | Phase 1 only |
| **Growth** | ₹15,999/yr | `plan_2` | `professional` | Phase 1 + Phase 2 |
| **Scale** | ₹29,999/yr | `plan_3` | `enterprise` | Phase 1 + Phase 2 + Phase 3 |

The mapping in `lib/entitlements/evaluate.ts` is **already correct**:
```
trial     → plan_1 (Essential)
standard  → plan_1 (Essential)
professional → plan_2 (Growth)
enterprise   → plan_3 (Scale)
```

### The Dual-System Problem

The codebase contains **two parallel entitlement systems that coexist and sometimes conflict**:

**System A — `lib/entitlements/` (plan_1/2/3 + FEATURE_REGISTRY)**
- `lib/entitlements/registry.ts` — maps features to phase_1/2/3
- `lib/entitlements/evaluate.ts` — `evaluateFeature()` checks plan vs feature phase
- `lib/entitlements/server.ts` — `hasCurrentFeature()` / `assertCurrentFeature()` for server actions
- Used by: `middleware.ts`, `finance-actions.ts`, `lead-actions.ts`, `biometric-actions.ts`, `pt-actions.ts`
- **This is the correct, canonical backend security system**

**System B — `lib/phases/registry.ts` + `services/phase.service.ts` (PHASE_1/PHASE_2)**
- `lib/phases/registry.ts` — `PhaseFeatureKey`, `FEATURE_REGISTRY` (different from System A)
- `services/phase.service.ts` — `getPhaseSnapshot()` reads `system_phases` + `feature_phases` tables
- `lib/entitlements.ts` — `getCommercialPlanTier()` returns `"free"` / `"paid"` (two-tier only)
- Used by: portal layouts, `portal-sidebar.tsx`, `portal-shell.tsx`
- **This controls sidebar visibility only**

**Critical finding: System B (`system_phases` / `feature_phases` DB tables) from migration `0041_phase_gating.sql` is NOT yet applied to QA.** The `phase.service.ts` always falls back to `defaultPhaseRecords()` which hardcodes PHASE_1=active, PHASE_2=locked. This means the sidebar always shows PHASE_2 nav items as locked regardless of plan. System A (middleware + server actions) works correctly based on `tenants.plan`.

---

## PART 2 — Plan Architecture Mapping

### What the system currently believes each plan means

| Internal ID | DB value | `normalizePlan()` result | Phases allowed | Commercial name |
|---|---|---|---|---|
| `plan_1` | `trial` / `standard` | `plan_1` | Phase 1 only | **Essential** ✅ |
| `plan_2` | `professional` | `plan_2` | Phase 1 + Phase 2 | **Growth** ✅ |
| `plan_3` | `enterprise` | `plan_3` | Phase 1 + Phase 2 + Phase 3 | **Scale** ✅ |

The plan naming is correct. The issue is **enforcement gaps**, not wrong mappings.

### Legacy terminology still in codebase

`lib/entitlements.ts` exports `"free"` and `"paid"` tier labels. These are used only for sidebar visual behavior (not for backend security). They map as:
- `"free"` = Essential (plan_1)
- `"paid"` = Growth or Scale (plan_2 or plan_3)

This is a **UI-only artifact** — it does not affect backend security. The labels are misleading relative to the three-tier commercial naming but cause no security bypass.

---

## PART 3 — Feature-by-Feature Inventory

### PHASE 1 / ESSENTIAL Features

| Feature (landing page) | Feature Key | Route | Implementation | Frontend Guard | Backend Guard | Problems |
|---|---|---|---|---|---|---|
| Member Profiles & ID | `members` | `/admin/members` | **IMPLEMENTED** | None needed (Phase 1) | `requireUser()` | None |
| Active / Expired Members | `expiry` | `/admin/members?sub_status=*` | **IMPLEMENTED** | None needed | `requireUser()` | None |
| Membership Plans & Renewals | `membership` | `/admin/memberships`, `/admin/renewals` | **IMPLEMENTED** | None needed | `requireUser()` | None |
| Member Search & Import/Export | `import_export` | `/admin/members`, `/api/members/export` | **IMPLEMENTED** | None needed | `requireUser()` | xlsx CDN tarball risk |
| Membership Billing | `payments` | `/admin/invoices/new` | **IMPLEMENTED** | None needed | `requireUser()` | None |
| Cash/UPI/Card/Bank payment methods | `payments` | Invoice + payment forms | **IMPLEMENTED** | None needed | `requireUser()` | `check` payment method added by 0029 |
| Partial & Pending Payments | `pending_payments` | `/admin/payments`, `/admin/renewals` | **IMPLEMENTED** | None needed | `requireUser()` | Reconciliation unverified |
| Payment History & Receipts | `payments` | `/admin/invoices/[id]` | **IMPLEMENTED** | None needed | `requireUser()` | Refund action missing |
| Daily Check-in/Check-out | `attendance` | `/admin/attendance` | **IMPLEMENTED** | **⚠️ WRONG** — nav shows `featureKey: "attendance"`, phase registry says PHASE_2 | `requireUser()` | Attendance is Phase 1 per landing page but System B marks it PHASE_2 |
| Attendance History | `attendance` | `/admin/attendance` | **IMPLEMENTED** | Same issue | `requireUser()` | Same |
| Attendance Reports | `reports` | `/admin/reports/attendance` | **IMPLEMENTED** | Same issue | `requireUser()` | Same |
| Expiring in 7/30 Days | `expiry` | `/admin/members?expiring_within=*` | **IMPLEMENTED** | None needed | `requireUser()` | None |
| Expired Members | `expiry` | `/admin/members?sub_status=expired` | **IMPLEMENTED** | None needed | `requireUser()` | None |
| Key Business Overview (Dashboard) | `dashboard` | `/admin/dashboard` | **IMPLEMENTED** | None needed | `requireUser()` | None |
| Today's Collection & Attendance | `dashboard` | `/admin/dashboard` | **IMPLEMENTED** | None needed | `requireUser()` | None |
| Basic Business Reports | `reports` | `/admin/reports` | **IMPLEMENTED** | **⚠️ WRONG** — System B marks as PHASE_2 | `requireUser()` | Reports is Phase 1 per landing page |
| Owner/Admin/Receptionist/Trainer roles | `staff` | Portal layouts | **IMPLEMENTED** | None needed | `requirePortalContext()` | None |
| Basic Role-Based Access | `staff` | Middleware + portal layouts | **IMPLEMENTED** | None needed | Middleware | None |

### PHASE 2 / GROWTH Features

| Feature (landing page) | Feature Key | Route | Implementation | Middleware Guard | Action Guard | Problems |
|---|---|---|---|---|---|---|
| Lead Management & Pipeline | `crm` | `/admin/leads` | **IMPLEMENTED** | ✅ `/admin/leads` → `crm` | ✅ `lead-actions.ts` | No `trial_at` scheduling UI; no dedicated leads report page |
| Follow-ups & Reminders | `crm` | `/admin/leads` | **IMPLEMENTED** | ✅ | ✅ | Follow-up date field exists; no automated reminder sending |
| Trial Management | `crm` | `/admin/leads` | **PARTIAL** | ✅ | ✅ | `trial_at` field exists in DB; no dedicated trial scheduling UI flow |
| Lead Conversion & Lost Reasons | `crm` | `/admin/leads` | **IMPLEMENTED** | ✅ | ✅ | `convertLead()` works; lost reason validated |
| Sales Reports | `crm` | None | **MISSING** | N/A | N/A | No dedicated CRM/sales report page |
| Income & Expense Management | `finance` | `/admin/finance/income`, `/admin/finance/expenses` | **IMPLEMENTED** | ✅ `/admin/finance` → `finance` | ✅ `finance-actions.ts` | None |
| Cash Book & Bank Transactions | `finance` | `/admin/finance/cash-book`, `/admin/finance/bank` | **IMPLEMENTED** | ✅ | ✅ | None |
| Outstanding & Receivables | `finance` | `/admin/finance/outstanding` | **IMPLEMENTED** | ✅ | ✅ | None |
| GST Tracking | `gst` → should be under `finance` | `/admin/finance/gst` | **IMPLEMENTED** | ✅ (covered by `finance` prefix) | ✅ | `gst` key in registry but middleware uses `finance` for this prefix |
| Profit & Loss Reports | `finance` | `/admin/finance/reports/profit-loss` | **IMPLEMENTED** | ✅ | ✅ | None |
| Trainer Profiles & Assignments | `pt` | `/admin/trainers` | **IMPLEMENTED** | ✅ `/admin/trainers` → `pt` | ✅ `pt-actions.ts` | None |
| PT Packages & Sessions | `pt` | `/admin/pt` | **IMPLEMENTED** | ✅ `/admin/pt` → `pt` | ✅ | `complete_pt_session` RPC undocumented |
| Session Balance Tracking | `pt` | `/admin/pt` (credits table) | **IMPLEMENTED** | ✅ | ✅ | No dedicated balance UI; embedded in PT page |
| Trainer Performance | `pt` | None | **MISSING** | N/A | N/A | No trainer performance/revenue report page |
| Payment & Renewal Reminders (WhatsApp) | `whatsapp` | Member communication menu | **PARTIAL** | ❌ No guard | ❌ No action guard | Deep-link only; no provider; no delivery; no history |
| Expiry & Inactive Member Alerts | `smart_alerts` | `/admin/notifications` | **PARTIAL** | ❌ No middleware guard | DB triggers exist | Notification page has no entitlement check |
| Lead Follow-up Alerts | `crm` | Auto (notification triggers) | **PARTIAL** | ✅ `crm` | ✅ | No automated follow-up reminder trigger; manual only |
| Trial & Offer Messages | `whatsapp` | `lib/member-messages.ts` | **PARTIAL** | ❌ | ❌ | Deep-link only |
| Expiry/Pending/Follow-up Alerts (Automation) | `smart_alerts` | DB triggers (0023/0024/0028) | **PARTIAL** | ❌ No guard on notification paths | DB-side ✅ | `smart_alerts` not in middleware FEATURE_ROUTE_PREFIXES |
| PT Renewal Alerts | `smart_alerts` | Not yet implemented | **MISSING** | N/A | N/A | No PT-specific notification trigger |
| eSSL / Supported Devices | `biometric` | `/admin/machines` | **IMPLEMENTED** | ✅ `/admin/machines` → `biometric` | ✅ `biometric-actions.ts` | Single gym validated; second gym not tested |
| Automatic Attendance Sync | `biometric` | `/iclock`, `/api/biometric/essl/events` | **IMPLEMENTED** | ✅ | eSSL auth | Hardware test pending |
| Device Mapping & Logs | `biometric` | `/admin/attendance` (sync logs) | **IMPLEMENTED** | ✅ | ✅ | None |
| Revenue & Expense Trends | `advanced_reports` | `/admin/reports/revenue` | **PARTIAL** | ❌ No middleware guard | `requireUser()` | `/admin/reports/*` not in FEATURE_ROUTE_PREFIXES; direct URL accessible for Essential |
| Outstanding Ageing | `finance` | `/admin/finance/outstanding` | **PARTIAL** | ✅ | ✅ | Basic ageing; no visual chart |
| Trainer & PT Revenue | `pt` + `advanced_reports` | None | **MISSING** | N/A | N/A | No trainer revenue report |
| Advanced Filters & Exports | `advanced_reports` | `/api/reports` | **PARTIAL** | ❌ `/api/reports` not in middleware | `requireUser()` | Missing plan check on reports API |

### PHASE 3 / SCALE Features

| Feature (landing page) | Key | Route | Implementation | Status |
|---|---|---|---|---|
| Multi-Branch Management | `multi_branch` | N/A (single branch per gym) | **MISSING** | Phase 3 |
| Multiple Branches & Staff | `multi_branch` | N/A | **MISSING** | Phase 3 |
| Branch-wise Dashboards | `multi_branch` | N/A | **MISSING** | Phase 3 |
| Member Transfer Between Branches | `multi_branch` | N/A | **MISSING** | Phase 3 |
| Consolidated Reports | `multi_branch` | N/A | **MISSING** | Phase 3 |
| Advanced Roles & Permissions | `enterprise_rbac` | N/A | **MISSING** | Phase 3 |
| Approval Workflows | `enterprise_rbac` | N/A | **MISSING** | Phase 3 |
| Discount/Refund Approvals | `enterprise_rbac` | N/A | **MISSING** | Phase 3 |
| Complete Audit Logs | `enterprise_rbac` | `/superadmin/audit-logs` (SA only) | **PARTIAL** | Activity logs exist but only in SA; not tenant-accessible |
| Chart of Accounts | `advanced_accounting` | `/admin/finance/accounting/chart-of-accounts` | **IMPLEMENTED** | ⚠️ Middleware guards `advanced_accounting` with Phase 3 key — CORRECT. But landing page says Growth includes "Finance & Accounts" which includes P&L. Chart of Accounts is Phase 3 per registry. Alignment issue — see below. |
| Journal & Ledger | `advanced_accounting` | `/admin/finance/accounting/journal`, `/ledger` | **IMPLEMENTED** | Same as above |
| Trial Balance, P&L, Balance Sheet | `advanced_accounting` | `/admin/finance/accounting/trial-balance` | **PARTIAL** | Balance Sheet missing |
| Bank Reconciliation | `advanced_accounting` | Not implemented | **MISSING** | Phase 3 |
| GST & Advanced Financial Reports | `gst` | `/admin/finance/gst` | **PARTIAL** | Under `finance` key in middleware (Phase 2) but labeled "Advanced" in P3 |
| Automation Engine | `advanced_automation` | N/A | **MISSING** | Phase 3 |
| Retention Intelligence | `retention_intelligence` | N/A | **MISSING** | Phase 3 |
| AI Business Intelligence | `ai_insights` | N/A | **MISSING** | Phase 3 |
| Payment Gateways & WhatsApp API | `api_webhooks` | N/A | **MISSING** | Phase 3 |
| Member Self-Service App | `member_portal` | `/member/*` | **PARTIAL** | Member portal exists; basic read-only; classified Phase 1 in System B (correct for Essential) |
| APIs & Webhooks | `api_webhooks` | N/A | **MISSING** | Phase 3 |

---

## PART 4 — Plan Mismatches Found

### A. Essential Problems (Phase 1 features incorrectly treated)

| Issue | Detail | Risk |
|---|---|---|
| **Attendance classified as Phase 2 in System B** | `lib/phases/registry.ts` puts `attendance` in `PHASE_2`. Landing page says attendance is Phase 1 (Essential). System B sidebar will lock attendance icon on Essential plan. | Essential users cannot see Attendance in sidebar |
| **Reports classified as Phase 2 in System B** | `lib/phases/registry.ts` puts `reports` in `PHASE_2`. Landing page says "Basic Business Reports" is Phase 1. System B sidebar will lock reports for Essential. | Essential users cannot see Reports in sidebar |
| **Payments classified as Phase 2 in System B** | `lib/phases/registry.ts` puts `payments` in `PHASE_2`. Landing page says payments are Phase 1. | Essential users cannot see Payments in sidebar |
| **Notifications classified as Phase 2 in System B** | `lib/phases/registry.ts` puts `notifications` in `PHASE_2`. Basic expiry notifications should be Essential. | Essential users cannot see Notifications in sidebar |
| **Appointments in System B is Phase 2** | `lib/phases/registry.ts` marks `appointments` as PHASE_2. This may be correct but is not explicitly in the landing page Essential feature list — needs product decision. | Ambiguous |
| **Equipment classified as Phase 2 in System B** | `lib/phases/registry.ts` puts `equipment` in `PHASE_2`. System A registry has `equipment` in `phase_1`. | Conflict between System A and System B |
| **All Phase 1 features have no middleware guard** | Correct by design — Phase 1 is always available. But the sidebar uses System B which (when 0041 is applied) will incorrectly lock attendance/payments/reports. | Essential users locked out |

### B. Growth Problems (Phase 2 features)

| Issue | Detail | Risk |
|---|---|---|
| **Accounting (CoA, Journal, Ledger) should be Growth but is Phase 3 in System A** | `lib/entitlements/registry.ts` maps `advanced_accounting` and `accounting` to `phase_3`. Middleware blocks `/admin/finance/accounting` with `advanced_accounting` (Phase 3). BUT the landing page Growth plan includes "Finance & Accounts" with "Chart of Accounts, Journal & Ledger, Trial Balance, P&L, Balance Sheet". | Growth users cannot access accounting — P1 BLOCKER |
| **`/admin/reports/*` sub-pages have no middleware guard** | `advanced_reports` is phase_2 in System A, but `/admin/reports/revenue`, `/admin/reports/members`, etc. are not in `FEATURE_ROUTE_PREFIXES` in middleware. Essential users can directly access these URLs. | Essential users bypass plan lock on advanced reports |
| **`/api/reports` not in middleware FEATURE_ROUTE_PREFIXES** | Direct API access to reports not plan-gated | Essential users can call reports API |
| **`smart_alerts` / notifications not in middleware** | `/admin/notifications` has no middleware guard. Phase 2 feature accessible to Essential directly. | Essential bypass |
| **WhatsApp is Phase 2 but has no backend guard** | No `hasCurrentFeature("whatsapp")` in any server action. The deep-link opens regardless of plan. Not a real provider anyway, but the guard is absent. | Minor — no real delivery |
| **`gst` registry key in System A is `phase_2` but middleware uses `finance` prefix** | The feature key `gst` is registered but never appears in `FEATURE_ROUTE_PREFIXES`. All GST pages are under `/admin/finance/` so they're implicitly covered by the `finance` guard. | Functionally OK but key is unused |
| **`growth_permissions` key exists in registry but is never checked** | `growth_permissions` is `phase_2` but no route, action, or service uses `hasCurrentFeature("growth_permissions")` | Orphaned registry key |

### C. Scale Problems (Phase 3 features)

| Issue | Detail | Risk |
|---|---|---|
| **Accounting should be Growth, not Scale** | Landing page puts Chart of Accounts + Journal + Ledger + Trial Balance + P&L in GROWTH. System A marks `advanced_accounting` as `phase_3`, blocking Growth users from it. | Major commercial mismatch — Growth users pay ₹15,999 but cannot use accounting |
| **`accounting` key (Phase 3) and `advanced_accounting` key (Phase 3) both exist** | Two keys for accounting-level features, both Phase 3. Should be consolidated to Phase 2 for Growth alignment. | Duplication |
| **Scale features (multi_branch, enterprise_rbac, ai_insights, etc.) are correctly Phase 3** | Not implemented; correctly guarded or simply absent | OK — no false positive |

### D. Architecture Problems

| Issue | Detail |
|---|---|
| **Two parallel feature registries** | `lib/entitlements/registry.ts` (System A, 3 plans) and `lib/phases/registry.ts` (System B, 2 phases) define overlapping feature keys. They disagree on which phase several features belong to. |
| **Two plan tiers in lib/entitlements.ts** | `getCommercialPlanTier()` returns `"free"` / `"paid"` — a two-tier model. This conflicts with the three-plan commercial model. The sidebar uses this two-tier result. |
| **Migrations 0040 + 0041 not applied** | `system_phases` and `feature_phases` tables don't exist in QA. Phase.service.ts falls back to hardcoded PHASE_1=active, PHASE_2=locked for all tenants regardless of plan. |
| **Duplicate migration prefix 0040** | Two files: `0040_member_financial_write_rls.sql` and `0040_shradha_phase1_security_hardening.sql` — same problem as previous 0008/0019/0022 duplicates |
| **`feature_locked` redirect goes to dashboard, not upgrade page** | When middleware blocks a Phase 2 route, it redirects to `PORTAL_DASHBOARD[roleSlug]` with `?error=feature_locked`. No upgrade CTA is shown. |
| **System B sidebar phase-locking doesn't map to plan_2/plan_3** | When 0041 is applied, the sidebar will show Phase 2 items as locked when `commercialPlanTier === "free"`. But "free" means plan_1 (Essential) only. A plan_2 (Growth) tenant would show `commercialPlanTier = "paid"`, so the sidebar correctly unlocks. However, System B's `canAccessFeature()` checks `PHASE_2 && free` — it doesn't understand plan_3 (Scale) separately. |
| **`system_phases` RLS requires `super_admin` role** | `system_phases_read` policy only allows `super_admin`. Regular users calling `getPhaseSnapshot()` get empty result → fall back to default → all Phase 2 locked. This is correct behavior but means the phase snapshot from DB can never serve non-SA users, making the DB tables redundant for per-tenant gating. |

---

## PART 5 — UI / Navigation Audit

### Current sidebar behavior (System B, with 0041 NOT applied)

Since `system_phases` table doesn't exist yet, `getPhaseSnapshot()` always returns default: PHASE_1=active, PHASE_2=locked.

`getCommercialPlanTier(plan)` from `lib/entitlements.ts`:
- Talwalkar (`plan=standard`) → `"free"` (Essential)
- Any `professional` plan → `"paid"` (Growth)
- Any `enterprise` plan → `"paid"` (Scale, but treated same as Growth in UI)

Sidebar `phaseLocked` check: `phaseFeature?.status === "locked" && commercialPlanTier === "free"`

Since phase.service defaults PHASE_2=locked AND nav items like `attendance`, `payments`, `reports`, `finance`, `trainers` etc. have `featureKey` from `lib/phases/registry.ts` (System B), **all PHASE_2 nav items show as locked for any tenant** regardless of plan.

**Actual observed sidebar behavior for a professional (Growth) tenant:**
- `commercialPlanTier = "paid"` (because `professional` → `"paid"`)
- `phaseLocked = false` (because `"paid" !== "free"`)
- All items show as unlocked in sidebar ✅ for Growth

**Actual observed sidebar behavior for a trial/standard (Essential) tenant:**
- `commercialPlanTier = "free"`
- `phaseLocked = true` for PHASE_2 items → shows `PhaseLockedMenuItem`
- Phase 1 items still show normally

**BUT**: Nav items for Phase 1 features (`attendance`, `payments`, `reports`) that are incorrectly classified as PHASE_2 in System B will show as locked for Essential — **wrong behavior**.

### What happens on direct URL access (bypassing sidebar)

- `/admin/finance` → ✅ Middleware blocks with `finance` (plan_2)
- `/admin/leads` → ✅ Middleware blocks with `crm` (plan_2)
- `/admin/pt` → ✅ Middleware blocks with `pt` (plan_2)
- `/admin/machines` → ✅ Middleware blocks with `biometric` (plan_2)
- `/admin/trainers` → ✅ Middleware blocks with `pt` (plan_2)
- `/admin/finance/accounting` → ✅ Middleware blocks with `advanced_accounting` (plan_3) — **BUT wrongly blocks Growth users**
- `/admin/reports/revenue` → ❌ No middleware guard — accessible by Essential
- `/admin/notifications` → ❌ No middleware guard — accessible by Essential
- `/admin/attendance` → ❌ No middleware guard (Phase 1 feature, correct — but System B mislabels it)
- `/api/reports` → ❌ No middleware guard — accessible by Essential

---

## PART 6 — Backend Security Audit

### Routes accessible by Essential (plan_1) that should require Growth (plan_2)

| Route/API | Method | Risk | Evidence |
|---|---|---|---|
| `/admin/reports/revenue` | GET (page) | Essential can view Growth revenue reports | No entry in `FEATURE_ROUTE_PREFIXES` |
| `/admin/reports/members` | GET (page) | Same | Same |
| `/admin/reports/payments` | GET (page) | Same | Same |
| `/admin/reports/attendance` | GET (page) | Same | Same |
| `/api/reports` | GET | Essential can call reports API | Not in middleware |
| `/admin/notifications` | GET (page) | Essential can view notification list | Not in middleware |
| `/admin/notifications/new` | GET+POST | Essential can create notifications | Not in middleware; no action guard |
| Finance **read** pages (income list, expense list, bank list) | GET | No guard at page level — middleware only blocks at `/admin/finance` prefix, but the page-level `requireUser()` has no `hasCurrentFeature("finance")` check. The middleware **does** catch `/admin/finance/*` so this is OK. | ✅ Middleware covers it |
| `createNotificationAction` | Server action | No `hasCurrentFeature("smart_alerts")` | `notification-actions.ts` — no entitlement check |

### Routes accessible by Growth (plan_2) that should require Scale (plan_3)

| Route/API | Risk | Evidence |
|---|---|---|
| `/admin/finance/accounting/*` | Growth users CANNOT access — middleware blocks with `advanced_accounting` (plan_3). But landing page says accounting is in Growth. | **Commercial mismatch — Growth wrongly blocked** |

### Server actions with no entitlement check (bypass risk)

| Action file | Missing check | Risk |
|---|---|---|
| `notification-actions.ts` — `createNotificationAction` | No `hasCurrentFeature` | Essential can create notifications |
| `member-actions.ts` | No entitlement check | Phase 1 — correct, no check needed |
| `member-management-actions.ts` | No entitlement check | Phase 1 — correct |
| `staff-account-actions.ts` | No entitlement check | Phase 1 — correct |
| `subscription-actions.ts` | No entitlement check | Phase 1 core — correct |
| `appointment-actions.ts` | No entitlement check | Appointments are Phase 2 per System B but not in System A middleware — gap |
| `settings-actions.ts` | No entitlement check | Settings — Phase 1 |

---

## PART 7 — Talwalkar Safety

**All checks performed read-only. Talwalkar not modified.**

Current Talwalkar DB state (from prior audit):
- `plan = "standard"` → maps to `plan_1` (Essential)
- `status = "active"`
- Uses Finance, Biometric features

**This is a data issue, not a code issue.** Talwalkar's plan should be `professional` (plan_2 / Growth) to match features in use. However, this audit makes no changes. The fix is a single SuperAdmin plan change.

---

## PART 8 — Phase Readiness Summary

### Phase 1 / Essential

| Dimension | Status | Notes |
|---|---|---|
| Commercial readiness | **PARTIAL** | Plan mapping correct; three-plan labels not surfaced to users |
| Implementation readiness | **IMPLEMENTED** | Core features work |
| Entitlement readiness | **PARTIAL** | System A correctly allows all Phase 1; System B incorrectly locks attendance/payments/reports as Phase 2 |
| UI readiness | **PARTIAL** | Sidebar incorrectly locks attendance/payments/reports for Essential |
| Backend security readiness | **PASS** | Phase 1 routes correctly unguarded; no Phase 2 leakage into Phase 1 actions |

### Phase 2 / Growth

| Dimension | Status | Notes |
|---|---|---|
| Commercial readiness | **PARTIAL** | Accounting (CoA/Journal/Ledger) is Phase 3 in System A but should be Growth — commercial blocker |
| Implementation readiness | **PARTIAL** | CRM, Finance, PT, Biometric implemented; WhatsApp partial; automation partial |
| Entitlement readiness | **PARTIAL** | Middleware guards main routes; reports sub-pages and notifications unguarded |
| UI readiness | **PARTIAL** | Growth users see unlocked sidebar; some features accessible via direct URL for Essential |
| Backend security readiness | **PARTIAL** | Server actions guard CRM/Finance/PT/Biometric; notifications and reports actions unguarded |

### Phase 3 / Scale

| Dimension | Status | Notes |
|---|---|---|
| Commercial readiness | **NOT READY** | Scale features not implemented |
| Implementation readiness | **MISSING** | Multi-branch, AI, automation engine, enterprise RBAC not implemented |
| Entitlement readiness | **IMPLEMENTED** (correctly Phase 3) | `advanced_accounting` middleware guard works; but accounting should be Growth not Scale |
| UI readiness | **N/A** | No Scale UI exists |
| Backend security readiness | **N/A** | No Scale routes exist to guard |

---

## PART 9 — Master Feature Matrix

| Feature | Phase | Essential | Growth | Scale | Implementation | Route | Middleware | Action Guard | Direct URL | Current Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| Member Profiles & ID | 1 | YES | YES | YES | IMPLEMENTED | `/admin/members` | None (P1) | None (P1) | ✅ Open | None |
| Active/Expired Members | 1 | YES | YES | YES | IMPLEMENTED | `/admin/members?*` | None (P1) | None (P1) | ✅ Open | None |
| Membership Plans & Renewals | 1 | YES | YES | YES | IMPLEMENTED | `/admin/memberships` | None (P1) | None (P1) | ✅ Open | None |
| Member Search & Import/Export | 1 | YES | YES | YES | IMPLEMENTED | `/admin/members` | None (P1) | None (P1) | ✅ Open | None |
| Membership Billing | 1 | YES | YES | YES | IMPLEMENTED | `/admin/invoices` | None (P1) | None (P1) | ✅ Open | None |
| Payments — Cash/UPI/Card/Bank | 1 | YES | YES | YES | IMPLEMENTED | `/admin/payments` | None (P1) | None (P1) | ✅ Open | Sidebar featureKey=payments → System B PHASE_2 — **Essential sidebar shows Payments as locked** |
| Partial & Pending Payments | 1 | YES | YES | YES | IMPLEMENTED | `/admin/payments` | None (P1) | None (P1) | ✅ Open | Same |
| Payment History & Receipts | 1 | YES | YES | YES | IMPLEMENTED | `/admin/invoices/[id]` | None (P1) | None (P1) | ✅ Open | None |
| Daily Attendance | 1 | YES | YES | YES | IMPLEMENTED | `/admin/attendance` | None (P1) | None (P1) | ✅ Open | Sidebar featureKey=attendance → System B PHASE_2 — **Essential sidebar shows Attendance as locked** |
| Attendance History | 1 | YES | YES | YES | IMPLEMENTED | `/admin/attendance` | None (P1) | None (P1) | ✅ Open | Same |
| Expiry — 7/30/Expired | 1 | YES | YES | YES | IMPLEMENTED | `/admin/members?*` | None (P1) | None (P1) | ✅ Open | None |
| Dashboard | 1 | YES | YES | YES | IMPLEMENTED | `/admin/dashboard` | None (P1) | None (P1) | ✅ Open | None |
| Basic Reports | 1 | YES | YES | YES | IMPLEMENTED | `/admin/reports` | None (P1) | None (P1) | ✅ Open | Sidebar featureKey=reports → System B PHASE_2 — **Essential sidebar shows Reports as locked** |
| Staff/Roles | 1 | YES | YES | YES | IMPLEMENTED | Portal layouts | Portal role gate | `requireUser()` | ✅ Protected | None |
| Lead Management & Pipeline | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/leads` | ✅ `crm` | ✅ `crm` | ✅ Blocked | No sales report; no trial scheduling UI |
| Follow-ups & Reminders | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/leads` | ✅ `crm` | ✅ `crm` | ✅ Blocked | No automated reminder trigger |
| Lead Conversion | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/leads` | ✅ `crm` | ✅ `crm` | ✅ Blocked | None |
| Income & Expense Management | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/finance/*` | ✅ `finance` | ✅ `finance` | ✅ Blocked | None |
| Cash Book & Bank | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/finance/*` | ✅ `finance` | ✅ `finance` | ✅ Blocked | None |
| Outstanding & Receivables | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/finance/*` | ✅ `finance` | ✅ `finance` | ✅ Blocked | None |
| GST Tracking | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/finance/gst` | ✅ (under `finance`) | ✅ `finance` | ✅ Blocked | `gst` registry key unused |
| P&L Reports | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/finance/*` | ✅ `finance` | ✅ `finance` | ✅ Blocked | None |
| Chart of Accounts | **2 per landing, 3 in code** | LOCKED | **SHOULD: YES — ACTUAL: LOCKED** | YES | IMPLEMENTED | `/admin/finance/accounting` | ✅ `advanced_accounting` (P3) | N/A | ✅ Blocked | **CRITICAL MISMATCH — Growth users cannot access CoA/Journal/Ledger** |
| Journal & Ledger | **2 per landing, 3 in code** | LOCKED | **SHOULD: YES — ACTUAL: LOCKED** | YES | IMPLEMENTED | `/admin/finance/accounting` | ✅ `advanced_accounting` (P3) | N/A | ✅ Blocked | **Same — Growth wrongly blocked** |
| Trial Balance / P&L Sheet | **2 per landing, 3 in code** | LOCKED | **SHOULD: YES — ACTUAL: LOCKED** | YES | PARTIAL | `/admin/finance/accounting` | ✅ (P3) | N/A | ✅ Blocked | **Same** |
| Trainer Profiles & Assignments | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/trainers` | ✅ `pt` | ✅ `pt` | ✅ Blocked | None |
| PT Packages & Sessions | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/pt` | ✅ `pt` | ✅ `pt` | ✅ Blocked | `complete_pt_session` undocumented |
| Session Balance Tracking | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/pt` | ✅ `pt` | ✅ `pt` | ✅ Blocked | No dedicated balance page |
| Trainer Performance Reports | 2 | LOCKED | YES | YES | MISSING | None | N/A | N/A | N/A | Not built |
| WhatsApp Communication | 2 | LOCKED | YES | YES | PARTIAL | Member comm menu | ❌ None | ❌ None | ❌ Accessible | Deep-link only; no provider; no guard |
| Expiry/Pending Alerts | 2 | LOCKED | YES | YES | PARTIAL | `/admin/notifications` | ❌ None | ❌ None | ❌ Accessible | No middleware guard on notifications |
| eSSL Biometric Integration | 2 | LOCKED | YES | YES | IMPLEMENTED | `/admin/machines`, `/iclock` | ✅ `biometric` | ✅ `biometric` | ✅ Blocked | Second gym hardware not validated |
| Automatic Attendance Sync | 2 | LOCKED | YES | YES | IMPLEMENTED | `/api/biometric/essl/events` | ✅ `biometric` | eSSL auth | ✅ Blocked | None |
| Advanced Reports (Revenue/Expense Trends) | 2 | LOCKED | YES | YES | PARTIAL | `/admin/reports/revenue` | ❌ None | ❌ None | ❌ Accessible | No middleware guard on `/admin/reports/*` sub-pages |
| Multi-Branch Management | 3 | LOCKED | LOCKED | YES | MISSING | N/A | N/A | N/A | N/A | Phase 3 — not built |
| Enterprise RBAC / Approvals | 3 | LOCKED | LOCKED | YES | MISSING | N/A | N/A | N/A | N/A | Phase 3 — not built |
| Automation Engine | 3 | LOCKED | LOCKED | YES | MISSING | N/A | N/A | N/A | N/A | Phase 3 — not built |
| Retention Intelligence | 3 | LOCKED | LOCKED | YES | MISSING | N/A | N/A | N/A | N/A | Phase 3 — not built |
| AI Business Intelligence | 3 | LOCKED | LOCKED | YES | MISSING | N/A | N/A | N/A | N/A | Phase 3 — not built |
| Integrations & Member App | 3 | LOCKED | LOCKED | YES | MISSING | N/A | N/A | N/A | N/A | Phase 3 — not built |

---

## PART 10 — Final Recommendations

### 1. What is already correct

- **System A (middleware + server actions)** correctly maps plan_1/2/3 to phases and blocks the main Growth routes from Essential tenants
- **`lib/entitlements/registry.ts` plan mapping** is correct — plan_1=Essential, plan_2=Growth, plan_3=Scale
- **`lib/entitlements/evaluate.ts` `normalizePlan()`** correctly maps legacy DB values (trial/standard/professional/enterprise) to plan IDs
- **Server action guards** for CRM, Finance, PT, Biometric work correctly via `hasCurrentFeature()`
- **SuperAdmin plan-change** with audit log works; Talwalkar correctly hardcoded against plan change
- **Upgrade page** (`/admin/upgrade`) exists with correct message; the route redirect just needs fixing

### 2. What is wrong

1. **`advanced_accounting` / `accounting` keys are Phase 3 in System A** but accounting (CoA/Journal/Ledger/Trial Balance/P&L) is a Growth feature per the landing page — blocks Growth users from accounting they pay for
2. **System B `lib/phases/registry.ts` classifies Essential features as Phase 2**: `attendance`, `payments`, `reports`, `notifications`, `equipment` — sidebar incorrectly shows these as locked for Essential
3. **Migrations 0040 and 0041 not applied** — phase-gating tables don't exist in QA; System B always falls back to PHASE_1=active, PHASE_2=locked regardless of tenant plan
4. **Duplicate migration prefix 0040** — `0040_member_financial_write_rls.sql` and `0040_shradha_phase1_security_hardening.sql`
5. **`/admin/reports/*` sub-pages not in middleware** — advanced reports directly accessible by Essential
6. **`/admin/notifications` not in middleware** — accessible by Essential
7. **`feature_locked` redirect goes to dashboard** instead of `/admin/upgrade?feature=X&next=Y`
8. **`system_phases` RLS only allows `super_admin`** — normal users' `getPhaseSnapshot()` calls get empty result → always default → System B sidebar always defaults to PHASE_1 active/PHASE_2 locked

### 3. What is missing

1. `/admin/reports/*` middleware guards for `advanced_reports`
2. `/admin/notifications` middleware guard for `smart_alerts`  
3. Appointment actions entitlement check (appointments are Phase 2)
4. `createNotificationAction` entitlement check
5. Commercial plan name labels ("Essential", "Growth", "Scale") anywhere in the UI — users see no plan name
6. Three-tier upgrade page (showing Essential → Growth → Scale pricing)
7. Trainer performance report
8. CRM/sales report
9. PT renewal notification triggers
10. WhatsApp provider integration (real delivery)

### 4. What must be changed

In priority order:

**P0 — Fix accounting phase assignment (commercial blocker for Growth)**
- Change `advanced_accounting` and `accounting` keys in `lib/entitlements/registry.ts` from `phase_3` to `phase_2`
- Change middleware entry from `{ prefix: "/admin/finance/accounting", feature: "advanced_accounting" }` to use a Phase 2 key
- Growth (plan_2) users must be able to access `/admin/finance/accounting`

**P0 — Fix System B phase registry for Phase 1 features**
- In `lib/phases/registry.ts`, move `attendance`, `payments`, `reports`, `notifications`, `equipment` from `PHASE_2` to `PHASE_1`
- These are Essential features per the landing page

**P1 — Fix feature_locked redirect to point to upgrade page**
- In `middleware.ts`, change redirect from `PORTAL_DASHBOARD[roleSlug]` to `/admin/upgrade?feature=<key>&next=<pathname>`

**P1 — Add middleware guards for reports and notifications**
- Add to `FEATURE_ROUTE_PREFIXES`:
  ```ts
  { prefix: "/admin/reports", feature: "reports" },
  { prefix: "/api/reports", feature: "reports" },
  { prefix: "/admin/notifications", feature: "smart_alerts" },
  ```
- Note: `/admin/reports` itself is Phase 1 (basic reports) but `/admin/reports/*` sub-pages are Phase 2 (advanced reports). This needs careful prefix matching.

**P1 — Resolve duplicate 0040 migration prefix**
- Same problem as previous 0008/0019/0022/0027 duplicates
- Rename one of the 0040 files before next `db push`

**P1 — Apply migration 0041 after fixing phase registry**
- But only after fixing System B registry — do not apply 0041 with the current wrong PHASE assignments

**P2 — Add `createNotificationAction` entitlement check**
- Add `if (!(await hasCurrentFeature("smart_alerts"))) return { error: "..." }` to `createNotificationAction`

**P2 — Fix `system_phases` RLS to allow authenticated read**
- Current policy: `app_role() = 'super_admin'` — only SA can read
- Should allow any authenticated user to read (it's not sensitive data) so `getPhaseSnapshot()` works for all portals
- Or: pass phase snapshot from server (as currently done via layout) — the current approach of reading in layout and passing to portal shell is actually fine; the RLS just means the DB query returns nothing, falls back to default. This is acceptable but the default values must be correct.

### 5. What must NOT be changed

- `lib/entitlements/evaluate.ts` plan mapping (`trial/standard → plan_1`, `professional → plan_2`, `enterprise → plan_3`) — correct
- `lib/entitlements/server.ts` `assertCurrentFeature` / `hasCurrentFeature` — correct
- Middleware portal role guards — correct
- Server action `requireUser()` role checks — correct
- Talwalkar plan — must only be changed by SuperAdmin, not by code
- Migration 0039 and earlier — applied and locked
- Finance/CRM/PT/Biometric server action guards — correct and working

### 6. Recommended fixing order

```
Step 1: Fix lib/entitlements/registry.ts
  - Change accounting/advanced_accounting from phase_3 → phase_2
  - This unlocks accounting for Growth immediately (via System A middleware)

Step 2: Fix lib/phases/registry.ts  
  - Move attendance, payments, reports, notifications, equipment from PHASE_2 → PHASE_1
  - This fixes System B sidebar for Essential tenants

Step 3: Fix middleware.ts
  - Change feature_locked redirect to /admin/upgrade
  - Add /admin/reports and /admin/notifications to FEATURE_ROUTE_PREFIXES
  - Keep /admin/reports (the hub page) accessible to Essential but block /admin/reports/* sub-pages with advanced_reports

Step 4: Resolve duplicate 0040 prefix
  - Rename 0040_shradha_phase1_security_hardening.sql to 0042_*

Step 5: Apply pending migrations (0040 + 0041) after above fixes
  - 0041 will correctly seed PHASE_1 active, PHASE_2 locked in DB

Step 6: Add missing entitlement checks to notification actions

Step 7: Update upgrade page to show three-plan names (Essential/Growth/Scale)
```

### 7. Dangerous/duplicate architecture

- **Two feature registries**: `lib/entitlements/registry.ts` (System A) and `lib/phases/registry.ts` (System B) with overlapping keys and disagreeing phase assignments — **this is the root cause of most audit findings**
- **Two plan tier systems**: `lib/entitlements/evaluate.ts` (plan_1/2/3) and `lib/entitlements.ts` (free/paid two-tier) — one for backend, one for frontend. Not dangerous but confusing.
- Both systems need to stay (System A for security, System B for sidebar UX) but their phase assignments must be **synchronized**

### 8. Production blockers

1. Accounting inaccessible to Growth users (commercial promise broken)
2. Attendance/Payments/Reports locked in sidebar for Essential users (wrong UX)
3. Migrations 0040 and 0041 not applied
4. Duplicate 0040 prefix blocks `db push`
5. Reports/notifications directly accessible by Essential (plan bypass)

### 9. Biometric-specific blockers

- Only `professional` (plan_2/Growth) and above should access biometric
- Middleware correctly blocks `/admin/machines` and `/api/biometric` for plan_1
- Second gym hardware validation not completed
- `complete_pt_session` RPC exists in DB with no migration definition — separate issue

### 10. Exact next implementation steps

```
1. [P0] lib/entitlements/registry.ts — change accounting + advanced_accounting → phase_2
   File: lib/entitlements/registry.ts
   Change: { phase: "phase_3" } → { phase: "phase_2" } for keys "accounting" and "advanced_accounting"
   
2. [P0] lib/phases/registry.ts — fix Essential features wrongly in PHASE_2
   File: lib/phases/registry.ts
   Change: attendance, payments, reports, notifications, equipment → phase: "PHASE_1"
   
3. [P1] middleware.ts — fix feature_locked redirect + add reports/notifications guards
   File: middleware.ts
   Add: FEATURE_ROUTE_PREFIXES entries for /admin/reports/* and /admin/notifications
   Fix: redirect target → /admin/upgrade?feature=X&next=Y
   
4. [P1] Rename 0040_shradha_phase1_security_hardening.sql → 0042_*
   
5. [P1] Apply migration 0040 (member_financial_write_rls) + 0041 (phase_gating) + 0042 (renamed)
   
6. [P2] notification-actions.ts — add hasCurrentFeature("smart_alerts") to createNotificationAction
   
7. [P2] Add upgrade CTA to admin dashboard when plan is Essential

8. [P2] Surface plan names (Essential/Growth/Scale) in settings/upgrade pages
```

---

*Read-only audit. No files modified. No database writes. Talwalkar untouched. Demo Gym untouched.*
