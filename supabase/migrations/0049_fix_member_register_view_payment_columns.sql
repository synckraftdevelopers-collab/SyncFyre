-- 0049_fix_member_register_view_payment_columns.sql
--
-- Fixes: on the Members page, every row's "Paid" column shows ₹0 and
-- "Balance" shows 0, while "Plan Amount" is correct and "Payment" always
-- shows the green "Paid" badge — regardless of what was actually paid.
--
-- Context: `public.member_register_view` was originally created in
-- 0002_report_views.sql without any payment columns at all. At some point
-- someone added member_id-joined payment columns directly to the live
-- database (outside of a tracked migration — this file is the first time
-- that change is captured in the migration history), including a
-- `subscriptions.paid_amount` / `subscriptions.balance_amount` pair that
-- the view reads from. The problem: nothing in the application ever
-- writes to those two columns — every invoice/payment flow in this
-- codebase (member-actions.ts, the admin sale wizard, reception's form)
-- records payments against `invoices`/`payments`, never against
-- `subscriptions` directly. So `subscriptions.paid_amount` and
-- `subscriptions.balance_amount` sit at their default (effectively always
-- 0), which is exactly the "Paid: ₹0 / Balance: 0" symptom. The view's
-- payment_status CASE expression then falls through to its `ELSE 'paid'`
-- branch whenever paid_amount and balance_amount are both 0 — which is
-- also why every member showed a green "Paid" badge no matter what they
-- actually owed.
--
-- Fix: compute total/paid/balance/payment_status from the member's
-- latest non-void *invoice* linked to their latest subscription — the
-- same source of truth already used by the Outstanding Dues fixes in
-- 0047/0048 — instead of the never-populated subscription-level shadow
-- columns. Every other column is carried over unchanged from the live
-- view (captured via pg_get_viewdef) so nothing else regresses.

create or replace view public.member_register_view
  with (security_invoker = true)
as
select
    m.id                                                        as member_id,
    m.member_code,
    m.full_name,
    m.gender,
    m.date_of_birth,
    date_part('year', age(m.date_of_birth::date))::int         as age,
    m.phone,
    m.email,
    m.blood_group,
    m.height_cm,
    m.weight_kg,
    m.fitness_goal,
    m.medical_conditions,
    m.status                                                    as member_status,
    m.branch_id,
    b.name                                                      as branch_name,
    b.city                                                      as branch_city,

    -- Assigned trainer
    t.id                                                        as trainer_id,
    tu.full_name                                                as assigned_trainer,

    -- Latest subscription (lateral – one row per member)
    s.plan_name                                                 as current_plan,
    s.plan_id,
    s.start_date                                                as subscription_start,
    s.end_date                                                  as subscription_end,
    s.sub_status                                                as subscription_status,
    (s.end_date - current_date)                                 as days_remaining,

    m.emergency_contact_name,
    m.emergency_contact_phone,
    m.profile_photo_url,
    m.created_at::date                                         as joined_date,
    m.created_at,

    m.balance_amount                                            as member_balance,
    m.is_pt,
    m.pt_details,
    m.notes,

    s.package_code,
    s.total_amount,
    s.paid_amount,
    s.balance_amount,
    coalesce(
      s.invoice_status,
      case when s.total_amount > 0 then 'unpaid' else null end
    )                                                            as payment_status

from public.members m

join public.branches b
    on b.id = m.branch_id

left join public.trainers t
    on t.id = m.assigned_trainer_id

left join public.users tu
    on tu.id = t.user_id

-- Most-recent subscription per member, priced/paid from its most-recent
-- non-void invoice (the real source of truth for what's been collected).
left join lateral (
    select
        sub.id                                                       as subscription_id,
        sub.plan_id,
        sub.start_date,
        sub.end_date,
        sub.status                                                   as sub_status,
        sub.package_code,
        coalesce(inv.total_amount, sub.total_amount, 0)              as total_amount,
        coalesce(inv.amount_paid, 0)                                 as paid_amount,
        coalesce(inv.total_amount, sub.total_amount, 0) - coalesce(inv.amount_paid, 0) as balance_amount,
        inv.status                                                   as invoice_status,
        coalesce(mp.name, sub.package_code, 'Custom Plan')           as plan_name
    from public.subscriptions sub
    left join public.membership_plans mp on mp.id = sub.plan_id
    left join lateral (
        select i.total_amount, i.amount_paid, i.status
        from public.invoices i
        where i.subscription_id = sub.id
          and i.status <> 'void'
        order by i.created_at desc
        limit 1
    ) inv on true
    where sub.member_id = m.id
    order by sub.created_at desc
    limit 1
) s on true;

comment on view public.member_register_view is
  'Full member roster with branch, assigned trainer, most-recent subscription, and that subscription''s real payment status/amounts sourced from its latest non-void invoice.';
