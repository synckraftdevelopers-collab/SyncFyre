begin;

alter table public.tenants
  add column if not exists tenant_type text not null default 'customer',
  add column if not exists purpose text,
  add column if not exists is_demo boolean not null default false,
  add column if not exists is_protected boolean not null default false;

update public.tenants
set
  tenant_type = case when coalesce(is_demo, false) then 'demo' else coalesce(nullif(tenant_type, ''), 'customer') end,
  purpose = case when coalesce(is_demo, false) and coalesce(nullif(purpose, ''), '') = '' then 'CLIENT DEMONSTRATION' else purpose end,
  is_demo = coalesce(is_demo, false),
  is_protected = coalesce(is_protected, false)
where true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_tenant_type_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_tenant_type_check
      check (tenant_type in ('customer', 'demo'));
  end if;
end $$;

create index if not exists tenants_tenant_type_status_idx
  on public.tenants (tenant_type, status);

commit;
