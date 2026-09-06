-- Run only in the dedicated non-production QA Supabase project.
-- Before running this script, create the Auth users listed in two-branch-role-qa.md.
-- Set v_tenant_slug to the QA tenant that should own both test branches.

begin;

do $$
declare
  v_tenant_slug constant text := 'replace-with-qa-tenant-slug';
  v_tenant_id uuid;
  v_branch_a_id uuid;
  v_branch_b_id uuid;
begin
  select id into v_tenant_id
  from public.tenants
  where slug = v_tenant_slug;

  if v_tenant_id is null then
    raise exception 'QA tenant with slug % was not found', v_tenant_slug;
  end if;

  insert into public.branches (name, code, city, state, timezone, tenant_id, status)
  values ('QA Branch A', 'QA-A', 'Bengaluru', 'Karnataka', 'Asia/Kolkata', v_tenant_id, 'active')
  on conflict (code) do update
    set name = excluded.name,
        city = excluded.city,
        state = excluded.state,
        timezone = excluded.timezone,
        tenant_id = excluded.tenant_id,
        status = excluded.status
  returning id into v_branch_a_id;

  insert into public.branches (name, code, city, state, timezone, tenant_id, status)
  values ('QA Branch B', 'QA-B', 'Bengaluru', 'Karnataka', 'Asia/Kolkata', v_tenant_id, 'active')
  on conflict (code) do update
    set name = excluded.name,
        city = excluded.city,
        state = excluded.state,
        timezone = excluded.timezone,
        tenant_id = excluded.tenant_id,
        status = excluded.status
  returning id into v_branch_b_id;

  update public.users
  set role_id = (select id from public.roles where slug = 'admin'), branch_id = v_branch_a_id, tenant_id = v_tenant_id, status = 'active'
  where email = 'qa.admin@syncfyre.test';
  if not found then raise exception 'Auth user qa.admin@syncfyre.test is missing'; end if;

  update public.users
  set role_id = (select id from public.roles where slug = 'reception'), branch_id = v_branch_a_id, tenant_id = v_tenant_id, status = 'active'
  where email = 'qa.reception.a@syncfyre.test';
  if not found then raise exception 'Auth user qa.reception.a@syncfyre.test is missing'; end if;

  update public.users
  set role_id = (select id from public.roles where slug = 'reception'), branch_id = v_branch_b_id, tenant_id = v_tenant_id, status = 'active'
  where email = 'qa.reception.b@syncfyre.test';
  if not found then raise exception 'Auth user qa.reception.b@syncfyre.test is missing'; end if;

  update public.users
  set role_id = (select id from public.roles where slug = 'trainer'), branch_id = v_branch_a_id, tenant_id = v_tenant_id, status = 'active'
  where email = 'qa.trainer.a@syncfyre.test';
  if not found then raise exception 'Auth user qa.trainer.a@syncfyre.test is missing'; end if;

  update public.users
  set role_id = (select id from public.roles where slug = 'trainer'), branch_id = v_branch_b_id, tenant_id = v_tenant_id, status = 'active'
  where email = 'qa.trainer.b@syncfyre.test';
  if not found then raise exception 'Auth user qa.trainer.b@syncfyre.test is missing'; end if;
end $$;

commit;