-- ================================================================
-- talwalkar-feature-freeze.sql
-- Tenant-level feature overrides for Talwalkar (slug=talwalkar).
--
-- tenant_id : 11111111-0001-0000-0000-000000000001
-- plan      : professional (Growth / plan_2)
-- status    : active
--
-- Overrides applied:
--   pt            = false  (PT Reports, PT Sessions — phase_2, Growth)
--   whatsapp      = false  (WhatsApp Templates + Communication History
--                           share the same feature key — one row only)
--   api_webhooks  = false  (Developer API & Webhooks — phase_3, Scale)
--
-- Guarantees:
--   - The Growth plan is NOT modified globally.
--   - Talwalkar is NOT downgraded; plan/status remain unchanged.
--   - customization_engine_enabled is NOT touched.
--   - No other tenant is affected.
--   - No business data (members/subscriptions/payments/attendance/
--     branches/roles/staff) is modified.
--   - Idempotent: safe to re-run (ON CONFLICT DO UPDATE).
-- ================================================================

begin;

-- ──────────────────────────────────────────────────────────────
-- STEP 1: SAFETY GUARD
-- Abort immediately if the tenant is not found, not professional,
-- or not active. This prevents the overrides from silently
-- applying to the wrong tenant or a wrong state.
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_tenant_id uuid    := '11111111-0001-0000-0000-000000000001';
  v_plan      text;
  v_status    text;
  v_slug      text;
  v_slug_count bigint;
begin
  -- Confirm exactly one row with this ID and slug
  select count(*) into v_slug_count
  from public.tenants
  where id = v_tenant_id and slug = 'talwalkar';

  if v_slug_count != 1 then
    raise exception
      'ABORT: Expected exactly 1 row with id=% slug=talwalkar, found %.',
      v_tenant_id, v_slug_count;
  end if;

  select plan, status, slug
  into   v_plan, v_status, v_slug
  from   public.tenants
  where  id = v_tenant_id;

  if v_plan != 'professional' then
    raise exception
      'ABORT: Talwalkar plan is %, expected professional. Refusing to apply freeze.',
      v_plan;
  end if;

  if v_status != 'active' then
    raise exception
      'ABORT: Talwalkar status is %, expected active. Refusing to apply freeze.',
      v_status;
  end if;

  raise notice '✓ Safety guard passed: tenant=% slug=% plan=% status=%',
    v_tenant_id, v_slug, v_plan, v_status;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 2: CAPTURE BEFORE-COUNTS (business data must not change)
-- ──────────────────────────────────────────────────────────────
create temp table if not exists _tw_freeze_before (
  entity text primary key,
  cnt    bigint
);

-- Use the Talwalkar branch to scope business-data counts
insert into _tw_freeze_before (entity, cnt)
values
  ('members',       (select count(*) from public.members
                     where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8')),
  ('subscriptions', (select count(*) from public.subscriptions
                     where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8')),
  ('payments',      (select count(*) from public.payments
                     where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8')),
  ('attendance',    (select count(*) from public.attendance
                     where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'))
on conflict (entity) do update set cnt = excluded.cnt;

-- Also snapshot any pre-existing tenant_features rows for Talwalkar
-- (unrelated rows must remain untouched)
create temp table if not exists _tw_freeze_before_features (
  feature_key text primary key,
  enabled     boolean
);

insert into _tw_freeze_before_features (feature_key, enabled)
select feature_key, enabled
from   public.tenant_features
where  tenant_id = '11111111-0001-0000-0000-000000000001'
on conflict (feature_key) do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 3: APPLY THE THREE FEATURE OVERRIDES
--
-- Uses INSERT ... ON CONFLICT (tenant_id, feature_key) DO UPDATE
-- so the operation is idempotent and never creates duplicates.
-- updated_at is refreshed automatically by the set_updated_at trigger.
-- ──────────────────────────────────────────────────────────────
insert into public.tenant_features (tenant_id, feature_key, enabled)
values
  ('11111111-0001-0000-0000-000000000001', 'pt',           false),
  ('11111111-0001-0000-0000-000000000001', 'whatsapp',     false),
  ('11111111-0001-0000-0000-000000000001', 'api_webhooks', false)
on conflict (tenant_id, feature_key)
  do update set
    enabled    = excluded.enabled,
    updated_at = now();

-- ──────────────────────────────────────────────────────────────
-- STEP 4: VERIFY — the three rows must now be enabled=false
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_tenant_id uuid := '11111111-0001-0000-0000-000000000001';
  rec         record;
  v_fail      boolean := false;
begin
  for rec in
    select feature_key, enabled
    from   public.tenant_features
    where  tenant_id = v_tenant_id
      and  feature_key in ('pt', 'whatsapp', 'api_webhooks')
    order  by feature_key
  loop
    if rec.enabled then
      raise warning 'FAIL: % is still enabled=true', rec.feature_key;
      v_fail := true;
    else
      raise notice '✓ Override verified: %  enabled=false', rec.feature_key;
    end if;
  end loop;

  -- Also confirm all three rows actually exist
  if (select count(*) from public.tenant_features
      where tenant_id = v_tenant_id
        and feature_key in ('pt', 'whatsapp', 'api_webhooks')) != 3 then
    raise exception 'ABORT: Expected 3 override rows, got fewer. Rolling back.';
  end if;

  if v_fail then
    raise exception 'ABORT: One or more overrides did not apply correctly. Rolling back.';
  end if;

  raise notice '✓ All three feature overrides confirmed enabled=false.';
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 5: VERIFY — Talwalkar plan/status unchanged
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_plan   text;
  v_status text;
begin
  select plan, status into v_plan, v_status
  from   public.tenants
  where  id = '11111111-0001-0000-0000-000000000001';

  if v_plan != 'professional' then
    raise exception 'ABORT: Talwalkar plan changed to %. Rolling back.', v_plan;
  end if;

  if v_status != 'active' then
    raise exception 'ABORT: Talwalkar status changed to %. Rolling back.', v_status;
  end if;

  raise notice '✓ Talwalkar plan=% status=% — unchanged.', v_plan, v_status;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 6: VERIFY — business data counts unchanged
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_branch uuid := '6a2a77a6-5f5b-4816-bfe2-590d61437af8';
  rec      record;
  v_after  bigint;
  v_before bigint;
  v_fail   boolean := false;
begin
  for rec in select entity, cnt from _tw_freeze_before loop
    case rec.entity
      when 'members'       then
        select count(*) into v_after from public.members       where branch_id = v_branch;
      when 'subscriptions' then
        select count(*) into v_after from public.subscriptions where branch_id = v_branch;
      when 'payments'      then
        select count(*) into v_after from public.payments      where branch_id = v_branch;
      when 'attendance'    then
        select count(*) into v_after from public.attendance    where branch_id = v_branch;
    end case;

    if rec.cnt != v_after then
      raise warning 'DATA MISMATCH: % before=% after=%', rec.entity, rec.cnt, v_after;
      v_fail := true;
    else
      raise notice '✓ Business data unchanged: % = %', rec.entity, v_after;
    end if;
  end loop;

  if v_fail then
    raise exception 'ABORT: Business data was modified. Rolling back.';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 7: VERIFY — unrelated tenant_features rows untouched
-- Any row that existed before the freeze (other than the three
-- we upserted) must still have the same enabled value.
-- ──────────────────────────────────────────────────────────────
do $$
declare
  rec    record;
  v_now  boolean;
  v_fail boolean := false;
begin
  for rec in
    select feature_key, enabled as before_val
    from   _tw_freeze_before_features
    where  feature_key not in ('pt', 'whatsapp', 'api_webhooks')
  loop
    select enabled into v_now
    from   public.tenant_features
    where  tenant_id = '11111111-0001-0000-0000-000000000001'
      and  feature_key = rec.feature_key;

    if v_now is distinct from rec.before_val then
      raise warning 'UNRELATED ROW CHANGED: % was=% now=%',
        rec.feature_key, rec.before_val, v_now;
      v_fail := true;
    else
      raise notice '✓ Unrelated row untouched: %  enabled=%', rec.feature_key, v_now;
    end if;
  end loop;

  if v_fail then
    raise exception 'ABORT: An unrelated tenant_features row was modified. Rolling back.';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 8: FINAL QUERY — show all Talwalkar tenant_features rows
-- ──────────────────────────────────────────────────────────────
select
  feature_key,
  enabled,
  updated_at
from  public.tenant_features
where tenant_id = '11111111-0001-0000-0000-000000000001'
order by feature_key;

-- ──────────────────────────────────────────────────────────────
-- STEP 9: FINAL QUERY — confirm Talwalkar tenant record
-- ──────────────────────────────────────────────────────────────
select
  id,
  name,
  slug,
  plan,
  status,
  '✓ plan and status unchanged' as note
from  public.tenants
where id = '11111111-0001-0000-0000-000000000001';

-- ──────────────────────────────────────────────────────────────
-- STEP 10: FINAL QUERY — business data summary
-- ──────────────────────────────────────────────────────────────
select
  (select count(*) from public.members
   where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8')       as members,
  (select count(*) from public.subscriptions
   where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8')       as subscriptions,
  (select count(*) from public.payments
   where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8')       as payments,
  (select count(*) from public.attendance
   where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8')       as attendance,
  '✓ Talwalkar business data untouched'                             as note;

-- Clean up temp tables
drop table if exists _tw_freeze_before;
drop table if exists _tw_freeze_before_features;

commit;
