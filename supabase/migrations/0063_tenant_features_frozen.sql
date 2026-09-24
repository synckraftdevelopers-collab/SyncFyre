-- ================================================================
-- Migration 0063: Tenant feature freeze support
-- ================================================================
--
-- Adds features_frozen boolean column to public.tenants.
--
-- PURPOSE:
--   Enables a per-tenant "frozen entitlement snapshot" mode. When
--   features_frozen=true, the tenant's feature access is governed by
--   the explicit allowlist in lib/entitlements/frozen-tenants.ts
--   rather than by the global Growth/Scale plan registry.
--
--   This insulates frozen tenants from future plan changes — new
--   features added to Growth or Scale do NOT automatically reach them.
--
-- SCOPE:
--   - One column added to public.tenants (all rows default to false)
--   - One UPDATE for Talwalkar only (sets features_frozen=true)
--   - No other tenant is affected
--   - No business data (members/subscriptions/payments/attendance/
--     branches) is touched
--
-- ROLLBACK:
--   ALTER TABLE public.tenants DROP COLUMN features_frozen;
--   This restores all rows to the pre-migration state. No data loss.
--
-- ================================================================

begin;

-- ──────────────────────────────────────────────────────────────
-- STEP 1: SAFETY CHECK — abort if column already exists
-- ──────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'tenants'
      and column_name  = 'features_frozen'
  ) then
    raise exception
      'ABORT: Column features_frozen already exists on public.tenants. '
      'This migration has already been applied. Aborting to prevent duplicate run.';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 2: ADD COLUMN — default false, affects all rows safely
-- ──────────────────────────────────────────────────────────────
alter table public.tenants
  add column features_frozen boolean not null default false;

comment on column public.tenants.features_frozen is
  'When true, this tenant''s feature access is governed by the explicit '
  'frozen snapshot in lib/entitlements/frozen-tenants.ts rather than '
  'the global commercial plan registry. Set only via explicit developer approval.';

-- ──────────────────────────────────────────────────────────────
-- STEP 3: PRE-UPDATE SAFETY GUARD
-- Confirm only Talwalkar will be set to true.
-- Abort if any other tenant would accidentally be affected.
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_talwalkar_id   uuid    := '11111111-0001-0000-0000-000000000001';
  v_talwalkar_slug text;
  v_talwalkar_plan text;
  v_talwalkar_stat text;
  v_slug_count     bigint;
begin
  -- Confirm the tenant exists with the expected slug
  select count(*) into v_slug_count
  from public.tenants
  where id = v_talwalkar_id and slug = 'talwalkar';

  if v_slug_count != 1 then
    raise exception
      'ABORT: Expected exactly 1 row with id=% slug=talwalkar, found %. '
      'Refusing to freeze an unidentified tenant.',
      v_talwalkar_id, v_slug_count;
  end if;

  select slug, plan, status
  into   v_talwalkar_slug, v_talwalkar_plan, v_talwalkar_stat
  from   public.tenants
  where  id = v_talwalkar_id;

  if v_talwalkar_plan != 'professional' then
    raise exception
      'ABORT: Talwalkar plan is %, expected professional. '
      'Refusing to apply freeze in unexpected state.',
      v_talwalkar_plan;
  end if;

  if v_talwalkar_stat != 'active' then
    raise exception
      'ABORT: Talwalkar status is %, expected active. '
      'Refusing to apply freeze in unexpected state.',
      v_talwalkar_stat;
  end if;

  raise notice '✓ Safety guard passed: tenant=% slug=% plan=% status=%',
    v_talwalkar_id, v_talwalkar_slug, v_talwalkar_plan, v_talwalkar_stat;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 4: SET features_frozen=true FOR TALWALKAR ONLY
-- ──────────────────────────────────────────────────────────────
update public.tenants
   set features_frozen = true
 where id = '11111111-0001-0000-0000-000000000001'
   and slug = 'talwalkar';

-- ──────────────────────────────────────────────────────────────
-- STEP 5: VERIFY — exactly one frozen tenant, and it is Talwalkar
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_frozen_count bigint;
  v_frozen_slug  text;
  v_frozen_plan  text;
  v_frozen_stat  text;
begin
  select count(*) into v_frozen_count
  from public.tenants
  where features_frozen = true;

  if v_frozen_count != 1 then
    raise exception
      'ABORT: Expected exactly 1 frozen tenant, found %. Rolling back.',
      v_frozen_count;
  end if;

  select slug, plan, status
  into   v_frozen_slug, v_frozen_plan, v_frozen_stat
  from   public.tenants
  where  features_frozen = true;

  if v_frozen_slug != 'talwalkar' then
    raise exception
      'ABORT: Frozen tenant is %, expected talwalkar. Rolling back.',
      v_frozen_slug;
  end if;

  raise notice '✓ Exactly 1 frozen tenant: slug=% plan=% status=%',
    v_frozen_slug, v_frozen_plan, v_frozen_stat;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 6: VERIFY — all other tenants remain features_frozen=false
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_non_frozen_frozen_count bigint;
begin
  select count(*) into v_non_frozen_frozen_count
  from public.tenants
  where features_frozen = true
    and slug != 'talwalkar';

  if v_non_frozen_frozen_count > 0 then
    raise exception
      'ABORT: % non-Talwalkar tenants have features_frozen=true. Rolling back.',
      v_non_frozen_frozen_count;
  end if;

  raise notice '✓ All non-Talwalkar tenants have features_frozen=false (unchanged).';
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 7: VERIFY — Talwalkar business data unchanged
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_branch   uuid    := '6a2a77a6-5f5b-4816-bfe2-590d61437af8';
  v_members  bigint;
  v_subs     bigint;
  v_payments bigint;
  v_attend   bigint;
begin
  select count(*) into v_members  from public.members       where branch_id = v_branch;
  select count(*) into v_subs     from public.subscriptions where branch_id = v_branch;
  select count(*) into v_payments from public.payments      where branch_id = v_branch;
  select count(*) into v_attend   from public.attendance    where branch_id = v_branch;

  raise notice '✓ Talwalkar business data: members=% subscriptions=% payments=% attendance=%',
    v_members, v_subs, v_payments, v_attend;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 8: FINAL QUERY — show the result
-- ──────────────────────────────────────────────────────────────
select
  id,
  name,
  slug,
  plan,
  status,
  features_frozen,
  '✓ Freeze applied' as note
from public.tenants
where id = '11111111-0001-0000-0000-000000000001';

commit;

-- ──────────────────────────────────────────────────────────────
-- ROLLBACK (run this block to undo):
-- ALTER TABLE public.tenants DROP COLUMN features_frozen;
-- ──────────────────────────────────────────────────────────────
