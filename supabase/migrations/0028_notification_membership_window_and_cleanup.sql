begin;

create or replace function public.generate_membership_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  d integer;
  c integer := 0;
  ttl text;
  msg text;
  gym_name text;
begin
  for r in
    select
      s.id,
      s.member_id,
      s.branch_id,
      s.tenant_id,
      s.end_date,
      m.full_name,
      m.user_id,
      b.name as branch_name,
      t.name as tenant_name
    from public.subscriptions s
    join public.members m on m.id = s.member_id
    join public.branches b on b.id = s.branch_id
    left join public.tenants t on t.id = s.tenant_id
    where s.status = 'active'
      and s.end_date between current_date + 1 and current_date + 10
  loop
    d := r.end_date - current_date;
    ttl := case when d = 1 then 'Membership expires in 1 day' else format('Membership expires in %s days', d) end;
    msg := case when d = 1 then format('%s''s membership expires in 1 day (%s).', r.full_name, to_char(r.end_date, 'DD Mon YYYY'))
                else format('%s''s membership expires in %s days (%s).', r.full_name, d, to_char(r.end_date, 'DD Mon YYYY')) end;
    gym_name := coalesce(nullif(trim(coalesce(r.tenant_name, '')), ''), nullif(trim(coalesce(r.branch_name, '')), ''), 'SyncFyre Gym');

    perform public.queue_business_notification(
      r.branch_id,
      r.tenant_id,
      null,
      r.member_id,
      'membership_expiry_reminder',
      ttl,
      msg,
      'subscription',
      r.id,
      array['owner', 'admin', 'manager', 'reception'],
      'membership_expiry_reminder:staff:' || r.id || ':' || r.end_date,
      jsonb_build_object(
        'subscription_id', r.id,
        'expiry_date', r.end_date,
        'remaining_days', d,
        'gym_name', gym_name
      )
    );

    if r.user_id is not null then
      perform public.queue_business_notification(
        r.branch_id,
        r.tenant_id,
        r.user_id,
        r.member_id,
        'membership_expiry_reminder',
        ttl,
        msg,
        'subscription',
        r.id,
        array['member'],
        'membership_expiry_reminder:member:' || r.id || ':' || r.end_date,
        jsonb_build_object(
          'subscription_id', r.id,
          'expiry_date', r.end_date,
          'remaining_days', d,
          'gym_name', gym_name
        )
      );
    end if;

    c := c + 1;
  end loop;

  return c;
end $$;

create or replace function public.notify_subscription_history_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
begin
  select * into v_sub
  from public.subscriptions
  where id = new.subscription_id;

  if new.action in ('created', 'renewed') then
    delete from public.notifications
    where member_id = v_sub.member_id
      and type in ('membership_expiring_today', 'membership_expiry_reminder');
  end if;

  if new.action in ('created', 'renewed', 'expired') then
    perform public.queue_branch_notification(v_sub.branch_id, v_sub.tenant_id,
      case new.action when 'renewed' then 'membership_renewed' when 'expired' then 'membership_expired' else 'membership_created' end,
      case new.action when 'renewed' then 'Membership renewal completed' when 'expired' then 'Membership expired' else 'Membership created' end,
      case new.action when 'renewed' then 'A membership renewal was completed.' when 'expired' then 'A membership has expired. Renewal is required.' else 'A membership was created.' end,
      'subscription', v_sub.id, array['owner','admin','manager','reception'], v_sub.member_id);
  end if;

  return new;
end $$;

create or replace function public.notify_invoice_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  balance numeric(12,2);
  gym_name text;
begin
  balance := new.total_amount - new.amount_paid;

  delete from public.notifications
  where type = 'pending_balance'
    and metadata->>'invoice_id' = new.id::text;

  if new.status <> 'void' and balance > 0 then
    select full_name, user_id into m
    from public.members
    where id = new.member_id;

    select coalesce(nullif(trim(coalesce(t.name, '')), ''), nullif(trim(coalesce(b.name, '')), ''), 'SyncFyre Gym')
      into gym_name
    from public.branches b
    left join public.tenants t on t.id = b.tenant_id
    where b.id = new.branch_id;

    perform public.queue_business_notification(
      new.branch_id,
      new.tenant_id,
      null,
      new.member_id,
      'pending_balance',
      'Pending balance',
      format('%s has an outstanding balance of %s on invoice %s.', m.full_name, to_char(balance, 'FM999G999G999D00'), new.invoice_number),
      'invoice',
      new.id,
      array['owner', 'admin', 'manager', 'reception'],
      'pending_balance:staff:' || new.id,
      jsonb_build_object(
        'invoice_id', new.id,
        'invoice_number', new.invoice_number,
        'outstanding_balance', balance,
        'due_date', new.due_date,
        'gym_name', gym_name
      )
    );

    if m.user_id is not null then
      perform public.queue_business_notification(
        new.branch_id,
        new.tenant_id,
        m.user_id,
        new.member_id,
        'pending_balance',
        'Pending balance',
        format('Your outstanding balance is %s for invoice %s.', to_char(balance, 'FM999G999G999D00'), new.invoice_number),
        'invoice',
        new.id,
        array['member'],
        'pending_balance:member:' || new.id,
        jsonb_build_object(
          'invoice_id', new.id,
          'invoice_number', new.invoice_number,
          'outstanding_balance', balance,
          'due_date', new.due_date,
          'gym_name', gym_name
        )
      );
    end if;
  end if;

  return new;
end $$;

grant execute on function public.generate_membership_reminders() to service_role;

commit;
