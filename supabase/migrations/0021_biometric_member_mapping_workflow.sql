begin;

create table if not exists public.biometric_member_mapping (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  machine_user_id text not null,
  machine_name text,
  match_status text not null default 'pending_registration',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists biometric_member_mapping_member_id_key
  on public.biometric_member_mapping (member_id);

create unique index if not exists biometric_member_mapping_machine_user_id_key
  on public.biometric_member_mapping (machine_user_id)
  where btrim(machine_user_id) <> '';

do $$
declare
  v_next bigint;
begin
  select greatest(
    coalesce(max(machine_value), 0) + 1,
    1
  )
  into v_next
  from (
    select case
      when machine_user_id ~ '^[0-9]+$' then machine_user_id::bigint
      else null
    end as machine_value
    from public.members
    union all
    select case
      when machine_user_id ~ '^[0-9]+$' then machine_user_id::bigint
      else null
    end as machine_value
    from public.biometric_member_mapping
  ) numeric_ids;

  if not exists (
    select 1
    from pg_class
    where relkind = 'S'
      and relnamespace = 'public'::regnamespace
      and relname = 'biometric_machine_user_id_seq'
  ) then
    execute format('create sequence public.biometric_machine_user_id_seq start with %s', v_next);
  else
    perform setval('public.biometric_machine_user_id_seq', greatest(v_next - 1, 1), true);
  end if;
end $$;

create or replace function public.next_machine_user_id()
returns text
language sql
security definer
set search_path = public
as $$
  select nextval('public.biometric_machine_user_id_seq')::text
$$;

create or replace function public.assign_biometric_mapping(
  p_member_id uuid,
  p_machine_user_id text,
  p_machine_name text default null,
  p_match_status text default 'verified',
  p_verified boolean default true,
  p_allow_reassign boolean default false
)
returns public.biometric_member_mapping
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members%rowtype;
  v_existing_member_id uuid;
  v_mapping public.biometric_member_mapping%rowtype;
  v_machine_user_id text;
begin
  v_machine_user_id := btrim(coalesce(p_machine_user_id, ''));
  if v_machine_user_id = '' then
    raise exception 'Machine User ID is required.';
  end if;

  select *
  into v_member
  from public.members
  where id = p_member_id
  for update;

  if not found then
    raise exception 'Member not found.';
  end if;

  select id
  into v_existing_member_id
  from public.members
  where machine_user_id = v_machine_user_id
    and id <> p_member_id
    and status = 'active'
  limit 1;

  if v_existing_member_id is not null and not p_allow_reassign then
    raise exception 'Machine User ID % is already assigned to another active member.', v_machine_user_id;
  end if;

  select member_id
  into v_existing_member_id
  from public.biometric_member_mapping
  where machine_user_id = v_machine_user_id
    and member_id <> p_member_id
  limit 1;

  if v_existing_member_id is not null and not p_allow_reassign then
    raise exception 'Machine User ID % is already mapped to another member.', v_machine_user_id;
  end if;

  update public.members
  set machine_user_id = v_machine_user_id,
      updated_at = now()
  where id = p_member_id;

  insert into public.biometric_member_mapping (
    member_id,
    machine_user_id,
    machine_name,
    match_status,
    verified
  )
  values (
    p_member_id,
    v_machine_user_id,
    nullif(btrim(coalesce(p_machine_name, '')), ''),
    coalesce(nullif(btrim(coalesce(p_match_status, '')), ''), 'verified'),
    coalesce(p_verified, true)
  )
  on conflict (member_id) do update
  set machine_user_id = excluded.machine_user_id,
      machine_name = coalesce(excluded.machine_name, public.biometric_member_mapping.machine_name),
      match_status = excluded.match_status,
      verified = excluded.verified
  returning * into v_mapping;

  return v_mapping;
end $$;

create or replace function public.generate_member_machine_user_id(
  p_member_id uuid,
  p_machine_name text default null,
  p_match_status text default 'pending_registration',
  p_verified boolean default false
)
returns public.biometric_member_mapping
language plpgsql
security definer
set search_path = public
as $$
declare
  v_machine_user_id text;
begin
  select public.next_machine_user_id() into v_machine_user_id;
  return public.assign_biometric_mapping(
    p_member_id,
    v_machine_user_id,
    p_machine_name,
    p_match_status,
    p_verified,
    false
  );
end $$;

create or replace view public.member_machine_mappings as
select
  bmm.id,
  m.branch_id,
  bmm.member_id,
  bmm.machine_user_id as matched_machine_user_id,
  m.machine_user_id as existing_machine_user_id,
  bmm.machine_name,
  bmm.match_status as match_type,
  bmm.verified as is_confident_match,
  m.full_name as member_name,
  bmm.created_at
from public.biometric_member_mapping bmm
join public.members m on m.id = bmm.member_id;

commit;
