begin;

alter table public.notifications add column if not exists target_roles text[] not null default '{}'::text[];

-- Do not apply role policies until legacy rows have both a deterministic tenant
-- and explicit recipients. Platform rows are the sole approved tenant-null case.
do $
begin
  if exists (select 1 from public.notifications where tenant_id is null and target_roles is distinct from array['super_admin']::text[]) then
    raise exception 'notifications contains legacy tenant_id NULL rows. Backfill and verify them in QA before applying 0022_role_based_notifications.';
  end if;
  if exists (select 1 from public.notifications where cardinality(target_roles) = 0) then
    raise exception 'notifications contains rows without explicit target_roles. Classify and verify them in QA before applying 0022_role_based_notifications.';
  end if;
end $;
create index if not exists notifications_branch_unread_idx on public.notifications (tenant_id, branch_id, created_at desc) where read_at is null;

create or replace function public.notification_role_is_allowed(p_roles text[])
returns boolean language sql stable set search_path = public as $$
  select coalesce(cardinality(p_roles) > 0 and public.app_role() = any(p_roles), false)
$$;

-- RLS may read rows, but no client receives direct UPDATE permission. Read state
-- changes only through mark_notification_read(), which validates the caller.
drop policy if exists notifications_read on public.notifications;
drop policy if exists notifications_update on public.notifications;
drop policy if exists notifications_delete on public.notifications;
drop policy if exists notifications_manage on public.notifications;
drop policy if exists notifications_insert on public.notifications;

create policy notifications_read on public.notifications for select to authenticated using (
  (user_id = auth.uid() and tenant_id = public.current_tenant_id())
  or (branch_id = public.current_branch_id() and tenant_id = public.current_tenant_id() and public.notification_role_is_allowed(target_roles))
  or (public.is_super_admin() and tenant_id is null and public.notification_role_is_allowed(target_roles))
);

create policy notifications_insert on public.notifications for insert to authenticated with check (
  branch_id = public.current_branch_id()
  and tenant_id = public.current_tenant_id()
  and public.app_role() in ('owner', 'admin', 'manager')
  and public.notification_role_is_allowed(target_roles)
);

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_updated boolean := false;
begin
  update public.notifications
  set read_at = now()
  where id = p_notification_id
    and (
      (user_id = auth.uid() and tenant_id = public.current_tenant_id())
      or (branch_id = public.current_branch_id() and tenant_id = public.current_tenant_id() and public.notification_role_is_allowed(target_roles))
      or (public.is_super_admin() and tenant_id is null and public.notification_role_is_allowed(target_roles))
    )
  returning true into v_updated;
  return coalesce(v_updated, false);
end $$;

create or replace function public.queue_branch_notification(
  p_branch_id uuid,
  p_tenant_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text,
  p_entity_id uuid,
  p_roles text[],
  p_member_id uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_branch_tenant uuid;
  v_allowed_roles constant text[] := array['owner', 'admin', 'manager', 'reception', 'trainer', 'dietician', 'diet-planner', 'diet_planner', 'member'];
begin
  select tenant_id into v_branch_tenant from public.branches where id = p_branch_id;
  if v_branch_tenant is null or v_branch_tenant is distinct from p_tenant_id then
    raise exception 'Notification branch does not belong to the supplied tenant';
  end if;
  if p_roles is null or cardinality(p_roles) = 0 or not (p_roles <@ v_allowed_roles) then
    raise exception 'Notification target roles are invalid';
  end if;
  if length(trim(coalesce(p_type, ''))) < 2 or length(trim(coalesce(p_title, ''))) < 2 or length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Notification payload is invalid';
  end if;

  insert into public.notifications (branch_id, tenant_id, member_id, type, title, message, target_roles, metadata, scheduled_for)
  values (p_branch_id, p_tenant_id, p_member_id, p_type, p_title, p_message, p_roles, jsonb_build_object('fingerprint', p_type || ':' || p_entity_id::text, 'entity_type', p_entity_type, 'entity_id', p_entity_id), now())
  on conflict do nothing;
end $$;

create or replace function public.notify_member_created() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.queue_branch_notification(new.branch_id, new.tenant_id, 'member_created', 'New member registration', 'New member registration received.', 'member', new.id, array['owner','admin','manager','reception'], new.id); return new; end $$;
create or replace function public.notify_subscription_history_created() returns trigger language plpgsql security definer set search_path = public as $$
declare v_subscription public.subscriptions%rowtype;
begin
  select * into v_subscription from public.subscriptions where id = new.subscription_id;
  if new.action in ('created','renewed','expired') then
    perform public.queue_branch_notification(v_subscription.branch_id, v_subscription.tenant_id, case when new.action = 'renewed' then 'membership_renewed' when new.action = 'expired' then 'membership_expired' else 'membership_created' end, case when new.action = 'renewed' then 'Membership renewal completed' when new.action = 'expired' then 'Membership expired' else 'Membership created' end, case when new.action = 'renewed' then 'Membership renewal completed.' when new.action = 'expired' then 'Membership has expired.' else 'Membership created.' end, 'subscription', v_subscription.id, array['owner','admin','manager','reception'], v_subscription.member_id);
  end if;
  return new;
end $$;
create or replace function public.notify_payment_created() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.status in ('completed','failed') then perform public.queue_branch_notification(new.branch_id, new.tenant_id, case when new.status = 'completed' then 'payment_received' else 'payment_failed' end, case when new.status = 'completed' then 'Payment received' else 'Payment failed' end, case when new.status = 'completed' then 'Payment received successfully.' else 'Payment processing failed.' end, 'payment', new.id, array['owner','admin','manager','reception'], new.member_id); end if; return new; end $$;
create or replace function public.notify_machine_status() returns trigger language plpgsql security definer set search_path = public as $$
begin if tg_op = 'INSERT' or new.connection_status is distinct from old.connection_status then perform public.queue_branch_notification(new.branch_id, new.tenant_id, case when new.connection_status = 'online' then 'machine_connected' else 'machine_disconnected' end, case when new.connection_status = 'online' then 'Machine connected' else 'Machine connection alert' end, case when new.connection_status = 'online' then 'Face detection machine connected successfully.' else 'Face detection machine connection lost.' end, 'machine', new.id, array['owner','admin','manager']); end if; return new; end $$;
create or replace function public.notify_tenant_created() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.notifications (tenant_id, type, title, message, target_roles, metadata, scheduled_for) values (null, 'tenant_registered', 'New gym registration', 'New gym registration received.', array['super_admin'], jsonb_build_object('fingerprint', 'tenant_registered:' || new.id::text, 'entity_type', 'tenant', 'entity_id', new.id), now()) on conflict do nothing; return new; end $$;

-- SECURITY DEFINER functions are callable only where required. Trigger functions
-- and queue_branch_notification are never exposed to browser/authenticated roles.
revoke all on function public.notification_role_is_allowed(text[]) from public;
grant execute on function public.notification_role_is_allowed(text[]) to authenticated;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;
revoke all on function public.queue_branch_notification(uuid, uuid, text, text, text, text, uuid, text[], uuid) from public;
revoke all on function public.notify_member_created() from public;
revoke all on function public.notify_subscription_history_created() from public;
revoke all on function public.notify_payment_created() from public;
revoke all on function public.notify_machine_status() from public;
revoke all on function public.notify_tenant_created() from public;

drop trigger if exists notifications_member_created on public.members;
create trigger notifications_member_created after insert on public.members for each row execute function public.notify_member_created();
drop trigger if exists notifications_subscription_history_created on public.subscription_history;
create trigger notifications_subscription_history_created after insert on public.subscription_history for each row execute function public.notify_subscription_history_created();
drop trigger if exists notifications_payment_created on public.payments;
create trigger notifications_payment_created after insert on public.payments for each row execute function public.notify_payment_created();
drop trigger if exists notifications_machine_status on public.face_machine_settings;
create trigger notifications_machine_status after insert or update of connection_status on public.face_machine_settings for each row execute function public.notify_machine_status();
drop trigger if exists notifications_tenant_created on public.tenants;
create trigger notifications_tenant_created after insert on public.tenants for each row execute function public.notify_tenant_created();

alter table public.notifications replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
commit;
