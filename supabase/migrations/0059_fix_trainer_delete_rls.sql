-- 0059_fix_trainer_delete_rls.sql
--
-- Problem: the trainers_management_write policy (from 0042) only allows:
--   - app_role() = 'admin' → full access (no branch restriction)
--   - is_management() AND branch_id = current_branch_id() → branch-locked
--
-- This means 'owner' role (who is management but not 'admin') cannot delete
-- trainers in other branches even though owners manage the whole organization.
-- Same gap exists on staff table.
--
-- Fix: extend the unrestricted path to include 'owner' and 'admin' roles.
-- Managers remain branch-scoped (branch_id = current_branch_id()).
--
-- Talwalkar Safety: policy still scopes to tenant via users.branch_id chain.
-- No cross-tenant access is introduced.

-- Drop and recreate trainers write policy
drop policy if exists trainers_management_write on public.trainers;

create policy trainers_management_write on public.trainers
  for all to authenticated
  using (
    -- Owner and admin: full tenant-wide access (no branch restriction)
    public.app_role() in ('owner', 'admin')
    -- Manager: branch-scoped access only
    or (public.app_role() = 'manager' and branch_id = public.current_branch_id())
  )
  with check (
    public.app_role() in ('owner', 'admin')
    or (public.app_role() = 'manager' and branch_id = public.current_branch_id())
  );

-- Apply the same fix to staff table (same pattern, same bug)
drop policy if exists staff_management_write on public.staff;

create policy staff_management_write on public.staff
  for all to authenticated
  using (
    public.app_role() in ('owner', 'admin')
    or (public.app_role() = 'manager' and branch_id = public.current_branch_id())
  )
  with check (
    public.app_role() in ('owner', 'admin')
    or (public.app_role() = 'manager' and branch_id = public.current_branch_id())
  );
