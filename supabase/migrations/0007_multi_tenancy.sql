-- ================================================================
-- Migration: 0007_multi_tenancy
-- Purpose  : Add multi-tenancy (Option A — shared DB).
--            Each gym = one tenant. All data is isolated by tenant_id.
--
-- What this does:
--  1. Creates public.tenants table
--  2. Adds super_admin role
--  3. Adds tenant_id to branches, users, and key tables
--  4. Seeds existing data as Tenant 1 (Talwalkar)
--  5. Adds RLS helper: current_tenant_id()
--  6. Updates RLS so super_admin sees everything, others see only own tenant
-- ================================================================

begin;

-- ──────────────────────────────────────────────────────────────
-- 1. TENANTS TABLE
-- ──────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                     -- gym business name
  slug          text not null unique,               -- url-safe identifier
  owner_email   citext,                            -- primary contact email
  phone         text,
  address       text,
  city          text,
  state         text,
  country       text not null default 'India',
  plan          text not null default 'standard'
    check (plan in ('trial','standard','professional','enterprise')),
  status        text not null default 'active'
    check (status in ('active','suspended','trial','cancelled')),
  trial_ends_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.tenants is
  'One row per gym/business. All member and financial data is scoped to a tenant.';

-- updated_at trigger
drop trigger if exists set_updated_at on public.tenants;
create trigger set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 2. SUPER_ADMIN ROLE
-- ──────────────────────────────────────────────────────────────
insert into public.roles (name, slug, description, is_system)
values ('Super Admin', 'super_admin', 'Platform-level access across all tenants', true)
on conflict (slug) do nothing;

-- ──────────────────────────────────────────────────────────────
-- 3. ADD tenant_id TO CORE TABLES
-- ──────────────────────────────────────────────────────────────

-- branches
alter table public.branches
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- users
alter table public.users
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- members
alter table public.members
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- membership_plans
alter table public.membership_plans
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- subscriptions
alter table public.subscriptions
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- invoices
alter table public.invoices
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- payments
alter table public.payments
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- staff
alter table public.staff
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- trainers
alter table public.trainers
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- appointments
alter table public.appointments
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- attendance
alter table public.attendance
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- notifications
alter table public.notifications
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- finance tables
alter table public.income      add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.expenses    add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.invoices    add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.receivables add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.bank_accounts     add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.bank_transactions add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.cash_book         add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- ──────────────────────────────────────────────────────────────
-- 4. SEED EXISTING DATA AS TENANT 1
-- ──────────────────────────────────────────────────────────────

-- Create the first tenant from the existing branch
insert into public.tenants (id, name, slug, owner_email, status)
select
  '11111111-0001-0000-0000-000000000001'::uuid,
  coalesce(b.name, 'Talwalkar Main Gym'),
  'talwalkar',
  u.email::text,
  'active'
from public.branches b
left join public.users u on u.role_id = (select id from public.roles where slug = 'admin') and u.status = 'active'
limit 1
on conflict (id) do nothing;

-- If no branch exists yet, insert a default tenant
insert into public.tenants (id, name, slug, status)
values ('11111111-0001-0000-0000-000000000001', 'My Gym', 'default', 'active')
on conflict (id) do nothing;

-- Backfill tenant_id on all existing rows
do $$
declare v_tenant_id uuid := '11111111-0001-0000-0000-000000000001';
begin
  update public.branches          set tenant_id = v_tenant_id where tenant_id is null;
  update public.users             set tenant_id = v_tenant_id where tenant_id is null;
  update public.members           set tenant_id = v_tenant_id where tenant_id is null;
  update public.membership_plans  set tenant_id = v_tenant_id where tenant_id is null;
  update public.subscriptions     set tenant_id = v_tenant_id where tenant_id is null;
  update public.invoices          set tenant_id = v_tenant_id where tenant_id is null;
  update public.payments          set tenant_id = v_tenant_id where tenant_id is null;
  update public.staff             set tenant_id = v_tenant_id where tenant_id is null;
  update public.trainers          set tenant_id = v_tenant_id where tenant_id is null;
  update public.appointments      set tenant_id = v_tenant_id where tenant_id is null;
  update public.attendance        set tenant_id = v_tenant_id where tenant_id is null;
  update public.notifications     set tenant_id = v_tenant_id where tenant_id is null;
  update public.income            set tenant_id = v_tenant_id where tenant_id is null;
  update public.expenses          set tenant_id = v_tenant_id where tenant_id is null;
  update public.receivables       set tenant_id = v_tenant_id where tenant_id is null;
  update public.bank_accounts     set tenant_id = v_tenant_id where tenant_id is null;
  update public.bank_transactions set tenant_id = v_tenant_id where tenant_id is null;
  update public.cash_book         set tenant_id = v_tenant_id where tenant_id is null;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 5. RLS HELPER: current_tenant_id()
-- Returns the tenant_id of the currently logged-in user.
-- Super admins return null (see all tenants).
-- ──────────────────────────────────────────────────────────────
create or replace function public.current_tenant_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select tenant_id
  from public.users
  where id = auth.uid();
$$;

-- is_super_admin() helper
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select r.slug = 'super_admin'
     from public.users u
     join public.roles r on r.id = u.role_id
     where u.id = auth.uid()),
    false
  );
$$;

-- Update app_role() to include super_admin
create or replace function public.app_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select r.slug
     from public.users u
     join public.roles r on r.id = u.role_id
     where u.id = auth.uid()),
    'anon'
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- 6. RLS ON TENANTS TABLE
-- Only super_admin can see/manage tenants
-- ──────────────────────────────────────────────────────────────
alter table public.tenants enable row level security;

drop policy if exists tenants_super_read on public.tenants;
create policy tenants_super_read on public.tenants
  for select to authenticated
  using (public.is_super_admin());

drop policy if exists tenants_super_write on public.tenants;
create policy tenants_super_write on public.tenants
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ──────────────────────────────────────────────────────────────
-- 7. UPDATE RLS ON MEMBERS to respect tenant_id
-- Super admin sees all. Others see only their tenant.
-- ──────────────────────────────────────────────────────────────
drop policy if exists members_staff_read on public.members;
create policy members_staff_read on public.members
  for select to authenticated
  using (
    public.is_super_admin()
    or tenant_id = public.current_tenant_id()
  );

drop policy if exists members_mgmt_write on public.members;
create policy members_mgmt_write on public.members
  for all to authenticated
  using (
    public.is_super_admin()
    or (public.is_staff_user() and tenant_id = public.current_tenant_id())
  )
  with check (
    public.is_super_admin()
    or (public.is_staff_user() and tenant_id = public.current_tenant_id())
  );

-- ──────────────────────────────────────────────────────────────
-- 8. UPDATE RLS ON BRANCHES
-- ──────────────────────────────────────────────────────────────
drop policy if exists branches_read on public.branches;
create policy branches_read on public.branches
  for select to authenticated
  using (
    public.is_super_admin()
    or tenant_id = public.current_tenant_id()
  );

drop policy if exists branches_write on public.branches;
create policy branches_write on public.branches
  for all to authenticated
  using (
    public.is_super_admin()
    or (public.app_role() in ('admin','manager') and tenant_id = public.current_tenant_id())
  )
  with check (
    public.is_super_admin()
    or (public.app_role() in ('admin','manager') and tenant_id = public.current_tenant_id())
  );

-- ──────────────────────────────────────────────────────────────
-- 9. UPDATE RLS ON USERS
-- ──────────────────────────────────────────────────────────────
drop policy if exists users_read on public.users;
create policy users_read on public.users
  for select to authenticated
  using (
    public.is_super_admin()
    or id = auth.uid()
    or tenant_id = public.current_tenant_id()
  );

-- ──────────────────────────────────────────────────────────────
-- 10. INDEXES ON tenant_id for performance
-- ──────────────────────────────────────────────────────────────
create index if not exists members_tenant_idx       on public.members(tenant_id);
create index if not exists branches_tenant_idx      on public.branches(tenant_id);
create index if not exists users_tenant_idx         on public.users(tenant_id);
create index if not exists subscriptions_tenant_idx on public.subscriptions(tenant_id);
create index if not exists payments_tenant_idx      on public.payments(tenant_id);
create index if not exists staff_tenant_idx         on public.staff(tenant_id);
create index if not exists income_tenant_idx        on public.income(tenant_id);
create index if not exists expenses_tenant_idx      on public.expenses(tenant_id);

commit;
