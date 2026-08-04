# SyncFyre Website Implementation Analysis

Date reviewed: 3 August 2026  
Project: SyncFyre Gym Management System  
Stack: Next.js 15, React 19, TypeScript, Supabase, Tailwind CSS, Recharts

## Executive summary

SyncFyre has a strong technical foundation and a wide database design, but it is not yet a production-ready gym management product. The application shell, authentication flow, dashboard metrics, member registration/list/detail views, generic CRUD APIs, attendance ingestion, CSV exports, and database security foundation are present. Most remaining business modules currently have a polished overview page and a create form, but do not yet have real list, detail, edit, delete, filtering, or workflow screens.

Estimated status:

| Area | Estimated completion | Status |
|---|---:|---|
| Project foundation and UI shell | 80% | Mostly complete |
| Database schema and initial RLS | 75% | Broad foundation; security corrections needed |
| Authentication and session handling | 65% | Login/reset works; onboarding and logout incomplete |
| Dashboard | 60% | Live metrics; charts are demo data |
| Member management | 65% | Best-developed module; edit/delete/upload/pagination controls missing |
| Attendance integration | 55% | Secure ingestion API and logs exist; device deployment workflow incomplete |
| Other business modules | 25% | Creation foundations exist; operational UIs mostly absent |
| Notifications and external providers | 20% | Reminder queue exists; delivery is not implemented |
| Testing, observability, and deployment readiness | 15% | Type-safe, but no tests, lint config, CI, or monitoring |
| **Overall usable MVP** | **about 45%** | Foundation is good; core workflows need completion |

These percentages are engineering estimates based on the source code, not time-sheet measurements.

## What is already implemented

### Application foundation

- Responsive dashboard shell with sidebar, header, mobile navigation, theme switching, loading state, and reusable UI components.
- Next.js App Router structure with server components, route handlers, middleware authentication, and Supabase SSR cookie handling.
- Environment template and local Supabase public configuration.
- Consistent validation using Zod for authentication, members, attendance, and 13 generic resources.
- TypeScript check currently passes with `npm run typecheck`.

### Authentication and authorization

- Email/password login.
- Forgot-password and reset-password actions.
- Middleware session refresh and protected-route redirects.
- Application-level role checks through `requireUser`.
- Roles for admin, manager, reception, trainer, dietician, and member.
- Unauthorized page and database Row Level Security policies.

### Dashboard

- Live summary metrics for members, attendance, expiring subscriptions, payments, appointments, trainers, and equipment.
- Recent activity feed query.
- Responsive metric cards and chart components.
- Revenue, attendance, and plan charts are visually implemented, but their values are currently hard-coded sample data.

### Member management

- Member registration with server-side validation.
- Member list with search and status filtering.
- Server-side pagination data and total counts.
- Member detail page with health and contact information.
- CSV member export.
- REST endpoints for list, create, update, and delete.
- Branch-aware data queries and Supabase RLS protection.

### Business module foundations

The project contains database models, validation, generic APIs, overview pages, and create forms for many areas:

- Membership plans and subscriptions.
- Appointments.
- Trainers and trainer assignments.
- Workouts and workout categories.
- Diet plans.
- Progress measurements.
- Payments and invoices.
- Staff.
- Equipment and maintenance.
- Notifications.
- Face-machine settings.
- CSV reports for members, attendance, payments, appointments, and subscriptions.

### Attendance and automation

- Secret-protected batch attendance ingestion endpoint.
- Zod validation with a maximum batch size of 1,000 events.
- Idempotency through external event IDs.
- Matching face-machine users to members.
- Entry/exit merging into a daily attendance record.
- Sync logs for processed, duplicate, and unmatched events.
- Device connection test endpoint and device status display.
- Cron-protected membership-expiry reminder queue for 15, 7, 3, 1, and 0 days.

### Supabase database

- One comprehensive initial migration with 25+ operational tables.
- Enums, foreign keys, indexes, updated-at triggers, auth-user provisioning, subscription date calculation, and attendance processing.
- RLS enabled across the application tables.
- Private storage buckets for member photos, progress photos, and receipts.
- Initial system roles are seeded.

## What is incomplete or needs correction

### Highest-priority blockers

1. Server-only configuration is missing locally: `SUPABASE_SERVICE_ROLE_KEY`, `ATTENDANCE_SYNC_SECRET`, and `CRON_SECRET`. Attendance ingestion and reminder automation cannot work until these are configured.
2. It is not confirmed from the repository whether the migration has been applied to the active Supabase project, whether a branch exists, or whether the first admin profile is correctly linked.
3. Admin users with no `branch_id` cannot reliably use several generic create forms. Many schemas require `branch_id`, but the forms do not offer a branch selector. Branch-bound staff receive it automatically; a global admin does not.
4. Most module overview pages always display “No records yet” because they do not query or render their actual records.
5. The generic create route allows every non-member role to attempt creation in every resource. Database RLS offers some protection, but role permissions need to be explicit per resource at both API and UI levels.

### Security issues to resolve before production

- The migration’s generated write policy uses `is_staff_user()` for staff, trainers, members, payments, and other sensitive tables. This effectively permits reception, trainers, and dieticians to write far more broadly than expected. The policy is named `management_write`, but its condition is not management-only.
- Generic PATCH requests update by record ID without explicitly adding a branch filter. RLS should stop cross-branch updates, but defense-in-depth filtering is recommended.
- Storage read policy allows any authenticated account to read objects from all three private buckets. Object paths should be scoped by user, member, and branch.
- Face-machine API credentials are stored in a column called `api_key_encrypted`, but the application treats the value as plaintext. Use encryption or a secrets store and never return it to clients.
- The device sync endpoint accepts arbitrary HTTP/HTTPS URLs. Add destination validation and an allowlist to reduce server-side request forgery risk.
- Hosted environments such as Vercel normally cannot contact face machines on a gym’s private LAN. A local connector/agent or device-initiated push integration is likely required.
- Add rate limiting to authentication, attendance sync, reports, and mutation endpoints.
- Add security headers, audit coverage for mutations, and safe structured error reporting.

### Product and workflow gaps

- No logout action or account/profile menu.
- No in-app user invitation, staff account creation, role assignment, or branch management workflow.
- No complete membership sale flow combining plan, subscription, invoice, payment, and receipt in one transaction.
- No subscription list, renewal, pause, cancel, or history UI.
- No operational list/detail/edit screens for appointments, trainers, workouts, diet plans, progress, payments, staff, equipment, or notifications.
- No invoice/receipt generation, printable documents, partial-payment workflow, refund UI, or payment gateway integration.
- No file-upload UI for member photos, progress photos, or receipts.
- No trainer schedule, member assignment, staff attendance, leave, payroll, or equipment maintenance-history UI.
- Notifications are inserted into the database, but email, SMS, and WhatsApp delivery adapters and delivery logs are not implemented.
- Reports are raw CSV endpoints. There is no report selection, date range, branch filter, preview, charting, or permission-specific report UI.
- Member list calculates pages but has no Previous/Next controls.
- Member edit and delete APIs exist, but the UI does not expose them.
- Dashboard header search claims to search payments and attendance but currently routes only to member search.
- Dashboard notification indicator is always visible and does not use unread data.
- Several user-facing strings contain encoding artifacts such as `â‚¹`, `â€”`, and `Â·` and need UTF-8 cleanup.

### Engineering and operational gaps

- There are no unit, integration, or end-to-end tests.
- The lint script opens an interactive setup prompt because no ESLint configuration is committed; it cannot run in CI as-is.
- No CI pipeline, preview deployment checks, or migration verification exists.
- No generated Supabase database types; several database results use casts or `any`.
- Many database errors are ignored on dashboard and page queries, which can make a failed query look like an empty state.
- No error boundaries, not-found strategy for most modules, structured logging, uptime monitoring, or error tracking.
- No database seed script for a development branch, admin, sample plans, or test data.
- The README covers only minimal setup and does not document roles, API payloads, attendance integration, deployment, backups, or recovery.
- The production build compiled successfully during review, but the full command was not observed through final completion because the check timed out during page-data collection.

## Recommended phased plan

### Phase 0 — Stabilize local setup and database

Goal: make every developer able to start the same working system.

- Confirm the initial migration is applied to the intended Supabase project.
- Create at least one branch and verify the first admin user/profile/role.
- Configure the three missing server-only environment variables.
- Add an environment validation module that fails with one clear startup message.
- Add repeatable development seed data.
- Fix all text-encoding artifacts.
- Expand the README with exact setup and verification steps.

Exit criteria: login works, the admin sees the dashboard, database queries succeed, and setup is repeatable from a clean clone.

### Phase 1 — Correct authorization and tenancy

Goal: make access safe before adding more workflows.

- Define a resource-by-role permission matrix.
- Replace overly broad RLS write policies with table-specific policies.
- Add explicit API role checks for every resource and action.
- Add branch filters to update/delete operations as defense in depth.
- Add a branch selector for global admins and enforce branch ownership in validation.
- Scope Storage access by branch/member/object owner.
- Add audit-log inserts for create, update, delete, payment, subscription, and settings operations.
- Add rate limiting and security headers.

Exit criteria: automated permission tests prove that every role can access only its allowed branch and operations.

### Phase 2 — Finish the core gym workflow

Goal: deliver the smallest operationally useful release.

- Complete member edit, deactivate/delete, photo upload, and pagination controls.
- Build plan listing/editing and subscription creation.
- Implement an atomic membership sale workflow: select member → plan → discount/GST → invoice → payment → receipt.
- Add subscription renewal, pause, cancel, expiry, and history screens.
- Build payment list/detail, outstanding balance, partial payment, refund, and receipt workflows.
- Replace demo dashboard charts with live, date-filtered aggregate queries.
- Add logout and account/profile controls.

Exit criteria: reception can register a member, sell and renew a membership, collect payment, issue a receipt, and find the transaction later.

### Phase 3 — Complete attendance operations

Goal: reliably ingest and manage real device events.

- Decide between device push, a local gym connector, or a supported vendor cloud API.
- Securely store device credentials and restrict endpoints.
- Add member-to-machine-user enrollment and mapping UI.
- Add unmatched-event review and correction workflow.
- Add date/member/device filters, manual correction, late/missing-exit handling, and exports.
- Monitor device heartbeat, sync lag, failure rate, and last successful event.
- Load-test batches and define retry/idempotency behavior.

Exit criteria: a real device can sync repeatedly without duplicates, operators can resolve unmatched records, and failures are observable.

### Phase 4 — Build role-specific service modules

Goal: replace generic overview/create pages with operational workflows.

Suggested order:

1. Appointments: calendar, approval, reschedule, completion, cancellation.
2. Trainers: profiles, schedules, member assignments, workload.
3. Workouts: exercise library, reusable plans, member assignment, progress notes.
4. Diet plans: templates, macros, assignment, history.
5. Progress: measurements, private photos, trend charts, comparisons.
6. Equipment: asset details, maintenance schedule/history, due alerts.
7. Staff: invitations, roles, attendance, leave; add payroll only if truly in scope.

Each module should have list, filters, detail, create, edit, status transitions, permissions, empty/loading/error states, and tests.

Exit criteria: each enabled sidebar item displays real records and supports its advertised workflow.

### Phase 5 — Notifications, reports, and integrations

Goal: automate communication and management reporting.

- Implement a background delivery worker and provider adapters.
- Start with dashboard and email; add SMS/WhatsApp only after provider selection and consent rules.
- Record delivery attempts, provider IDs, failures, retries, and opt-outs.
- Add birthday, appointment, payment, expiry, and maintenance notification templates.
- Build a reports page with resource, branch, date range, status, preview, and export controls.
- Add live revenue, retention, attendance, peak-hour, renewal, and outstanding-payment reports.

Exit criteria: scheduled messages are delivered and traceable, and management can generate filtered reports without editing URLs.

### Phase 6 — Quality assurance and production readiness

Goal: make releases safe and supportable.

- Commit an ESLint flat configuration and replace the deprecated interactive lint command.
- Add unit tests for validation and calculations.
- Add integration tests for RLS, role permissions, attendance idempotency, subscriptions, payments, and reminders.
- Add Playwright end-to-end tests for login, member registration, membership sale, attendance review, and reports.
- Generate Supabase TypeScript types and remove unsafe casts.
- Add error boundaries, structured logs, error tracking, health checks, and uptime monitoring.
- Add CI for lint, typecheck, tests, build, migration checks, and dependency/security scanning.
- Define backup, restore, retention, privacy, and incident-response procedures.
- Perform accessibility, responsive, performance, and security reviews.

Exit criteria: CI is green, critical workflows have automated coverage, production monitoring is active, and restore/security procedures are documented.

### Phase 7 — Deployment and controlled rollout

Goal: launch without disrupting gym operations.

- Create separate development, staging, and production Supabase projects.
- Configure production secrets, domains, email redirects, cron schedule, and backup policy.
- Import or clean initial branch/member data.
- Pilot with one branch and a small staff group.
- Train reception, managers, and trainers using role-specific guides.
- Collect issues for one or two operating cycles before enabling additional branches.
- Roll out modules gradually behind feature flags.

Exit criteria: the pilot branch completes daily operations successfully, support issues are understood, and rollback is tested.

## Suggested immediate next sprint

The next sprint should focus only on making one complete business path reliable:

1. Apply/verify the database migration and seed a branch/admin.
2. Correct RLS and API permissions.
3. Fix admin branch selection.
4. Add member edit and list pagination controls.
5. Build the membership sale + invoice + payment transaction.
6. Replace dashboard demo charts with real data.
7. Add lint configuration and tests for this workflow.

Avoid expanding more sidebar modules until this core path works end to end. A narrower complete workflow will provide more value than additional overview pages.

## Verification performed during this review

- Source inventory across `app`, `components`, `lib`, `services`, `supabase`, and `types`.
- Route, API, validation, schema, RLS, and environment-configuration review.
- `npm run typecheck`: passed.
- `npm run lint`: not runnable non-interactively because ESLint configuration is missing.
- Automated test discovery: no test suite found.
- Next.js production compilation: compilation and type validation passed; the observed command timed out later during page-data collection.
- Local public Supabase URL and anonymous key are configured; secret values were not recorded in this document.

