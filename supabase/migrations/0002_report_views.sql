-- ================================================================
-- Migration: 0002_report_views
-- Purpose  : Create read-only reporting views for all 9 report
--            areas. Views inherit RLS from their source tables
--            through SECURITY INVOKER (default) so every query
--            automatically respects branch-level row policies.
--
-- Views created
--   1. member_register_view
--   2. attendance_report_view
--   3. payment_report_view
--   4. membership_report_view
--   5. trainer_report_view
--   6. subscription_report_view
--   7. revenue_report_view
--   8. pending_payment_report_view
--   9. monthly_joining_report_view
--
-- Supporting indexes added at the bottom (no existing index
-- is removed or altered).
-- ================================================================

begin;

-- ----------------------------------------------------------------
-- 1. member_register_view
--    Full member roster joined with branch, assigned trainer,
--    and the member's most-recent subscription plan.
--    RLS: reads from members (branch-scoped) → branch filter
--         propagates automatically.
-- ----------------------------------------------------------------
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
    m.created_at

from public.members m

join public.branches b
    on b.id = m.branch_id

left join public.trainers t
    on t.id = m.assigned_trainer_id

left join public.users tu
    on tu.id = t.user_id

-- Most-recent subscription per member
left join lateral (
    select
        sub.id            as subscription_id,
        sub.plan_id,
        sub.start_date,
        sub.end_date,
        sub.status        as sub_status,
        mp.name           as plan_name
    from public.subscriptions sub
    join public.membership_plans mp on mp.id = sub.plan_id
    where sub.member_id = m.id
    order by sub.created_at desc
    limit 1
) s on true;

comment on view public.member_register_view is
  'Full member roster with branch, assigned trainer, and most-recent subscription. '
  'Branch-level RLS is enforced via SECURITY INVOKER on the members table.';


-- ----------------------------------------------------------------
-- 2. attendance_report_view
--    Daily attendance records with member info, IST times, and
--    human-readable duration.
--    RLS: scoped through attendance.branch_id policy.
-- ----------------------------------------------------------------
create or replace view public.attendance_report_view
  with (security_invoker = true)
as
select
    a.id                                                        as attendance_id,
    a.attendance_date,
    m.id                                                        as member_id,
    m.member_code,
    m.full_name,
    m.phone,
    m.status                                                    as member_status,
    a.branch_id,
    b.name                                                      as branch_name,

    -- Entry / exit in IST
    (a.entry_time at time zone 'Asia/Kolkata')::time            as entry_time_ist,
    (a.exit_time  at time zone 'Asia/Kolkata')::time            as exit_time_ist,

    -- Computed column from schema (stored)
    a.duration_minutes,

    -- Friendly label
    case
        when a.duration_minutes is null then 'No exit recorded'
        else floor(a.duration_minutes / 60)::text || 'h '
             || (a.duration_minutes % 60)::text || 'm'
    end                                                         as duration_label,

    a.source,
    a.device_id,
    a.created_at

from public.attendance a

join public.members m
    on m.id = a.member_id

join public.branches b
    on b.id = a.branch_id;

comment on view public.attendance_report_view is
  'Daily attendance log with entry/exit in IST and duration. '
  'Filter by attendance_date, branch_id, or member_id. '
  'RLS enforced via attendance.branch_id policy.';


-- ----------------------------------------------------------------
-- 3. payment_report_view
--    All payment transactions enriched with member, branch,
--    invoice, subscription plan, and collecting staff details.
--    RLS: scoped through payments.branch_id policy.
-- ----------------------------------------------------------------
create or replace view public.payment_report_view
  with (security_invoker = true)
as
select
    p.id                                                        as payment_id,
    p.created_at::date                                         as payment_date,
    (p.paid_at at time zone 'Asia/Kolkata')                    as paid_at_ist,
    p.branch_id,
    b.name                                                      as branch_name,

    m.id                                                        as member_id,
    m.member_code,
    m.full_name,
    m.phone,

    -- Invoice reference
    i.id                                                        as invoice_id,
    i.invoice_number,

    -- Plan linked through subscription
    s.id                                                        as subscription_id,
    mp.name                                                     as plan_name,

    p.amount,
    p.refund_amount,
    (p.amount - p.refund_amount)                               as net_amount,
    p.method                                                    as payment_method,
    p.status                                                    as payment_status,
    p.transaction_reference,

    -- Collector
    cu.full_name                                               as collected_by,

    p.receipt_url,
    p.refund_reason,
    p.created_at

from public.payments p

join public.members m
    on m.id = p.member_id

join public.branches b
    on b.id = p.branch_id

left join public.invoices i
    on i.id = p.invoice_id

left join public.subscriptions s
    on s.id = p.subscription_id

left join public.membership_plans mp
    on mp.id = s.plan_id

left join public.users cu
    on cu.id = p.collected_by;

comment on view public.payment_report_view is
  'All payment transactions with member, invoice, plan, and collector details. '
  'Filter by payment_status, payment_method, branch_id, or date range on paid_at_ist / payment_date. '
  'RLS enforced via payments.branch_id policy.';


-- ----------------------------------------------------------------
-- 4. membership_report_view
--    Every subscription with financial breakdown, plan metadata,
--    renewal count, and days remaining.
--    RLS: scoped through subscriptions.branch_id policy.
-- ----------------------------------------------------------------
create or replace view public.membership_report_view
  with (security_invoker = true)
as
select
    s.id                                                        as subscription_id,
    s.branch_id,
    b.name                                                      as branch_name,

    m.id                                                        as member_id,
    m.member_code,
    m.full_name,
    m.phone,

    mp.id                                                       as plan_id,
    mp.name                                                     as plan_name,
    mp.duration_months,
    mp.price                                                    as plan_base_price,
    mp.gst_percent,

    s.start_date,
    s.end_date,
    (s.end_date - s.start_date + 1)                           as total_days,
    (s.end_date - current_date)                                as days_left,

    s.status                                                    as subscription_status,
    s.auto_renew,

    -- Financials
    s.price                                                     as billed_price,
    s.discount_amount,
    s.gst_amount,
    s.total_amount,

    -- Renewal count derived from subscription_history
    coalesce(hist.renewal_count, 0)                           as times_renewed,

    cu.full_name                                               as created_by,
    s.created_at::date                                        as created_date,
    s.created_at

from public.subscriptions s

join public.members m
    on m.id = s.member_id

join public.membership_plans mp
    on mp.id = s.plan_id

join public.branches b
    on b.id = s.branch_id

left join public.users cu
    on cu.id = s.created_by

left join (
    select
        subscription_id,
        count(*) filter (where action = 'renewed') as renewal_count
    from public.subscription_history
    group by subscription_id
) hist
    on hist.subscription_id = s.id;

comment on view public.membership_report_view is
  'All subscriptions with plan details, financial breakdown, renewal count, and days remaining. '
  'Filter by subscription_status, branch_id, plan_id, or date columns. '
  'RLS enforced via subscriptions.branch_id policy.';


-- ----------------------------------------------------------------
-- 5. trainer_report_view
--    Trainer roster with branch, staff info, active/total
--    assigned members, active workouts, and upcoming appointments.
--    RLS: scoped through trainers.branch_id policy.
-- ----------------------------------------------------------------
create or replace view public.trainer_report_view
  with (security_invoker = true)
as
select
    t.id                                                        as trainer_id,
    t.branch_id,
    b.name                                                      as branch_name,

    u.full_name                                                as trainer_name,
    u.email,
    u.phone,

    st.id                                                       as staff_id,
    st.employee_code,
    st.designation,
    st.joining_date,

    t.experience_years,
    t.specializations,
    t.certifications,
    t.bio,
    t.status                                                    as trainer_status,

    -- Assigned member counts (from trainer_assignments)
    coalesce(ta.active_members,  0)                           as active_assigned_members,
    coalesce(ta.total_members,   0)                           as total_members_assigned,

    -- Active scheduled workouts
    coalesce(wo.active_workouts, 0)                           as active_workouts,

    -- Upcoming appointments (today onward, pending or approved)
    coalesce(ap.upcoming_count,  0)                           as upcoming_appointments

from public.trainers t

join public.users u
    on u.id = t.user_id

join public.branches b
    on b.id = t.branch_id

left join public.staff st
    on st.id = t.staff_id

left join (
    select
        trainer_id,
        count(*) filter (where status = 'active') as active_members,
        count(*)                                  as total_members
    from public.trainer_assignments
    group by trainer_id
) ta on ta.trainer_id = t.id

left join (
    select
        trainer_id,
        count(*) as active_workouts
    from public.workouts
    where status = 'active'
    group by trainer_id
) wo on wo.trainer_id = t.id

left join (
    select
        provider_staff_id,
        count(*) as upcoming_count
    from public.appointments
    where appointment_date >= current_date
      and status in ('pending', 'approved')
    group by provider_staff_id
) ap on ap.provider_staff_id = t.staff_id;

comment on view public.trainer_report_view is
  'Trainer roster with staff details, assigned member counts, active workouts, '
  'and upcoming appointments. RLS enforced via trainers.branch_id policy.';


-- ----------------------------------------------------------------
-- 6. subscription_report_view
--    Per-plan aggregated summary: subscription counts by every
--    status value, revenue totals, and collection amounts.
--    RLS: membership_plans.branch_id drives branch scoping.
-- ----------------------------------------------------------------
create or replace view public.subscription_report_view
  with (security_invoker = true)
as
select
    mp.id                                                       as plan_id,
    mp.branch_id,
    b.name                                                      as branch_name,

    mp.name                                                     as plan_name,
    mp.duration_months,
    mp.price                                                    as plan_price,
    mp.gst_percent,
    mp.status                                                   as plan_status,

    -- Subscription counts by status
    count(s.id)                                                as total_subscriptions,
    count(s.id) filter (where s.status = 'active')            as active_count,
    count(s.id) filter (where s.status = 'expired')           as expired_count,
    count(s.id) filter (where s.status = 'cancelled')         as cancelled_count,
    count(s.id) filter (where s.status = 'paused')            as paused_count,
    count(s.id) filter (where s.status = 'pending')           as pending_count,
    count(s.id) filter (where s.auto_renew = true)            as auto_renew_count,

    -- Revenue metrics
    coalesce(sum(s.total_amount),    0)                        as total_billed,
    coalesce(sum(s.discount_amount), 0)                        as total_discounts,
    coalesce(sum(s.gst_amount),      0)                        as total_gst,

    -- Actual cash collected for these subscriptions
    coalesce(sum(ps.paid_amount),    0)                        as total_collected

from public.membership_plans mp

join public.branches b
    on b.id = mp.branch_id

left join public.subscriptions s
    on s.plan_id = mp.id

left join (
    select
        subscription_id,
        sum(amount) filter (where status = 'completed') as paid_amount
    from public.payments
    group by subscription_id
) ps on ps.subscription_id = s.id

group by
    mp.id, mp.branch_id, b.name,
    mp.name, mp.duration_months, mp.price,
    mp.gst_percent, mp.status;

comment on view public.subscription_report_view is
  'Per-plan subscription summary: counts by status, billed/collected amounts, and GST. '
  'Filter by branch_id or plan_status. RLS enforced via membership_plans.branch_id.';


-- ----------------------------------------------------------------
-- 7. revenue_report_view
--    Flat payment ledger optimised for grouping in the client:
--    includes month label, payment method, and plan name so the
--    consumer can GROUP BY any dimension.
--    RLS: scoped through payments.branch_id policy.
-- ----------------------------------------------------------------
create or replace view public.revenue_report_view
  with (security_invoker = true)
as
select
    p.id                                                        as payment_id,
    p.branch_id,
    b.name                                                      as branch_name,

    -- Time dimensions
    p.paid_at,
    to_char(
        date_trunc('month', p.paid_at at time zone 'Asia/Kolkata'),
        'YYYY-MM'
    )                                                           as revenue_month,
    to_char(
        date_trunc('month', p.paid_at at time zone 'Asia/Kolkata'),
        'Mon YYYY'
    )                                                           as revenue_month_label,
    extract(year  from p.paid_at at time zone 'Asia/Kolkata')  as revenue_year,
    extract(month from p.paid_at at time zone 'Asia/Kolkata')  as revenue_month_num,

    -- Dimensions for slicing
    p.method                                                    as payment_method,
    coalesce(mp.name, 'Direct / Other')                        as plan_name,

    -- Amounts
    p.amount,
    p.refund_amount,
    (p.amount - p.refund_amount)                               as net_amount,

    -- GST from linked invoice (may be null for direct payments)
    i.gst_amount                                               as invoice_gst,

    p.status                                                    as payment_status,
    p.created_at

from public.payments p

join public.branches b
    on b.id = p.branch_id

left join public.invoices i
    on i.id = p.invoice_id

left join public.subscriptions s
    on s.id = p.subscription_id

left join public.membership_plans mp
    on mp.id = s.plan_id

where p.status = 'completed'
  and p.paid_at is not null;

comment on view public.revenue_report_view is
  'Flat completed-payment ledger with month, method, and plan dimensions. '
  'Aggregate in the client by revenue_month, payment_method, or plan_name. '
  'RLS enforced via payments.branch_id policy.';


-- ----------------------------------------------------------------
-- 8. pending_payment_report_view
--    Consolidated outstanding balances: unpaid/partial invoices
--    UNION ALL pending/failed payment rows.
--    RLS: both source tables (invoices, payments) are branch-scoped.
-- ----------------------------------------------------------------
create or replace view public.pending_payment_report_view
  with (security_invoker = true)
as
-- Unpaid / partial invoices
select
    'invoice'                                                  as record_type,
    i.id                                                        as record_id,
    i.invoice_number                                           as reference,
    m.id                                                        as member_id,
    m.member_code,
    m.full_name,
    m.phone,
    i.branch_id,
    b.name                                                      as branch_name,

    coalesce(mp.name, '—')                                    as plan_name,

    i.total_amount,
    i.amount_paid,
    (i.total_amount - i.amount_paid)                          as balance_due,

    i.status                                                    as record_status,
    i.due_date,

    case
        when i.due_date is not null then (current_date - i.due_date)
        else null
    end                                                         as days_overdue,

    i.created_at::date                                        as record_date,
    null::text                                                  as payment_method,
    null::text                                                  as transaction_reference,
    i.created_at

from public.invoices i

join public.members m
    on m.id = i.member_id

join public.branches b
    on b.id = i.branch_id

left join public.subscriptions s
    on s.id = i.subscription_id

left join public.membership_plans mp
    on mp.id = s.plan_id

where i.status in ('unpaid', 'partial')

union all

-- Pending / failed payment transactions
select
    'payment'                                                  as record_type,
    p.id                                                        as record_id,
    p.id::text                                                  as reference,
    m.id                                                        as member_id,
    m.member_code,
    m.full_name,
    m.phone,
    p.branch_id,
    b.name                                                      as branch_name,

    coalesce(mp.name, '—')                                    as plan_name,

    p.amount                                                    as total_amount,
    0::numeric                                                  as amount_paid,
    p.amount                                                    as balance_due,

    p.status::text                                             as record_status,
    null::date                                                  as due_date,

    (current_date - p.created_at::date)                       as days_overdue,

    p.created_at::date                                        as record_date,
    p.method::text                                             as payment_method,
    p.transaction_reference,
    p.created_at

from public.payments p

join public.members m
    on m.id = p.member_id

join public.branches b
    on b.id = p.branch_id

left join public.subscriptions s
    on s.id = p.subscription_id

left join public.membership_plans mp
    on mp.id = s.plan_id

where p.status in ('pending', 'failed');

comment on view public.pending_payment_report_view is
  'All outstanding balances from unpaid/partial invoices and pending/failed payments. '
  'record_type distinguishes "invoice" from "payment" rows. '
  'Sort by days_overdue DESC for oldest-first. '
  'RLS enforced via invoices.branch_id and payments.branch_id policies.';


-- ----------------------------------------------------------------
-- 9. monthly_joining_report_view
--    New member detail list with first subscription plan and
--    first completed payment – one row per member.
--    Monthly aggregates are computed client-side from this view.
--    RLS: scoped through members.branch_id policy.
-- ----------------------------------------------------------------
create or replace view public.monthly_joining_report_view
  with (security_invoker = true)
as
select
    m.id                                                        as member_id,
    m.member_code,
    m.full_name,
    m.gender,
    m.phone,
    m.email,
    m.branch_id,
    b.name                                                      as branch_name,

    m.created_at::date                                        as join_date,
    to_char(
        date_trunc('month', m.created_at),
        'YYYY-MM'
    )                                                           as join_month,
    to_char(
        date_trunc('month', m.created_at),
        'Mon YYYY'
    )                                                           as join_month_label,
    extract(year  from m.created_at)                           as join_year,
    extract(month from m.created_at)                           as join_month_num,

    m.status                                                    as current_status,

    -- First subscription
    fs.plan_name                                               as first_plan,
    fs.plan_id                                                  as first_plan_id,
    fs.start_date                                              as plan_start,
    fs.end_date                                                as plan_end,
    fs.total_amount                                            as plan_amount,
    fs.sub_status                                              as plan_status,

    -- First completed payment
    fp.amount                                                   as first_payment_amount,
    fp.method                                                   as first_payment_method,
    fp.paid_at::date                                           as first_payment_date,

    m.created_at

from public.members m

join public.branches b
    on b.id = m.branch_id

-- First subscription per member (chronological)
left join lateral (
    select
        sub.start_date,
        sub.end_date,
        sub.total_amount,
        sub.status      as sub_status,
        sub.plan_id,
        mp.name         as plan_name
    from public.subscriptions sub
    join public.membership_plans mp on mp.id = sub.plan_id
    where sub.member_id = m.id
    order by sub.created_at asc
    limit 1
) fs on true

-- First completed payment per member
left join lateral (
    select
        pay.amount,
        pay.method,
        pay.paid_at
    from public.payments pay
    where pay.member_id = m.id
      and pay.status = 'completed'
    order by pay.paid_at asc
    limit 1
) fp on true;

comment on view public.monthly_joining_report_view is
  'New member list with first subscription plan and first payment. '
  'Filter by join_month (YYYY-MM) or branch_id. '
  'GROUP BY join_month + branch_name for monthly count summaries. '
  'RLS enforced via members.branch_id policy.';


-- ================================================================
-- Supporting indexes (only created if they do not already exist)
-- ================================================================

-- members.created_at – speeds monthly_joining_report_view month grouping
create index if not exists members_created_at_idx
    on public.members (created_at desc);

-- subscriptions.member_id + created_at – used by LATERAL joins in
-- member_register_view and monthly_joining_report_view
create index if not exists subscriptions_member_created_idx
    on public.subscriptions (member_id, created_at desc);

-- payments.member_id + status + paid_at – used by monthly_joining
-- lateral and revenue_report_view
create index if not exists payments_member_status_paid_idx
    on public.payments (member_id, status, paid_at asc);

-- payments.paid_at (partial) – revenue_report_view date filtering
create index if not exists payments_paid_at_completed_idx
    on public.payments (paid_at desc)
    where status = 'completed' and paid_at is not null;

-- invoices.status – pending_payment_report_view outstanding filter
create index if not exists invoices_status_idx
    on public.invoices (status)
    where status in ('unpaid', 'partial');

-- payments pending/failed – pending_payment_report_view
create index if not exists payments_status_pending_idx
    on public.payments (branch_id, created_at desc)
    where status in ('pending', 'failed');

-- trainer_assignments.trainer_id – trainer_report_view aggregation
create index if not exists trainer_assignments_trainer_idx
    on public.trainer_assignments (trainer_id, status);

-- workouts.trainer_id (partial active) – trainer_report_view
create index if not exists workouts_trainer_active_idx
    on public.workouts (trainer_id)
    where status = 'active';

-- subscription_history.subscription_id + action – membership_report_view
create index if not exists sub_history_subscription_action_idx
    on public.subscription_history (subscription_id, action);

commit;
