# SyncFyre — Remaining Modules, Ownership & Test Tracker

**Updated:** 9 August 2026  
**Purpose:** Complete every remaining portal workflow with two developers working in parallel without editing the same files. This is the delivery checklist; a feature is not complete until its implementation and verification boxes are checked.

## How to use this tracker

Status meanings:

| Status | Meaning |
|---|---|
| `Implemented` | Code path exists and was reviewed. It is not yet proven against a logged-in Supabase environment. |
| `To build` | The route, action, or user-facing workflow still needs code. |
| `Manual test required` | Requires a browser session and test data; do not mark verified from code review alone. |
| `Verified` | All listed acceptance checks passed in staging or local Supabase, with evidence recorded below. |

### Completion rule for every row

- [ ] Feature implementation is merged.
- [ ] Empty, loading, error, and unauthorised states are handled.
- [ ] Branch isolation and role access were tested with the stated account.
- [ ] Happy path and failure path were manually tested.
- [ ] `npm run typecheck` passes.
- [ ] Test evidence (date, tester, environment, and result) is recorded in the final table.

Current automated baseline: `npm run typecheck` passed on 9 August 2026. No automated test runner or CI workflow is configured in `package.json`; the test tasks below therefore include adding that foundation.

## Zero-conflict working agreement

1. Each developer edits only the directories assigned below. Create new files only inside the owned directory.
2. Do not edit `middleware.ts`, `lib/auth.ts`, `lib/nav/*`, `app/layout.tsx`, `app/globals.css`, `types/index.ts`, or existing Supabase migration files while working on this plan.
3. If a shared-file change is unavoidable, create a small dedicated branch/commit, tell the other developer, merge it first, then both developers rebase before continuing.
4. Database changes use new migration files only. Dev 1 uses the next **even** migration number; Dev 2 uses the next **odd** number. Never renumber or edit a migration created by the other developer.
5. Each task is one focused pull request. Do not mix refactors with a feature or a test task.

## Ownership map

| Developer | Exclusive scope | Explicitly excluded |
|---|---|---|
| **Dev 1 — Aastha** | `app/(reception)/`, `app/(member)/`, `e2e/reception/`, `e2e/member/`, `__tests__/reception/`, `__tests__/member/`, `services/reception.service.ts`, `services/member-portal.service.ts` | Trainer files, admin pages, navigation files, shared layout/auth files |
| **Dev 2 — Shradha** | `app/(trainer)/`, `e2e/trainer/`, `__tests__/trainer/`, `__tests__/attendance/`, `services/trainer-portal.service.ts`, `services/attendance.service.ts`, `.github/workflows/ci.yml`, test-tool configuration files | Reception/member files, admin pages, navigation files, shared layout/auth files |
| **Joint, sequential only** | Navigation additions, cross-portal APIs, shared types, global styling, migrations that affect both owners | Never edit concurrently; create a handoff issue first |

## Release gates that apply to all portals

| Gate | Owner | Acceptance criteria | Status |
|---|---|---|---|
| Authentication and access control | Joint | Unauthenticated users are redirected; each role can access only its portal and permitted records. | [ ] |
| Branch tenancy | Joint | A user from Branch A cannot list, fetch, update, or export Branch B data. | [ ] |
| CRUD feedback | Module owner | Create, edit, delete/cancel actions show success/failure feedback and refresh the visible data. | [ ] |
| Responsive UI | Module owner | Main list, form, filters, and primary action work at 360 px and desktop widths. | [ ] |
| Error/loading states | Module owner | Failed query has a recoverable error state; long query has a loading state. | [ ] |
| Auditability | Joint | Payments, attendance corrections, membership changes, and finance postings retain actor/time/reference data. | [ ] |

## Dev 1 — Reception portal completion

### R1. Member lookup and member details — `Implemented; manual test required`

**Owned files:** `app/(reception)/reception/members/page.tsx`, `app/(reception)/reception/members/[id]/page.tsx`, new children under `app/(reception)/reception/members/`, `services/reception.service.ts`.

- [ ] Search by name, member code, phone, and email.
- [ ] Filter by active/inactive/expired membership and paginate safely.
- [ ] Detail view shows profile, active membership, recent payments, and recent attendance.
- [ ] Reception can edit only the allowed member fields; invalid data shows field-level errors.
- [ ] Test: create a member, find them by each search key, edit phone/address, refresh, and verify persistence.
- [ ] Test: log in as reception for Branch A and confirm Branch B member cannot be opened by a copied URL.

### R2. Membership sale and renewal — `To build / verify`

**Owned files:** `app/(reception)/reception/memberships/page.tsx`, new children under `app/(reception)/reception/memberships/`, `services/reception.service.ts`.

- [ ] Display active membership plans with price, duration, tax, and availability status.
- [ ] Select a member and plan; calculate subtotal, discount, GST, total, paid amount, and balance server-side.
- [ ] Create subscription, invoice, payment/part-payment, and receipt as one transaction or safely recover on failure.
- [ ] Renew, cancel, and pause/resume only with permitted role and an audit note.
- [ ] Prevent a duplicate active subscription unless the business rule explicitly allows it.
- [ ] Test: sell a cash/UPI plan, verify membership expiry, invoice, payment, receipt, and admin finance total.
- [ ] Test: force an invalid amount/plan and confirm no partial subscription or payment is stored.

### R3. Attendance desk view — `Implemented; manual test required`

**Owned files:** `app/(reception)/reception/attendance/page.tsx`, new child components under `app/(reception)/reception/attendance/`, `services/reception.service.ts`.

- [ ] Filter attendance by date, member, and entry/exit state.
- [ ] Clearly identify unmatched device events and route to the authorised correction workflow.
- [ ] Do not expose device credentials or cross-branch logs.
- [ ] Test: check in/out a test member through a device or seeded event; verify the correct date/time appears.

### R4. Appointment desk workflow — `Implemented; manual test required`

**Owned files:** `app/(reception)/reception/appointments/`, `services/reception.service.ts`.

- [ ] List and filter pending, approved, completed, cancelled, and no-show appointments.
- [ ] Create an appointment using a valid member/trainer and prevent invalid time conflicts.
- [ ] Allow reception-approved transitions only; show a reason when cancelling.
- [ ] Test: create -> approve -> complete and create -> cancel; reload at each stage and verify status/history.

### R5. Payments and invoices — `Implemented; manual test required`

**Owned files:** `app/(reception)/reception/payments/page.tsx`, `app/(reception)/reception/invoices/`, `services/reception.service.ts`.

- [ ] List payments with date/member/method/status filters and invoice reference.
- [ ] Create an invoice only from permitted reception workflow and prevent negative/overpaid amounts.
- [ ] View/print/download receipt with member, branch, tax, and payment reference.
- [ ] Test: record full payment and partial payment; verify outstanding balance and invoice detail.

## Dev 1 — Member self-service completion

### M1. Profile — `To build`

**Owned files:** `app/(member)/member/profile/`, `services/member-portal.service.ts`.

- [ ] Replace read-only profile with an edit form for safe personal fields (phone, address, emergency contact, photo).
- [ ] Disallow changes to branch, membership, role, status, and staff-assigned trainer from this portal.
- [ ] Validate photo type/size and use branch/member-scoped storage access.
- [ ] Test: update permitted fields, reload, and verify forbidden fields cannot be submitted by URL or payload change.

### M2. Membership and payments — `Partially implemented; to complete`

**Owned files:** `app/(member)/member/membership/`, new `app/(member)/member/payments/`, `services/member-portal.service.ts`.

- [ ] Show current plan, start/end dates, status, days remaining, and renewal request action.
- [ ] Show invoice/payment history and receipt download without exposing other members' records.
- [ ] Add the Payments navigation item only after the page is tested; treat that nav edit as a sequential joint handoff.
- [ ] Test: member sees only own data; expired member sees correct renewal state; receipt belongs to current member.

### M3. Appointments — `Implemented; manual test required`

**Owned files:** `app/(member)/member/appointments/`, `services/member-portal.service.ts`.

- [ ] Create appointment from available trainer/time slots.
- [ ] Allow cancel/reschedule only before the configured cutoff and show resulting status.
- [ ] Test: submit a request, confirm it appears in reception/trainer views, cancel it, and verify all views agree.

### M4. Workouts, diet, progress, attendance — `Implemented; manual test required`

**Owned files:** `app/(member)/member/workouts/`, `diet-plan/`, `progress/`, `attendance/`, `services/member-portal.service.ts`.

- [ ] Member sees only their assigned workout, diet plan, progress records, and attendance history.
- [ ] Empty assignment has helpful next step rather than an error.
- [ ] Test: assign content as trainer, log in as the member, and verify visibility; use a second member to confirm isolation.

## Dev 2 — Trainer portal completion

### T1. Trainer dashboard and assigned members — `To build / verify`

**Owned files:** `app/(trainer)/trainer/dashboard/`, `app/(trainer)/trainer/members/`, `services/trainer-portal.service.ts`.

- [ ] Replace any voided/dead queries with awaited, branch-scoped dashboard metrics.
- [ ] List only members assigned to the current trainer; support member search and detail links.
- [ ] Test: assign one member to each of two trainers and confirm no crossover in dashboard/list/detail URLs.

### T2. Workout management — `Partially implemented; to complete`

**Owned files:** `app/(trainer)/trainer/workouts/`, `services/trainer-portal.service.ts`.

- [ ] Create workout template/plan with exercises, sets, reps, rest, notes, and optional start/end dates.
- [ ] Edit, archive/delete, assign, and unassign only current trainer's content and assigned members.
- [ ] Validate all numeric fields and confirm no orphaned assignment after deletion/archive.
- [ ] Test: create -> assign -> edit -> archive; verify assigned member view updates correctly.

### T3. Diet-plan management — `Partially implemented; to complete`

**Owned files:** `app/(trainer)/trainer/diet-plans/`, `services/trainer-portal.service.ts`.

- [ ] Create template/plan with meals, quantities, macros, notes, start/end dates, and assigned member.
- [ ] Edit, archive/delete, assignment history, and member isolation follow the workout rules.
- [ ] Test: create -> assign -> edit -> archive and verify macros/rendering in member view.

### T4. Progress management — `Partially implemented; to complete`

**Owned files:** `app/(trainer)/trainer/progress/`, `services/trainer-portal.service.ts`.

- [ ] Record measurements with date, weight, body-fat, dimensions, notes, and optional approved photos.
- [ ] Edit/delete/archive records only for the trainer's assigned members; include trend visualisation or comparison.
- [ ] Test: create two dated records, verify trend/order and member portal visibility; reject unassigned-member request.

### T5. Trainer appointments — `Implemented; manual test required`

**Owned files:** `app/(trainer)/trainer/appointments/`, `services/trainer-portal.service.ts`.

- [ ] Show assigned appointments with date/status filters.
- [ ] Permit allowed status transitions and notes; prevent edits to another trainer's appointment.
- [ ] Test: reception/member creates appointment; trainer approves/completes it; reception and member see final state.

### T6. Trainer notifications and settings — `To build`

**Owned files:** new `app/(trainer)/trainer/notifications/`, new `app/(trainer)/trainer/settings/`, `services/trainer-portal.service.ts`.

- [ ] Notifications list, unread/read state, and safe deep links to owned records.
- [ ] Settings permits only personal preferences/profile fields; no role/branch changes.
- [ ] Add navigation items only through the sequential joint handoff after both pages pass tests.
- [ ] Test: send a test notification, mark it read, refresh, and verify persistence; validate profile update permissions.

## Dev 2 — Attendance reliability

### A1. Device sync and exception resolution — `Implemented; manual test required`

**Owned files:** `app/api/attendance/`, `app/api/face-machines/`, `app/(admin)/admin/attendance/`, new `__tests__/attendance/`, `services/attendance.service.ts`.

- [ ] Validate shared secret and machine identity; reject malformed, replayed, duplicate, and unauthorised events.
- [ ] Ensure repeated identical sync payloads are idempotent.
- [ ] List/review unmatched events and record a reason/actor for every correction.
- [ ] Show sync lag/heartbeat without exposing API keys to the browser.
- [ ] Test: submit valid batch twice (one set of records only), submit wrong secret (401/403), and correct an unmatched event.

## Admin portal regression pack — joint execution, no admin code changes unless a defect is found

The code audit shows all current admin sidebar routes are present, including the newly created Progress list page. Each needs logged-in acceptance testing before release.

| Module | Acceptance flow | Status |
|---|---|---|
| Dashboard | KPIs, charts, recent activity, and quick actions use current branch data. | [ ] |
| Members | Create without trainer, search/filter/paginate, edit, photo upload, delete, and detail tabs. | [ ] |
| Memberships | Create/edit plan; assign, renew, pause/cancel membership; dates and totals remain correct. | [ ] |
| Attendance | Filter events and resolve/correct an exception. | [ ] |
| Appointments | Create -> approve -> complete and create -> cancel. | [ ] |
| Trainers | Create trainer, confirm list and detail page. | [ ] |
| Workouts / Diet plans | Create, list, assign, and confirm member tab visibility. | [ ] |
| Progress | Record a measurement; filter by member/date; verify pagination and member association. | [ ] |
| Payments / invoices | Filter/export payment; create invoice; record payment; inspect receipt/outstanding balance. | [ ] |
| Finance / accounting | Create income/expense/bank account; approve expense; post journal; verify ledger/trial balance/P&L. | [ ] |
| Equipment | Create equipment; search/filter; verify maintenance and warranty values. | [ ] |
| Reports | Open each report and export CSV with current branch data only. | [ ] |
| Notifications | Create notification, filter unread, mark as read, and check delivery/audit data. | [ ] |
| Settings | Change allowed branch settings; manage categories; view face-machine state without leaking credentials. | [ ] |

## Test automation foundation — Dev 2 owns setup, each developer owns their tests

| Task | Owner | Files | Done |
|---|---|---|---|
| Add a unit/integration test runner and scripts | Dev 2 | `package.json` *(shared handoff)*, test config | [ ] |
| Add browser E2E runner and scripts | Dev 2 | `package.json` *(shared handoff)*, E2E config | [ ] |
| Add CI for install, typecheck, lint, unit/integration tests, and E2E smoke test | Dev 2 | `.github/workflows/ci.yml` | [ ] |
| Add reception/member integration tests | Dev 1 | `__tests__/reception/`, `__tests__/member/` | [ ] |
| Add reception/member E2E tests | Dev 1 | `e2e/reception/`, `e2e/member/` | [ ] |
| Add trainer/attendance integration tests | Dev 2 | `__tests__/trainer/`, `__tests__/attendance/` | [ ] |
| Add trainer/attendance E2E tests | Dev 2 | `e2e/trainer/` | [ ] |

Minimum automated coverage before launch:

- [ ] Validation unit tests: member, attendance, finance amount/date/status inputs.
- [ ] API integration tests: branch isolation, unauthorised role, invalid payload, and idempotent attendance batch.
- [ ] E2E smoke tests: login, receptionist membership sale, member self-service view, trainer assignment, admin finance posting.
- [ ] CI runs on every pull request and blocks merge on any failed check.

## Evidence log and release sign-off

Use one row per tested workflow. Attach a PR link, test-output link, or screenshot location in the Evidence column.

| Date | Environment | Module/workflow | Tester | Result | Evidence / defect link |
|---|---|---|---|---|---|
| 2026-08-09 | Local | TypeScript compilation | Codex | Pass | `npm run typecheck` |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

Release may be approved only when all release gates, all applicable module rows, and the automated-coverage checklist are checked, with no unresolved critical or high-severity defect.
