begin;

insert into public.roles (name, slug, description, is_system)
values ('Owner', 'owner', 'Gym owner with organization-level control', true)
on conflict (slug) do nothing;

alter table public.tenants
  add column if not exists email citext,
  add column if not exists logo_url text,
  add column if not exists postal_code text,
  add column if not exists gst_number text,
  add column if not exists currency text not null default 'INR',
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists trial_starts_at date,
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.tenant_onboarding_progress (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  current_step text not null default 'gym_profile'
    check (current_step in ('gym_profile','main_branch','membership_plans','trainers','staff','machine','complete')),
  completed_steps jsonb not null default '[]'::jsonb,
  machine_skipped boolean not null default false,
  setup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.tenant_onboarding_progress;
create trigger set_updated_at
  before update on public.tenant_onboarding_progress
  for each row execute function public.set_updated_at();

create index if not exists users_email_lower_idx on public.users ((lower(email::text))) where email is not null;
create index if not exists users_phone_idx on public.users (phone) where phone is not null;

create or replace function public.is_management()
returns boolean
language sql stable security definer
set search_path = 'public'
as $$
  select coalesce(public.app_role() in ('owner','admin','manager'), false)
$$;

create or replace function public.is_staff_user()
returns boolean
language sql stable security definer
set search_path = 'public'
as $$
  select coalesce(public.app_role() in ('owner','admin','manager','reception','trainer','dietician'), false)
$$;

drop policy if exists branches_write on public.branches;
create policy branches_write on public.branches
  for all to authenticated
  using (
    public.is_super_admin()
    or (public.app_role() in ('owner','admin','manager') and tenant_id = public.current_tenant_id())
  )
  with check (
    public.is_super_admin()
    or (public.app_role() in ('owner','admin','manager') and tenant_id = public.current_tenant_id())
  );

alter table public.tenant_onboarding_progress enable row level security;

drop policy if exists tenant_onboarding_progress_read on public.tenant_onboarding_progress;
create policy tenant_onboarding_progress_read on public.tenant_onboarding_progress
  for select to authenticated
  using (
    public.is_super_admin()
    or tenant_id = public.current_tenant_id()
  );

drop policy if exists tenant_onboarding_progress_write on public.tenant_onboarding_progress;
create policy tenant_onboarding_progress_write on public.tenant_onboarding_progress
  for all to authenticated
  using (
    public.is_super_admin()
    or (public.is_management() and tenant_id = public.current_tenant_id())
  )
  with check (
    public.is_super_admin()
    or (public.is_management() and tenant_id = public.current_tenant_id())
  );

create or replace function public.bootstrap_owner_tenant(
  p_gym_name text,
  p_branch_name text default 'Main Branch',
  p_logo_url text default null,
  p_address text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_country text default 'India',
  p_phone text default null,
  p_email citext default null,
  p_gst_number text default null,
  p_currency text default 'INR',
  p_timezone text default 'Asia/Kolkata'
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user public.users%rowtype;
  v_owner_role_id uuid;
  v_tenant public.tenants%rowtype;
  v_branch public.branches%rowtype;
  v_slug_base text;
  v_slug text;
  v_suffix integer := 0;
  v_trial_start date := current_date;
  v_trial_end date := current_date + 365;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_user
  from public.users
  where id = auth.uid()
  for update;

  if not found then
    raise exception 'User profile not found';
  end if;

  if v_user.tenant_id is not null then
    select * into v_tenant from public.tenants where id = v_user.tenant_id;
    select * into v_branch from public.branches where id = v_user.branch_id;
    return jsonb_build_object(
      'tenant_id', v_tenant.id,
      'branch_id', v_branch.id,
      'already_exists', true
    );
  end if;

  if coalesce(trim(p_gym_name), '') = '' then
    raise exception 'Gym name is required';
  end if;

  select id into v_owner_role_id
  from public.roles
  where slug = 'owner';

  if v_owner_role_id is null then
    raise exception 'Owner role is not configured';
  end if;

  v_slug_base := regexp_replace(lower(trim(p_gym_name)), '[^a-z0-9]+', '-', 'g');
  v_slug_base := trim(both '-' from v_slug_base);
  if v_slug_base = '' then
    v_slug_base := 'gym';
  end if;
  v_slug := v_slug_base;

  while exists(select 1 from public.tenants where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := left(v_slug_base, 46) || '-' || v_suffix::text;
  end loop;

  insert into public.tenants (
    name, slug, owner_email, phone, email, address, city, state, postal_code, country,
    logo_url, gst_number, currency, timezone, plan, status, trial_starts_at, trial_ends_at
  )
  values (
    trim(p_gym_name), v_slug, coalesce(p_email, v_user.email), p_phone, coalesce(p_email, v_user.email),
    nullif(trim(p_address), ''), nullif(trim(p_city), ''), nullif(trim(p_state), ''), nullif(trim(p_postal_code), ''),
    coalesce(nullif(trim(p_country), ''), 'India'), nullif(trim(p_logo_url), ''), nullif(trim(p_gst_number), ''),
    coalesce(nullif(trim(p_currency), ''), 'INR'), coalesce(nullif(trim(p_timezone), ''), 'Asia/Kolkata'),
    'trial', 'trial', v_trial_start, v_trial_end
  )
  returning * into v_tenant;

  insert into public.branches (
    name, code, address, city, state, postal_code, country, phone, email, timezone, status, tenant_id
  )
  values (
    coalesce(nullif(trim(p_branch_name), ''), 'Main Branch'),
    'GYM' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    nullif(trim(p_address), ''), nullif(trim(p_city), ''), nullif(trim(p_state), ''), nullif(trim(p_postal_code), ''),
    coalesce(nullif(trim(p_country), ''), 'India'), p_phone, coalesce(p_email, v_user.email), coalesce(nullif(trim(p_timezone), ''), 'Asia/Kolkata'),
    'active', v_tenant.id
  )
  returning * into v_branch;

  update public.users
  set
    role_id = v_owner_role_id,
    branch_id = v_branch.id,
    tenant_id = v_tenant.id,
    full_name = case when full_name = '' then coalesce((select raw_user_meta_data->>'full_name' from auth.users where id = auth.uid()), full_name) else full_name end,
    email = coalesce(v_user.email, p_email),
    phone = coalesce(nullif(trim(p_phone), ''), v_user.phone),
    status = 'active',
    updated_at = now()
  where id = auth.uid();

  insert into public.tenant_onboarding_progress (tenant_id, current_step, completed_steps)
  values (v_tenant.id, 'gym_profile', '["gym_profile","main_branch"]'::jsonb)
  on conflict (tenant_id) do nothing;

  return jsonb_build_object(
    'tenant_id', v_tenant.id,
    'branch_id', v_branch.id,
    'trial_start_date', v_trial_start,
    'trial_end_date', v_trial_end,
    'already_exists', false
  );
end;
$$;

create or replace function public.complete_owner_onboarding(p_machine_skipped boolean default true)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.users where id = auth.uid();
  if v_tenant_id is null then
    raise exception 'Tenant not found';
  end if;

  update public.tenant_onboarding_progress
  set
    current_step = 'complete',
    completed_steps = '["gym_profile","main_branch","membership_plans","trainers","staff","machine","complete"]'::jsonb,
    machine_skipped = p_machine_skipped,
    setup_completed_at = now(),
    updated_at = now()
  where tenant_id = v_tenant_id;

  update public.tenants
  set onboarding_completed_at = now(), updated_at = now()
  where id = v_tenant_id;
end;
$$;

commit;
