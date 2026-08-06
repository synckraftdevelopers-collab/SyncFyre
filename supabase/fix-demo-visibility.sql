-- ================================================================
-- fix-demo-visibility.sql
-- Run this in Supabase SQL Editor to make demo data visible.
-- ================================================================

-- ──────────────────────────────────────────────────────────────
-- STEP 1: DIAGNOSE — check what's actually in the DB
-- ──────────────────────────────────────────────────────────────

-- How many members were seeded?
select count(*) as seeded_members from public.members
where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- Does the branch exist?
select id, name, code from public.branches
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- What branch_id does the admin user have?
select id, full_name, branch_id, role_id from public.users limit 5;

-- What do RLS helper functions return for your session?
select
  public.app_role()           as my_role,
  public.current_branch_id()  as my_branch_id;

-- ──────────────────────────────────────────────────────────────
-- STEP 2: LINK admin user to the demo branch
-- The seed members are in branch 'aaaaaaaa-...-0001'.
-- Admin users typically have branch_id = NULL (global access)
-- but if the RLS policy uses current_branch_id() the queries
-- return nothing unless we either:
--   (a) set the admin's branch_id, OR
--   (b) fix RLS to let admin see all branches
--
-- Option A — assign admin to the demo branch (simplest for demo):
-- ──────────────────────────────────────────────────────────────

update public.users
set branch_id = 'aaaaaaaa-0000-0000-0000-000000000001'
where id = (select id from public.users where role_id = (select id from public.roles where slug = 'admin') limit 1)
  and branch_id is null;

-- Verify
select id, full_name, branch_id from public.users
where role_id = (select id from public.roles where slug = 'admin');

-- ──────────────────────────────────────────────────────────────
-- STEP 3: CHECK what app_role() and current_branch_id() return
-- These are used by all RLS policies. If they don't exist the
-- policies silently block everything.
-- ──────────────────────────────────────────────────────────────

-- Check if these functions exist:
select proname, prosrc
from pg_proc
where proname in ('app_role','current_branch_id','is_staff_user')
  and pronamespace = 'public'::regnamespace;

-- ──────────────────────────────────────────────────────────────
-- STEP 4: CREATE the RLS helper functions if missing
-- (These are normally created in 0001 or 0003 but may be absent)
-- ──────────────────────────────────────────────────────────────

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

create or replace function public.current_branch_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select branch_id from public.users where id = auth.uid();
$$;

create or replace function public.is_staff_user()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select r.slug in ('admin','manager','reception','trainer','dietician')
     from public.users u
     join public.roles r on r.id = u.role_id
     where u.id = auth.uid()),
    false
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- STEP 5: FIX RLS on members table so admin sees all branches
-- The current policy blocks admin if branch_id doesn't match.
-- Admin role should bypass branch filter.
-- ──────────────────────────────────────────────────────────────

-- Drop and recreate members read policy
drop policy if exists members_staff_read on public.members;
create policy members_staff_read on public.members
  for select to authenticated
  using (
    public.app_role() = 'admin'
    or branch_id = public.current_branch_id()
  );

drop policy if exists members_mgmt_write on public.members;
create policy members_mgmt_write on public.members
  for all to authenticated
  using (
    public.app_role() = 'admin'
    or (public.is_staff_user() and branch_id = public.current_branch_id())
  )
  with check (
    public.app_role() = 'admin'
    or (public.is_staff_user() and branch_id = public.current_branch_id())
  );

-- Same fix for subscriptions
drop policy if exists subscriptions_staff_read on public.subscriptions;
create policy subscriptions_staff_read on public.subscriptions
  for select to authenticated
  using (
    public.app_role() = 'admin'
    or branch_id = public.current_branch_id()
  );

-- Same fix for payments
drop policy if exists payments_staff_read on public.payments;
create policy payments_staff_read on public.payments
  for select to authenticated
  using (
    public.app_role() = 'admin'
    or branch_id = public.current_branch_id()
  );

-- Same fix for attendance
drop policy if exists attendance_staff_read on public.attendance;
create policy attendance_staff_read on public.attendance
  for select to authenticated
  using (
    public.app_role() = 'admin'
    or branch_id = public.current_branch_id()
  );

-- Same fix for invoices
drop policy if exists invoices_staff_read on public.invoices;
create policy invoices_staff_read on public.invoices
  for select to authenticated
  using (
    public.app_role() = 'admin'
    or branch_id = public.current_branch_id()
  );

-- ──────────────────────────────────────────────────────────────
-- STEP 6: VERIFY data is now readable
-- Run these after applying the fixes above.
-- ──────────────────────────────────────────────────────────────

-- Should return 100
select count(*) as total_members from public.members;

-- Should return member names
select member_code, full_name, status, branch_id
from public.members
order by created_at desc
limit 10;

-- Should return subscriptions
select count(*) as total_subscriptions from public.subscriptions;

-- Should return attendance rows
select count(*) as total_attendance from public.attendance;

-- Should show dashboard numbers
select * from (
  select
    (select count(*) from public.members where status = 'active')                     as active_members,
    (select count(*) from public.attendance where attendance_date = current_date)     as today_attendance,
    (select count(*) from public.subscriptions where status = 'active')               as active_subscriptions,
    (select coalesce(sum(amount),0) from public.payments where status = 'completed')  as total_revenue
) t;
