begin;

create or replace function public.set_subscription_dates()
returns trigger
language plpgsql
set search_path='public'
as $$
declare
  v_duration_months integer;
begin
  select duration_months
    into v_duration_months
  from public.membership_plans
  where id = new.plan_id;

  if v_duration_months is null then
    raise exception 'Invalid membership plan';
  end if;

  new.end_date := (new.start_date + make_interval(months => v_duration_months))::date;
  return new;
end $$;

comment on function public.set_subscription_dates() is
  'Derives subscription end_date from start_date plus membership_plans.duration_months for all inserts and plan/start-date updates.';

commit;
