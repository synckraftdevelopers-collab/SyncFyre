begin;

alter table public.face_machine_settings
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

update public.face_machine_settings f
set tenant_id = b.tenant_id
from public.branches b
where b.id = f.branch_id
  and (f.tenant_id is distinct from b.tenant_id);

create index if not exists face_machine_settings_tenant_idx
  on public.face_machine_settings (tenant_id, status, connection_status);

create or replace function public.sync_face_machine_tenant_id()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  if new.branch_id is not null then
    select tenant_id into new.tenant_id
    from public.branches
    where id = new.branch_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_face_machine_tenant_id on public.face_machine_settings;
create trigger sync_face_machine_tenant_id
before insert or update of branch_id on public.face_machine_settings
for each row execute function public.sync_face_machine_tenant_id();

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
  v_trial_end date := ((current_date + interval '1 year') - interval '1 day')::date;
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

create or replace function public.provision_superadmin_tenant_owner(
  p_user_id uuid,
  p_owner_name text,
  p_owner_email citext,
  p_owner_phone text default null,
  p_gym_name text default null,
  p_gym_slug text default null,
  p_branch_name text default 'Main Branch'
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_actor uuid := auth.uid();
  v_owner_role_id uuid;
  v_tenant public.tenants%rowtype;
  v_branch public.branches%rowtype;
  v_slug_base text;
  v_slug text;
  v_suffix integer := 0;
  v_trial_start date := current_date;
  v_trial_end date := ((current_date + interval '1 year') - interval '1 day')::date;
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'Super admin authorization required';
  end if;

  if p_user_id is null then
    raise exception 'Owner user id is required';
  end if;

  if coalesce(trim(p_owner_name), '') = '' then
    raise exception 'Owner name is required';
  end if;

  if coalesce(trim(p_owner_email::text), '') = '' then
    raise exception 'Owner email is required';
  end if;

  if exists(select 1 from public.users where id = p_user_id and tenant_id is not null) then
    raise exception 'The selected owner account is already attached to a tenant';
  end if;

  select id into v_owner_role_id
  from public.roles
  where slug = 'owner';

  if v_owner_role_id is null then
    raise exception 'Owner role is not configured';
  end if;

  v_slug_base := coalesce(nullif(trim(p_gym_slug), ''), regexp_replace(lower(trim(coalesce(p_gym_name, p_owner_name))), '[^a-z0-9]+', '-', 'g'));
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
    name, slug, owner_email, email, phone, plan, status, trial_starts_at, trial_ends_at
  )
  values (
    trim(coalesce(nullif(p_gym_name, ''), p_owner_name || ' Gym')),
    v_slug,
    lower(trim(p_owner_email::text)),
    lower(trim(p_owner_email::text)),
    nullif(trim(p_owner_phone), ''),
    'trial',
    'trial',
    v_trial_start,
    v_trial_end
  )
  returning * into v_tenant;

  insert into public.branches (
    name, code, email, phone, timezone, status, tenant_id
  )
  values (
    coalesce(nullif(trim(p_branch_name), ''), 'Main Branch'),
    'GYM' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    lower(trim(p_owner_email::text)),
    nullif(trim(p_owner_phone), ''),
    'Asia/Kolkata',
    'active',
    v_tenant.id
  )
  returning * into v_branch;

  insert into public.users (id, full_name, email, phone, role_id, branch_id, tenant_id, status)
  values (
    p_user_id,
    trim(p_owner_name),
    lower(trim(p_owner_email::text)),
    nullif(trim(p_owner_phone), ''),
    v_owner_role_id,
    v_branch.id,
    v_tenant.id,
    'active'
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    role_id = excluded.role_id,
    branch_id = excluded.branch_id,
    tenant_id = excluded.tenant_id,
    status = excluded.status,
    updated_at = now();

  insert into public.tenant_onboarding_progress (tenant_id, current_step, completed_steps, machine_skipped)
  values (v_tenant.id, 'gym_profile', '["gym_profile","main_branch"]'::jsonb, false)
  on conflict (tenant_id) do update
  set
    current_step = excluded.current_step,
    completed_steps = excluded.completed_steps,
    machine_skipped = false,
    updated_at = now();

  perform public.log_activity(
    v_actor,
    v_branch.id,
    'tenant_created',
    'tenant',
    v_tenant.id::text,
    'Tenant and owner provisioned by super admin',
    jsonb_build_object(
      'tenant_name', v_tenant.name,
      'tenant_slug', v_tenant.slug,
      'owner_user_id', p_user_id,
      'trial_start_date', v_trial_start,
      'trial_end_date', v_trial_end
    )
  );

  return jsonb_build_object(
    'tenant_id', v_tenant.id,
    'branch_id', v_branch.id,
    'owner_user_id', p_user_id,
    'trial_start_date', v_trial_start,
    'trial_end_date', v_trial_end,
    'tenant_slug', v_tenant.slug
  );
end;
$$;

commit;
