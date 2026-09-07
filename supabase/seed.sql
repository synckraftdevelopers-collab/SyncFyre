-- dev-task-split.md Phase 0 (#2): local development seed data.
--
-- IMPORTANT: this file is picked up ONLY by `supabase db reset` against your
-- LOCAL Docker Postgres instance. It is never applied to a hosted/remote
-- project by `supabase db push`, and it is not run automatically against
-- production. Do not point it at a remote project, and never use it (or
-- anything like it) against the Talwalkar tenant or any other real customer
-- data - everything below is synthetic, with obviously-fake IDs, emails,
-- and passwords for local use only.
--
-- Usage: `npx supabase start` then `npx supabase db reset` (runs every
-- migration, then this file) to get a working local dev environment with
-- one tenant, one branch, and five logins:
--   owner@devgym.local     / DevPassword123!   (owner)
--   reception@devgym.local / DevPassword123!   (reception)
--   trainer@devgym.local   / DevPassword123!   (trainer)
--   dietician@devgym.local / DevPassword123!   (dietician)
--   member@devgym.local    / DevPassword123!   (member)
--
-- Safe to re-run: every insert is guarded so `db reset` (which drops and
-- recreates the local database from scratch every time) never collides
-- with itself, and nothing here ever touches a table by anything but these
-- fixed, obviously-synthetic UUIDs.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tenant + branch
-- ---------------------------------------------------------------------
insert into public.tenants (id, name, slug, owner_email, city, state, plan, status)
values ('de000000-0000-0000-0000-000000000001', 'Dev Gym', 'dev-gym', 'owner@devgym.local', 'Pune', 'Maharashtra', 'professional', 'active')
on conflict (id) do nothing;

insert into public.branches (id, name, code, city, state, phone, email, status)
values ('de000000-0000-0000-0000-000000000002', 'Dev Gym - Main', 'DEVMAIN01', 'Pune', 'Maharashtra', '9000000000', 'main@devgym.local', 'active')
on conflict (id) do nothing;

-- branches.tenant_id was added by 0009_multi_tenancy.sql
update public.branches set tenant_id = 'de000000-0000-0000-0000-000000000001'
where id = 'de000000-0000-0000-0000-000000000002' and tenant_id is distinct from 'de000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------
-- Auth users (local dev only - public.handle_new_auth_user() trigger
-- creates the matching public.users row automatically from
-- raw_app_meta_data.role / raw_user_meta_data.full_name)
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  crypt('DevPassword123!', gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', u.role_slug),
  jsonb_build_object('full_name', u.full_name),
  now(), now(), '', '', '', ''
from (values
  ('de000000-0000-0000-0000-0000000000a1'::uuid, 'owner@devgym.local', 'Dev Owner', 'owner'),
  ('de000000-0000-0000-0000-0000000000a2'::uuid, 'reception@devgym.local', 'Dev Reception', 'reception'),
  ('de000000-0000-0000-0000-0000000000a3'::uuid, 'trainer@devgym.local', 'Dev Trainer', 'trainer'),
  ('de000000-0000-0000-0000-0000000000a4'::uuid, 'dietician@devgym.local', 'Dev Dietician', 'dietician'),
  ('de000000-0000-0000-0000-0000000000a5'::uuid, 'member@devgym.local', 'Dev Member', 'member')
) as u(id, email, full_name, role_slug)
where not exists (select 1 from auth.users where id = u.id);

-- Backfill tenant/branch on the users the trigger just created (the
-- trigger only sets role/name/email/phone, not tenant/branch scoping).
update public.users set tenant_id = 'de000000-0000-0000-0000-000000000001', branch_id = 'de000000-0000-0000-0000-000000000002'
where id in (
  'de000000-0000-0000-0000-0000000000a1',
  'de000000-0000-0000-0000-0000000000a2',
  'de000000-0000-0000-0000-0000000000a3',
  'de000000-0000-0000-0000-0000000000a4',
  'de000000-0000-0000-0000-0000000000a5'
);

-- ---------------------------------------------------------------------
-- Trainer + staff profile for the dev trainer login
-- ---------------------------------------------------------------------
insert into public.staff (id, user_id, branch_id, employee_code, designation, joining_date, salary, status)
values ('de000000-0000-0000-0000-000000000b1', 'de000000-0000-0000-0000-0000000000a3', 'de000000-0000-0000-0000-000000000002', 'DEV-EMP-001', 'Trainer', current_date, 30000, 'active')
on conflict (id) do nothing;

insert into public.trainers (id, user_id, staff_id, branch_id, specializations, experience_years, certifications, status)
values ('de000000-0000-0000-0000-000000000c1', 'de000000-0000-0000-0000-0000000000a3', 'de000000-0000-0000-0000-000000000b1', 'de000000-0000-0000-0000-000000000002', array['Strength training', 'Weight loss'], 3, array['Certified Personal Trainer'], 'active')
on conflict (id) do nothing;

insert into public.staff (id, user_id, branch_id, employee_code, designation, joining_date, salary, status)
values ('de000000-0000-0000-0000-000000000b2', 'de000000-0000-0000-0000-0000000000a4', 'de000000-0000-0000-0000-000000000002', 'DEV-EMP-002', 'Dietician', current_date, 30000, 'active')
on conflict (id) do nothing;

insert into public.trainers (id, user_id, staff_id, branch_id, specializations, experience_years, certifications, status)
values ('de000000-0000-0000-0000-000000000c2', 'de000000-0000-0000-0000-0000000000a4', 'de000000-0000-0000-0000-000000000b2', 'de000000-0000-0000-0000-000000000002', array['Nutrition planning', 'Diet coaching'], 2, array['Certified Dietician'], 'active')
on conflict (id) do nothing;

insert into public.members (id, user_id, branch_id, member_code, full_name, phone, status, created_at)
values ('de000000-0000-0000-0000-000000000e1', 'de000000-0000-0000-0000-0000000000a5', 'de000000-0000-0000-0000-000000000002', 'DEV-MEM-001', 'Dev Member', '9000000001', 'active', current_date)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- A membership plan so subscriptions/sale flows have something to sell
-- ---------------------------------------------------------------------
insert into public.membership_plans (id, branch_id, name, price, gst_percent, discount_percent, duration_months, features, status)
values ('de000000-0000-0000-0000-000000000d1', 'de000000-0000-0000-0000-000000000002', 'Monthly Gold', 2000, 18, 0, 1, array['Gym floor access', 'Locker'], 'active')
on conflict (id) do nothing;

commit;
