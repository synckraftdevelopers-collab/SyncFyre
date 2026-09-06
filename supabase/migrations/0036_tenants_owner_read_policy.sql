begin;

-- Keep tenant records private while allowing an authenticated user to read the
-- single tenant attached to their own user profile. The existing SuperAdmin
-- read policy remains in force as a separate permissive SELECT policy.
drop policy if exists tenants_tenant_read on public.tenants;
create policy tenants_tenant_read on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

commit;
