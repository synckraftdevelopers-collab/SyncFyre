-- 0045_demo_bookings_table.sql
-- Creates the demo_bookings table used by the public /book-demo form.
-- Submissions from potential gym owners are stored here and reviewed
-- by SuperAdmin at /superadmin/demos.
--
-- This table has NO tenant_id — it is a platform-level lead capture table
-- visible only to super_admin role.
-- No customer or Talwalkar data is touched.

begin;

create table if not exists public.demo_bookings (
  id               uuid primary key default gen_random_uuid(),

  -- Contact info collected from the book-demo form
  contact_name     text not null,
  email            citext not null,
  phone            text not null,
  gym_name         text not null,
  city             text,

  -- Additional fields stored by the action
  business_type    text,
  location_count   integer,
  member_count     integer,
  current_software text,
  migration_urgency text,
  preferred_date   date,
  preferred_time   text,
  notes            text,
  source           text not null default 'book-demo',

  -- Timestamps
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Index for ordered listing (newest first)
create index if not exists demo_bookings_created_at_idx
  on public.demo_bookings (created_at desc);

-- Index for email lookup (dedup / follow-up)
create index if not exists demo_bookings_email_idx
  on public.demo_bookings (email);

-- updated_at trigger
drop trigger if exists set_updated_at on public.demo_bookings;
create trigger set_updated_at
  before update on public.demo_bookings
  for each row execute function public.set_updated_at();

-- RLS: enable but only super_admin can read; public insert is handled via
-- service-role key in bookDemoAction (createAdminClient bypasses RLS).
alter table public.demo_bookings enable row level security;

drop policy if exists demo_bookings_super_read   on public.demo_bookings;
drop policy if exists demo_bookings_super_write  on public.demo_bookings;

create policy demo_bookings_super_read
  on public.demo_bookings
  for select to authenticated
  using (public.is_super_admin());

create policy demo_bookings_super_write
  on public.demo_bookings
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Verification
do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'demo_bookings'
  ) then
    raise exception '0045 verification failed: demo_bookings table not created.';
  end if;
  raise notice '0045_demo_bookings_table verified successfully.';
end $$;

commit;
