-- ================================================================
-- Migration: 0044_machine_rls_tenant_scope
-- Purpose  : Fix face_machine_settings RLS so that admin-role users
--            are scoped to their own tenant rather than seeing all
--            machines across all tenants.
--            Also inserts a Demo Gym machine record for the
--            Front Desk AiFace-ERIS so the Demo tenant has its own
--            properly-owned machine row (the Talwalkar-owned record
--            with the same device identity is untouched).
--
-- Root cause:
--   The original RLS policies from 0001_initial_schema.sql used
--   app_role()='admin' as a full bypass — no tenant_id filter.
--   Migration 0018_superadmin_saas_extensions.sql added tenant_id
--   to face_machine_settings and backfilled it, but never updated
--   these RLS policies. Result: admin users could see Talwalkar
--   machines from the Demo tenant and vice versa.
--
-- Fix:
--   Replace app_role()='admin' bypass with:
--     is_super_admin()                         → still sees all
--     OR (admin/management AND tenant_id matches)  → own tenant only
--     OR (staff user AND branch_id matches)         → own branch only
--
-- Safety:
--   - super_admin role is unchanged (sees all)
--   - Talwalkar branch/machine data is untouched
--   - Demo branch/machine data is untouched
--   - Existing Talwalkar machine rows are NOT modified
--   - New Demo machine row uses the Demo tenant branch
--   - No data modification on any existing rows
-- ================================================================

-- ── face_machine_settings: read ───────────────────────────────────────────
drop policy if exists machines_staff_read on public.face_machine_settings;

create policy machines_staff_read on public.face_machine_settings
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.app_role() in ('owner', 'admin', 'manager')
      and tenant_id = public.current_tenant_id()
    )
    or (
      public.is_staff_user()
      and branch_id = public.current_branch_id()
    )
  );

-- ── face_machine_settings: write (insert / update / delete) ──────────────
drop policy if exists machines_management on public.face_machine_settings;

create policy machines_management on public.face_machine_settings
  for all to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_management()
      and tenant_id = public.current_tenant_id()
    )
    or (
      public.is_management()
      and branch_id = public.current_branch_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_management()
      and tenant_id = public.current_tenant_id()
    )
    or (
      public.is_management()
      and branch_id = public.current_branch_id()
    )
  );

-- ── Demo Gym machine record ───────────────────────────────────────────────
-- The Demo Gym (tenant 052375ac) had zero machine records.
-- The Talwalkar-owned "Front Desk AiFace-ERIS" (device FACE-DEV-002) is a
-- real device; the Demo Gym gets its own record representing the same type
-- of device, scoped to the Demo Gym's branch.
--
-- Demo Gym:    tenant_id = 052375ac-f0c8-45f8-91ee-da3e7f3ae71f
-- Demo Branch: id        = 9937e5b4-a337-4e0e-8349-d19b7c48f43f
-- Talwalkar machine (unchanged): d1611c2a-e0fa-49d6-a975-11d5e101f7b2
--
-- device_id is DEMO-FACE-ERIS (distinct from Talwalkar's FACE-DEV-002)
-- to satisfy the unique(branch_id, device_id) constraint.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.face_machine_settings (
  id,
  branch_id,
  tenant_id,
  machine_name,
  device_id,
  provider,
  manufacturer,
  model,
  connection_mode,
  status,
  connection_status,
  settings
)
values (
  'eris0000-demo-0000-0000-000000000001',
  '9937e5b4-a337-4e0e-8349-d19b7c48f43f',   -- Demo Gym Main Branch
  '052375ac-f0c8-45f8-91ee-da3e7f3ae71f',   -- Demo Gym tenant
  'Front Desk AiFace-ERIS',
  'DEMO-FACE-ERIS',
  'essl',
  'ERIS',
  'AiFace Terminal',
  'push',
  'active',
  'online',
  '{"vendor":"ERIS","model":"AiFace","note":"Demo Gym front-desk face attendance terminal"}'::jsonb
)
on conflict (id) do nothing;
