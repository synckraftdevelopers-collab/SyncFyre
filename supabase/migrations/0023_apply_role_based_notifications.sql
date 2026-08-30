-- 0023_apply_role_based_notifications.sql
-- QA-only, idempotent business notification hardening.
-- Notification rows may only represent real database events or controlled server reminders.
begin;

alter table public.notifications add column if not exists target_roles text[] not null default '{}'::text[];
alter table public.notifications add column if not exists updated_at timestamptz not null default now();
alter table public.notifications enable row level security;

-- Recover tenant scope from the authoritative branch for legacy branch rows.
update public.notifications n
set tenant_id = b.tenant_id
from public.branches b
where n.branch_id = b.id and n.tenant_id is null;

-- This list is deliberately narrow: legacy greetings, calls, generic announcements,
-- and any unknown type are not business notifications and are removed in QA.
delete from public.notifications
where type not in (
  'member_created', 'membership_created', 'membership_renewed',
  'membership_expired', 'membership_expiring_today',
  'membership_expiry_reminder', 'membership_renewal_reminder',
  'pending_balance', 'payment_pending', 'payment_received', 'payment_failed',
  'machine_connected', 'machine_disconnected', 'tenant_registered'
);

-- Every surviving branch event has explicit staff recipients; platform records are
-- super-admin only. The legacy UI-only greeting records were deleted above.
update public.notifications
set target_roles = case
  when tenant_id is null and type = 'tenant_registered' then array['super_admin']::text[]
  when user_id is not null and member_id is not null then array['owner','admin','manager','reception','member']::text[]
  else array['owner','admin','manager','reception']::text[]
end
where cardinality(target_roles) = 0;

-- A malformed non-platform row without a tenant cannot be safely isolated.
delete from public.notifications
where tenant_id is null and type <> 'tenant_registered';

alter table public.notifications drop constraint if exists notifications_business_type_check;
alter table public.notifications add constraint notifications_business_type_check check (
  type = any (array[
    'member_created', 'membership_created', 'membership_renewed',
    'membership_expired', 'membership_expiring_today',
    'membership_expiry_reminder', 'membership_renewal_reminder',
    'pending_balance', 'payment_pending', 'payment_received', 'payment_failed',
    'machine_connected', 'machine_disconnected', 'tenant_registered'
  ]::text[])
);
alter table public.notifications drop constraint if exists notifications_target_roles_not_empty;
alter table public.notifications add constraint notifications_target_roles_not_empty check (cardinality(target_roles) > 0);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

create index if not exists notifications_branch_unread_idx
  on public.notifications (tenant_id, branch_id, created_at desc) where read_at is null;
create index if not exists notifications_user_unread_idx
  on public.notifications (tenant_id, user_id, created_at desc) where read_at is null;
create index if not exists notifications_updated_at_idx
  on public.notifications (tenant_id, updated_at desc);
create unique index if not exists notifications_metadata_fingerprint_uidx
  on public.notifications ((metadata->>'fingerprint')) where metadata ? 'fingerprint';

create or replace function public.notification_role_is_allowed(p_roles text[])
returns boolean language sql stable set search_path = public as $$
  select coalesce(cardinality(p_roles) > 0 and public.app_role() = any(p_roles), false)
$$;

-- Browser clients may read only their own user notification or an authorized
-- branch notification. There is intentionally no direct INSERT/UPDATE policy.
drop policy if exists notifications_read on public.notifications;
drop policy if exists notifications_update on public.notifications;
drop policy if exists notifications_delete on public.notifications;
drop policy if exists notifications_manage on public.notifications;
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_read_own on public.notifications;
drop policy if exists notifications_read_branch on public.notifications;

create policy notifications_read on public.notifications for select to authenticated using (
  (user_id = auth.uid() and tenant_id = public.current_tenant_id())
  or (branch_id = public.current_branch_id() and tenant_id = public.current_tenant_id()
      and public.notification_role_is_allowed(target_roles))
  or (public.is_super_admin() and tenant_id is null
      and public.notification_role_is_allowed(target_roles))
);

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_updated boolean := false;
begin
  update public.notifications set read_at = now(), updated_at = now()
  where id = p_notification_id and (
    (user_id = auth.uid() and tenant_id = public.current_tenant_id())
    or (branch_id = public.current_branch_id() and tenant_id = public.current_tenant_id()
        and public.notification_role_is_allowed(target_roles))
    or (public.is_super_admin() and tenant_id is null
        and public.notification_role_is_allowed(target_roles))
  ) returning true into v_updated;
  return coalesce(v_updated, false);
end $$;

-- This function is trigger/server-only. It validates the branch's tenant,
-- recipient roles, and non-empty event payload before inserting an idempotent row.
create or replace function public.queue_branch_notification(
  p_branch_id uuid, p_tenant_id uuid, p_type text, p_title text, p_message text,
  p_entity_type text, p_entity_id uuid, p_roles text[], p_member_id uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_branch_tenant uuid;
  v_allowed_roles constant text[] := array['owner','admin','manager','reception','trainer','dietician','diet-planner','diet_planner','member'];
begin
  select tenant_id into v_branch_tenant from public.branches where id = p_branch_id;
  if v_branch_tenant is null or v_branch_tenant is distinct from p_tenant_id then
    raise exception 'Notification branch does not belong to the supplied tenant';
  end if;
  if p_entity_id is null or p_roles is null or cardinality(p_roles) = 0 or not (p_roles <@ v_allowed_roles) then
    raise exception 'Notification payload or target roles are invalid';
  end if;
  if p_type not in ('member_created','membership_created','membership_renewed','membership_expired','payment_pending','payment_received','payment_failed','machine_connected','machine_disconnected')
     or length(trim(coalesce(p_title, ''))) < 2 or length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Notification type or payload is invalid';
  end if;
  insert into public.notifications (branch_id, tenant_id, member_id, type, title, message, target_roles, metadata, scheduled_for)
  values (p_branch_id, p_tenant_id, p_member_id, p_type, p_title, p_message, p_roles,
    jsonb_build_object('fingerprint', p_type || ':' || p_entity_id::text, 'entity_type', p_entity_type, 'entity_id', p_entity_id), now())
  on conflict do nothing;
end $$;

create or replace function public.notify_member_created() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.queue_branch_notification(new.branch_id, new.tenant_id, 'member_created', 'New member registration', 'A new member registration was received.', 'member', new.id, array['owner','admin','manager','reception'], new.id);
  return new;
end $$;

create or replace function public.notify_subscription_history_created() returns trigger language plpgsql security definer set search_path = public as $$
declare v_sub public.subscriptions%rowtype;
begin
  select * into v_sub from public.subscriptions where id = new.subscription_id;
  if new.action in ('created','renewed','expired') then
    perform public.queue_branch_notification(v_sub.branch_id, v_sub.tenant_id,
      case new.action when 'renewed' then 'membership_renewed' when 'expired' then 'membership_expired' else 'membership_created' end,
      case new.action when 'renewed' then 'Membership renewal completed' when 'expired' then 'Membership expired' else 'Membership created' end,
      case new.action when 'renewed' then 'A membership renewal was completed.' when 'expired' then 'A membership has expired. Renewal is required.' else 'A membership was created.' end,
      'subscription', v_sub.id, array['owner','admin','manager','reception'], v_sub.member_id);
  end if;
  return new;
end $$;

create or replace function public.notify_payment_status() returns trigger language plpgsql security definer set search_path = public as $$
declare v_type text; v_title text; v_message text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  v_type := case new.status when 'pending' then 'payment_pending' when 'completed' then 'payment_received' when 'failed' then 'payment_failed' else null end;
  if v_type is not null then
    v_title := case v_type when 'payment_pending' then 'Payment pending' when 'payment_received' then 'Payment received' else 'Payment failed' end;
    v_message := case v_type when 'payment_pending' then 'A payment is pending.' when 'payment_received' then 'A payment was received.' else 'A payment failed.' end;
    perform public.queue_branch_notification(new.branch_id, new.tenant_id, v_type, v_title, v_message, 'payment', new.id, array['owner','admin','manager','reception'], new.member_id);
  end if;
  return new;
end $$;

create or replace function public.notify_machine_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.connection_status is distinct from old.connection_status then
    perform public.queue_branch_notification(new.branch_id, new.tenant_id,
      case when new.connection_status = 'online' then 'machine_connected' else 'machine_disconnected' end,
      case when new.connection_status = 'online' then 'Machine connected' else 'Machine connection alert' end,
      case when new.connection_status = 'online' then 'A biometric machine connected successfully.' else 'A biometric machine connection requires attention.' end,
      'machine', new.id, array['owner','admin','manager']);
  end if;
  return new;
end $$;

create or replace function public.notify_tenant_created() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (tenant_id, type, title, message, target_roles, metadata, scheduled_for)
  values (null, 'tenant_registered', 'New gym registration', 'A new gym registration was received.', array['super_admin'],
    jsonb_build_object('fingerprint', 'tenant_registered:' || new.id::text, 'entity_type', 'tenant', 'entity_id', new.id), now()) on conflict do nothing;
  return new;
end $$;

drop trigger if exists notifications_member_created on public.members;
create trigger notifications_member_created after insert on public.members for each row execute function public.notify_member_created();
drop trigger if exists notifications_subscription_history_created on public.subscription_history;
create trigger notifications_subscription_history_created after insert on public.subscription_history for each row execute function public.notify_subscription_history_created();
drop trigger if exists notifications_payment_created on public.payments;
drop trigger if exists notifications_payment_status on public.payments;
create trigger notifications_payment_status after insert or update of status on public.payments for each row execute function public.notify_payment_status();
drop trigger if exists notifications_machine_status on public.face_machine_settings;
create trigger notifications_machine_status after insert or update of connection_status on public.face_machine_settings for each row execute function public.notify_machine_status();
drop trigger if exists notifications_tenant_created on public.tenants;
create trigger notifications_tenant_created after insert on public.tenants for each row execute function public.notify_tenant_created();

revoke all on function public.notification_role_is_allowed(text[]) from public;
grant execute on function public.notification_role_is_allowed(text[]) to authenticated;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;
revoke all on function public.queue_branch_notification(uuid, uuid, text, text, text, text, uuid, text[], uuid) from public;
revoke all on function public.notify_member_created() from public;
revoke all on function public.notify_subscription_history_created() from public;
revoke all on function public.notify_payment_status() from public;
revoke all on function public.notify_machine_status() from public;
revoke all on function public.notify_tenant_created() from public;

alter table public.notifications replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;