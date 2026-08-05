# SyncFyre — Developer Task Split

**Project:** SyncFyre Gym Management System  
**Dev 1:** Aastha  
**Dev 2:** Shradha  
**Goal:** Parallel work with zero merge conflicts — each developer owns completely separate files and folders.

---

## Ground Rules to Avoid Merge Conflicts

| Rule | Detail |
|---|---|
| **File ownership** | Each dev owns specific files. Never touch the other person's files unless explicitly noted in a handoff. |
| **Shared files** | `lib/utils.ts`, `app/globals.css`, `middleware.ts`, `next.config.ts` — coordinate before editing, commit separately. |
| **New components** | Aastha creates files in `components/members/`, `components/dashboard/`, `components/layout/`. Shradha creates files in `components/modules/`, `components/settings/`, `components/attendance/`. |
| **New API routes** | Aastha owns `app/api/members/`, `app/api/reports/`. Shradha owns `app/api/attendance/`, `app/api/face-machines/`, `app/api/[resource]/`. |
| **New pages** | Aastha owns `app/(dashboard)/members/`, `app/(dashboard)/dashboard/`. Shradha owns `app/(dashboard)/[module]/`, `app/(dashboard)/attendance/`, `app/(dashboard)/settings/`. |
| **New services** | Aastha creates `services/member.service.ts`, `services/payment.service.ts`, `services/subscription.service.ts`. Shradha creates `services/attendance.service.ts`, `services/notification.service.ts`, and module-specific services. |
| **New types** | Aastha owns `types/member.ts`, `types/payment.ts`. Shradha owns `types/attendance.ts`, `types/module.ts`. |

---

## Phase 0 — Stabilize Local Setup *(both, coordinated, 1 day)*

These are one-time setup tasks. Do them together or assign one person and share the result.

| Task | Owner | File(s) |
|---|---|---|
| Confirm Supabase migration is applied, verify admin user/profile/role | **Shradha** | Supabase dashboard only |
| Add missing env vars: `SUPABASE_SERVICE_ROLE_KEY`, `ATTENDANCE_SYNC_SECRET`, `CRON_SECRET` to `.env.local` and `.env.example` | **Aastha** | `.env.local`, `.env.example` |
| Add environment validation module that fails fast on missing vars | **Aastha** | `lib/env.ts` *(new file)* |
| Fix UTF-8 encoding artifacts (`â‚¹` → `₹`, `â€"` → `—`, `Â·` → `·`) | **Shradha** | Search across `components/` and `app/` — fix only Shradha's owned files; Aastha fixes hers |
| Add ESLint flat config so `npm run lint` runs without interactive prompt | **Shradha** | `eslint.config.mjs` *(new file)* |
| Expand README with setup steps, roles, env vars | **Aastha** | `README.md` |
| Add dev seed script | **Shradha** | `supabase/seed.sql` *(new file)* |

---

## Phase 1 — Auth, Authorization & Security *(parallel, ~3 days)*

### Aastha — Auth flows and RLS for members/payments

| Task | File(s) |
|---|---|
| Add logout action and link it in the header | `app/(auth)/actions.ts`, `components/layout/header.tsx` |
| Add account/profile dropdown in header (avatar, logout, settings link) | `components/layout/header.tsx` |
| Fix notification indicator to read actual unread count | `components/layout/header.tsx` |
| Add branch selector for global admin users in all member/payment forms | `components/members/member-form.tsx`, `lib/validations/member.ts` |
| Tighten RLS write policies for `members`, `payments`, `invoices` tables | `supabase/migrations/` *(new migration file — coordinate naming with Shradha)* |
| Add explicit role checks in members API (admin/manager only for delete) | `app/api/members/route.ts`, `app/api/members/[id]/route.ts` |
| Add rate limiting helper for auth endpoints | `lib/rate-limit.ts` *(new file)* |

### Shradha — RLS for modules and security headers

| Task | File(s) |
|---|---|
| Define resource-by-role permission matrix | `docs/permissions.md` *(new file)* |
| Replace overly broad `is_staff_user()` write policies for staff, trainers, appointments, workouts, diet | `supabase/migrations/` *(new migration file — coordinate naming with Aastha)* |
| Add explicit role checks in generic `[resource]` API | `app/api/[resource]/route.ts`, `app/api/[resource]/[id]/route.ts` |
| Scope Storage read policies by branch/member | `supabase/migrations/` *(new migration file)* |
| Add security headers (CSP, X-Frame-Options, etc.) | `next.config.ts` |
| Add SSRF protection — validate device sync URLs against an allowlist | `app/api/face-machines/[id]/sync/route.ts` |
| Add rate limiting to attendance sync and cron endpoints | `app/api/attendance/sync/route.ts`, `app/api/cron/reminders/route.ts` |

> **Migration coordination:** Use sequential numbered files. Aastha takes even numbers (`0002`, `0004`), Shradha takes odd numbers (`0003`, `0005`). Never edit each other's migration files.

---

## Phase 2 — Core Gym Workflow *(parallel, ~5 days)*

### Aastha — Member management + Dashboard + Payments

| Task | File(s) |
|---|---|
| Add Previous/Next pagination controls to member list | `app/(dashboard)/members/page.tsx` |
| Add member edit page and wire up existing PUT API | `app/(dashboard)/members/[id]/page.tsx`, `components/members/member-form.tsx` |
| Add member delete with confirmation dialog | `components/members/members-table.tsx`, `app/(dashboard)/members/[id]/page.tsx` |
| Add member photo upload UI | `components/members/member-form.tsx`, `app/api/members/[id]/route.ts` |
| Replace demo dashboard chart data with live aggregate queries | `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/charts.tsx` |
| Fix dashboard header search to route correctly for all entity types | `components/layout/header.tsx` |
| Build payment list page | `app/(dashboard)/[module]/page.tsx` already exists — create `app/(dashboard)/payments/page.tsx` *(new dedicated page)* |
| Build invoice/receipt create and view | `components/modules/invoice-form.tsx` *(new)*, `app/(dashboard)/payments/[id]/page.tsx` *(new)* |
| Create `payment.service.ts` and `subscription.service.ts` | `services/payment.service.ts` *(new)*, `services/subscription.service.ts` *(new)* |

### Shradha — Membership plans + Subscriptions + Atomic sale flow

| Task | File(s) |
|---|---|
| Build membership plans list and edit page | `app/(dashboard)/plans/page.tsx` *(new)*, `app/(dashboard)/plans/[id]/page.tsx` *(new)* |
| Build subscription list, create, renew, pause, cancel, history | `app/(dashboard)/subscriptions/page.tsx` *(new)*, `app/(dashboard)/subscriptions/[id]/page.tsx` *(new)* |
| Build atomic membership sale wizard (member → plan → discount → invoice → payment → receipt) | `components/modules/membership-sale-wizard.tsx` *(new)* |
| Add subscription expiry and status UI badges | `components/modules/subscription-status-badge.tsx` *(new)* |
| Create `plan.service.ts` | `services/plan.service.ts` *(new)* |
| Add sidebar nav items for Plans, Subscriptions, Payments | `components/layout/sidebar.tsx` |

---

## Phase 3 — Attendance Operations *(Shradha-led, ~3 days)*

Shradha owns attendance end-to-end. Aastha has no attendance files to touch.

| Task | File(s) |
|---|---|
| Add attendance list page with date/member/device filters | `app/(dashboard)/attendance/page.tsx` |
| Add unmatched-event review and correction workflow | `app/(dashboard)/attendance/unmatched/page.tsx` *(new)* |
| Add manual late/missing-exit correction UI | `components/attendance/manual-correction-form.tsx` *(new)* |
| Add member-to-machine-user enrollment and mapping UI | `app/(dashboard)/settings/page.tsx`, `components/settings/sync-machine-button.tsx` |
| Secure device credential storage (remove plaintext api_key from client responses) | `app/api/face-machines/[id]/sync/route.ts` |
| Add device heartbeat/sync-lag monitoring display | `components/settings/device-status-card.tsx` *(new)* |
| Create `attendance.service.ts` | `services/attendance.service.ts` *(new)* |

---

## Phase 4 — Business Modules *(split by module, ~7 days)*

Aastha and Shradha each own specific modules entirely — pages, components, services.

### Aastha's Modules

| Module | New Files |
|---|---|
| **Appointments** — calendar view, create, approve, reschedule, cancel | `app/(dashboard)/appointments/page.tsx`, `app/(dashboard)/appointments/[id]/page.tsx`, `components/modules/appointments/` *(new folder)*, `services/appointment.service.ts` |
| **Progress measurements** — log, photos, trend chart | `app/(dashboard)/progress/page.tsx`, `app/(dashboard)/progress/[id]/page.tsx`, `components/modules/progress/` *(new folder)*, `services/progress.service.ts` |
| **Equipment** — asset list, maintenance schedule, due alerts | `app/(dashboard)/equipment/page.tsx`, `app/(dashboard)/equipment/[id]/page.tsx`, `components/modules/equipment/` *(new folder)*, `services/equipment.service.ts` |

### Shradha's Modules

| Module | New Files |
|---|---|
| **Trainers** — profiles, schedules, member assignments | `app/(dashboard)/trainers/page.tsx`, `app/(dashboard)/trainers/[id]/page.tsx`, `components/modules/trainers/` *(new folder)*, `services/trainer.service.ts` |
| **Workouts** — exercise library, plans, assignment | `app/(dashboard)/workouts/page.tsx`, `app/(dashboard)/workouts/[id]/page.tsx`, `components/modules/workouts/` *(new folder)*, `services/workout.service.ts` |
| **Diet Plans** — templates, macros, assignment history | `app/(dashboard)/diet-plans/page.tsx`, `app/(dashboard)/diet-plans/[id]/page.tsx`, `components/modules/diet-plans/` *(new folder)*, `services/diet-plan.service.ts` |

> Each module must have: list with filters, detail view, create form, edit form, status transitions, empty/loading/error states.

---

## Phase 5 — Notifications, Reports & Integrations *(parallel, ~4 days)*

### Aastha — Reports

| Task | File(s) |
|---|---|
| Build reports page with resource/branch/date-range selector | `app/(dashboard)/reports/page.tsx` *(new)* |
| Add report preview and export controls | `components/modules/reports/report-builder.tsx` *(new)* |
| Add live revenue, retention, attendance, outstanding-payment report queries | `services/report.service.ts` *(new)* |
| Wire dashboard charts to these live queries | `components/dashboard/charts.tsx` |

### Shradha — Notifications

| Task | File(s) |
|---|---|
| Build notification delivery worker / background job | `services/notification.service.ts` *(new)* |
| Add email adapter (start with Resend/Nodemailer) | `lib/providers/email.ts` *(new)* |
| Add notification templates (birthday, expiry, appointment, payment) | `lib/notification-templates.ts` *(new)* |
| Add delivery attempt logging (status, provider ID, failure, retry) | Supabase migration — Shradha's next odd number |
| Build notifications list/history page | `app/(dashboard)/notifications/page.tsx` *(new)* |
| Add Staff module: invite, roles, attendance, leave | `app/(dashboard)/staff/page.tsx` *(new)*, `services/staff.service.ts` *(new)* |

---

## Phase 6 — Quality Assurance *(parallel, ~4 days)*

### Aastha — Testing (member + payment + dashboard flows)

| Task | File(s) |
|---|---|
| Add unit tests for `lib/validations/member.ts`, `lib/validations/auth.ts` | `__tests__/validations/member.test.ts`, `__tests__/validations/auth.test.ts` *(new)* |
| Add integration tests for members API (CRUD, RLS, branch isolation) | `__tests__/api/members.test.ts` *(new)* |
| Add Playwright e2e: login, member registration, membership sale | `e2e/login.spec.ts`, `e2e/member-registration.spec.ts`, `e2e/membership-sale.spec.ts` *(new)* |
| Generate Supabase TypeScript types, remove `any` casts in member/payment code | `types/database.ts` *(generated)* |
| Add error boundaries for member and dashboard pages | `app/(dashboard)/members/error.tsx`, `app/(dashboard)/dashboard/error.tsx` *(new)* |

### Shradha — Testing (attendance + modules + CI)

| Task | File(s) |
|---|---|
| Add unit tests for `lib/validations/attendance.ts`, `lib/validations/resources.ts` | `__tests__/validations/attendance.test.ts`, `__tests__/validations/resources.test.ts` *(new)* |
| Add integration tests for attendance sync (idempotency, batch, unmatched) | `__tests__/api/attendance.test.ts` *(new)* |
| Add Playwright e2e: attendance review, report generation | `e2e/attendance-review.spec.ts`, `e2e/reports.spec.ts` *(new)* |
| Remove `any` casts in attendance and module service code | owned service files |
| Add error boundaries for module and attendance pages | `app/(dashboard)/attendance/error.tsx` *(new)* |
| Set up CI pipeline (GitHub Actions) | `.github/workflows/ci.yml` *(new)* |

---

## Phase 7 — Deployment & Rollout *(shared, 2 days)*

Both devs coordinate — do this together:

| Task | Owner |
|---|---|
| Create staging and production Supabase projects | Shradha |
| Configure Vercel project, env vars, cron schedule | Aastha |
| Import initial branch/member data | Shradha |
| Write role-specific user guides | Aastha (reception + manager), Shradha (trainer + admin) |
| Pilot test with one branch | Both |

---

## Quick Reference — Who Owns What

| Area | Aastha | Shradha |
|---|---|---|
| Auth/Session | ✅ logout, profile menu, rate-limit helper | — |
| Members | ✅ edit, delete, photo upload, pagination | — |
| Dashboard | ✅ live charts, search fix | — |
| Payments & Invoices | ✅ list, create, receipt | — |
| Plans & Subscriptions | — | ✅ list, edit, sale wizard |
| Attendance | — | ✅ full module |
| Settings / Devices | — | ✅ mapping, heartbeat |
| Appointments | ✅ | — |
| Progress | ✅ | — |
| Equipment | ✅ | — |
| Trainers | — | ✅ |
| Workouts | — | ✅ |
| Diet Plans | — | ✅ |
| Notifications | — | ✅ |
| Reports | ✅ | — |
| Staff | — | ✅ |
| Tests (member/payment/dashboard) | ✅ | — |
| Tests (attendance/modules/CI) | — | ✅ |
| README & env validation | ✅ | — |
| ESLint config & seed data | — | ✅ |
| Supabase migrations | Even numbers (0002, 0004…) | Odd numbers (0003, 0005…) |

---

## Shared Files — Edit Protocol

These files are touched by both devs. **Never edit at the same time.**

| File | Protocol |
|---|---|
| `components/layout/sidebar.tsx` | Aastha adds her nav items first, commits and pushes. Shradha pulls, then adds hers. |
| `components/layout/header.tsx` | Aastha owns (logout, profile, search fix). Shradha coordinates if she needs to add anything. |
| `supabase/migrations/` | Use the even/odd numbering rule — never edit each other's migration files. |
| `types/database.ts` | Regenerate with `npx supabase gen types` after each migration. The person who runs the migration regenerates types. |
| `lib/auth.ts` | Aastha only. Shradha should not modify this file; use `getCurrentProfile()` as-is. |

---

*Generated: 4 August 2026 | Based on analysis.md review*
