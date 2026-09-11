-- dev-task-split.md Phase 1 (Shradha): #5 tighten overly broad is_staff_user()
-- write policies on staff/trainers/appointments/workouts/diet_plans, and #7
-- scope Storage read/write policies for progress-photos and receipts by
-- tenant instead of leaving them open to any authenticated staff user
-- anywhere in the Supabase project.
--
-- Forward-only. Does not edit any existing migration file (0001-0039 stay
-- untouched per DEMO_PHASE2_TASK_SPLIT.md's baseline rule). Reviewed for:
--   - RLS-only change, no schema/data change, nothing to roll back beyond
--     re-running the previous policy definitions if ever needed.
--   - No effect on members/payments/invoices (Aastha's Phase 1 scope) or on
--     membership_plans/subscriptions/equipment (unchanged, out of this pass).
--   - No effect on the member-photos bucket, which is intentionally public
--     (see 0015_member_photos_public.sql) and keeps its existing policies.
--   - progress-photos and receipts currently have zero upload/read call
--     sites anywhere in the app (verified against app/, components/,
--     services/, lib/) — tightening them cannot break any existing feature.

begin;

-- =====================================================================
-- Part 1: staff / trainers / appointments / workouts / diet_plans writes
-- =====================================================================
-- Original policy (0001_initial_schema.sql, the generic per-table loop):
--   create policy <table>_management_write on public.<table> for all
--   to authenticated using (admin OR (is_staff_user() AND branch match))
--   with check (same)
-- is_staff_user() = admin, manager, reception, trainer OR dietician — so,
-- for example, any trainer's own authenticated session could previously
-- insert/update/delete another trainer's HR record, another provider's
-- appointment, or another trainer's workout/diet plan for a member they
-- don't own. The read policies (<table>_staff_read, unaffected by this
-- migration) already correctly allow any branch staff member to view.

drop policy if exists staff_management_write on public.staff;
drop policy if exists trainers_management_write on public.trainers;
drop policy if exists appointments_management_write on public.appointments;
drop policy if exists workouts_management_write on public.workouts;
drop policy if exists diet_plans_management_write on public.diet_plans;

-- staff: HR/payroll data (salary, employee_code). Admin/manager only.
create policy staff_management_write on public.staff for all to authenticated
  using (public.app_role() = 'admin' or (public.is_management() and branch_id = public.current_branch_id()))
  with check (public.app_role() = 'admin' or (public.is_management() and branch_id = public.current_branch_id()));

-- trainers: profile/HR record. Admin/manager only (no self-service edit
-- exists in the app today, so no self-update carve-out is needed).
create policy trainers_management_write on public.trainers for all to authenticated
  using (public.app_role() = 'admin' or (public.is_management() and branch_id = public.current_branch_id()))
  with check (public.app_role() = 'admin' or (public.is_management() and branch_id = public.current_branch_id()));

-- appointments: admin/manager and reception keep full branch access
-- (reception books/manages appointments for any member/provider). A
-- trainer or dietician may only touch appointments where THEY are the
-- assigned provider — matches how the trainer portal already scopes
-- appointments in its own queries, now enforced at the database too.
create policy appointments_management_write on public.appointments for all to authenticated
  using (
    public.app_role() = 'admin'
    or (public.is_management() and branch_id = public.current_branch_id())
    or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    or (
      public.app_role() in ('trainer', 'dietician')
      and branch_id = public.current_branch_id()
      and provider_staff_id in (select staff_id from public.trainers where user_id = auth.uid() and staff_id is not null)
    )
  )
  with check (
    public.app_role() = 'admin'
    or (public.is_management() and branch_id = public.current_branch_id())
    or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    or (
      public.app_role() in ('trainer', 'dietician')
      and branch_id = public.current_branch_id()
      and provider_staff_id in (select staff_id from public.trainers where user_id = auth.uid() and staff_id is not null)
    )
  );

-- workouts: admin/manager/reception keep full branch access (the admin
-- console lets reception create/manage workouts too). A trainer may only
-- touch workouts assigned to their own trainer record.
create policy workouts_management_write on public.workouts for all to authenticated
  using (
    public.app_role() = 'admin'
    or (public.is_management() and branch_id = public.current_branch_id())
    or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    or (
      public.app_role() in ('trainer', 'dietician')
      and branch_id = public.current_branch_id()
      and trainer_id in (select id from public.trainers where user_id = auth.uid())
    )
  )
  with check (
    public.app_role() = 'admin'
    or (public.is_management() and branch_id = public.current_branch_id())
    or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    or (
      public.app_role() in ('trainer', 'dietician')
      and branch_id = public.current_branch_id()
      and trainer_id in (select id from public.trainers where user_id = auth.uid())
    )
  );

-- diet_plans: same shape as workouts, scoped by staff_id (diet_plans
-- links to the trainer's linked staff record rather than trainers.id).
create policy diet_plans_management_write on public.diet_plans for all to authenticated
  using (
    public.app_role() = 'admin'
    or (public.is_management() and branch_id = public.current_branch_id())
    or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    or (
      public.app_role() in ('trainer', 'dietician')
      and branch_id = public.current_branch_id()
      and staff_id in (select staff_id from public.trainers where user_id = auth.uid() and staff_id is not null)
    )
  )
  with check (
    public.app_role() = 'admin'
    or (public.is_management() and branch_id = public.current_branch_id())
    or (public.app_role() = 'reception' and branch_id = public.current_branch_id())
    or (
      public.app_role() in ('trainer', 'dietician')
      and branch_id = public.current_branch_id()
      and staff_id in (select staff_id from public.trainers where user_id = auth.uid() and staff_id is not null)
    )
  );

-- =====================================================================
-- Part 2: Storage — scope progress-photos and receipts by tenant
-- =====================================================================
-- Original policies (0001_initial_schema.sql) covered all three buckets
-- together with no tenant/branch scoping at all:
--   storage_authenticated_read: any authenticated user, any tenant, can
--     SELECT any object in member-photos/progress-photos/receipts.
--   storage_staff_write / storage_staff_update: any staff user, any
--     tenant, can INSERT/UPDATE any object in those same buckets.
-- Since 0009_multi_tenancy.sql this Supabase project hosts multiple gym
-- tenants, so this was a real cross-tenant read/write path for
-- progress-photos and receipts. member-photos is deliberately public
-- (0015_member_photos_public.sql) and keeps equivalent unscoped policies
-- for its authenticated-SDK path (public reads bypass RLS entirely via
-- the public URL, so this only affects authenticated upload/list calls).

drop policy if exists storage_authenticated_read on storage.objects;
drop policy if exists storage_staff_write on storage.objects;
drop policy if exists storage_staff_update on storage.objects;

drop policy if exists tenant_scoped_photos_receipts_read   on storage.objects;
drop policy if exists tenant_scoped_photos_receipts_write  on storage.objects;
drop policy if exists tenant_scoped_photos_receipts_update on storage.objects;

create policy storage_authenticated_read on storage.objects for select to authenticated
  using (bucket_id = 'member-photos');
create policy storage_staff_write on storage.objects for insert to authenticated
  with check (bucket_id = 'member-photos' and public.is_staff_user());
create policy storage_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'member-photos' and public.is_staff_user());

-- progress-photos / receipts: require the object's first path segment to
-- be the uploader's tenant id (same convention as member-documents in
-- 0034_member_notes_documents.sql), so whenever upload code is added for
-- these buckets it must key objects as `${tenantId}/...`. Any tenant user
-- may read (members can view their own progress photos/receipts); only
-- staff may write.
drop policy if exists tenant_scoped_photos_receipts_read   on storage.objects;
drop policy if exists tenant_scoped_photos_receipts_write  on storage.objects;
drop policy if exists tenant_scoped_photos_receipts_update on storage.objects;
create policy tenant_scoped_photos_receipts_read on storage.objects for select to authenticated
  using (
    bucket_id in ('progress-photos', 'receipts')
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
create policy tenant_scoped_photos_receipts_write on storage.objects for insert to authenticated
  with check (
    bucket_id in ('progress-photos', 'receipts')
    and public.is_staff_user()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
create policy tenant_scoped_photos_receipts_update on storage.objects for update to authenticated
  using (
    bucket_id in ('progress-photos', 'receipts')
    and public.is_staff_user()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

commit;
