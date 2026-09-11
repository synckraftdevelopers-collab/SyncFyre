-- 0043_phase_gating_corrected.sql
-- Creates and seeds the phase-gating tables (system_phases + feature_phases)
-- with CORRECTED phase assignments aligned to the commercial plan:
--   Essential (plan_1) = Phase 1
--   Growth    (plan_2) = Phase 1 + Phase 2
--   Scale     (plan_3) = Phase 1 + Phase 2 + Phase 3
--
-- P0 Fix 1: accounting moved to PHASE_2 (was wrongly Phase 3 in prior drafts)
-- P0 Fix 2: attendance, payments, reports, notifications, equipment → PHASE_1
--           (were wrongly listed as PHASE_2 in 0041_phase_gating.sql)
--
-- This migration supersedes the excluded 0041_phase_gating.sql.
-- It is forward-only and idempotent via ON CONFLICT DO UPDATE.
-- No business data (members, payments, attendance) is touched.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES (identical structure to 0041; CREATE TABLE IF NOT EXISTS is safe)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.system_phases (
  id          uuid primary key default gen_random_uuid(),
  phase_key   text not null unique,
  name        text not null,
  phase_number integer not null unique,
  description text,
  status      text not null default 'locked' check (status in ('active', 'locked')),
  activated_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint system_phases_key_check    check (phase_key    ~ '^PHASE_[1-2]$'),
  constraint system_phases_number_check check (phase_number between 1 and 2)
);

create table if not exists public.feature_phases (
  id          uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  phase_id    uuid not null references public.system_phases(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint feature_phases_key_check check (feature_key ~ '^[a-z0-9._-]{2,80}$')
);

create table if not exists public.system_phase_audit_logs (
  id          bigint generated always as identity primary key,
  action      text not null check (action in ('phase_activated', 'phase_deactivated', 'feature_phase_changed')),
  phase_key   text,
  previous_phase_key text,
  new_phase_key text,
  feature_key text,
  performed_by uuid references public.users(id) on delete set null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists system_phases_number_idx
  on public.system_phases (phase_number);
create index if not exists feature_phases_feature_idx
  on public.feature_phases (feature_key);
create index if not exists system_phase_audit_logs_created_idx
  on public.system_phase_audit_logs (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.system_phases          enable row level security;
alter table public.feature_phases         enable row level security;
alter table public.system_phase_audit_logs enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists set_updated_at on public.system_phases;
create trigger set_updated_at
  before update on public.system_phases
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.feature_phases;
create trigger set_updated_at
  before update on public.feature_phases
  for each row execute function public.set_updated_at();

create or replace function public.guard_system_phase_audit_update()
returns trigger language plpgsql as $$
begin
  raise exception 'system_phase_audit_logs is immutable. Rows cannot be updated (id=%).', old.id;
end $$;

drop trigger if exists guard_system_phase_audit_update on public.system_phase_audit_logs;
create trigger guard_system_phase_audit_update
  before update on public.system_phase_audit_logs
  for each row execute function public.guard_system_phase_audit_update();

create or replace function public.guard_system_phase_audit_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'system_phase_audit_logs is immutable. Rows cannot be deleted (id=%).', old.id;
end $$;

drop trigger if exists guard_system_phase_audit_delete on public.system_phase_audit_logs;
create trigger guard_system_phase_audit_delete
  before delete on public.system_phase_audit_logs
  for each row execute function public.guard_system_phase_audit_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: system_phases
-- PHASE_1 = Essential (active by default)
-- PHASE_2 = Growth    (locked until tenant has plan_2 / professional)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.system_phases (phase_key, name, phase_number, description, status, activated_at)
values
  ('PHASE_1', 'Essential', 1, 'Core gym operations and member management.', 'active', now()),
  ('PHASE_2', 'Growth',    2, 'Advanced gym workflows and operational tools.', 'locked', null)
on conflict (phase_key) do update set
  name        = excluded.name,
  phase_number = excluded.phase_number,
  description = excluded.description,
  status      = excluded.status,
  activated_at = excluded.activated_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: feature_phases — CORRECTED assignments
--
-- PHASE_1 (Essential — must be available on all plans):
--   dashboard, members, memberships, subscriptions, member_portal,
--   attendance, payments, notifications, reports, equipment
--
-- PHASE_2 (Growth — locked for Essential):
--   appointments, trainers, workouts, diet_plans, progress,
--   crm, pt, finance, accounting, biometric, advanced_reports,
--   whatsapp, classes, classes_management, inventory,
--   multi_branch, advanced_analytics, enterprise_features,
--   api, settings_biometric, machine_access
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.feature_phases (feature_key, phase_id)
select v.feature_key, p.id
from (values
  -- Phase 1 / Essential
  ('dashboard',          'PHASE_1'),
  ('members',            'PHASE_1'),
  ('memberships',        'PHASE_1'),
  ('subscriptions',      'PHASE_1'),
  ('member_portal',      'PHASE_1'),
  ('attendance',         'PHASE_1'),  -- P0 Fix 2: was PHASE_2
  ('payments',           'PHASE_1'),  -- P0 Fix 2: was PHASE_2
  ('notifications',      'PHASE_1'),  -- P0 Fix 2: was PHASE_2
  ('reports',            'PHASE_1'),  -- P0 Fix 2: was PHASE_2
  ('equipment',          'PHASE_1'),  -- P0 Fix 2: was PHASE_2
  -- Phase 2 / Growth
  ('appointments',       'PHASE_2'),
  ('trainers',           'PHASE_2'),
  ('classes',            'PHASE_2'),
  ('workouts',           'PHASE_2'),
  ('diet_plans',         'PHASE_2'),
  ('progress',           'PHASE_2'),
  ('crm',                'PHASE_2'),
  ('pt',                 'PHASE_2'),
  ('finance',            'PHASE_2'),
  ('accounting',         'PHASE_2'),  -- P0 Fix 1: was wrongly Phase 3 in earlier draft
  ('biometric',          'PHASE_2'),
  ('advanced_reports',   'PHASE_2'),
  ('whatsapp',           'PHASE_2'),
  ('classes_management', 'PHASE_2'),
  ('inventory',          'PHASE_2'),
  ('multi_branch',       'PHASE_2'),
  ('advanced_analytics', 'PHASE_2'),
  ('enterprise_features','PHASE_2'),
  ('api',                'PHASE_2'),
  ('settings_biometric', 'PHASE_2'),
  ('machine_access',     'PHASE_2')
) as v(feature_key, phase_key)
join public.system_phases p on p.phase_key = v.phase_key
on conflict (feature_key) do update set
  phase_id   = excluded.phase_id,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs (identical logic to 0041 — safe to re-apply via CREATE OR REPLACE)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_current_system_phase()
returns text
language sql stable security definer set search_path = 'public'
as $$
  select phase_key
  from public.system_phases
  where status = 'active'
  order by phase_number asc
  limit 1;
$$;

create or replace function public.activate_system_phase(
  p_phase_key    text,
  p_performed_by uuid default null
) returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare
  v_target  public.system_phases%rowtype;
  v_current public.system_phases%rowtype;
begin
  select * into v_target  from public.system_phases where phase_key = p_phase_key for update;
  if not found then raise exception 'Unknown phase: %', p_phase_key; end if;
  select * into v_current from public.system_phases where status = 'active' order by phase_number asc limit 1 for update;
  if found and v_current.phase_key = v_target.phase_key then
    return jsonb_build_object('status','noop','phase_key',v_target.phase_key);
  end if;
  if v_target.phase_number > 1 and (not found or v_current.phase_number <> v_target.phase_number - 1) then
    raise exception 'Previous phase must be active before enabling %', p_phase_key;
  end if;
  update public.system_phases
    set status = 'active',
        activated_at = case when phase_key = v_target.phase_key then now() else coalesce(activated_at, now()) end
    where phase_number <= v_target.phase_number;
  update public.system_phases set status = 'locked' where phase_number > v_target.phase_number;
  insert into public.system_phase_audit_logs (action, phase_key, previous_phase_key, new_phase_key, performed_by, details)
  values ('phase_activated', v_target.phase_key, coalesce(v_current.phase_key,null), v_target.phase_key, p_performed_by,
    jsonb_build_object('activated_at', now(), 'phase_number', v_target.phase_number));
  return jsonb_build_object('status','ok','phase_key',v_target.phase_key);
end $$;

create or replace function public.update_feature_phase(
  p_feature_key  text,
  p_phase_key    text,
  p_performed_by uuid default null
) returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare
  v_phase      public.system_phases%rowtype;
  v_feature_id uuid;
begin
  select * into v_phase from public.system_phases where phase_key = p_phase_key;
  if not found then raise exception 'Unknown phase: %', p_phase_key; end if;
  insert into public.feature_phases (feature_key, phase_id)
  values (p_feature_key, v_phase.id)
  on conflict (feature_key) do update set phase_id = excluded.phase_id, updated_at = now()
  returning id into v_feature_id;
  insert into public.system_phase_audit_logs (action, phase_key, feature_key, performed_by, details)
  values ('feature_phase_changed', p_phase_key, p_feature_key, p_performed_by,
    jsonb_build_object('feature_key', p_feature_key, 'phase_key', p_phase_key));
  return jsonb_build_object('status','ok','feature_key',p_feature_key,'phase_key',p_phase_key,'feature_phase_id',v_feature_id);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES (super_admin only — phase config is platform-level)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists system_phases_read          on public.system_phases;
drop policy if exists system_phases_write         on public.system_phases;
drop policy if exists feature_phases_read         on public.feature_phases;
drop policy if exists feature_phases_write        on public.feature_phases;
drop policy if exists system_phase_audit_logs_read   on public.system_phase_audit_logs;
drop policy if exists system_phase_audit_logs_insert on public.system_phase_audit_logs;

create policy system_phases_read   on public.system_phases for select to authenticated using (public.app_role() = 'super_admin');
create policy system_phases_write  on public.system_phases for all    to authenticated using (public.app_role() = 'super_admin') with check (public.app_role() = 'super_admin');
create policy feature_phases_read  on public.feature_phases for select to authenticated using (public.app_role() = 'super_admin');
create policy feature_phases_write on public.feature_phases for all    to authenticated using (public.app_role() = 'super_admin') with check (public.app_role() = 'super_admin');
create policy system_phase_audit_logs_read   on public.system_phase_audit_logs for select to authenticated using (public.app_role() = 'super_admin');
create policy system_phase_audit_logs_insert on public.system_phase_audit_logs for insert to authenticated with check (public.app_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION (raises exception and rolls back if wrong)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_count integer;
begin
  -- Both phase rows must exist
  select count(*) into v_count from public.system_phases;
  if v_count < 2 then
    raise exception '0043 verification failed: expected 2 system_phases rows, got %', v_count;
  end if;
  -- Phase 1 essential features must be in PHASE_1
  select count(*) into v_count
  from public.feature_phases fp
  join public.system_phases sp on sp.id = fp.phase_id
  where fp.feature_key in ('attendance','payments','reports','notifications','equipment')
    and sp.phase_key = 'PHASE_1';
  if v_count <> 5 then
    raise exception '0043 verification failed: expected 5 P0-Fix-2 features in PHASE_1, got %', v_count;
  end if;
  -- Accounting must be PHASE_2
  select count(*) into v_count
  from public.feature_phases fp
  join public.system_phases sp on sp.id = fp.phase_id
  where fp.feature_key = 'accounting'
    and sp.phase_key = 'PHASE_2';
  if v_count <> 1 then
    raise exception '0043 verification failed: accounting must be PHASE_2, got %', v_count;
  end if;
  raise notice '0043_phase_gating_corrected verified successfully.';
end $$;

commit;
