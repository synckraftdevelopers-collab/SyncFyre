# Syncfyre — Master SaaS Production Readiness Audit

**Audit date:** September 2026  
**Prepared by:** Architecture / QA review  
**Repository:** SyncTyre  
**QA project:** `siycjpmsujcxkvdsfcvq`  
**Method:** Read-only static inspection + read-only QA database probes  
**Production accessed:** NO. Talwalkar modified: NO. Demo Gym modified: NO.

---

## 1. Executive Summary

Syncfyre is a Next.js 15 + Supabase multi-tenant gym SaaS with a working entitlement system, five role-based portals, and a migration chain of 39 applied migrations. The core commercial architecture (Free = Phase 1, Paid = Phase 2) is correctly modelled in code, enforced at the middleware layer for known feature routes, and enforced in key server actions. The database schema, RLS, and tenant/branch isolation foundations are sound.

The product is **ready for internal testing and structured QA**, but is **not ready for a pilot gym or production launch** due to the following material gaps:

- Phase 2 entitlement enforcement is incomplete at the server-page level — middleware only guards known prefixes; pages without those prefixes render for any plan
- No billing/payment infrastructure — SuperAdmin manually changes plans with no automation, no webhook, and no subscription provider
- CRM and Finance pages have no entitlement guard at the page level (middleware guards `/admin/leads` and `/admin/finance`, which is correct, but secondary sub-routes are inconsistent)
- Demo Gym (`demo gym`, id `052375ac`) exists but has zero operational demo data — unsuitable for a sales demo today
- No automated E2E or integration tests; only unit tests for calculation logic
- WhatsApp is a deep-link generator only — no provider, no delivery, no history
- Biometric integration has a functional eSSL foundation but has not been validated with real hardware from a second gym
- `complete_pt_session` RPC exists remotely but has no local migration definition — a data-integrity blind spot

---

## 2. Current Architecture

```
Next.js 15 App Router
  ├── (public)        — landing, book-demo, terms, privacy
  ├── (auth)          — login, register, forgot/reset-password
  ├── (admin)         — admin portal (owner / admin / manager)
  ├── (reception)     — reception portal
  ├── (trainer)       — trainer + dietician portal
  ├── (member)        — member self-service portal
  ├── (superadmin)    — platform control
  ├── /machine        — standalone biometric terminal (cookie-auth)
  └── /iclock         — eSSL ZKTeco iClock protocol endpoint

Supabase (QA: siycjpmsujcxkvdsfcvq)
  ├── Auth (Supabase Auth — email/password)
  ├── Storage (member photos, documents)
  ├── Realtime (notifications channel)
  └── Database (39 migrations, RLS enabled)

Entitlements: lib/entitlements/ (registry + evaluate + server)
Portals: lib/portals.ts + lib/nav/
Middleware: tenant plan → feature gate → portal role gate
```

**Stack versions:** Next.js `^15.5.22`, React 19, @supabase/supabase-js `^2.49.1`, TypeScript `^5.8.2`, Playwright `^1.63.0` (devDependency, not used in CI yet), `xlsx` from SheetJS CDN (licensing risk — see §20).

---

## 3. Current Commercial Model

### Plan Storage in Database

| DB value | Mapped to internal plan | Commercial tier |
|---|---|---|
| `trial` | `plan_1` | **Free — Phase 1 only** |
| `standard` | `plan_1` | **Free — Phase 1 only** |
| `professional` | `plan_2` | **Paid — Phase 1 + Phase 2** |
| `enterprise` | `plan_3` | Phase 3 (future) |

### Current Tenant States (Live QA Database)

| Tenant | Plan | Status | Type | Is Demo | Protected |
|---|---|---|---|---|---|
| Talwalkar Gym | `standard` → `plan_1` (**Free**) | `active` | customer | false | false |
| QA Tenant A | `trial` → `plan_1` | `trial` | customer | false | false |
| QA Tenant B | `trial` → `plan_1` | `trial` | customer | false | false |
| talwalkar gym (duplicate) | `trial` → `plan_1` | `trial` | customer | false | false |
| **demo gym** (`052375ac`) | `trial` → `plan_1` | `trial` | **demo** | **true** | **true** |
| SyncFyre Demo (`22222222`) | `trial` → `plan_1` | `active` | customer | false | false |

**Important:** Talwalkar Gym is on `plan=standard` which maps to `plan_1` (Free). Finance, PT, Biometric, CRM are **locked** for Talwalkar under the current entitlement logic. This is likely a data artifact — Talwalkar is a production-like gym that needs `professional` (plan_2) if it should have Phase 2 features.

Plan-change audit logs confirm SuperAdmin toggled `SyncFyre Demo` between trial/standard multiple times on 2026-09-08 — confirming the plan-change mechanism works.

---

## 4. Demo Gym State

| Field | Value |
|---|---|
| Tenant ID | `052375ac-f0c8-45f8-91ee-da3e7f3ae71f` |
| Name | `demo gym` |
| Slug | `fitness` |
| Status | `trial` |
| Plan | `trial` (= Phase 1 / Free) |
| `tenant_type` | `demo` |
| `is_demo` | `true` |
| `is_protected` | `true` |
| `purpose` | `null` (not set) |
| Onboarding completed | `2026-09-06` |
| Members | **0** (no demo members) |
| Branches | 1 (Main Branch) |

**Assessment: NOT suitable for sales demo.** No members, no subscriptions, no payments, no attendance, no staff accounts for each role. The tenant_type/is_demo/is_protected flags are correctly set (passes governance tests). But it has no operational data. Synthetic fixture data must be created before it can be used for demonstrations.

**SyncFyre Demo** (`22222222`) has `is_demo=false` and `plan_1` — it is a second quasi-demo tenant that was used for plan-toggle testing but is not classified as a demo tenant.

---

## 5. Free vs Paid Entitlement Status

### Entitlement Architecture

The system uses a three-layer entitlement check:

1. **Middleware** (`middleware.ts`) — guards specific route prefixes before the page renders
2. **Server action** (`assertCurrentFeature` / `hasCurrentFeature`) — enforced in `finance-actions.ts`, `lead-actions.ts`, `biometric-actions.ts`, `pt-actions.ts`
3. **Per-feature override** — `tenant_features` table allows SuperAdmin per-tenant overrides

### Middleware-guarded routes (plan enforced before page load)

| Route prefix | Feature key | Phase |
|---|---|---|
| `/admin/finance/accounting` | `advanced_accounting` | Phase 3 |
| `/admin/leads` | `crm` | Phase 2 |
| `/api/leads` | `crm` | Phase 2 |
| `/admin/finance` | `finance` | Phase 2 |
| `/admin/pt` | `pt` | Phase 2 |
| `/api/finance` | `finance` | Phase 2 |
| `/api/pt` | `pt` | Phase 2 |
| `/admin/machines` | `biometric` | Phase 2 |
| `/api/biometric` | `biometric` | Phase 2 |
| `/admin/trainers` | `pt` | Phase 2 |
| `/api/trainers` | `pt` | Phase 2 |

Middleware correctly redirects to the portal dashboard with `?error=feature_locked&feature=<key>`. An `/admin/upgrade` page exists but it is **not wired to the `feature_locked` redirect** — the redirect goes to `PORTAL_DASHBOARD[roleSlug]` (i.e. `/admin/dashboard`), not `/admin/upgrade`. The upgrade page is reachable manually but the locked-feature flow does not lead there.

### Server-action-level entitlement checks

| Server action file | Feature checked |
|---|---|
| `finance-actions.ts` | `finance` |
| `lead-actions.ts` | `crm` |
| `biometric-actions.ts` | `biometric` |
| `pt-actions.ts` | `pt` |

### **CRITICAL GAP — Pages without middleware and without page-level check**

The following Phase 2 pages render data for **any** authenticated user regardless of plan, because neither middleware nor the page itself checks entitlement:

| Page | Feature | Risk |
|---|---|---|
| `/admin/finance/*` sub-pages (not all covered) | `finance` | Finance sub-pages partially covered |
| `/admin/leads` | `crm` | ✅ Middleware covers this |
| `/admin/notifications` | Phase 1 (`smart_alerts`) | Listed as phase_2 in registry but page has no guard |
| `/admin/reports/*` sub-pages | `advanced_reports` | No page-level guard |
| `/admin/settings` | n/a | Accessible to all admin roles regardless of plan |
| Admin nav items with `featureKey` (e.g. `finance`, `accounting`) | Various | Nav visibility is sidebar-only, not security |

**Assessment: PARTIAL.** Middleware guards the main Phase 2 entry points correctly. Server actions that mutate Phase 2 data are guarded. But: (a) some Phase 2 read pages are accessible without entitlement check, (b) the `feature_locked` redirect goes to dashboard not to the upgrade page, (c) no visible upgrade CTA is shown in the UI when a user is on Free.

---

## 6. Phase 1 Readiness

| Module | Status | Key gaps |
|---|---|---|
| Dashboard | **B — Implemented, incomplete** | No `feature_locked` banner; quick-actions link to Phase 2 pages; dashboard totals not reconciled against source |
| Members | **B — Implemented, incomplete** | Core CRUD works; no duplicate-member-by-phone prevention test; import audit history missing |
| Memberships | **B — Implemented, incomplete** | Plan CRUD works; freeze/hold/grace not implemented; duplicate active subscription rule not proven |
| Payments | **B — Implemented, incomplete** | List/invoice/receipt UI exists; `Total = Paid + Pending` not reconciled end-to-end; refund action not implemented |
| Pending Payments | **B — Implemented, incomplete** | Outstanding surface exists; reconciliation with finance unverified |
| Expiry | **B — Implemented, incomplete** | Expiry filters and cards exist; 0/7/15 day segments functional; boundary testing not done |
| Attendance | **B — Implemented, incomplete** | Manual and biometric surfaces exist; duplicate prevention logic exists; no complete role/branch negative test |
| Staff & roles | **B — Implemented, incomplete** | 7 roles implemented; deactivation lifecycle not fully tested; finance/destructive action bypass not proven |
| Trainer foundation | **B — Implemented, incomplete** | Trainer profile/assignment surfaces exist; trainer cannot access unrelated-member test absent |
| Basic reports | **B — Implemented, incomplete** | Multiple report pages exist; totals/filter parity not reconciled; export vs screen parity unverified |
| Import/Export | **B — Implemented, incomplete** | Excel/CSV import with validation; file-type validation recently added; import history table `member_import_batches` created but UI incomplete |
| Responsive | **C — Partially implemented** | Mobile card views exist; critical forms (payments, invoice) not verified at 360px; PWA manifest exists |

---

## 7. Phase 2 Readiness

| Module | Status | Entitlement protected? | Key gaps |
|---|---|---|---|
| **CRM / Lead Pipeline** | **B — Implemented, functional-looking** | ✅ Middleware + server action | No lead page-level entitlement check; no pipeline view UI (just a table); no trial scheduling UI; no bulk import of leads |
| **WhatsApp / Communications** | **C — Partial** | ❌ No entitlement check | Deep-link only, no provider, no delivery, no history. `lib/member-messages.ts` generates text. Not production communication. |
| **Advanced Membership Ops** | **C — Partial** | ❌ No page-level check | Freeze/hold/grace/installments/upgrade missing; RPC exists for pause/cancel/renew |
| **Finance Management** | **B — Implemented, incomplete** | ✅ Middleware | GST columns applied (migration 0026); income/expense/bank/P&L pages exist; journal/ledger/trial-balance exist; reconciliation not proven; accountant sign-off absent |
| **PT & Trainer Management** | **B — Implemented, incomplete** | ✅ Middleware + server action | Package/sell/schedule/complete cycle functional; `complete_pt_session` RPC exists remotely but no migration defines it; no revenue reports; no PT-specific notifications |
| **Biometric / Face Attendance** | **C — Partial** | ✅ Middleware + server action | eSSL event ingestion works for Talwalkar; tenant isolation via device_id→branch lookup; second-gym hardware not validated; no real-device replay attack test |
| **Smart Alerts / Automation** | **B — Implemented, incomplete** | ❌ No entitlement check at notification page | Notification system fully implemented; realtime configured; DB triggers fire on member/payment/membership/machine/tenant events; generalized trigger-condition-action workflow absent |
| **Advanced Reports** | **C — Partial** | ❌ No page-level entitlement check | Report pages exist; filter/export parity unproven; branch-filter consistency unproven |
| **Growth Permissions** | **C — Partial** | ❌ Not implemented as feature gate | Role foundations exist; Sales Executive / Accountant roles absent; role-specific permission matrix not enforced beyond portal access |
| **GST Finance** | **B — Implemented, incomplete** | ✅ (under `finance`) | GST columns on invoices/payments/income/expenses; `auto_income_from_payment` trigger; GST transactions table; GSTIN stored in `finance_settings`; no GST filing export |

---

## 8. Phase 3 Future Scope

Phase 3 is not part of the current commercial offering. The `advanced_accounting` feature key maps to Phase 3 in the registry and is correctly blocked by middleware. No Phase 3 features need to be assessed for production readiness. They are correctly classified as `F = Future`.

---

## 9. Authentication & Authorization

| Mechanism | Status |
|---|---|
| Login (email/password) | ✅ Implemented via Supabase Auth |
| Logout | ✅ Server action clears session |
| Forgot password | ✅ `forgotPasswordAction` sends reset email |
| Reset password | ✅ `resetPasswordAction` with token |
| Email verification | ❌ Not implemented — `enable_signup: false` in `config.toml`, registration is manual |
| Invitation flow | ❌ Not implemented — owner creates staff manually |
| Owner onboarding | ✅ `/onboarding` page with `bootstrapOrganizationAction` |
| Staff creation | ✅ SuperAdmin creates owner; owner creates staff via admin panel |
| Staff deactivation | **B — partial** — `status` field exists, no tested lifecycle |
| Session handling | ✅ Supabase SSR cookie refresh via middleware |
| Unauthorized route | ✅ Middleware redirects to login or portal dashboard |
| Incomplete profile | ✅ `ownerNeedsOnboarding` redirects to `/onboarding` |
| Tenant assignment | ✅ Required for all staff; enforced in auth helpers |

**New gym owner journey:**
1. Book demo (landing page form → `demo_bookings` table) ✅
2. SuperAdmin reviews demo request (`/superadmin/demos`) ✅
3. SuperAdmin creates tenant + owner via `/superadmin/users` and `/superadmin/tenants` **→ MANUAL, no automated wizard** ⚠️
4. Owner receives credentials (manual email from SuperAdmin) **→ MANUAL** ⚠️
5. Owner logs in → redirected to `/onboarding` ✅
6. Onboarding creates gym + branch ✅
7. Owner configures settings, plans, staff → functional ✅

**Gap:** No automated tenant-provisioning flow. SuperAdmin must manually create users and tenants via the admin UI. No invitation email is sent. The gap between "book demo" and "activated account" is entirely manual.

---

## 10. Tenant / Branch Isolation

| Check | Status | Notes |
|---|---|---|
| RLS on all tables | ✅ Enabled + policies applied | All core tables have tenant_id + branch_id RLS |
| `current_tenant_id()` helper | ✅ EXISTS | Used in all RLS policies |
| `current_branch_id()` helper | ✅ EXISTS | Used in branch-scoped policies |
| Service queries include tenant_id | **B — mostly** | Some service-role queries use admin client and bypass RLS; these should be audited individually |
| Server actions validate tenant | **B — mostly** | `requireUser()` provides tenant/branch; actions use `profile.tenant_id` — not trusting form input for tenant_id |
| Cross-tenant URL IDOR | **B — partially protected** | RLS + tenant_id filter in queries prevents data access; not formally tested with cross-tenant UUIDs |
| Branch isolation | **B — partial** | Branch filter applied in most queries; reception portal scoped to `profile.branch_id`; negative tests not recorded |
| Notification isolation | ✅ Implemented | `target_roles`, `tenant_id`, `branch_id` filters on all notification queries |
| Storage isolation | **B — partial** | `tenant_features` for object path scoping; MIME/size validation in `member-import-actions.ts`; cross-tenant path access not formally tested |
| Service-role usage | **B — needs review** | `createAdminClient()` used in SuperAdmin actions (correct) and in some biometric services; should be audited to confirm no unintended cross-tenant access |

---

## 11. SuperAdmin Control

| Capability | Status |
|---|---|
| View all tenants | ✅ `/superadmin/tenants` |
| Change plan (Free ↔ Paid) | ✅ `TenantPlanControl` component + `updateTenantAction` |
| Plan change audited | ✅ `activity_logs` with `previous_plan` + `plan` recorded |
| Change tenant status (active/trial/suspended) | ✅ Via `EditTenantDialog` |
| Set demo/protected classification | ✅ `tenant_type`, `is_demo`, `is_protected` fields |
| Trial date management | ✅ `trial_starts_at`, `trial_ends_at` |
| Create owner accounts | ✅ `/superadmin/users` |
| View device status | ✅ `/superadmin/devices` |
| Audit logs | ✅ `/superadmin/audit-logs` |
| View demo bookings | ✅ `/superadmin/demos` |
| Billing activity | **D** — `/superadmin/billing` page exists; no real billing data |
| Talwalkar protected from plan change | ✅ `updateTenantAction` rejects slug `talwalkar` |
| Customer cannot change own plan | ✅ No plan-change UI in admin portal; only SuperAdmin has access |
| Plan change doesn't alter business data | ✅ Only `tenants.plan` field changes; member/payment/subscription records untouched |

**Minor gap:** The Talwalkar slug check hardcodes `"talwalkar"` — if the slug ever changes this protection breaks. A better approach is an `is_protected` flag check (which also exists but is not used in this specific guard).

---

## 12. Customer Onboarding

| Step | Status | Notes |
|---|---|---|
| Public landing page | NOT VERIFIED | Not in this repo |
| Book demo form | ✅ `/book-demo` → `demo_bookings` table |
| SuperAdmin receives demo request | ✅ `/superadmin/demos` shows all bookings |
| SuperAdmin creates tenant | **MANUAL** | No wizard; manually enters tenant details |
| SuperAdmin creates owner user | **MANUAL** | `/superadmin/users` — manual auth.admin.createUser |
| Owner receives credentials | **MANUAL** | No invitation email system; SuperAdmin tells them verbally/manually |
| Owner logs in + onboarding | ✅ Functional |
| Gym + branch created | ✅ `bootstrapOrganizationAction` |
| Plans created | ✅ Admin → Memberships |
| Staff created | ✅ Admin → Staff |
| Import members | ✅ Import flow functional |
| Plan assigned | **MANUAL** — SuperAdmin must upgrade to Paid | |
| Ready to use | **PARTIAL** | Free features work; Paid requires SuperAdmin manual action |

**Overall onboarding: MANUAL / PARTIAL.** The technical pieces exist but the end-to-end journey requires 3–4 manual SuperAdmin interventions and no automated email communications.

---

## 13. Billing / Subscription Readiness

| Capability | Status |
|---|---|
| Free subscription (trial plan) | ✅ `tenants.plan = 'trial'` |
| Paid subscription | **MANUAL** — SuperAdmin changes `plan` field |
| Subscription status | ✅ `tenants.status` (`active`, `trial`, `suspended`, `cancelled`) |
| Trial dates | ✅ `trial_starts_at`, `trial_ends_at` |
| Trial expiry detection | ✅ In SuperAdmin dashboard |
| Automatic trial expiry enforcement | ❌ Not implemented — status does not auto-change |
| Payment for Syncfyre subscription | ❌ No billing provider integration |
| Failed payment / dunning | ❌ Not implemented |
| Cancellation / grace period | ❌ Not implemented |
| Billing history | ❌ Not implemented |
| Invoice to customer | ❌ Not implemented |
| Payment provider webhook | ❌ Not implemented |
| Entitlement sync on payment | ❌ Not implemented |
| Upgrade flow UX | **D** — `/admin/upgrade` page exists but is not linked from locked features |

**Overall: NOT READY for self-serve billing.** Billing is entirely manual today. For a pilot gym with a direct sales relationship this is acceptable for a short period, but requires a clear SLA on how plan upgrades are triggered.

---

## 14. Financial Integrity

| Check | Status |
|---|---|
| `calculatePaymentBalance()` unit tested | ✅ Unit tests pass with full/partial/overpayment/rounding |
| `Total = Paid + Pending` enforced in code | ✅ `payment-balance.ts` |
| Auto-income from payment trigger | ✅ `auto_income_from_payment()` DB trigger on `payments` |
| Cash book auto-entry for cash payments | ✅ In `auto_income_from_payment()` |
| GST transaction auto-entry | ✅ In `auto_income_from_payment()` when gst > 0 |
| Posted record immutability | **NOT VERIFIED** — no migration enforces it; depends on server-action logic |
| Refund action | ❌ No dedicated refund action; refund amount field exists on payments table |
| Dashboard totals reconcile with source | **NOT VERIFIED** |
| Finance P&L matches income - expenses | **NOT VERIFIED** |
| Duplicate payment prevention | **NOT VERIFIED** |
| Concurrent payment race condition | **NOT VERIFIED** |

---

## 15. Integrations

### WhatsApp
- **Status: PARTIAL / NOT PRODUCTION-READY**
- Implementation: `lib/member-messages.ts` generates message text; `components/members/member-communication-menu.tsx` opens `wa.me/` deep links
- No WhatsApp Business API integration; no provider credentials; no delivery status; no history
- This is a convenience feature, not a messaging integration

### Biometric / eSSL ZKTeco
- **Status: FOUNDATION / TEST READY for single gym, not validated for second gym**
- eSSL iClock protocol implemented at `/iclock/*` (registry, getrequest, cdata, devicecmd)
- eSSL REST events at `/api/biometric/essl/events`
- Machine session auth via `syncfyre_machine_session` cookie
- Tenant isolation via device_id → `face_machine_settings.branch_id` → `branches.tenant_id`
- Duplicate prevention via `attendance_sync_logs` idempotency
- Retry/offline: raw events stored in `attendance_sync_logs`; reprocessing supported via `reprocessUnmatchedAttendanceForMember`
- Real hardware validated for Talwalkar only; second gym onboarding not tested

### Email (Supabase Auth)
- ✅ Password reset emails via Supabase Auth
- No transactional email system for membership reminders, receipts, or invitations

### SMS
- **NOT IMPLEMENTED** — SMS links only (`sms:` protocol)

---

## 16. Mobile / PWA

| Check | Status |
|---|---|
| `manifest.ts` / `manifest.webmanifest` | ✅ Present |
| Service worker | **NOT VERIFIED** — `sw.js` in public paths suggests it exists |
| Installability | **NOT VERIFIED** |
| Responsive member list | ✅ Card/row toggle with mobile cards |
| Responsive payment/invoice forms | **NOT VERIFIED** at 360px |
| Mobile navigation (bottom nav) | ✅ `MobileBottomNav` component |
| Critical forms on mobile | **NOT VERIFIED** |
| PWA offline behavior | **NOT VERIFIED** |
| HTTPS assumed | Deployed on Contabo VPS with assumed HTTPS |

---

## 17. Reporting / Exports

| Check | Status |
|---|---|
| Members report | **B** — page exists; filter parity unverified |
| Payments report | **B** — date range/status filters; CSV export endpoint |
| Revenue report | **B** — monthly chart + table |
| Attendance report | **B** — date range filter |
| Finance P&L | **B** — page exists; reconciliation unverified |
| Export = screen filter | **NOT VERIFIED** |
| Tenant/branch scope | ✅ Filters applied in service queries |
| Large dataset performance | **NOT VERIFIED** |
| Empty/invalid input | **NOT VERIFIED** |

---

## 18. Error Handling & UX

| Check | Status |
|---|---|
| Loading states | **B** — some pages have `loading.tsx`; inconsistent coverage |
| Empty states | **B** — most list pages have empty state; not all |
| Error boundaries | **B** — `error.tsx` exists at some route groups |
| Form validation | ✅ Server-side Zod validation in most actions |
| Duplicate submission prevention | **B** — useTransition used in some forms |
| Success/error messages | ✅ Toast via `sonner` |
| Back buttons | **B** — present in most detail pages |
| Locked feature UX | **FAIL** — middleware redirects to portal dashboard, not to upgrade page; no upgrade CTA shown |
| Phase 2 feature on Free plan | Shows portal dashboard (confusing) instead of upgrade prompt |
| 404 behavior | ✅ Next.js default 404 |
| Unauthorized behavior | ✅ Middleware redirects appropriately |

---

## 19. Database / Data Safety

| Check | Status |
|---|---|
| Migration chain | ✅ 0001–0039 all applied to QA |
| Duplicate migration prefixes | ✅ Resolved — 0008/0019/0022 duplicates moved to `_excluded/` |
| RLS enabled | ✅ All core tables |
| Indexes | ✅ Applied in migrations 0023, 0024, 0025 |
| Foreign keys | ✅ Comprehensive FK constraints throughout |
| tenant_id / branch_id columns | ✅ All business tables |
| Audit logs | ✅ `activity_logs` table; SuperAdmin plan-change logged |
| Financial integrity | **B** — DB triggers exist; posted-record immutability not enforced at DB level |
| Demo metadata | ✅ `tenant_type`, `is_demo`, `is_protected`, `purpose` columns on `tenants` |
| `complete_pt_session` RPC | ⚠️ Exists remotely but has no local migration — undocumented DB state |
| Backup/recovery | **NOT VERIFIED** — Supabase managed backup assumed |
| 30k `time_period_greeting` rows | ✅ Cleaned by migration 0023 |
| Talwalkar data | ✅ 497 members, intact, not modified |

---

## 20. Dependencies / Build

| Check | Status |
|---|---|
| `npm run typecheck` | ✅ PASS — zero errors |
| `npm run lint` | ✅ PASS (exit 0 with warnings) |
| `npm run build` | **NOT RUN THIS SESSION** — previously passed per prior audit |
| `npm test` (unit tests) | ✅ 10 test files covering entitlements, payment balance, membership dates, GST, tenant governance, biometric parsing, attendance |
| E2E tests (`npm run e2e`) | **NOT CONFIGURED** — Playwright is a devDependency but CI does not run `e2e` |
| CI pipeline | ✅ `.github/workflows/ci.yml` — lint + typecheck + unit tests on push/PR |
| `xlsx` package | ⚠️ Loaded from SheetJS CDN `xlsx-0.20.3.tgz` — not a standard npm registry install; may violate npm lockfile integrity checks; licensing risk for commercial use |
| No `npm audit fix` vulnerabilities reported this session | NOT VERIFIED |
| `sharp` overridden to `0.35.3` | ✅ Known compatibility fix |
| `postcss` pinned to `8.5.27` | ✅ |
| No test framework for integration tests | ⚠️ Node built-in `test` module used — lightweight, no mocking, no coverage reporting |

---

## 21. Monitoring / Operations

| Capability | Status |
|---|---|
| Application error logging | ❌ No Sentry / error service configured |
| Database monitoring | NOT VERIFIED — Supabase dashboard available |
| Audit logs | ✅ `activity_logs` table in DB |
| Authentication logs | NOT VERIFIED — Supabase Auth logs |
| Integration logs | ✅ `attendance_sync_logs` for biometric events |
| Device sync logs | ✅ `attendance_sync_logs` with status/error fields |
| Health checks | ❌ No `/health` endpoint |
| Uptime monitoring | ❌ No external uptime monitoring configured |
| Alerts | ❌ No alerting system |
| Backup monitoring | NOT VERIFIED |
| Console errors suppressed | ✅ No console.log calls found in production paths |

---

## 22. Support & Customer Operations

| Capability | Status |
|---|---|
| Support tickets | ❌ Not implemented |
| SuperAdmin visibility into tenant issues | **B** — activity logs available; no structured support workflow |
| Tenant-level issue tracking | ❌ Not implemented |
| Integration troubleshooting | **B** — `attendance_sync_logs`, `biometric_diagnostics`, device status visible to admin |
| Audit history | ✅ `activity_logs` + SuperAdmin audit-logs page |
| Manual plan change | ✅ SuperAdmin can change plan with audit trail |

---

## 23. Demo / Sales Flow

### A. Demo Request (Sales Lead)
- Public form at `/book-demo` captures: contact_name, email, phone, gym_name, city, notes, source
- Stored in `demo_bookings` table
- SuperAdmin reviews at `/superadmin/demos`
- **No automated follow-up or CRM integration** — entirely manual after capture

### B. Demo Tenant (Synthetic Gym)
- `demo gym` tenant (`052375ac`) exists with correct classification
- `is_demo=true`, `is_protected=true`, `purpose=null`
- **No demo data** — 0 members, 0 plans, 0 payments, 0 staff accounts
- `tenant_governance.ts` and tests correctly prevent demo operations on non-demo tenants
- A separate `SyncFyre Demo` tenant (`22222222`) exists but is not classified as demo

**Gap:** Demo tenant is set up but empty. Cannot be used for a live sales demo today.

---

## 24. Production Readiness Matrix

| Stage | Status | Key blockers |
|---|---|---|
| **Internal testing** | **PARTIAL** | Typecheck/lint pass; unit tests exist; no E2E; no integration tests; locked-feature UX broken |
| **Demo testing** | **PARTIAL** | Demo Gym correctly classified but has zero demo data; plan-switch mechanism works |
| **Pilot gym** | **FAIL** | No billing automation; manual onboarding; entitlement not enforced at all page levels; no error monitoring; no support workflow; WhatsApp is not real delivery |
| **Production launch** | **FAIL** | All pilot blockers plus: no automated onboarding, no subscription billing, no E2E tests, no monitoring/alerting, no invitation emails |

---

## 25. P0/P1/P2/P3 Gap List

### P0 — Security / Data Isolation Risk

| ID | Gap | Risk |
|---|---|---|
| P0-01 | Locked-feature UX redirect goes to dashboard, not `/admin/upgrade` — but more critically, some Phase 2 read pages (reports sub-pages, notification page, settings sub-pages) have no entitlement check and render for all plans | Free-plan user can read Phase 2 data |
| P0-02 | `complete_pt_session` RPC exists in remote DB with no local migration definition — DB state is undocumented and could be silently broken by a future migration | Data integrity blind spot |
| P0-03 | Talwalkar is on `plan=standard` which maps to `plan_1` (Free) — this means Finance, PT, Biometric are technically locked for Talwalkar under current entitlement logic | Production gym may unexpectedly lose feature access |
| P0-04 | `xlsx` loaded from SheetJS CDN tarball, not npm registry — bypasses integrity verification and introduces supply chain risk | Security / supply chain |

### P1 — Must fix before pilot

| ID | Gap |
|---|---|
| P1-01 | Wire `feature_locked` middleware redirect to `/admin/upgrade?feature=<key>&next=<path>` instead of portal dashboard |
| P1-02 | Add `hasCurrentFeature` / `assertCurrentFeature` checks to Phase 2 server pages that are not covered by middleware prefixes (reports sub-pages, settings customization) |
| P1-03 | Create `complete_pt_session` migration with `CREATE OR REPLACE FUNCTION` from the live remote definition |
| P1-04 | Populate Demo Gym with synthetic demo data (members, plans, subscriptions, payments, attendance, trainers, staff) using an idempotent fixture script |
| P1-05 | Automated tenant provisioning: after demo booking approval, a minimal guided wizard to create tenant + owner + send credentials email |
| P1-06 | Add application error monitoring (Sentry or equivalent) |
| P1-07 | Add `/api/health` endpoint for uptime monitoring |
| P1-08 | E2E smoke tests for critical paths: login → members → payment → attendance |
| P1-09 | Confirm Talwalkar's correct plan assignment (should be `professional` = plan_2 if Finance/Biometric are in use) |
| P1-10 | Integration tests for RLS: cross-tenant ID access must return empty, not error |

### P2 — Important, shortly after launch

| ID | Gap |
|---|---|
| P2-01 | Billing infrastructure — subscription provider integration (Razorpay / Stripe) with webhook for plan activation |
| P2-02 | Automated trial expiry — scheduled job to move expired trials to `suspended` |
| P2-03 | Invitation email system — send login credentials when SuperAdmin creates an owner |
| P2-04 | WhatsApp Business API integration (replace deep-link with actual provider delivery) |
| P2-05 | Staff deactivation lifecycle — `status=inactive` should block login |
| P2-06 | Refund server action with audit trail |
| P2-07 | Dashboard `feature_locked` banner — when tenant is on Free, show a CTA banner for Phase 2 features in quick actions |
| P2-08 | Support workflow — basic ticket/contact mechanism for tenants |
| P2-09 | Demo Gym fixture script must be idempotent, audited, and refuse non-demo targets |
| P2-10 | Export filter parity verification — automated check that export matches active filters |
| P2-11 | Remove `xlsx` CDN dependency; use a proper npm registry package |

### P3 — Future

| ID | Gap |
|---|---|
| P3-01 | Phase 3: multi-branch, enterprise RBAC, AI insights, etc. |
| P3-02 | Self-serve onboarding flow (signup → trial → automatic tenant creation) |
| P3-03 | WhatsApp template management in communication_templates table |
| P3-04 | Generalized trigger-condition-action automation engine |
| P3-05 | GST e-filing export |
| P3-06 | Biometric second-provider adapter (non-eSSL ZKTeco devices) |

---

## 26. Recommended Implementation Order

1. **[P0]** Fix Talwalkar plan to `professional` in QA/prod DB — one-line SuperAdmin action  
   _Why:_ Talwalkar is the reference production tenant; should have Phase 2 unlocked  

2. **[P0]** Write and apply migration to document `complete_pt_session` RPC  
   _Why:_ Undocumented DB state is a maintenance risk  

3. **[P0]** Audit all Phase 2 read pages for missing entitlement checks; add `hasCurrentFeature` checks  
   _Why:_ Free tenants can currently read Phase 2 data pages  

4. **[P1]** Wire `feature_locked` redirect to `/admin/upgrade` with feature and return URL  
   _Why:_ Currently redirects to dashboard with no explanation — confusing UX and missing upgrade CTA  

5. **[P1]** Populate Demo Gym with idempotent synthetic fixtures  
   _Why:_ Cannot demo the product without data  

6. **[P1]** Add Sentry (or equivalent) error monitoring  
   _Why:_ No visibility into production errors  

7. **[P1]** Add `/api/health` endpoint  
   _Why:_ Required for uptime monitoring  

8. **[P1]** E2E smoke tests for critical paths  
   _Why:_ Currently only unit tests; no protection against regression in flows  

9. **[P1]** Integration tests for RLS cross-tenant boundary  
   _Why:_ Tenant isolation is the core security promise; needs automated proof  

10. **[P1]** Minimal tenant provisioning wizard in SuperAdmin  
    _Why:_ Current manual process is error-prone and not scalable  

11. **[P2]** Billing provider integration  
    _Why:_ Required before any self-serve or volume launch  

12. **[P2]** Trial expiry automation  
    _Why:_ Expired trials stay active indefinitely without this  

13. **[P2]** Staff deactivation blocks login  
    _Why:_ Security risk if deactivated staff can still log in  

---

## 27. Final Status

### OVERALL SAAS STATUS

| Stage | Result |
|---|---|
| **INTERNAL TESTING** | **PARTIAL** |
| **DEMO READY** | **PARTIAL** (platform works; Demo Gym has no data) |
| **PILOT READY** | **FAIL** |
| **PRODUCTION READY** | **FAIL** |

---

### TOP 10 BLOCKERS

1. **[P0]** Talwalkar on wrong plan (`standard` = Free) — Talwalkar uses Finance/Biometric but these are Phase 2 features locked on `plan_1`  
2. **[P0]** `complete_pt_session` RPC exists in DB with no local migration  
3. **[P0]** Phase 2 read pages accessible without entitlement check (reports sub-pages, notification page)  
4. **[P0]** `xlsx` CDN tarball bypasses npm integrity verification  
5. **[P1]** Demo Gym has zero demo data — cannot demo the product  
6. **[P1]** `feature_locked` redirect goes to dashboard, not upgrade page — no upgrade CTA visible  
7. **[P1]** No application error monitoring — no Sentry or equivalent  
8. **[P1]** No E2E or integration tests — no automated regression protection  
9. **[P1]** Tenant onboarding is entirely manual — not scalable  
10. **[P2]** No billing infrastructure — plan assignment is manual SuperAdmin action; trials don't auto-expire  

---

### NEXT IMPLEMENTATION ORDER

```
1. [P0] Fix Talwalkar plan to professional (plan_2) via SuperAdmin UI
   Why: Production tenant locked out of features it uses
   Affected area: tenants table, entitlement evaluation
   Expected outcome: Finance/Biometric/PT unlocked for Talwalkar

2. [P0] Write 0040_complete_pt_session_rpc.sql — CREATE OR REPLACE FUNCTION complete_pt_session from live definition
   Why: Undocumented remote DB function; no migration safety net
   Affected area: PT workflow, database migrations
   Expected outcome: RPC documented in migration chain

3. [P0] Audit Phase 2 pages without entitlement guards; add assertCurrentFeature/hasCurrentFeature
   Why: Free tenants can read Phase 2 data
   Affected area: /admin/reports/*, /admin/notifications, /admin/settings customization tab
   Expected outcome: Free tenants redirected to upgrade page on Phase 2 read access

4. [P1] Wire feature_locked middleware redirect to /admin/upgrade?feature=X&next=Y
   Why: Confusing UX; no upgrade CTA
   Affected area: middleware.ts
   Expected outcome: Locked feature click → clear upgrade prompt

5. [P1] Create idempotent demo fixture script for Demo Gym
   Why: Demo Gym has zero data; product cannot be demonstrated
   Affected area: Demo Gym tenant (052375ac)
   Expected outcome: Full role walkthrough possible in Demo Gym

6. [P1] Add Sentry (or Supabase logging) for application errors
   Why: No production visibility
   Affected area: app layout, error boundaries
   Expected outcome: Errors tracked and alertable

7. [P1] Add /api/health endpoint
   Why: Required for uptime monitoring
   Affected area: app/api/health/route.ts (new)
   Expected outcome: External uptime monitor can ping

8. [P1] E2E smoke tests for login → member → payment → attendance
   Why: No regression protection for critical flows
   Affected area: tests/e2e/
   Expected outcome: CI fails if critical path breaks

9. [P1] Integration tests for RLS cross-tenant boundary
   Why: Tenant isolation is the core SaaS security promise
   Affected area: tests/
   Expected outcome: Automated proof that cross-tenant IDs return empty

10. [P1] SuperAdmin minimal tenant-provisioning wizard
    Why: Current manual process requires 4+ steps with no email automation
    Affected area: /superadmin/tenants/new page + email action
    Expected outcome: SuperAdmin creates tenant + sends owner credentials in one flow
```

---

*This audit is an implementation assessment for internal development and QA planning. It is not a production approval. No Talwalkar data was accessed or modified. No Demo Gym data was modified.*
