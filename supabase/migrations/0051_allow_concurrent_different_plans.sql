-- 0051_allow_concurrent_different_plans.sql
--
-- Feature: "member can have more than one plan" — a member should be able to
-- hold two (or more) DIFFERENT membership plans at the same time (e.g. a
-- Gym membership running alongside a Personal Training plan), each with its
-- own dates, invoice, and balance, rather than one plan always replacing
-- another.
--
-- Root cause / blocker: migration 0035_prevent_overlapping_memberships.sql
-- added a trigger, prevent_overlapping_memberships(), that raises an error
-- whenever a member already has an active/pending/paused subscription whose
-- date range overlaps the new one being inserted — regardless of which plan
-- is involved. That trigger's real intent was to stop a genuine duplicate
-- (e.g. the same plan accidentally sold/renewed twice, double-clicked, or
-- imported twice) from creating two overlapping rows for the SAME plan. But
-- as written it also blocks the legitimate case of adding a second,
-- different plan while the first is still active — exactly what "add an
-- extra plan" needs to do.
--
-- Fix: scope the overlap check to the SAME plan_id. Two different plans are
-- now allowed to run concurrently for one member; a duplicate/overlapping
-- sale of the *same* plan is still blocked, preserving 0035's original
-- protection.

begin;

create or replace function public.prevent_overlapping_memberships()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status not in ('active', 'pending', 'paused') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.member_id::text, 0));

  if exists (
    select 1
    from public.subscriptions existing
    where existing.member_id = new.member_id
      and existing.id is distinct from new.id
      and existing.plan_id = new.plan_id
      and existing.status in ('active', 'pending', 'paused')
      and daterange(existing.start_date, existing.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'An active or pending membership on this same plan already overlaps this period for the member.' using errcode = '23P01';
  end if;

  return new;
end;
$$;

comment on function public.prevent_overlapping_memberships() is
  'Blocks a duplicate/overlapping subscription for the SAME plan and member. Different plans are allowed to run concurrently for one member (e.g. Gym + Personal Training at the same time) — see 0051.';

commit;
