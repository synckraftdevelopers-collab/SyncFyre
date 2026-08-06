# SyncFyre — SaaS Readiness Analysis & Developer Task Split
**Date:** August 2026  
**Analysts:** Technical review against production SaaS standards  
**Developers:** Aastha (Dev 1) · Shradha (Dev 2)

---

## Executive Summary

SyncFyre has grown from a 45% foundation to approximately **62% of a shippable SaaS product**. The backend is genuinely strong — 6 migrations, 25+ tables, 9 report views, typed services, full RLS, double-entry accounting, audit triggers, and 5 role-based portals. The gap is almost entirely in the **frontend**: most module pages show live data in read-only tables but have no create forms, no edit flows, no delete/deactivate UI, no filters, no date pickers, and no pagination controls wired beyond members. Finance has the deepest coverage; member management has meaningful detail; everything else is list-only or skeleton.

A real gym cannot use this product today. A gym admin cannot add a trainer, create a workout plan from the UI, manage staff, configure equipment, resolve attendance exceptions, or do anything with the accounting module except view data that arrives automatically from payments. The goal of this document is to close that gap systematically with zero merge conflicts between Aastha and Shradha.

---

## Current State: What Is Working

### ✅ Fully functional (production-ready)

| Area | Evidence |
|---|---|
| Authentication (all roles) | Login, logout, forgot-password, reset-password. Role-based portal redirect works. |
| Portal routing & middleware | 5 portals (admin, reception, trainer, member, public). Middleware blocks wrong-role access. |
| Member list + search + pagination | Admin and reception member pages have full search, status filter, Previous/Next pagination. |
| Member create (wizard) | `add-member-wizard.tsx` exists. Branches and trainers are loaded from DB. |
| Member edit | `member-edit-form.tsx` wired to `updateMemberFullAction`. Photo upload works. |
| Member deactivate | `deactivateMemberAction` server action with soft-delete and audit log. |
| Member detail tabs | `member-profile-tabs.tsx` — subscriptions, payments, attendance, progress all query real views. |
| Membership renewal | `renew-membership-dialog.tsx` wired to `renewMembershipAction` which calls `create_subscription_with_history` DB function. |
| Trainer assignment | `assign-trainer-dialog.tsx` wired to `assignTrainerAction`. |
| Invoice create + receipt | `invoice-form.tsx` creates invoice + payment in one transaction. Receipt page with print button. |
| Payments list (admin + reception) | Live data, status filter, pagination, CSV export. |
| Finance dashboard | 12 KPI cards from real DB queries. Revenue trend, payment mode, aging charts. |
| Finance — Income list + create | Live table with today/month totals. Category breakdown. `createIncomeAction`. |
| Finance — Expenses list + approve/reject | Full approval workflow. `approveExpenseAction`, `rejectExpenseAction`. |
| Finance — Cash Book | Live running balance. Auto-populated from cash payments via trigger. |
| Finance — Bank accounts + transactions | Live balance. Bank account cards. Transaction table. |
| Finance — Outstanding dues | Aging buckets. Member detail. Balance remaining. |
| Finance — GST | CGST/SGST breakdown. Net payable. Transaction register. |
| Dashboard (admin) | 10 KPIs from live DB. Revenue/attendance/plan charts using real data. |
| Attendance log (admin) | Live records, entry/exit times, device ID, today count. |
| Report service | 9 report views: members, attendance, payments, membership, trainers, subscriptions, revenue, pending, monthly joining. All paginated with filters. |
| Supabase schema | 6 migrations applied. 25+ tables. 5 custom enums. Triggers for cash/bank balance, income auto-post, receivable sync, audit logs. RLS on all tables. |
| API routes | Members CRUD, generic resource CRUD, reports CSV, attendance sync, cron reminders, finance dashboard/income/expenses/GST/outstanding/P&L. |

---

## Current State: What Is Incomplete

### ❌ Critical blockers for a paying gym customer

| Area | Problem |
|---|---|
| **Membership plans UI** | Admin can see `/admin/memberships` (module overview) but cannot create or edit a plan from the UI. No list of plans. Gym can't configure pricing. |
| **Subscriptions UI** | No subscription list, no status change (pause/cancel/expire), no history view in admin. Member portal shows read-only. |
| **Trainer profiles** | Trainer portal lists assigned members but trainer cannot log notes, update their own profile, or see their full schedule in one view. Admin has no trainer detail page. |
| **Workout create/edit** | Trainer can create a workout (form exists) but cannot edit or delete one. No workout library — every workout is one-off. |
| **Diet plans** | Trainer can create but not edit. Member sees read-only. No versioning. |
| **Progress — no chart** | Member and trainer see a table of measurements but no trend chart despite Recharts being installed. |
| **Appointments — no status management** | List exists. No approve/reschedule/complete/cancel action buttons. No calendar view. |
| **Staff module** | No staff list page. `/admin/staff` goes to module overview only. Admin cannot add, view, or edit a staff record from the UI. |
| **Equipment module** | Same — module overview only. No list, no detail, no maintenance scheduling from UI. |
| **Reports UI** | No report selection page. Current `/api/reports` downloads raw CSV by URL. No date range picker, no branch filter, no preview, no scheduled export. |
| **Notifications** | Inserted into DB by cron but no delivery adapter. Email/SMS/WhatsApp are not implemented. No notifications list in admin. |
| **Finance — Expense create form** | `finance-actions.ts` has `createExpenseAction` but there is no `/admin/finance/expenses/new` page. Link in expenses list goes to a non-existent page. |
| **Finance — Income create form** | Same — `/admin/finance/income/new` is linked but does not exist. |
| **Finance — Bank account create form** | `/admin/finance/bank/new-account` is linked in bank page but page does not exist. |
| **Finance — P&L report page** | `/admin/finance/reports/profit-loss` is in quick links but page does not exist. `getProfitAndLoss()` service function is ready. |
| **Finance — Accounting (journal/ledger/COA)** | `/admin/finance/accounting` is in quick links but no page exists. `listJournalEntries`, `getTrialBalance`, `listChartOfAccounts` service functions are all ready. |
| **Finance — Cash closing** | `cash_closing` table created in 0006 but no UI to perform daily close. |
| **Settings page** | Only shows face machines. No branch management, no GST settings, no user/role management, no finance settings. |
| **Member portal — no action buttons** | Member can read everything but cannot book an appointment, cancel one, or update their own profile details. Read-only is fine for v1 but incomplete. |
| **Reception memberships** | Shows module overview, not a plan selector or subscription creation flow. |
| **Error boundaries** | No `error.tsx` on any route. A single Supabase failure takes down the whole page with a raw crash. |
| **Loading skeletons** | Only `/dashboard/loading.tsx` exists. Every other server-component page has no loading state. |
| **No tests** | Zero unit, integration, or e2e tests. `npm run lint` works but no `npm run test`. |
| **No CI** | No GitHub Actions pipeline for typecheck, lint, build. |
| **ESLint config outdated** | `.eslintrc.json` uses the legacy format. Next.js 15 expects `eslint.config.mjs` (flat config). |

---

## Real SaaS Gap Score

| Module | Current | Target | Gap |
|---|---|---|---|
| Authentication & portals | 95% | 100% | Password confirm on reset, email verification flow |
| Member management | 75% | 100% | Bulk actions, import CSV, profile picture crop |
| Membership plans | 20% | 100% | No list/create/edit UI |
| Subscriptions | 30% | 100% | No admin list, no status change UI |
| Payments & invoices | 70% | 100% | Partial payment, refund UI missing |
| Attendance | 55% | 100% | Exception resolution UI exists (API only), no manual entry UI |
| Trainers | 40% | 100% | No admin detail page, no schedule view |
| Appointments | 30% | 100% | No status management, no calendar |
| Workouts | 35% | 100% | Create only, no edit/delete, no library |
| Diet plans | 35% | 100% | Create only, no edit/delete |
| Progress | 40% | 100% | No trend chart |
| Finance — Dashboard | 90% | 100% | Budget vs Actual card missing |
| Finance — Income | 70% | 100% | Create form page missing |
| Finance — Expenses | 70% | 100% | Create form page missing, approval in table only |
| Finance — Cash book | 80% | 100% | No daily closing UI |
| Finance — Bank | 70% | 100% | Add account form page missing |
| Finance — GST | 75% | 100% | No export, no GSTR-1 format |
| Finance — P&L | 30% | 100% | Service ready, page missing |
| Finance — Accounting | 10% | 100% | Journal/ledger/COA pages all missing |
| Reports | 25% | 100% | No UI at all, service layer complete |
| Notifications | 15% | 100% | No delivery, no UI list |
| Staff | 10% | 100% | No list/create/edit UI |
| Equipment | 10% | 100% | No list/create/edit UI |
| Settings | 20% | 100% | Only face machines shown |
| Error handling | 5% | 100% | No error boundaries |
| Tests | 0% | 100% | Nothing |
| CI/CD | 0% | 100% | Nothing |
| **Overall** | **~42%** | **100%** | |

---

## Developer Assignment Rules

**Golden rule: each dev owns completely separate files and folders. Never edit the other person's files.**

| Area | Aastha | Shradha |
|---|---|---|
| `app/(admin)/admin/members/` | ✅ | — |
| `app/(admin)/admin/finance/` | ✅ | — |
| `app/(admin)/admin/payments/` + `invoices/` | ✅ | — |
| `app/(admin)/admin/dashboard/` | ✅ | — |
| `app/(admin)/admin/attendance/` | — | ✅ |
| `app/(admin)/admin/[module]/` — trainers, workouts, diet-plans, progress, appointments | — | ✅ |
| `app/(admin)/admin/[module]/` — memberships, subscriptions, staff, equipment | — | ✅ |
| `app/(admin)/admin/finance/accounting/` | ✅ | — |
| `app/(admin)/admin/finance/reports/` | ✅ | — |
| `app/(admin)/admin/settings/` | — | ✅ |
| `app/(reception)/` | ✅ | — |
| `app/(trainer)/` | — | ✅ |
| `app/(member)/` | ✅ | — |
| `components/finance/` | ✅ | — |
| `components/members/` | ✅ | — |
| `components/modules/` (trainer, workout, diet, progress, appointment, staff, equipment) | — | ✅ |
| `services/finance.service.ts` | ✅ (extend only) | — |
| `services/member-extended.service.ts` | ✅ | — |
| `services/report.service.ts` | ✅ | — |
| `services/notification.service.ts` | — | ✅ |
| `services/trainer.service.ts` (new) | — | ✅ |
| `services/module.service.ts` (new) | — | ✅ |
| Tests for member/payment/finance | ✅ | — |
| Tests for trainer/module/attendance | — | ✅ |
| CI pipeline | — | ✅ |
| ESLint flat config | — | ✅ |
| `app/(admin)/admin/finance/income/new/` | ✅ | — |
| `app/(admin)/admin/finance/expenses/new/` | ✅ | — |
| `app/(admin)/admin/finance/bank/new-account/` | ✅ | — |

**Shared files** — edit protocol (one at a time, commit before the other touches it):
- `types/index.ts` — Aastha adds finance/member types, Shradha adds module/trainer types
- `app/(admin)/admin/[module]/page.tsx` — Shradha owns this file; Aastha does not modify it
- `lib/validations/resources.ts` — Shradha extends for new module fields
- `middleware.ts` — Neither touches unless both agree

---

## Phase Plan

---

### Phase 1 — Fix broken links and create missing forms (1 week, parallel)

**Goal:** Every nav link that currently leads to a 404 or placeholder must work.

#### Aastha — Finance create forms

| Task | File to create | Service/Action already ready? |
|---|---|---|
| Income create page | `app/(admin)/admin/finance/income/new/page.tsx` | ✅ `createIncomeAction` |
| Expense create page | `app/(admin)/admin/finance/expenses/new/page.tsx` | ✅ `createExpenseAction` |
| Bank account create page | `app/(admin)/admin/finance/bank/new-account/page.tsx` | ✅ `createBankAccountAction` |
| P&L report page | `app/(admin)/admin/finance/reports/profit-loss/page.tsx` | ✅ `getProfitAndLoss()` |
| Expense approve/reject buttons in table row | Update `app/(admin)/admin/finance/expenses/page.tsx` | ✅ `approveExpenseAction`, `rejectExpenseAction` |
| Fix `members.service.ts` `updateMember` to accept `profile_photo_url` | Already done — verify it compiles | — |

#### Shradha — Module create forms for admin [module] catch-all

| Task | File to create | Service/Action available? |
|---|---|---|
| Membership plans list page | `app/(admin)/admin/memberships/page.tsx` *(new — breaks out of catch-all)* | Generic `[resource]` API |
| Memberships new plan form | `app/(admin)/admin/memberships/new/page.tsx` | ✅ `ResourceCreateForm` |
| Subscriptions list page | `app/(admin)/admin/subscriptions/page.tsx` | `listMembers` + supabase query |
| Staff list page | `app/(admin)/admin/staff/page.tsx` | Generic resource API |
| Equipment list page | `app/(admin)/admin/equipment/page.tsx` | Generic resource API |
| Reception memberships page — real subscription create | `app/(reception)/reception/memberships/page.tsx` | Replace overview with plan list |
| Fix `app/(dashboard)/[module]/page.tsx` — still exists but should be removed | Delete stale file | — |

**Phase 1 exit criteria:** `npm run typecheck` passes. Every nav link in every portal resolves to a real page. No 404s.

---

### Phase 2 — Finance accounting pages + Reports UI (1.5 weeks, parallel)

**Goal:** Finance module reaches 90% completeness for a CA / accountant user.

#### Aastha — Finance accounting + reports

| Task | Files |
|---|---|
| Accounting hub page | `app/(admin)/admin/finance/accounting/page.tsx` |
| Journal entries list + post button | `app/(admin)/admin/finance/accounting/journal/page.tsx` |
| Chart of accounts list | `app/(admin)/admin/finance/accounting/coa/page.tsx` |
| Ledger viewer (filter by account + date) | `app/(admin)/admin/finance/accounting/ledger/page.tsx` |
| Trial balance page | `app/(admin)/admin/finance/accounting/trial-balance/page.tsx` |
| Reports hub page (pick report, date range, branch, export) | `app/(admin)/admin/reports/page.tsx` |
| Member report page (uses `getMembersReport`) | `app/(admin)/admin/reports/members/page.tsx` |
| Revenue report page (uses `getRevenueReport`) | `app/(admin)/admin/reports/revenue/page.tsx` |
| Monthly joining report page | `app/(admin)/admin/reports/monthly-joining/page.tsx` |
| Pending payments report page | `app/(admin)/admin/reports/pending-payments/page.tsx` |
| Finance — cash closing UI | `app/(admin)/admin/finance/cash-closing/page.tsx` |
| Add "Budget vs Actual" card to finance dashboard | Update `app/(admin)/admin/finance/page.tsx` — add `budget` table queries |

#### Shradha — Attendance exception resolution UI + trainer module

| Task | Files |
|---|---|
| Attendance exceptions list with resolve buttons | `app/(admin)/admin/attendance/exceptions/page.tsx` |
| Attendance exceptions resolve action | `app/actions/attendance-actions.ts` (new) — wraps `resolveAttendanceException` |
| Trainer detail page (admin) | `app/(admin)/admin/trainers/[id]/page.tsx` (new) |
| Trainer schedule view (appointments today/week) | Component inside trainer detail |
| Workout library concept — list all workouts with filters | `app/(admin)/admin/workouts/page.tsx` |
| Workout edit page | `app/(admin)/admin/workouts/[id]/page.tsx` |
| Diet plan edit page | `app/(admin)/admin/diet-plans/[id]/page.tsx` |
| Progress trend chart (Recharts) | Component used inside member profile tabs and trainer progress page |
| Appointments status management (approve/complete/cancel) | Update `app/(admin)/admin/appointments/page.tsx` to add action buttons |
| Trainer portal — full schedule view | Update `app/(trainer)/trainer/appointments/page.tsx` |

**Phase 2 exit criteria:** Finance module is usable by an accountant end-to-end. Admin can manage all trainer/workout/diet operations.

---

### Phase 3 — Member portal self-service + notification delivery (1 week, parallel)

**Goal:** Members can take actions. Notifications actually send.

#### Aastha — Member portal actions

| Task | Files |
|---|---|
| Member can book appointment | `app/(member)/member/appointments/new/page.tsx` + server action |
| Member can cancel pending appointment | Update `app/(member)/member/appointments/page.tsx` — add Cancel button |
| Member can view and download their invoice/receipt | `app/(member)/member/invoices/[id]/page.tsx` |
| Member progress trend chart | Update `app/(member)/member/progress/page.tsx` |
| Member — download own data (attendance CSV) | Add export button to `app/(member)/member/attendance/page.tsx` |
| Reception — full subscription create flow with plan picker | `app/(reception)/reception/memberships/new/page.tsx` |
| Reception — member detail + quick actions (renew, collect payment) | `app/(reception)/reception/members/[id]/page.tsx` |

#### Shradha — Notifications + Settings

| Task | Files |
|---|---|
| Email adapter (Resend or Nodemailer) | `lib/providers/email.ts` (new) |
| Notification delivery function | Update `services/notification.service.ts` — implement `deliverNotification()` |
| Notification templates (expiry, appointment, payment) | `lib/notification-templates.ts` (new) |
| Notifications list page (admin) | `app/(admin)/admin/notifications/page.tsx` |
| Notification detail + delivery log | `app/(admin)/admin/notifications/[id]/page.tsx` |
| Settings — Finance settings (GSTIN, rates, fiscal year) | `app/(admin)/admin/settings/finance/page.tsx` |
| Settings — User management (invite user, assign role) | `app/(admin)/admin/settings/users/page.tsx` |
| Settings — Branch management | `app/(admin)/admin/settings/branches/page.tsx` |
| ESLint flat config | `eslint.config.mjs` |

**Phase 3 exit criteria:** A member can log in and take actions. Expiry reminder emails actually send. Settings page shows real configuration.

---

### Phase 4 — Error handling, loading states, tests, CI (1 week, parallel)

**Goal:** The app does not show blank pages or raw crashes. CI catches regressions.

#### Aastha — Error boundaries + loading skeletons + member/finance tests

| Task | Files |
|---|---|
| Error boundary on every portal layout | `app/(admin)/error.tsx`, `app/(reception)/error.tsx`, etc. |
| Loading skeletons for member list, finance dashboard, payments | `app/(admin)/admin/members/loading.tsx`, etc. |
| Not-found pages for member/invoice/detail routes | `app/(admin)/admin/members/[id]/not-found.tsx`, etc. |
| Unit tests — `lib/validations/member.ts`, `lib/validations/auth.ts` | `__tests__/validations/member.test.ts` |
| Integration test — members API CRUD | `__tests__/api/members.test.ts` |
| Integration test — invoice + payment flow | `__tests__/api/payments.test.ts` |
| Integration test — finance income/expense create | `__tests__/finance/income.test.ts` |
| Playwright e2e — login as admin, register member, create invoice | `e2e/admin-member-invoice.spec.ts` |
| Playwright e2e — member login, view dashboard, book appointment | `e2e/member-portal.spec.ts` |
| Generate Supabase TypeScript types | `types/database.ts` via `npx supabase gen types` |

#### Shradha — Error handling + tests + CI

| Task | Files |
|---|---|
| Error boundary on trainer + member portals | `app/(trainer)/error.tsx`, `app/(member)/error.tsx` |
| Loading skeletons — trainer dashboard, attendance, modules | loading.tsx files per route |
| Unit tests — `lib/validations/attendance.ts`, `lib/validations/resources.ts` | `__tests__/validations/attendance.test.ts` |
| Integration test — attendance sync idempotency | `__tests__/api/attendance.test.ts` |
| Integration test — subscription create + history | `__tests__/api/subscription.test.ts` |
| Playwright e2e — trainer login, log workout, record progress | `e2e/trainer-portal.spec.ts` |
| GitHub Actions CI pipeline | `.github/workflows/ci.yml` |
| Vitest config | `vitest.config.ts` |
| Playwright config | `playwright.config.ts` |
| Fix ESLint flat config (already in Phase 3, enforce in CI here) | `.github/workflows/ci.yml` |

**Phase 4 exit criteria:** CI is green. No page crashes on a Supabase error. Every route has a loading state. At least 20 tests pass.

---

### Phase 5 — Deployment, staging, and controlled rollout (3 days, joint)

| Task | Owner |
|---|---|
| Create staging Supabase project, apply all 6 migrations | Shradha |
| Create production Supabase project, apply migrations, set auth redirect URL | Shradha |
| Configure Vercel project, environment variables for staging and production | Aastha |
| Set up Vercel Cron for `/api/cron/reminders` | Aastha |
| Seed staging with test branches, plans, and one admin user | Shradha |
| Write reception training guide | Aastha |
| Write admin/accountant training guide | Aastha |
| Write trainer training guide | Shradha |
| Pilot test with one branch (both devs) | Both |
| Go/no-go checklist sign-off | Both |

---

## Testing Strategy

### Test pyramid

```
e2e (Playwright)       — 5 flows (login, member, payment, trainer, member-portal)
integration (Vitest)   — 8 API and service tests
unit (Vitest)          — 15 validation and util tests
```

### Critical test flows (must pass before production)

1. **Admin: register member → assign plan → create invoice → collect payment → print receipt**
2. **Reception: check in member → book appointment → renew membership**
3. **Trainer: log workout → record progress → approve appointment**
4. **Member: view membership → view attendance → book appointment**
5. **Finance: create income entry → create expense → approve expense → view P&L**
6. **Attendance: batch sync → detect exception → resolve exception**
7. **Cron: run reminder → verify notification created in DB**

### Security tests (manual, before go-live)

- Reception cannot access `/admin/*` — middleware blocks it
- Member cannot see another member's data — RLS enforced
- Unauthenticated user cannot access any portal — middleware redirects to login
- Service role key is never returned to client — check browser network tab
- Expense approval cannot be self-approved (future: add created_by ≠ approved_by check)

---

## Known Technical Debt (log for post-launch)

| Item | Severity | Notes |
|---|---|---|
| `any` casts in dashboard.service and finance.service | Medium | Replace with Supabase generated types |
| `member.service.ts updateMember` has overloaded signatures | Low | Consolidate |
| `app/(dashboard)/[module]/page.tsx` still exists in catch-all | High | Delete this file — it conflicts with admin routes |
| No database connection pooler config | Medium | Add PgBouncer on Supabase for production |
| `NEXT_PUBLIC_APP_URL` not validated at runtime | Low | `lib/env.ts` covers it |
| Tally export in `finance_settings.tally_group_mapping` has no UI | Low | Future roadmap |
| `machine_user_id` mapping to members is not validated in attendance sync | High | Unmatched events silently create `unmatched` sync logs; no admin alert |
| Receipt storage bucket (`receipts`) is created in migration but no upload UI exists | Medium | `receipt_url` on payments table is always null |
| `budget` table created in 0006 but no budget entry UI or Budget vs Actual card yet | Medium | Phase 2 — Aastha |
| No rate limiting on auth endpoints | High | Add before production |
| `fin_audit_logs` has no client read UI | Low | Phase 2 accounting section |

---

## Quick Reference: Who Owns What

| Feature | Aastha | Shradha |
|---|---|---|
| Finance create forms (income/expense/bank) | ✅ | — |
| Finance P&L, accounting, reports UI | ✅ | — |
| Finance cash closing | ✅ | — |
| Member portal self-service | ✅ | — |
| Reception subscription flow | ✅ | — |
| Error boundaries + loading (admin/reception/member) | ✅ | — |
| Member/finance/payment unit + integration tests | ✅ | — |
| Member portal e2e | ✅ | — |
| Vercel + cron setup | ✅ | — |
| Training guides (reception + admin) | ✅ | — |
| Attendance exceptions UI | — | ✅ |
| Trainer detail page + schedule | — | ✅ |
| Workout/diet/progress edit pages | — | ✅ |
| Appointment status management | — | ✅ |
| Memberships / subscriptions / staff / equipment list pages | — | ✅ |
| Notification delivery (email) | — | ✅ |
| Notifications list + settings pages | — | ✅ |
| Error boundaries (trainer portal) | — | ✅ |
| Attendance + subscription tests | — | ✅ |
| CI pipeline (GitHub Actions) | — | ✅ |
| ESLint flat config | — | ✅ |
| Staging + production Supabase setup | — | ✅ |
| Trainer training guide | — | ✅ |

---

*Generated: August 2026 · Based on full source code review*
