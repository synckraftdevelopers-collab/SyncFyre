-- Review affected rows before any backfill.
-- Current live schema stores plan duration in membership_plans.duration_months.

select
  m.full_name as member,
  m.member_code,
  mp.name as plan,
  s.start_date,
  s.end_date as current_expiry,
  (s.start_date + make_interval(months => mp.duration_months))::date as expected_expiry,
  ((s.start_date + make_interval(months => mp.duration_months))::date - s.end_date) as difference_days
from public.subscriptions s
join public.members m
  on m.id = s.member_id
join public.membership_plans mp
  on mp.id = s.plan_id
where s.end_date is distinct from (s.start_date + make_interval(months => mp.duration_months))::date
order by abs(((s.start_date + make_interval(months => mp.duration_months))::date - s.end_date)) desc,
         s.start_date desc,
         m.full_name asc;
