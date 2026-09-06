begin;

create or replace function public.prevent_overlapping_memberships()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status not in ('active', 'pending', 'paused') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.member_id::text, 0));

  if exists (
    select 1
    from public.subscriptions existing
    where existing.member_id = new.member_id
      and existing.id is distinct from new.id
      and existing.status in ('active', 'pending', 'paused')
      and daterange(existing.start_date, existing.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'An active or pending membership already overlaps this period for the member.' using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists subscriptions_prevent_overlapping_memberships on public.subscriptions;
create trigger subscriptions_prevent_overlapping_memberships
before insert or update of member_id, start_date, end_date, status on public.subscriptions
for each row execute function public.prevent_overlapping_memberships();

commit;