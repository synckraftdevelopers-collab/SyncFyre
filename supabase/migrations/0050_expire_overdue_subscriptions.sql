-- 0050_expire_overdue_subscriptions.sql
--
-- Fixes: "new expired members are not added in expired members" — members
-- whose membership end_date has passed never show up under Expired on the
-- Members page, in the expired-subscriptions count on the dashboard, or in
-- the sub_status=expired filter.
--
-- Root cause: `subscriptions.status` has an 'expired' value in its enum,
-- and `subscription_history.action` already anticipates an 'expired'
-- action (both since 0001/0003), and the notification system
-- (generate_membership_reminders(), 0024) already sends "membership
-- expired" alerts once end_date has passed — but nothing anywhere ever
-- actually UPDATEs a subscription's status to 'expired' when its end_date
-- passes. It just silently stays 'active' forever. Every "Expired" count
-- and filter in the app (app/(admin)/admin/members/page.tsx,
-- app/(reception)/reception/members/page.tsx, services/dashboard.service.ts)
-- queries subscriptions.status = 'expired' directly, so a subscription
-- that's actually overdue but still marked 'active' is invisible to all of
-- them, no matter how overdue it is.
--
-- Fix:
--   1. A new function, expire_overdue_subscriptions(), sweeps every
--      'active' subscription whose end_date has passed, flips it to
--      'expired', and logs it to subscription_history (action='expired')
--      the same way every other status transition in this app is
--      recorded — mirroring update_subscription_with_history() in 0003.
--   2. It's wired into the app's existing daily automation job (see the
--      accompanying code change to services/notification.service.ts),
--      which already runs every night via the Vercel Cron configured in
--      vercel.json ("/api/cron/reminders", 30 2 * * *) — so from here on,
--      newly-overdue memberships get flipped automatically without any
--      extra setup.
--   3. This migration also runs the sweep once immediately, so every
--      membership that's already overdue today shows up as Expired right
--      away instead of waiting for tonight's cron run.

create or replace function public.expire_overdue_subscriptions()
returns integer
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_count integer := 0;
begin
  with expired as (
    update public.subscriptions
    set status = 'expired',
        updated_at = now()
    where status = 'active'
      and end_date < current_date
    returning id, member_id, start_date, end_date
  )
  insert into public.subscription_history (
    subscription_id, member_id, previous_end_date, new_start_date, new_end_date,
    action, notes, performed_by, previous_status, new_status, performed_at, remarks
  )
  select
    e.id, e.member_id, e.end_date, e.start_date, e.end_date,
    'expired', 'Automatically expired: end date has passed.', null, 'active', 'expired', now(), null
  from expired e;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

comment on function public.expire_overdue_subscriptions() is
  'Flips every active subscription whose end_date has passed to expired and logs it to subscription_history. Called nightly by the /api/cron/reminders job; safe to call any time (no-op when nothing is overdue).';

-- Run it once now so today's already-overdue memberships show up as
-- Expired immediately, rather than waiting for tonight's cron.
select public.expire_overdue_subscriptions();
