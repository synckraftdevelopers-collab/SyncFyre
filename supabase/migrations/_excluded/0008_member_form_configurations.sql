-- ================================================================
-- Migration: 0008_member_form_configurations
-- Purpose  : Per-tenant member registration form field configuration.
--            Each tenant (gym) can enable/disable fields, mark them
--            required, and control their display order independently.
--            System-required fields (full_name) cannot be disabled.
-- ================================================================
begin;

create table if not exists public.member_form_configurations (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  field_key     text        not null,
  enabled       boolean     not null default true,
  required      boolean     not null default false,
  display_order integer     not null default 1 check (display_order > 0),
  created_by    uuid        references public.users(id) on delete set null,
  updated_by    uuid        references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint member_form_configurations_tenant_field_key
    unique (tenant_id, field_key)
);

-- Indexes
create index if not exists mfc_tenant_order_idx
  on public.member_form_configurations (tenant_id, display_order);

-- updated_at trigger
drop trigger if exists set_updated_at on public.member_form_configurations;
create trigger set_updated_at
  before update on public.member_form_configurations
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────
alter table public.member_form_configurations enable row level security;

-- Any authenticated user of the same tenant can read configuration
drop policy if exists mfc_tenant_read on public.member_form_configurations;
create policy mfc_tenant_read
  on public.member_form_configurations for select
  to authenticated
  using (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
  );

-- Only admin/manager/owner can write configuration
drop policy if exists mfc_admin_write on public.member_form_configurations;
create policy mfc_admin_write
  on public.member_form_configurations for all
  to authenticated
  using (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
    and (select r.slug from public.users u join public.roles r on r.id = u.role_id where u.id = auth.uid())
        in ('owner', 'admin', 'manager')
  )
  with check (
    tenant_id = (select tenant_id from public.users where id = auth.uid())
    and (select r.slug from public.users u join public.roles r on r.id = u.role_id where u.id = auth.uid())
        in ('owner', 'admin', 'manager')
  );

-- ── Default seed: no rows needed ─────────────────────────────────
-- The service falls back to getDefaultMemberFormConfiguration()
-- when no rows exist for a tenant, so existing tenants automatically
-- get all fields enabled (matching the current form behaviour).
-- New tenants also get the full default without any manual setup.

commit;
