# SyncFyre Gym Management System

Production-oriented, multi-branch gym SaaS built with Next.js 15, TypeScript, Supabase, Tailwind CSS v4, TanStack Table, and Recharts.

---

## Table of contents

- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Roles and permissions](#roles-and-permissions)
- [Running the development server](#running-the-development-server)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [Attendance integration](#attendance-integration)
- [Deployment](#deployment)

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20 LTS |
| npm | 10 |
| Supabase account | — |

---

## Local setup

```bash
# 1. Clone the repository
git clone <repo-url> SyncFyre
cd SyncFyre

# 2. Install dependencies
npm install

# 3. Copy the environment template
copy .env.example .env.local

# 4. Fill in the values in .env.local — see "Environment variables" below

# 5. Apply the database migration (see "Database setup" below)

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to your role's portal dashboard after login.

---

## Environment variables

Copy `.env.example` to `.env.local` and set every value:

| Variable | Where to find it | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API → Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API → anon public key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API → service_role key | ✅ (server only) |
| `ATTENDANCE_SYNC_SECRET` | Generate with `openssl rand -hex 32` | ✅ |
| `CRON_SECRET` | Generate with `openssl rand -hex 32` | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your domain, e.g. `https://gym.example.com` | optional (defaults to localhost:3000) |
| `EMAIL_PROVIDER_API_KEY` | Your email provider (Resend, SendGrid, etc.) | optional |
| `SMS_PROVIDER_API_KEY` | Your SMS provider | optional |
| `WHATSAPP_PROVIDER_API_KEY` | Your WhatsApp Business provider | optional |

> **Never** prefix `SUPABASE_SERVICE_ROLE_KEY`, `ATTENDANCE_SYNC_SECRET`, or `CRON_SECRET` with `NEXT_PUBLIC_`. They must only exist in the server environment.

The app validates all required variables at startup. If any are missing you will see a clear error message listing the missing keys.

---

## Database setup

1. Open your [Supabase project](https://supabase.com) → SQL Editor.
2. Run the full migration:
   ```
   supabase/migrations/0001_initial_schema.sql
   ```
3. After the migration succeeds, go to **Authentication → Users** and create the first admin user.
4. In the SQL Editor run:
   ```sql
   -- Replace the email below with your admin email
   UPDATE public.users
   SET role_id = (SELECT id FROM public.roles WHERE slug = 'admin')
   WHERE email = 'your-admin@example.com';
   ```
5. Optionally run the seed file for development branches and sample data:
   ```
   supabase/seed.sql
   ```

### Verify setup

After login the dashboard should show live metrics (all zeros for a fresh database is expected). If you see Supabase errors in the browser console, double-check your `.env.local` values and confirm the migration ran without errors.

---

## Roles and permissions

| Slug | Access |
|---|---|
| `admin` | Full access across all branches |
| `manager` | Full access within their assigned branch |
| `reception` | Register members, collect payments, manage appointments |
| `trainer` | View their assigned members, log workouts and progress |
| `dietician` | View assigned members, manage diet plans |
| `member` | Read-only: own profile, subscription, attendance |

Roles are stored in `public.roles` and assigned via `public.users.role_id`. Row-Level Security is enabled on all application tables.

---

## Running the development server

```bash
npm run dev        # Starts Next.js with Turbopack on http://localhost:3000
npm run build      # Production build
npm run start      # Serve the production build
npm run typecheck  # TypeScript type check (no emit)
npm run lint       # ESLint
```

---

## Available scripts

| Script | Description |
|---|---|
| `dev` | Start dev server with Turbopack |
| `build` | Production build |
| `start` | Serve production build |
| `typecheck` | Run `tsc --noEmit` |
| `lint` | Run Next.js ESLint |

---

## Project structure

```
app/
  (auth)/           Login, forgot-password, reset-password pages + server actions
  (admin)/          Admin and manager portal pages
  (reception)/      Reception portal pages
  (trainer)/        Trainer and dietician portal pages
  (member)/         Member portal pages
  api/              REST API route handlers
  layout.tsx        Root layout (ThemeProvider, Toaster)
  globals.css       Global styles

components/
  auth/             Auth-specific UI (login form)
  dashboard/        MetricCard, DashboardCharts
  layout/           PortalShell, PortalHeader, PortalSidebar
  members/          MembersTable, MemberForm, MemberEditForm
  modules/          Generic module overview, resource create form
  settings/         SyncMachineButton, DeviceStatusCard
  ui/               Primitive components (Button, Card, Input, Badge, ...)

lib/
  auth.ts           getCurrentProfile(), requireUser()
  env.ts            Environment variable validation
  nav/              Portal navigation items per role
  portals.ts        Portal-to-role mapping, PORTAL_DASHBOARD constants
  supabase/         Supabase client factories (server, client, admin)
  utils.ts          cn(), formatCurrency(), initials(), calculateAge(), calculateBmi()
  validations/      Zod schemas (auth, member, attendance, resources)

services/
  member.service.ts     listMembers, createMember, updateMember, deleteMember
  dashboard.service.ts  getDashboardData, getRevenueChartData, getAttendanceChartData
  payment.service.ts    listPayments, getPaymentById, listInvoices, getInvoiceById

types/
  index.ts          Shared TypeScript types
```

---

## API overview

### Members

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/members` | Any authenticated | List members with pagination, search, status filter |
| POST | `/api/members` | admin, manager, reception | Create member |
| PATCH | `/api/members/:id` | admin, manager, reception | Update member |
| DELETE | `/api/members/:id` | admin, manager | Delete member |
| GET | `/api/members/export` | Any authenticated | Download members CSV |

### Generic resource API

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/:resource` | Any authenticated | List resource records (paginated) |
| POST | `/api/:resource` | Non-member roles | Create resource record |
| PATCH | `/api/:resource/:id` | Non-member roles | Update resource record |
| DELETE | `/api/:resource/:id` | admin, manager | Delete resource record |

Supported resource names: `membership-plans`, `subscriptions`, `appointments`, `trainers`, `workouts`, `diet-plans`, `progress`, `payments`, `invoices`, `notifications`, `equipment`, `staff`, `face-machines`.

### Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/reports?resource=<name>` | Any authenticated | Download CSV report |

Supported report names: `members`, `attendance`, `payments`, `appointments`, `subscriptions`.

### Attendance (device ingestion)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/attendance/sync` | `X-Sync-Secret` header | Batch ingest face-machine events (max 1000 per request) |
| GET/POST | `/api/face-machines/:id/sync` | Authenticated | Test device connection |

### Cron

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/cron/reminders` | `X-Cron-Secret` header | Queue membership expiry notifications |

---

## Attendance integration

The attendance ingestion endpoint `/api/attendance/sync` accepts batch JSON payloads from face-recognition devices. It:

1. Validates each event with Zod (device_id, machine_user_id, event_at, event_type, external_event_id).
2. Enforces idempotency via `external_event_id` — duplicate events are counted but not re-inserted.
3. Matches `machine_user_id` to `members` via the `machine_user_mappings` table.
4. Merges entry/exit events into a single daily `attendance` record.

**Required header:** `X-Sync-Secret: <ATTENDANCE_SYNC_SECRET from .env.local>`

**Payload example:**
```json
{
  "events": [
    {
      "device_id": "DEVICE-001",
      "machine_user_id": "USER-42",
      "event_at": "2026-08-04T09:15:00+05:30",
      "event_type": "entry",
      "external_event_id": "DEVICE-001-20260804-001"
    }
  ]
}
```

> Note: Vercel and similar cloud platforms cannot reach devices on a private gym LAN. Use a local connector that proxies events to this endpoint, or configure device-initiated push from a public IP.

---

## Deployment

### Vercel (recommended)

1. Push the repository to GitHub/GitLab.
2. Import the project in Vercel.
3. Set all environment variables from `.env.example` in **Vercel → Project → Settings → Environment Variables**.
4. Deploy.
5. Configure the cron job for `/api/cron/reminders` using Vercel Cron or an external scheduler (e.g. daily at 07:00).

### Supabase production setup

- Create a separate Supabase project for production.
- Apply the migration to the production project.
- Enable email confirmations and set the correct redirect URL in **Supabase → Authentication → URL Configuration**.
- Configure storage bucket policies per the RLS definitions in the migration.

### Environment checklist before go-live

- [ ] All required env vars set in production
- [ ] Migration applied to production Supabase project
- [ ] First admin user created and role assigned
- [ ] Supabase auth redirect URL matches production domain
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Cron job scheduled for reminder endpoint
- [ ] Attendance sync secret rotated from default
