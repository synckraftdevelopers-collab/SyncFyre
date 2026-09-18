-- 0053_grace_period_for_lapsed_subscriptions.sql
--
-- Feature: Advanced Membership Operations — "grace period where applicable"
-- (part of the Growth-tier CRM/Advanced Membership feature set).
--
-- Product decision (confirmed with the user): a single, fixed platform-
-- default grace period applies to every Growth and Scale tenant — it is
-- NOT configurable per plan or per tenant. Essential-tier tenants keep the
-- existing, unchanged behavior (a subscription is swept to 'expired' the
-- moment end_date passes, i.e. an effective 0-day grace period).
--
-- Why a grace period at all: on Growth/Scale, a membership that lapses by
-- a day or two (payment retry, member travelling, staff hasn't renewed it
-- yet) shouldn't immediately flip to 'expired' and disappear from active
-- rosters / start showing cancellation-style messaging. Essential tenants
-- don't get this cushion — that's an intentional plan differentiator, not
-- an oversight.
--
-- Implementation: expire_overdue_subscriptions() (introduced in 0050) is
-- modified to look up each subscription's tenant plan and only sweep it to
-- 'expired' once end_date + grace period has passed, where the grace
-- period is GRACE_PERIOD_DAYS (7) for tenants on 'professional' (Growth)
-- or 'enterprise' (Scale), and 0 for every other plan value ('trial',
-- 'standard', null, or anything unrecognized) — preserving 0050's exact
-- original behavior for Essential and any tenant we can't positively
-- identify as Growth/Scale. See lib/entitlements/evaluate.ts for the
-- StoredPlan mapping this mirrors (trial/standard = Essential (plan_1),
-- professional = Growth (plan_2), enterprise = Scale (plan_3)).
--
-- Nothing else about the function changes: it's still called nightly by
-- the existing /api/cron/reminders job (services/notification.service.ts),
-- still logs every transition to subscription_history exactly as before,
-- and is still safe to call any time (no-op when nothing is overdue past
-- its applicable grace period).
--
-- Scope / what this does NOT do:
--   - It does not reactivate subscriptions that were already flipped to
--     'expired' under the old 0-day-for-everyone behavior before this
--     migration runs. The grace period only affects subscriptions that are
--     still 'active' at the time this function next runs. This is
--     intentional — automatically un-expiring already-expired subscriptions
--     is a separate, riskier decision the user has not asked for.
--   - It is not configurable from the UI. GRACE_PERIOD_DAYS is a SQL
--     constant inside the function. Changing it requires a new migration.
--   - It does not touch subscriptions.status semantics, RLS, or any other
--     function.

create or replace function public.expire_overdue_subscriptions()
returns integer
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_count integer := 0;
  -- Fixed platform-default grace period (days) before a Growth/Scale
  -- tenant's lapsed subscription is swept to 'expired'. Not configurable
  -- per plan or per tenant — see migration header for the product
  -- decision this encodes.
  v_grace_period_days constant integer := 7;
begin
  with expired as (
    update public.subscriptions s
    set status = 'expired',
        updated_at = now()
    from public.tenants t
    where s.tenant_id = t.id
      and s.status = 'active'
      and s.end_date < (
        current_date - (
          case
            when t.plan in ('professional', 'enterprise') then v_grace_period_days
            else 0
          end
        )
      )
    returning s.id, s.member_id, s.start_date, s.end_date
  )
  insert into public.subscription_history (
    subscription_id, member_id, previous_end_date, new_start_date, new_end_date,
    action, notes, performed_by, previous_status, new_status, performed_at, remarks
  )
  select
    e.id, e.member_id, e.end_date, e.start_date, e.end_date,
    'expired', 'Automatically expired: end date (plus grace period, if applicable) has passed.', null, 'active', 'expired', now(), null
  from expired e;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

comment on function public.expire_overdue_subscriptions() is
  'Flips every active subscription whose end_date (plus a fixed 7-day grace period on Growth/Scale tenants only) has passed to expired and logs it to subscription_history. Called nightly by the /api/cron/reminders job; safe to call any time (no-op when nothing is overdue past its applicable grace period).';

-- Run it once now, consistent with 0050: this re-applies the sweep with
-- the new, plan-aware threshold. It will not un-expire anything already
-- 'expired'; it only affects subscriptions still 'active' whose grace
-- period (if any) has now also passed.
select public.expire_overdue_subscriptions();
