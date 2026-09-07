# SyncFyre - Resource x Role Permission Matrix

_dev-task-split.md Phase 1 (#4). This documents the permissions as actually enforced today across three layers - Next.js `middleware.ts` (portal/route access), the API route handlers (`app/api/**`), and Postgres RLS (`supabase/migrations/*.sql`, including `0040_shradha_phase1_security_hardening.sql`). Where a layer is stricter than another, the effective permission is the strictest one. Treat this as a living document - update it whenever a role check or RLS policy changes._

## Roles

| Role slug | Portal | Notes |
|---|---|---|
| `super_admin` | `/superadmin/*` | Platform operator, cross-tenant. Not covered row-by-row below (out of scope for tenant-level resources; see `superadmin` routes). |
| `owner` | `/admin/*` | Tenant owner. Functionally equivalent to `admin` for resource access once onboarding is complete. |
| `admin` | `/admin/*` | Full tenant access, not branch-limited. |
| `manager` | `/admin/*` | Branch-limited version of admin (`branch_id` scoped everywhere `current_branch_id()` is checked). |
| `reception` | `/reception/*` | Front-desk operations: members, sales/subscriptions, payments, appointments, workouts/diet-plan records (not authoring plans), attendance corrections. |
| `trainer` | `/trainer/*` | Owns their own assigned members' workouts/diet plans/appointments/progress. |
| `dietician` / `diet-planner` | `/trainer/*` | Same portal and RLS treatment as `trainer` for diet_plans/workouts/appointments (aliased role slugs). |
| `member` | `/member/*` | Self-service: own profile, own subscriptions/attendance/payments/appointments/workouts/diet plans/progress. |

Portal boundaries are enforced in `middleware.ts` (`PORTAL_ROLES`) - a role can only reach routes under its own portal prefix; cross-portal URLs redirect to the role's dashboard.

## Resource matrix

Legend: **C** create, **R** read, **U** update, **D** delete/archive. A blank cell means no access. "(own)" means scoped to records the role owns (assigned member, own trainer/staff record) - enforced by RLS as of `0040_shradha_phase1_security_hardening.sql`.

| Resource | admin | manager | reception | trainer / dietician | member |
|---|---|---|---|---|---|
| Members | CRUD | CRUD (branch) | CRU (branch, no delete) | R (assigned) | R (self) |
| Staff | CRUD | CRUD (branch) | - | - | - |
| Trainers | CRUD | CRUD (branch) | - | - | - |
| Membership plans | CRUD | CRUD (branch) | R | - | R |
| Subscriptions | CRUD | CRUD (branch) | CRU (create sale, renew/pause/cancel) | - | R (self) |
| Appointments | CRUD | CRUD (branch) | CRUD (branch) | CRU (own, as provider) | R (self), C (request) |
| Workouts | CRUD | CRUD (branch) | CRU (branch) | CRUD (own, as trainer) | R (self) |
| Diet plans | CRUD | CRUD (branch) | CRU (branch) | CRUD (own, as dietician) | R (self) |
| Progress | CRUD | CRUD (branch) | - | CRUD (own, as recorder) | R (self) |
| Payments | CRUD | CRUD (branch) | CR (collect) | - | R (self) |
| Invoices | CRUD | CRUD (branch) | CR | - | R (self) |
| Notifications | R (system-generated only; no manual create) | R (branch) | R (branch) | R (own) | R (own) |
| Equipment | CRUD | CRUD (branch) | - | - | - |
| Face machines / devices | CRUD | CRUD (branch) | - | - | - |
| Attendance | CRUD (correction) | CRUD (branch, correction) | R | - | R (self) |
| Reports | R (all branches) | R (own branch) | - | R (own metrics) | - |
| Settings | CRUD | CRUD (branch-scoped settings) | R (non-secret) | - | - |

### Storage buckets

| Bucket | Read | Write | Scope |
|---|---|---|---|
| `member-photos` | Public URL (unauthenticated) | Staff only | Intentionally public (`0015_member_photos_public.sql`) - not tenant-scoped by design. |
| `progress-photos` | Any authenticated tenant user | Staff only | Tenant-scoped by folder path (`${tenant_id}/...`) as of `0040`. Currently unused by any feature. |
| `receipts` | Any authenticated tenant user | Staff only | Tenant-scoped by folder path as of `0040`. Currently unused by any feature. |
| `member-documents` | Any authenticated tenant user | Any authenticated tenant user (insert) | Tenant-scoped since `0034_member_notes_documents.sql`. |
| `finance-attachments` | Staff only | Staff only | Not tenant-scoped (`0005_finance_module.sql`) - flagged, not fixed in this pass; currently unused by any feature. Should get the same tenant-folder treatment before it's ever wired up. |

## Known gaps / follow-ups (not fixed in this pass)

- `finance-attachments` storage bucket has the same cross-tenant exposure `progress-photos`/`receipts` had - fix before any feature starts using it.
- `membership_plans`, `subscriptions`, and `equipment` still use the original branch-only `is_staff_user()` write policy (any staff role, not role-differentiated) - out of Shradha's Phase 1 scope for this pass; revisit if reception/trainer access to these needs tightening too.
- This matrix reflects the code and RLS as read on 2026-09-07 - re-verify after any role-check or migration change, and keep this file in sync rather than letting it drift like `dev-task-split.md` did.
