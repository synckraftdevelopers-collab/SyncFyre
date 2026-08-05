begin;

do $$
begin
  alter type public.payment_status add value if not exists 'cancelled';
exception
  when duplicate_object then null;
end $$;

alter table public.subscription_history
  add column if not exists previous_status public.subscription_status,
  add column if not exists new_status public.subscription_status,
  add column if not exists performed_at timestamptz not null default now(),
  add column if not exists remarks text;

alter table public.invoices
  add column if not exists balance_amount numeric(12,2) not null default 0,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_payment_status_check'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_payment_status_check
      check (payment_status in ('pending', 'partial', 'completed', 'refunded', 'cancelled', 'overpaid')) not valid;
  end if;
end $$;

alter table public.members
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

alter table public.membership_plans
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

alter table public.subscriptions
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

alter table public.trainers
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

alter table public.staff
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

alter table public.workouts
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

alter table public.diet_plans
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

alter table public.equipment
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

alter table public.face_machine_settings
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

alter table public.attendance_sync_logs
  add column if not exists exception_type text,
  add column if not exists resolution_status text not null default 'open',
  add column if not exists resolution_action text,
  add column if not exists resolved_by uuid references public.users(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_notes text,
  add column if not exists resolution_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_sync_logs_resolution_status_check'
      and conrelid = 'public.attendance_sync_logs'::regclass
  ) then
    alter table public.attendance_sync_logs
      add constraint attendance_sync_logs_resolution_status_check
      check (resolution_status in ('open', 'resolved', 'ignored')) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_sync_logs_exception_type_check'
      and conrelid = 'public.attendance_sync_logs'::regclass
  ) then
    alter table public.attendance_sync_logs
      add constraint attendance_sync_logs_exception_type_check
      check (
        exception_type is null
        or exception_type in ('unknown_face', 'duplicate_scan', 'machine_offline', 'member_not_found', 'sync_failed', 'clock_mismatch')
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_sync_logs_resolution_action_check'
      and conrelid = 'public.attendance_sync_logs'::regclass
  ) then
    alter table public.attendance_sync_logs
      add constraint attendance_sync_logs_resolution_action_check
      check (
        resolution_action is null
        or resolution_action in ('approve', 'merge', 'ignore', 'retry_sync', 'assign_member')
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'diet_plans_date_order_check'
      and conrelid = 'public.diet_plans'::regclass
  ) then
    alter table public.diet_plans
      add constraint diet_plans_date_order_check
      check (end_date is null or end_date >= start_date) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trainer_assignments_date_order_check'
      and conrelid = 'public.trainer_assignments'::regclass
  ) then
    alter table public.trainer_assignments
      add constraint trainer_assignments_date_order_check
      check (assigned_until is null or assigned_until >= assigned_from) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_amount_paid_total_check'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_amount_paid_total_check
      check (amount_paid >= 0 and amount_paid <= total_amount) not valid;
  end if;
end $$;

create index if not exists diet_plans_member_status_start_idx
  on public.diet_plans (member_id, status, start_date desc);

create index if not exists appointments_member_date_idx
  on public.appointments (member_id, appointment_date desc);

create index if not exists workouts_member_status_schedule_idx
  on public.workouts (member_id, status, scheduled_date desc);

create index if not exists notifications_member_created_idx
  on public.notifications (member_id, created_at desc)
  where member_id is not null;

create index if not exists equipment_maintenance_equipment_date_idx
  on public.equipment_maintenance (equipment_id, maintenance_date desc);

create index if not exists invoices_member_status_created_idx
  on public.invoices (member_id, status, created_at desc);

create index if not exists attendance_sync_logs_exception_idx
  on public.attendance_sync_logs (branch_id, resolution_status, synced_at desc)
  where status in ('duplicate', 'unmatched', 'error', 'rejected')
     or exception_type is not null;

update public.invoices
set balance_amount = greatest(total_amount - amount_paid, 0),
    payment_status = case
      when amount_paid = 0 then 'pending'
      when amount_paid < total_amount then 'partial'
      when amount_paid = total_amount then 'completed'
      else 'overpaid'
    end
where true;

update public.attendance_sync_logs
set exception_type = case
  when status = 'duplicate' then 'duplicate_scan'
  when status = 'unmatched' then 'member_not_found'
  when status = 'error' then 'sync_failed'
  when status = 'rejected' then 'unknown_face'
  else exception_type
end
where exception_type is null
  and status in ('duplicate', 'unmatched', 'error', 'rejected');

create or replace function public.log_activity(
  p_user_id uuid,
  p_branch_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_description text default null,
  p_changes jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path='public'
as $$
begin
  insert into public.activity_logs(user_id, branch_id, action, entity_type, entity_id, description, changes, created_at)
  values (p_user_id, p_branch_id, p_action, p_entity_type, p_entity_id, p_description, coalesce(p_changes, '{}'::jsonb), now());
end $$;

create or replace function public.sync_invoice_totals(p_invoice_id uuid)
returns void
language plpgsql
set search_path='public'
as $$
declare
  v_total numeric(12,2);
  v_amount_paid numeric(12,2);
  v_balance numeric(12,2);
  v_payment_status text;
begin
  if p_invoice_id is null then
    return;
  end if;

  select total_amount into v_total
  from public.invoices
  where id = p_invoice_id;

  if v_total is null then
    return;
  end if;

  select coalesce(sum(
    case
      when status in ('completed', 'refunded', 'partially_refunded') then amount - refund_amount
      else 0
    end
  ), 0)
  into v_amount_paid
  from public.payments
  where invoice_id = p_invoice_id;

  v_balance := v_total - v_amount_paid;

  v_payment_status := case
    when exists(select 1 from public.payments where invoice_id = p_invoice_id and status = 'cancelled') and v_amount_paid = 0 then 'cancelled'
    when v_amount_paid < 0 then 'refunded'
    when v_balance < 0 then 'overpaid'
    when v_amount_paid = 0 and exists(select 1 from public.payments where invoice_id = p_invoice_id and status in ('refunded', 'partially_refunded')) then 'refunded'
    when v_balance = 0 then 'completed'
    when v_amount_paid > 0 then 'partial'
    else 'pending'
  end;

  update public.invoices
  set amount_paid = greatest(v_amount_paid, 0),
      balance_amount = greatest(v_balance, 0),
      payment_status = v_payment_status,
      status = case
        when v_balance <= 0 and v_amount_paid > 0 then 'paid'
        when v_amount_paid > 0 then 'partial'
        else 'unpaid'
      end,
      updated_at = now()
  where id = p_invoice_id;
end $$;

create or replace function public.sync_invoice_totals_trigger()
returns trigger
language plpgsql
set search_path='public'
as $$
begin
  perform public.sync_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  if tg_op = 'UPDATE' and new.invoice_id is distinct from old.invoice_id then
    perform public.sync_invoice_totals(old.invoice_id);
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists payments_sync_invoice_totals on public.payments;
create trigger payments_sync_invoice_totals
after insert or update or delete on public.payments
for each row execute function public.sync_invoice_totals_trigger();

create or replace function public.create_subscription_with_history(
  p_member_id uuid,
  p_plan_id uuid,
  p_branch_id uuid,
  p_start_date date,
  p_end_date date default null,
  p_status public.subscription_status default 'pending',
  p_auto_renew boolean default false,
  p_price numeric default 0,
  p_discount_amount numeric default 0,
  p_gst_amount numeric default 0,
  p_total_amount numeric default 0,
  p_created_by uuid default null,
  p_action text default 'created',
  p_remarks text default null
) returns public.subscriptions
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_actor uuid;
begin
  v_actor := coalesce(p_created_by, auth.uid());

  insert into public.subscriptions(
    member_id, plan_id, branch_id, start_date, end_date, status, auto_renew,
    price, discount_amount, gst_amount, total_amount, created_by
  )
  values (
    p_member_id, p_plan_id, p_branch_id, p_start_date, p_end_date, p_status, p_auto_renew,
    p_price, p_discount_amount, p_gst_amount, p_total_amount, v_actor
  )
  returning * into v_subscription;

  insert into public.subscription_history(
    subscription_id, member_id, previous_end_date, new_start_date, new_end_date,
    action, notes, performed_by, previous_status, new_status, performed_at, remarks
  )
  values (
    v_subscription.id, v_subscription.member_id, null, v_subscription.start_date, v_subscription.end_date,
    p_action, p_remarks, v_actor, null, v_subscription.status, now(), p_remarks
  );

  perform public.log_activity(
    v_actor,
    v_subscription.branch_id,
    case when p_action = 'renewed' then 'membership_renewed' else 'membership_created' end,
    'subscription',
    v_subscription.id::text,
    'Membership lifecycle event',
    jsonb_build_object('action', p_action, 'member_id', v_subscription.member_id, 'status', v_subscription.status)
  );

  return v_subscription;
end $$;

create or replace function public.update_subscription_with_history(
  p_subscription_id uuid,
  p_plan_id uuid default null,
  p_start_date date default null,
  p_end_date date default null,
  p_status public.subscription_status default null,
  p_auto_renew boolean default null,
  p_price numeric default null,
  p_discount_amount numeric default null,
  p_gst_amount numeric default null,
  p_total_amount numeric default null,
  p_performed_by uuid default null,
  p_action text default null,
  p_remarks text default null,
  p_deleted_at timestamptz default null,
  p_deleted_by uuid default null
) returns public.subscriptions
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_before public.subscriptions%rowtype;
  v_after public.subscriptions%rowtype;
  v_actor uuid;
  v_action text;
begin
  select * into v_before
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Subscription not found';
  end if;

  v_actor := coalesce(p_performed_by, auth.uid(), p_deleted_by);

  update public.subscriptions
  set plan_id = coalesce(p_plan_id, plan_id),
      start_date = coalesce(p_start_date, start_date),
      end_date = coalesce(p_end_date, end_date),
      status = coalesce(p_status, status),
      auto_renew = coalesce(p_auto_renew, auto_renew),
      price = coalesce(p_price, price),
      discount_amount = coalesce(p_discount_amount, discount_amount),
      gst_amount = coalesce(p_gst_amount, gst_amount),
      total_amount = coalesce(p_total_amount, total_amount),
      deleted_at = coalesce(p_deleted_at, deleted_at),
      deleted_by = coalesce(p_deleted_by, deleted_by),
      updated_at = now()
  where id = p_subscription_id
  returning * into v_after;

  v_action := coalesce(
    p_action,
    case
      when v_before.status <> 'paused' and v_after.status = 'paused' then 'paused'
      when v_before.status = 'paused' and v_after.status = 'active' then 'resumed'
      when v_after.status = 'cancelled' and v_before.status <> 'cancelled' then 'cancelled'
      when v_after.status = 'expired' and v_before.status <> 'expired' then 'expired'
      when v_after.end_date > v_before.end_date then 'extended'
      else 'updated'
    end
  );

  insert into public.subscription_history(
    subscription_id, member_id, previous_end_date, new_start_date, new_end_date,
    action, notes, performed_by, previous_status, new_status, performed_at, remarks
  )
  values (
    v_after.id, v_after.member_id, v_before.end_date, v_after.start_date, v_after.end_date,
    v_action, p_remarks, v_actor, v_before.status, v_after.status, now(), p_remarks
  );

  perform public.log_activity(
    v_actor,
    v_after.branch_id,
    'membership_' || v_action,
    'subscription',
    v_after.id::text,
    'Membership lifecycle event',
    jsonb_build_object(
      'action', v_action,
      'member_id', v_after.member_id,
      'previous_status', v_before.status,
      'new_status', v_after.status
    )
  );

  return v_after;
end $$;

create policy sync_logs_staff_manage on public.attendance_sync_logs
for update to authenticated
using (public.app_role() = 'admin' or (is_staff_user() and branch_id = current_branch_id()))
with check (public.app_role() = 'admin' or (is_staff_user() and branch_id = current_branch_id()));

commit;
