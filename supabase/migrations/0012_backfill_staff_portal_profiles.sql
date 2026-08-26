-- Trainer and dietician portals both use a trainers profile as the secure member-assignment anchor.
-- Backfill active staff accounts created before that profile was provisioned automatically.
insert into public.trainers (user_id, staff_id, branch_id, status)
select staff.user_id, staff.id, staff.branch_id, 'active'
from public.staff as staff
join public.users as users on users.id = staff.user_id
join public.roles as roles on roles.id = users.role_id
where staff.status = 'active'
  and users.status = 'active'
  and roles.slug in ('trainer', 'dietician')
  and not exists (
    select 1
    from public.trainers as trainer
    where trainer.user_id = staff.user_id
  );