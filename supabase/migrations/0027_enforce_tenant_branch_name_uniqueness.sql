-- Branch names may repeat across tenants, but a tenant must not have two branches
-- with the same normalized display name. This prevents duplicate dropdown entries
-- without merging or deleting existing business data.
do $$
begin
  if exists (
    select 1
    from public.branches
    where tenant_id is not null
    group by tenant_id, lower(btrim(name))
    having count(*) > 1
  ) then
    raise exception 'Cannot add branches tenant/name uniqueness: duplicate branch names exist within a tenant.';
  end if;
end $$;

create unique index if not exists branches_tenant_normalized_name_uidx
  on public.branches (tenant_id, lower(btrim(name)))
  where tenant_id is not null;