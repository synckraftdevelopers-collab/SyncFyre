# Admin Functionality Audit

Updated: 2026-08-08

## Scope and evidence

This is a code-level audit of the admin portal routes, their create flows, and their persistence paths. It is **not** a replacement for logged-in browser testing against Supabase. `npm run typecheck` and `npm run lint` passed during the latest implementation work.

Status legend:

- **Implemented** — route and main data flow are present in code.
- **Manual test required** — needs a logged-in browser/database test before it can be called fully verified.
- **Gap** — missing list page, action, or verification required before release.

## Sidebar route audit

| Area | Route | Code status | What to verify manually |
|---|---|---|---|
| Dashboard | `/admin/dashboard` | Implemented | KPIs, charts, recent activity, and quick actions load for the current branch. |
| Members | `/admin/members` | Implemented | Add member without trainer, search/filter/pagination, edit/delete, detail tabs. |
| Memberships | `/admin/memberships` | Implemented | Create/edit plan, assign/renew a membership, correct start/end dates. |
| Attendance | `/admin/attendance` | Implemented | Branch data, entry/exit times, attendance filters. |
| Appointments | `/admin/appointments` | Implemented | Book appointment, approve, complete, cancel, and filter status. |
| Trainers | `/admin/trainers` | Implemented | Add Trainer opens `/admin/trainers/new`, selects a user, saves, and opens a trainer detail page. |
| Workouts | `/admin/workouts` | Implemented | Create workout and confirm it appears in the table and the selected member's Workouts tab. |
| Diet plans | `/admin/diet-plans` | Implemented | Create diet plan and confirm it appears in the table and the selected member's Diet Plan tab. |
| Progress | `/admin/progress` | **Gap** | Currently uses the generic module overview after creation; add a real progress-record list page. |
| Payments | `/admin/payments` | Implemented | Filters, CSV export, invoice payment appears in the list. |
| Finance | `/admin/finance` | Implemented | KPI cards and quick links match real data. |
| Accounting | `/admin/finance/accounting` | Implemented | Chart of accounts, journal posting, ledger filtering, trial balance totals. |
| Equipment | `/admin/equipment` | Implemented | Add equipment, search/status filter, and maintenance/warranty data. |
| Reports | `/admin/reports` | Implemented | Hub cards, report filters, CSV exports, and revenue data. |
| Notifications | `/admin/notifications` | Implemented | Create notification, unread filter, and Mark read action. |
| Settings | `/admin/settings` | Implemented | Face machines, branch details, income categories, and expense categories. |

## Create-and-save flow audit

| Resource | Create route | Save mechanism | Destination after save | Current status |
|---|---|---|---|---|
| Member | `/admin/members/new` | Server action | `/admin/members` | Implemented; trainer assignment is optional. |
| Trainer | `/admin/trainers/new` | `/api/trainers` | `/admin/trainers` | Implemented. |
| Workout | `/admin/workouts/new` | `/api/workouts` | `/admin/workouts` | Implemented; listed in admin page and member tab. |
| Diet plan | `/admin/diet-plans/new` | `/api/diet-plans` | `/admin/diet-plans` | Implemented; listed in admin page and member tab. |
| Appointment | `/admin/appointments/new` | `/api/appointments` | `/admin/appointments` | Manual test required. |
| Equipment | `/admin/equipment/new` | `/api/equipment` | `/admin/equipment` | Manual test required. |
| Staff | `/admin/staff/new` | `/api/staff` | `/admin/staff` | Manual test required. |
| Notification | `/admin/notifications/new` | `/api/notifications` | `/admin/notifications` | Manual test required. |
| Membership plan | `/admin/memberships/new` | Server action | `/admin/memberships` | Manual test required. |
| Progress | `/admin/progress/new` | `/api/progress` | `/admin/progress` | **Gap:** record saves but no dedicated list page confirms it. |

## Recent fixes that need regression testing

1. `/admin/trainers/new` has an explicit page so it is no longer interpreted as trainer ID `new`.
2. The member wizard does not validate an empty optional trainer assignment.
3. Admin Workout and Diet Plan pages show newly created records.
4. Workout and Diet Plan joins use explicit Supabase foreign-key names to avoid ambiguous relationship errors.
5. Trainer dashboard counts workouts and diet plans for assigned members.

## Required manual acceptance test

Run these while logged in as an admin and use a test member/trainer only.

- [ ] Open every sidebar link in a new tab; no page should show 404 or a runtime error.
- [ ] Create a member without a trainer; complete the wizard and confirm the member list shows the new member.
- [ ] Create a trainer; confirm the trainer list and detail page display it.
- [ ] Create a workout; confirm it is visible in `/admin/workouts` and the member's Workouts tab.
- [ ] Create a diet plan; confirm it is visible in `/admin/diet-plans` and the member's Diet Plan tab.
- [ ] Create equipment; confirm it is visible in `/admin/equipment` and search/filter work.
- [ ] Book an appointment; test pending -> approved -> completed and cancelled transitions.
- [ ] Create income, expense, and bank account entries; confirm they appear in their list pages.
- [ ] Approve an expense and check Profit & Loss totals update.
- [ ] Check reports and each CSV export with real data.
- [ ] Post a draft journal and check it appears in the ledger/trial balance.

## Recommended next implementation

Create `app/(admin)/admin/progress/page.tsx` with a branch-scoped list of progress records, member name, measurement date, key measurements, search/filter controls, and a link to `/admin/progress/new`. This is the only current admin navigation item that still resolves to a generic placeholder rather than a data list.