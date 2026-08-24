# SyncFyre Gym Management SaaS

## Product documentation and evidence policy

SyncFyre is a multi-tenant gym-management SaaS built with Next.js, React, TypeScript, and Supabase. This document describes the repository as it is currently implemented. It is intentionally conservative: source code, routes, components, services, and migrations demonstrate that functionality is present; they do **not** prove that a production workflow has been exercised successfully.

### Status legend

- ✅ **IMPLEMENTED** — the repository contains the relevant route/component/service and database support.
- ⚠️ **PARTIALLY IMPLEMENTED** — an interface or some layers exist, but the full workflow is incomplete, conditional, or requires further validation.
- 🗓️ **PLANNED** — expressly documented as future work. No current contractual feature is inferred from planning notes.
- ❓ **NOT VERIFIED** — implementation exists but has not been end-to-end verified in an isolated QA environment.
- ❌ **NOT IMPLEMENTED** — no implementation was found in the current repository.

## Product overview

SyncFyre supports gym operations across a platform administrator, gym/tenant administrators, branch staff, trainers, reception staff, and members. It provides member and membership administration, payments and invoices, attendance, training and diet plans, appointments, finance, reporting, notifications, and biometric/device integration surfaces.

**Current product status:** most core modules have code and database support, but live business, tenant-isolation, role, device, and browser-PWA workflows remain ❓ **NOT VERIFIED** until they are executed against a safe local or staging Supabase environment.

## SaaS architecture

### Tenancy and branches — ✅ IMPLEMENTED / ❓ NOT VERIFIED

- `tenants` are introduced by the multi-tenancy migration and are related to tenant-scoped operational data through `tenant_id`.
- `branches` provide the operational scope used by many pre-existing database policies and queries.
- The multi-tenancy migration adds `tenant_id` to branches, users, members, membership plans, subscriptions, invoices, payments, staff, trainers, appointments, attendance, notifications, income, expenses, receivables, bank accounts, bank transactions, and cash-book records.
- Migration helpers include `current_tenant_id()` and `is_super_admin()`; indexes were added for commonly tenant-scoped tables.
- Tenant data separation is intended to be enforced by both Supabase Row Level Security (RLS) and server-side role/branch/tenant context. This must be tested with two isolated tenants before release.

### Application layers — ✅ IMPLEMENTED

| Layer | Current implementation |
| --- | --- |
| UI | Next.js App Router pages under `app/`, reusable components under `components/` |
| Domain/data access | Services under `services/` for members, payments, finance, reports, reception, workflow, notifications, devices, dashboards, and biometric integration |
| APIs | Route handlers under `app/api/`, generic resource endpoints, reports, finance, members, attendance, biometric, and machine routes |
| Database | Supabase PostgreSQL schema and policies in `supabase/migrations/` |
| Authentication | Supabase SSR clients plus `middleware.ts` and portal layouts |
| PWA | `app/manifest.ts`, `public/sw.js`, install and registration components |

### Authentication and authorization — ✅ IMPLEMENTED / ❓ NOT VERIFIED

- Login, forgot-password, and reset-password routes are under `app/(auth)/`.
- Logout/session handling uses Supabase SSR clients and middleware session refresh.
- `middleware.ts` protects portal routes and redirects unauthenticated visitors to `/login`.
- Portal route families are present for `/superadmin`, `/admin`, `/reception`, `/trainer`, and `/member`; `/unauthorized` handles denied access.
- `lib/portals.ts` maps roles including `super_admin`, `admin`, `manager`, `reception`, `trainer`, `dietician`/`diet-planner`, and `member` to portal areas.
- Forgot-password uses Supabase reset email; email delivery and reset completion are ❓ **NOT VERIFIED** because they depend on configured authentication/email infrastructure.

## Modules

### SuperAdmin — ✅ IMPLEMENTED / ❓ NOT VERIFIED

Implemented routes and UI exist for:

- Dashboard and KPI presentation: `/superadmin/dashboard`
- Demo bookings and detail pages: `/superadmin/demos`, `/superadmin/demos/[id]`
- Tenant management: `/superadmin/tenants`
- User management: `/superadmin/users`
- Subscription management: `/superadmin/subscriptions`
- Billing: `/superadmin/billing`
- Audit logs: `/superadmin/audit-logs`
- Devices, reports, and settings: `/superadmin/devices`, `/superadmin/reports`, `/superadmin/settings`

KPI destination correctness, searching/filtering/pagination, approval/status mutations, and cross-role authorization are ❓ **NOT VERIFIED** until exercised in QA.

### Tenant, gym, branch, and staff management — ✅ IMPLEMENTED / ❓ NOT VERIFIED

- Tenant creation/administration is represented by SuperAdmin tenant pages and the `tenants` migration.
- Branch forms and settings components exist.
- Staff creation, account creation, role assignment, and assignment pages are present under `/admin/staff` and `components/staff/`.
- A service-role key is required for server-side staff-account creation where the feature creates Supabase Auth users.
- Actual tenant provisioning, branch assignment, and role enforcement require isolated QA verification.

### Members — ✅ IMPLEMENTED / ❓ NOT VERIFIED

Member functions are represented by admin and reception routes, API handlers, member services, validations, and UI components:

- Create, view, edit, import/export, search/filter, card/table views, profile/360 view, photo upload, and deactivate/delete flows.
- Membership renewal, invoice creation, pending payment views, payment history, and trainer/dietician assignment UI.
- Manual check-in, attendance views, communication actions, expiry reminders, and member profile tabs.
- Member workout, diet-plan, progress, appointment, membership, attendance, and notification portal views.

Persistence, validation behavior, duplicate protection, and end-to-end CRUD are ❓ **NOT VERIFIED**.

### Memberships and payments — ✅ IMPLEMENTED / ❓ NOT VERIFIED

- Membership-plan forms, create/edit pages, active/inactive toggle endpoint, renewal UI, and member membership pages are present.
- Payment pages, pending-payment views, invoices, receipts-related UI, payment service, and `payments`/`invoices` migrations exist.
- The intended lifecycle is a membership/invoice total, one or more payments, and an outstanding balance. The repository contains finance/outstanding services and APIs; calculation correctness across dashboards and reports is ❓ **NOT VERIFIED**.

### Trainers and diet planners — ✅ IMPLEMENTED / ❓ NOT VERIFIED

- Admin trainer list, create, and detail routes exist.
- Trainer portal routes include dashboard, members, workouts, diet plans, progress, appointments, settings, and notifications.
- Trainer assignment, trainer/member relationship, workout and diet editing components are present.
- The portal map additionally supports dietician/diet-planner role naming.
- Trainer permissions and direct-route/API authorization are ❓ **NOT VERIFIED**.

### Reception — ✅ IMPLEMENTED / ❓ NOT VERIFIED

- Reception routes include dashboard, members, memberships, payments, pending payments, invoices, attendance, appointments, notifications, and settings.
- Components include a new-membership form and reception service support.
- Reception role boundaries and operational workflows are ❓ **NOT VERIFIED**.

### Attendance and eBioServer/device integration — ⚠️ PARTIALLY IMPLEMENTED / ❓ NOT VERIFIED

- Manual member check-in and attendance pages/services are implemented.
- Attendance sync endpoint: `POST /api/attendance/sync` (shared-secret protected).
- Biometric endpoints include eSSL events, diagnostics, and a device mock route under `/api/biometric/`.
- Machine session and attendance APIs exist under `/api/machine/`; iClock-compatible routes exist under `/iclock/`.
- Device settings, credential, and machine-connect UI are present.
- Attendance sync logs, machine settings, terminal credentials, and biometric migrations exist.

Actual physical-device connection, vendor authentication, real synchronization, retry behavior, and duplicate prevention are ❓ **NOT VERIFIED** and require a test device/API.

### Finance — ✅ IMPLEMENTED / ❓ NOT VERIFIED

The repository implements finance interfaces, services, migrations, and APIs for income and expense capture, collections and payment-derived financial records, outstanding balances and receivables, cash book and bank accounts/transactions, chart of accounts and journal posting, profit and loss, GST views/calculations, finance charts, and finance reports.

Finance endpoints include `/api/finance/income`, `/api/finance/expenses`, `/api/finance/outstanding`, `/api/finance/profit-loss`, and `/api/finance/gst`.

| Finance area | Status | Notes |
| --- | --- | --- |
| Income | ✅ IMPLEMENTED | Form, service, table/migration, and API presence |
| Expenses | ✅ IMPLEMENTED | Form, service, table/migration, and API presence |
| Collections/payments | ✅ IMPLEMENTED | Payment and finance services/pages are present |
| Outstanding | ✅ IMPLEMENTED | Outstanding API/service/UI present; formulas need QA |
| Cash | ✅ IMPLEMENTED | Cash-book migration/service support present |
| Bank | ✅ IMPLEMENTED | Bank account/transaction components and migration support present |
| Accounting/journals | ✅ IMPLEMENTED | Chart of accounts and journal-posting UI/migrations present |
| GST | ✅ IMPLEMENTED | GST API/finance route support present |
| Exports | ⚠️ PARTIALLY IMPLEMENTED | XLSX dependency and member export exist; report-specific export coverage must be verified |

No financial calculation is considered production-verified until tested with isolated transactions and reconciled against reports.

### Reports and analytics — ✅ IMPLEMENTED / ❓ NOT VERIFIED

- Admin reports: overview, members, attendance, payments, and revenue pages.
- Generic report and overview API handlers: `/api/reports` and `/api/reports/overview`.
- SuperAdmin reports page and reports/analytics services are present.
- Finance report functionality is represented in finance services and pages.
- Filtering, tenant/branch scoping, total reconciliation, export formats, and pagination are ❓ **NOT VERIFIED**.

### Notifications — ✅ IMPLEMENTED / ❓ NOT VERIFIED

- Notifications pages exist for admin, reception, trainer, and member portals.
- Notification and notification-log database tables/migrations, service code, member messaging helpers, and a protected cron reminder endpoint are present.
- Delivery channels, cron execution, retry behavior, and user-visible delivery are ❓ **NOT VERIFIED**.

### PWA — ✅ IMPLEMENTED / ❓ NOT VERIFIED

- Web manifest: `app/manifest.ts`
- Service worker: `public/sw.js`
- Icons: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Offline page: `/offline`
- Service-worker registration and install UI components are present.
- Manifest declares standalone display, SyncFyre name/short name, theme/background colors, and icon definitions.

HTTP availability of PWA assets has been validated previously; service-worker activation, installation, standalone operation, and offline behavior need browser-level QA and are ❓ **NOT VERIFIED**.

## Database

The following objects are sourced from the Supabase migrations in `supabase/migrations/`; exact local/remote database state must be confirmed by applying those migrations in a safe environment.

| Domain | Tables/objects represented in migrations |
| --- | --- |
| Platform and access | `tenants`, `branches`, `roles`, `users`, `staff`, activity/audit logs, settings |
| People | `members`, `trainers`, trainer assignments, member photo/candidate support |
| Membership and billing | `membership_plans`, `subscriptions`, subscription history, `invoices`, `payments`, receivables |
| Attendance/devices | `attendance`, attendance sync logs, face/machine settings, biometric/device/terminal credential support |
| Programs | `workout_categories`, `workouts`, `diet_plans`, `progress`, `appointments` |
| Finance | income/expense categories, `income`, `expenses`, chart of accounts, journal records, cash book, bank accounts, bank transactions, finance report views |
| Communications | `notifications`, notification logs |
| Operations | equipment and equipment maintenance |

Foreign keys, constraints, triggers, indexes, views, functions, and RLS policies are defined by the migration sequence. Migration code demonstrates intended controls but is not a substitute for a live RLS/tenant-isolation test.

## API surface

The API is implemented as Next.js route handlers. Representative, confirmed route families are below; consumers should inspect the route source for request/response contracts and authorization behavior.

| Route family | Purpose |
| --- | --- |
| `/api/[resource]`, `/api/[resource]/[id]` | Generic resource access layer for supported resources |
| `/api/members`, `/api/members/[id]`, `/api/members/export` | Member management and export |
| `/api/membership-plans/[id]/toggle` | Membership-plan activation state |
| `/api/reports`, `/api/reports/overview` | Reports and dashboard/report overview data |
| `/api/finance/*` | Income, expenses, outstanding, profit/loss, and GST |
| `/api/attendance/sync` | Secret-protected attendance ingestion/sync |
| `/api/biometric/*` | eSSL events, diagnostics, and device mock support |
| `/api/machine/*` | Machine session and attendance operations |
| `/iclock/*` | Device protocol routes: registry, getrequest, devicecmd, cdata |
| `/api/cron/reminders` | Secret-protected reminder automation |

Public booking is implemented by a server action in `app/(public)/book-demo/actions.ts`, not a documented public REST endpoint.

## Roles and permissions

The following describes current role routing and module presence, not a completed permission certification.

| Role identity found in code | Intended portal/access surface | Status |
| --- | --- | --- |
| `super_admin` | SuperAdmin platform routes and tenant-level administration | ✅ IMPLEMENTED / ❓ NOT VERIFIED |
| `admin` | Gym/tenant admin operations, members, staff, finance, reports, settings | ✅ IMPLEMENTED / ❓ NOT VERIFIED |
| `manager` | Mapped to the admin portal | ✅ IMPLEMENTED / ❓ NOT VERIFIED |
| `reception` | Reception dashboard, members, memberships, payments, attendance, appointments | ✅ IMPLEMENTED / ❓ NOT VERIFIED |
| `trainer` | Trainer dashboard, assigned members, programs, progress, appointments | ✅ IMPLEMENTED / ❓ NOT VERIFIED |
| `dietician`, `diet-planner`, `diet_planner` | Trainer-style portal mapping for diet planning | ⚠️ PARTIALLY IMPLEMENTED / ❓ NOT VERIFIED |
| `member` | Member dashboard, profile, membership, attendance, workouts, diet, progress, appointments, notifications | ✅ IMPLEMENTED / ❓ NOT VERIFIED |

Create/read/update/delete/approve/export permission matrices are not fully documented as a single source in the current codebase. They must be verified per route and API in QA. **UNSPECIFIED — repository documentation does not define a complete, audited permission matrix.**

## Security

### Implemented safeguards

- Supabase Auth clients are used for server, browser, middleware, and server-only admin operations.
- Middleware protects authenticated portals and uses role/portal routing.
- Database migrations enable RLS for core operational tables and define policies; the multi-tenancy migration updates tenant-aware policies for important tables.
- Sensitive server-only configuration is separated from public Supabase configuration by environment variable naming and server helpers.
- Attendance sync and reminder automation check server-side shared secrets.

### Verification status

- ❓ Tenant isolation must be tested with at least two local/staging tenants through UI, direct route/API access, and database/RLS access.
- ❓ Role authorization must be tested with authenticated accounts for every supported role; hidden UI is not proof of protection.
- ❓ Production secret exposure must be checked from built browser assets and deployment configuration without printing secrets.
- ❓ Authentication edge cases and reset-email delivery need an isolated test environment.

## Public routes

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Product entry/redirect behavior | ✅ IMPLEMENTED / ❓ NOT VERIFIED |
| `/login` | Authentication entry | ✅ IMPLEMENTED |
| `/forgot-password` | Password reset request | ✅ IMPLEMENTED / ❓ NOT VERIFIED |
| `/reset-password` | Password update flow | ✅ IMPLEMENTED / ❓ NOT VERIFIED |
| `/book-demo` | Public demo-booking form | ✅ IMPLEMENTED / ❓ NOT VERIFIED |
| `/terms` | Terms page | ✅ IMPLEMENTED |
| `/privacy` | Privacy page | ✅ IMPLEMENTED |
| `/offline` | PWA offline fallback | ✅ IMPLEMENTED / ❓ NOT VERIFIED |

## Runtime, deployment, and environment

### Runtime — ✅ IMPLEMENTED

- Next.js `15.5.22` (declared range `^15.5.22`), React 19, TypeScript, Tailwind/PostCSS, and ESLint 9.
- Commands: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run start`.
- Production requires a successful `npm run build` before `npm run start`.
- Supabase is required for authentication and data access. Local Supabase configuration and migrations are in `supabase/`; a safe local stack requires Docker and the Supabase CLI.

### Environment variables — names only

| Variable | Purpose | Exposure requirement |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project/local API URL | Public client configuration |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Public client configuration |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side privileged tasks, including eligible staff-account work | Server only; never `NEXT_PUBLIC_` |
| `ATTENDANCE_SYNC_SECRET` | Authorizes attendance ingestion | Server only |
| `CRON_SECRET` | Authorizes reminder cron endpoint | Server only |
| `NEXT_PUBLIC_APP_URL` | Canonical application URL for redirect flows | Public configuration |

Never commit real values or expose server-only values to the browser.

## Delivery status

### ✅ IMPLEMENTED modules

Authentication routes and middleware; SuperAdmin routes; tenant/branch/staff surfaces; members; memberships; payments/invoices; trainer/member/reception portals; manual attendance and device integration surfaces; finance; reports; notifications; PWA files; Supabase migrations/RLS policy definitions; APIs and server actions.

### ⚠️ PARTIALLY IMPLEMENTED modules

eBioServer/biometric physical-device workflow; dietician role consistency; report/export coverage; any workflow whose UI/service/database layers exist but which has not been executed end to end.

### 🗓️ PLANNED modules

No feature is explicitly marked as a current product commitment solely by the planning documents in this repository. Planning notes are not treated as implemented requirements.

### ❓ NOT VERIFIED modules

All live authentication/email, SuperAdmin mutations, role enforcement, two-tenant RLS isolation, member/membership/payment financial calculations, device synchronization, report reconciliation/exports, notification delivery, PWA installation/offline behavior, and responsive browser behavior.

### ❌ NOT IMPLEMENTED modules

No repository-configured automated unit, integration, or browser E2E test suite was found in `package.json`; no claim is made that these tests exist.

# QA CHECKLIST

Use only a safe local/staging Supabase environment. This is a requirements checklist, not a test report.

| Test ID | Module | Test case | Expected result |
| --- | --- | --- | --- |
| AUTH-01 | Authentication | Valid login | Authenticated user reaches their permitted portal. |
| AUTH-02 | Authentication | Invalid credentials | Login is rejected without creating a session. |
| AUTH-03 | Authentication | Logout and browser back navigation | Session is cleared and protected pages remain inaccessible. |
| AUTH-04 | Authentication | Session refresh/persistence | Valid session survives a refresh according to Supabase session policy. |
| AUTH-05 | Authentication | Forgot/reset password | Reset request and password update work once with a controlled test inbox. |
| SA-01 | SuperAdmin | Dashboard KPIs | Every clickable KPI opens the correct existing destination. |
| SA-02 | SuperAdmin | Demo bookings | List, detail, status actions, filters, and search respect authorization. |
| SA-03 | SuperAdmin | Tenant/user/subscription/billing/audit routes | Each documented page loads and authorized actions persist correctly. |
| TEN-01 | Tenant | Create QA Tenant A and B | Each QA tenant has isolated branch, user, and test records. |
| TEN-02 | Tenant isolation | Tenant A attempts Tenant B UI/direct-route access | Tenant B data is never displayed or returned. |
| TEN-03 | Tenant isolation | Tenant B attempts Tenant A API/RLS access | API/database access is rejected by authorization/RLS. |
| ROLE-01 | Roles | SuperAdmin, admin/manager, reception, trainer, diet planner, member | Allowed functions work; forbidden pages/actions/APIs are denied. |
| MEM-01 | Members | Create, view, edit, filter, search, deactivate/delete | Changes validate, persist after refresh, and remain tenant-scoped. |
| MEM-02 | Members | Import/export/photo/profile | Supported operations handle valid/invalid input and preserve authorization. |
| MSHIP-01 | Membership | Plan create/edit/toggle and membership assignment | Correct plan/status appears on the member after refresh. |
| PAY-01 | Payments | Invoice 10,000; pay 6,000 then 4,000 | Paid/outstanding/status reconcile to 6,000/4,000 then 10,000/0/Paid. |
| ATT-01 | Attendance | Manual check-in and records | One valid record is stored and displayed for the correct member/branch. |
| ATT-02 | eBioServer | Device/API synchronization | Real test device/API authenticates, maps users, logs results, and rejects duplicates. |
| TRN-01 | Trainer | Assignment, workout, diet, progress, appointments | Trainer sees only assigned/authorized data and changes persist. |
| REC-01 | Reception | Registration, membership, payment, receipt, attendance | Reception workflows succeed within allowed tenant/branch scope. |
| FIN-01 | Finance | Income/expense/collections | Records appear once in correct category and tenant/branch. |
| FIN-02 | Finance | Cash, bank, journal, GST, P&L | Calculations reconcile with source transactions and configured business rules. |
| FIN-03 | Finance | Outstanding ageing | Balances and ageing buckets agree with invoices and payments. |
| REP-01 | Reports | Membership/attendance/payments/revenue/finance reports | Totals match underlying tenant-scoped data and filters. |
| REP-02 | Reports | Date, branch, category, status, payment-mode filters | Filters constrain results correctly without cross-tenant leakage. |
| REP-03 | Reports | Export/print formats where offered | Produced file/print output matches current filtered data. |
| NOT-01 | Notifications | Reminder/notification delivery and logs | Authorized trigger writes expected logs and user-visible notifications. |
| PWA-01 | PWA | Manifest, service worker, icons | Manifest loads; worker registers and activates under a supported browser. |
| PWA-02 | PWA | Install/offline/standalone | Install prompt/standalone behavior and offline fallback behave as designed. |
| SEC-01 | Security | Build/client secret review | No server-only secret is present in browser assets or client configuration. |
| SEC-02 | Security | Protected route/API bypass | Direct navigation/API requests without required role/session are denied. |
| UI-01 | Mobile UI | Desktop, tablet, and mobile critical workflows | Navigation, forms, tables, dialogs, errors, and empty states remain usable without overflow. |

## Documentation limitations

- README status is evidence-based documentation, not a release sign-off.
- Live behavior must be recorded separately in QA results.
- Features marked ❓ **NOT VERIFIED** must not be promoted to production-ready based on this document alone.