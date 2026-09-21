-- 13-Prompt Sprint — Prompts 12 & 13: Smart Alerts (Inactivity + Low PT Sessions).
--
-- Adds two new automated, staff-facing alert types on top of the existing
-- queue_business_notification() idempotency machinery (fingerprint unique
-- index from 0020, validation + on-conflict-do-nothing from 0024):
--   1. member_inactivity_alert — an active member hasn't checked in for
--      14+ days. Re-fires once per ISO week while they remain inactive
--      (fingerprint includes the ISO year-week), instead of once ever or
--      once per day.
--   2. pt_sessions_low — an active PT package has 2 or fewer sessions
--      remaining. Re-fires when the remaining count changes (fingerprint
--      includes the remaining count), so it doesn't repeat daily for the
--      same count but does follow the member down to 1, then 0.
--
-- Both follow the exact same shape as generate_membership_reminders()
-- (0024/0028): a SECURITY DEFINER plpgsql function, looped business query,
-- queue_business_notification() per row, granted to service_role only,
-- called from the nightly cron via services/notification.service.ts.
--
-- The notifications_business_type_check constraint (0024) is extended to
-- allow these two new type values — required, since it's a whitelist and
-- an insert with an unlisted type is rejected before it ever reaches the
-- fingerprint dedup logic.
begin;

alter table public.notifications drop constraint if exists notifications_business_type_check;
alter table public.notifications add constraint notifications_business_type_check check (
  type = any (array[
    'member_created',
    'membership_created',
    'membership_renewed',
    'membership_expired',
    'membership_expiring_today',
    'membership_expiry_reminder',
    'membership_renewal_reminder',
    'pending_balance',
    'payment_pending',
    'payment_received',
    'payment_failed',
    'machine_connected',
    'machine_disconnected',
    'attendance_recorded',
    'tenant_registered',
    'member_inactivity_alert',
    'pt_sessions_low'
  ]::text[])
);

-- Runs from the protected server cron route. Flags active members (an
-- active subscription) whose most recent attendance record — or, if they
-- have never checked in, their subscription start date — is more than 14
-- days in the past. Fixed platform threshold, matching the fixed-constant
-- pattern used elsewhere in this sprint (grace period, discount caps)
-- rather than a per-tenant setting.
create or replace function public.generate_inactivity_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  c integer := 0;
  window_key text;
begin
  window_key := to_char(current_date, 'IYYY-IW');

  for r in
    select
      m.id as member_id,
      m.full_name,
      s.branch_id,
      s.tenant_id,
      la.last_attendance
    from public.members m
    join public.subscriptions s on s.member_id = m.id and s.status = 'active'
    left join lateral (
      select max(a.attendance_date) as last_attendance
      from public.attendance a
      where a.member_id = m.id
    ) la on true
    where coalesce(la.last_attendance, s.start_date) < current_date - 14
  loop
    perform public.queue_business_notification(
      r.branch_id,
      r.tenant_id,
      null,
      r.member_id,
      'member_inactivity_alert',
      'Inactive member',
      format(
        '%s has not checked in for over 14 days (last visit: %s).',
        r.full_name,
        coalesce(to_char(r.last_attendance, 'DD Mon YYYY'), 'never')
      ),
      'member',
      r.member_id,
      array['owner', 'admin', 'manager', 'reception'],
      'member_inactivity_alert:staff:' || r.member_id || ':' || window_key,
      jsonb_build_object('member_id', r.member_id, 'last_attendance', r.last_attendance)
    );
    c := c + 1;
  end loop;

  return c;
end $$;

-- Runs from the protected server cron route. Flags active PT packages
-- (pt_member_packages.status = 'active') with 2 or fewer sessions left,
-- so staff/trainers can prompt a renewal before the package runs out.
-- Fixed platform threshold, same rationale as the inactivity alert above.
create or replace function public.generate_low_pt_session_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  c integer := 0;
  remaining integer;
begin
  for r in
    select
      p.id as package_id,
      p.member_id,
      p.trainer_id,
      p.branch_id,
      p.tenant_id,
      p.purchased_sessions,
      p.used_sessions,
      m.full_name
    from public.pt_member_packages p
    join public.members m on m.id = p.member_id
    where p.status = 'active'
      and (p.purchased_sessions - p.used_sessions) between 0 and 2
  loop
    remaining := r.purchased_sessions - r.used_sessions;

    perform public.queue_business_notification(
      r.branch_id,
      r.tenant_id,
      null,
      r.member_id,
      'pt_sessions_low',
      'Low PT sessions remaining',
      format(
        '%s has %s PT session%s remaining on their package.',
        r.full_name,
        remaining,
        case when remaining = 1 then '' else 's' end
      ),
      'pt_member_package',
      r.package_id,
      array['owner', 'admin', 'manager', 'trainer'],
      'pt_sessions_low:staff:' || r.package_id || ':' || remaining::text,
      jsonb_build_object(
        'package_id', r.package_id,
        'member_id', r.member_id,
        'trainer_id', r.trainer_id,
        'remaining_sessions', remaining
      )
    );
    c := c + 1;
  end loop;

  return c;
end $$;

revoke all on function public.generate_inactivity_alerts() from public;
revoke all on function public.generate_low_pt_session_alerts() from public;
grant execute on function public.generate_inactivity_alerts() to service_role;
grant execute on function public.generate_low_pt_session_alerts() to service_role;

commit;
