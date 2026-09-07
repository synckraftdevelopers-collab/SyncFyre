begin;

-- Restrict member and financial writes to roles that operate these records.
-- Reception staff are limited to their assigned branch; administrators and
-- managers may work across branches within their own tenant.

drop policy if exists members_mgmt_write on public.members;
drop policy if exists members_management_write on public.members;
drop policy if exists invoices_management_write on public.invoices;
drop policy if exists payments_management_write on public.payments;

create policy members_insert_authorized on public.members
for insert to authenticated
with check (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (
      public.app_role() in ('admin', 'manager')
      or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    )
  )
);

create policy members_update_authorized on public.members
for update to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (
      public.app_role() in ('admin', 'manager')
      or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    )
  )
)
with check (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (
      public.app_role() in ('admin', 'manager')
      or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    )
  )
);

create policy members_delete_admin_manager on public.members
for delete to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and public.app_role() in ('admin', 'manager')
  )
);

create policy invoices_insert_authorized on public.invoices
for insert to authenticated
with check (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (
      public.app_role() in ('admin', 'manager')
      or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    )
  )
);

create policy invoices_update_authorized on public.invoices
for update to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (
      public.app_role() in ('admin', 'manager')
      or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    )
  )
)
with check (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (
      public.app_role() in ('admin', 'manager')
      or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    )
  )
);

create policy invoices_delete_admin_manager on public.invoices
for delete to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and public.app_role() in ('admin', 'manager')
  )
);

create policy payments_insert_authorized on public.payments
for insert to authenticated
with check (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (
      public.app_role() in ('admin', 'manager')
      or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    )
  )
);

create policy payments_update_authorized on public.payments
for update to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (
      public.app_role() in ('admin', 'manager')
      or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    )
  )
)
with check (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (
      public.app_role() in ('admin', 'manager')
      or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    )
  )
);

create policy payments_delete_admin_manager on public.payments
for delete to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and public.app_role() in ('admin', 'manager')
  )
);

commit;
