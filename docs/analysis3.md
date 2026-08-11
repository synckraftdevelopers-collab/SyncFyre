# SyncFyre — Remaining Work and Release Plan

**Prepared:** 2026-08-10  
**Purpose:** Turn the current codebase into a reliable, end-to-end gym-management product that can be operated by an admin, reception team, trainers, and members.

---

## 1. Current position

The application has a strong foundation: Supabase-backed data, role-based portals, member management, finance services, dashboards, reports, and most admin routes exist. Recent work also added:

- Staff account creation with role and branch assignment.
- Admin-dashboard and sidebar access to **Add Staff**.
- Member Excel/CSV import with branch selection, validation, duplicate-phone protection, batch inserts, and discrepancy feedback.
- Clear required/optional guidance in the Add Member wizard.

The main remaining risk is not only missing screens. It is **verification**: every business-critical flow needs to be tested with real roles and real database data before the product can be called production-ready.

### Release definition

The product is ready for a gym when the following are true:

1. An admin can configure the gym, staff, plans, equipment, and finance categories.
2. Reception can register a member, sell or renew a membership, take a payment, and handle attendance.
3. Trainers can see their assigned members and maintain workouts, diet plans, and progress records.
4. Members can reliably see the information relevant to them.
5. No navigation route, action, import, payment flow, or role boundary fails in normal use.
6. Critical flows are protected by automated checks and a repeatable manual UAT checklist.

---

## 2. Remaining-work priorities

| Priority | Area | Why it matters | Completion evidence |
|---|---|---|---|
| P0 | Current flow validation | Existing features cannot be treated as complete until exercised against a logged-in Supabase environment. | Signed manual test checklist with no unresolved blocker. |
| P0 | Member import hardening | Bulk import is likely to be used with legacy spreadsheets and can affect many records. | Imports sample and real legacy sheet without duplicate/corrupt records. |
| P0 | Progress module | Admin navigation still needs a real progress-record list rather than a placeholder/generic route. | List, filter, create, view, and member linkage work. |
| P0 | Staff lifecycle | Creating a staff login is available; role changes, visibility, and staff record behaviour need browser verification. | Admin creates staff, assigns role/branch, then staff signs in to correct portal. |
| P1 | Membership/subscription lifecycle | A gym cannot operate if it cannot manage plans, renewals, expiry, pauses, and cancellations. | Full sale → active → renew/pause/cancel lifecycle tested. |
| P1 | Attendance exceptions | Staff need manual correction/entry and a clear audit trail for device failures. | Manual entry/edit approval path works and is audited. |
| P1 | Trainer and member workflows | Workout, diet, appointment, and progress operations must be complete, not merely listed. | CRUD and role visibility tested for each workflow. |
| P1 | Finance operational checks | Financial data must reconcile across payment, cash, bank, invoice, and reports. | Reconciliation scenario passes with known test figures. |
| P2 | Communication and notifications | Notifications are useful only when they are visible, actionable, or delivered. | Notification inbox works; delivery integrations are scoped/tested. |
| P2 | Operational polish | Loading, errors, empty states, responsive UI, exports, and accessibility reduce support burden. | Browser QA checklist passes on desktop and mobile. |
| P3 | Production engineering | Monitoring, CI, backups, security review, and release process are needed for dependable operation. | CI green, environment checklist completed, recovery process documented. |

---

## 3. Phased implementation and testing plan

## Phase 0 — Stabilise the current branch

**Goal:** Make the current uncommitted work safe to test and prevent regressions.

### Work

- Review and commit the current changes in small, coherent commits:
  - Staff creation/role assignment.
  - Member Excel import.
  - Member-form required/optional guidance.
  - Dashboard/sidebar navigation.
- Restart the development server after the `next.config.ts` upload-size change.
- Confirm the `xlsx` dependency is committed in both `package.json` and `package-lock.json`.
- Remove generated-only changes such as `tsconfig.tsbuildinfo` from commits if they are not intentionally versioned.
- Ensure all newly created routes/actions are covered by appropriate admin/manager authorization checks.

### Tests

| Test | Expected result |
|---|---|
| `npm run typecheck` | No TypeScript errors. |
| `npm run build` | Production build completes without route or server-action errors. |
| Admin dashboard refresh | Add Staff appears in banner and Quick Actions. |
| Admin sidebar refresh | Add Staff appears and opens `/admin/staff/new`. |
| Unauthorized role access | Reception/trainer/member cannot open admin staff routes. |

**Exit criteria:** Clean build, no broken route, and current changes committed or intentionally documented as pending.

---

## Phase 1 — Validate core daily gym operations

**Goal:** Prove that a front-desk team can run a normal day using the product.

### Work

1. Create a dedicated progress-record list at `/admin/progress`.
   - Branch-scoped data.
   - Member name, measurement date, key metrics, search/filter, pagination.
   - Link to add record and relevant member profile.
2. Confirm the staff module has a usable list, status, role, branch, and designation view.
3. Verify all admin sidebar routes against a real database; replace any generic overview/404 route with a live operational page.
4. Add a small member-import history/audit record if bulk imports are used operationally.
   - Filename, imported count, skipped count, actor, branch, timestamp.
   - This can be Phase 2 if it requires a schema migration.

### Required manual scenario: new member to active member

1. Log in as admin.
2. Create or verify a branch, membership plan, and trainer.
3. Add a member with only required fields: full name, phone, branch.
4. Confirm member code generation and list visibility.
5. Edit optional details and upload a profile image.
6. Assign trainer, create membership/subscription, take a payment, and create invoice/receipt.
7. Mark/check attendance and confirm dashboard/report totals update.
8. Deactivate the member and confirm the audit/activity event is retained.

### Excel import test matrix

| File | Expected result |
|---|---|
| Template CSV with 2 valid rows | Both members created. |
| `.xlsx` with a title row above `NAME` / `CONTACT NUMBER` | Header is detected and rows import. |
| Sheet with blank optional cells | Member imports; optional fields remain empty. |
| Sheet with blank name/phone | Valid rows import; invalid row appears in discrepancies. |
| Sheet with duplicate phone in file | One row imports; duplicate is skipped and reported. |
| Sheet with phone already in selected branch | Row is skipped and reported. |
| Wrong/missing branch | Import is blocked before inserts. |
| 500+ rows | All valid rows insert in batches; browser remains usable. |

**Exit criteria:** A member can be registered, imported, maintained, sold a plan, paid, and checked in without manual database changes.

---

## Phase 2 — Complete commercial and staff workflows

**Goal:** Make the product ready for admin and reception teams to manage gym operations without workarounds.

### Work

- Membership plans: create, edit, activate/deactivate, price/GST/duration validation.
- Subscriptions: active list, expiry filtering, renewal history, pause/cancel/expire actions.
- Reception: member registration, membership sale, payment collection, appointment creation, and branch-scoped restrictions.
- Staff: create account, assign role, edit designation/branch/status, deactivate safely, and ensure role changes take effect after sign-in.
- Attendance: manual attendance entry/correction, device failure exception path, and audit reason.
- Equipment: create/edit/deactivate, warranty information, maintenance schedule/status, due-maintenance visibility.
- Appointments: approve, complete, cancel, reschedule, conflict validation, and calendar/list usability.

### Tests

- Role test: admin, manager, reception, trainer, dietician, and member each sign in and only see permitted data/routes.
- Branch test: create two branches; confirm reception and staff cannot read or alter the other branch’s records.
- Membership test: new plan → new subscription → payment → renewal → expiry/cancel; verify reports and balances.
- Staff test: create a reception user, assign branch, sign in as that user, and confirm correct redirect/permissions.
- Equipment test: maintenance due item appears in the correct list/report.

**Exit criteria:** Admin and reception can complete all daily commercial tasks, with no cross-branch data exposure.

---

## Phase 3 — Complete trainer and member value

**Goal:** Ensure the product helps staff deliver fitness services after the sale.

### Work

- Trainer profile/detail page with assigned-member list, schedule, qualifications, status, and notes.
- Workout plans: create, edit, delete/archive, assign/reassign, and member visibility.
- Diet plans: create, edit/version, assign/reassign, and member visibility.
- Progress: measurement history and trend chart for member/trainer/admin views.
- Member portal: profile update request or self-service profile edit, appointment booking/cancellation if included in v1, and clear plan/expiry/payment visibility.
- Appointment schedule: trainer/dietician calendar/list with availability/conflict protection.

### Tests

- Trainer sees only assigned members and permitted plans.
- A trainer-created workout and diet plan appear on the correct member portal.
- Progress records create a correct chronological trend chart.
- Appointment lifecycle works through pending → approved → completed/cancelled.
- Member cannot access another member’s ID or data by changing the URL.

**Exit criteria:** Trainer and member portals contain live, relevant, correctly scoped information and support the agreed v1 actions.

---

## Phase 4 — Finance, reporting, and communication confidence

**Goal:** Ensure the operational figures used by the gym are reliable and actionable.

### Work

- Verify/create missing finance screens: income, expense, bank account, cash closing, P&L, accounting journals/ledger/trial balance.
- Add refund/partial-payment behaviour if required by business policy.
- Verify GST exports and report filters with a defined accountant review process.
- Reports hub: date range, branch, status filters; CSV download; clear empty state.
- Notification centre: list, read/unread, action links, and delivery provider integration only if required for v1.
- Document finance business rules: tax treatment, cash closing owner, approval limits, refund policy, and accounting period lock policy.

### Finance reconciliation scenario

Use fixed test data for one branch:

1. Create a membership invoice for a known amount.
2. Record cash, UPI, and card payments.
3. Create and approve an expense.
4. Post an income/bank transaction as applicable.
5. Verify dashboard revenue, outstanding balance, cash book, bank balance, GST view, P&L, journal, and trial balance all reconcile to expected values.

**Exit criteria:** An admin can trust reports for daily cash, monthly revenue, outstanding dues, and finance review.

---

## Phase 5 — Reliability, security, and UX polish

**Goal:** Remove the failure modes that make a usable product feel unfinished or unsafe.

### Work

- Add route-level `loading.tsx`, `error.tsx`, and empty states for all high-traffic portals.
- Confirm all server actions validate input, authorization, and branch scope.
- Add confirmation dialogs for destructive operations and clear success/error toasts.
- Add accessibility basics: keyboard navigation, visible focus states, labels, descriptions, contrast, and mobile checks.
- Add rate limiting/abuse controls for login, bulk import, and public endpoints where applicable.
- Review Supabase RLS policies using test users from two branches and each role.
- Add audit log visibility for sensitive events: staff role change, member import, financial approval, attendance correction, and deactivation.
- Define backup, restore, and data-retention procedures.

### Tests

- Simulate Supabase/network error: user sees a helpful recoverable message, not a raw crash.
- Mobile widths: 360px, 768px, 1024px; no inaccessible action or overflowing critical table without a scroll affordance.
- Keyboard-only path: sign in, create member, import file, save form, close dialogs.
- Security: invoke an admin action as a reception/trainer/member user; server rejects it even if UI is bypassed.

**Exit criteria:** Normal failures are understandable, sensitive actions are protected, and core pages are practical on target devices.

---

## Phase 6 — Automated testing and release process

**Goal:** Make future changes safe and repeatable.

### Test layers to add

| Layer | Suggested scope | Minimum first suite |
|---|---|---|
| Unit | Zod mappings, spreadsheet header detection, date/phone normalization, finance calculations. | Member import parser and validation helpers. |
| Integration | Server actions/services against a dedicated Supabase test project. | Create member, bulk import, staff role assignment, renewal, payment. |
| End-to-end | Browser workflow with seeded data. | Admin day-in-the-life, reception payment, trainer plan assignment, member portal access. |
| Regression | Known defects and permission boundaries. | Two-branch isolation; role redirect; duplicate import behaviour. |

### CI pipeline

Run on every pull request:

1. Install locked dependencies (`npm ci`).
2. `npm run typecheck`.
3. Lint with a supported ESLint flat configuration.
4. Unit/integration tests.
5. Production build (`npm run build`).
6. Optional preview-environment smoke test.

### Release checklist

- [ ] Environment variables are set only in the deployment platform; no secrets committed.
- [ ] Production Supabase migrations are reviewed and applied.
- [ ] Backup/restore procedure is tested.
- [ ] Admin test account and all role test accounts work.
- [ ] Core P0/P1 UAT scenarios pass in production-like environment.
- [ ] Error monitoring and uptime checks are configured.
- [ ] Release notes and rollback procedure are written.

**Exit criteria:** Every deployment is checked automatically, and a regression can be found before a gym customer is affected.

---

## 4. Recommended execution order

1. Complete **Phase 0** immediately and commit the current work.
2. Complete **Phase 1** before adding optional enhancement features.
3. Run the full **Phase 2** role/branch UAT with two real test branches.
4. Complete **Phase 3** only after staff/reception workflow is proven.
5. Run finance reconciliation from **Phase 4** with the business owner or accountant.
6. Do not launch publicly until at least the Phase 5 security/error baseline and Phase 6 build checks are in place.

---

## 5. Ownership and tracking template

Use one task row per change in the issue tracker or a project board.

| Field | Required content |
|---|---|
| Task | Concrete user outcome, not only a file name. |
| Priority | P0 / P1 / P2 / P3. |
| Owner | One accountable developer. |
| Scope | Routes, components, services, migrations, tests. |
| Acceptance criteria | Observable result and role/branch behaviour. |
| Test evidence | Screenshot/video, automated test name, or UAT checklist item. |
| Rollback note | How to safely disable/revert if production behaviour is wrong. |

This plan should be revisited after Phase 1 UAT. At that point, replace assumptions with findings from real staff and real legacy spreadsheets.