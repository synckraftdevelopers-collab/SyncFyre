-- =============================================================
-- MEMBERSHIP REPORT
-- Tables: subscriptions, members, membership_plans, branches,
--         subscription_history, users
-- Description: All subscriptions with financial breakdown,
--              status, plan details, and renewal history count.
-- =============================================================

SELECT
    m.member_code,
    m.full_name,
    m.phone,
    b.name                                                      AS branch_name,

    mp.name                                                     AS plan_name,
    mp.duration_months,
    mp.price                                                    AS plan_base_price,

    s.start_date,
    s.end_date,
    (s.end_date - s.start_date + 1)                            AS total_days,
    (s.end_date - CURRENT_DATE)                                 AS days_left,

    s.status                                                    AS subscription_status,
    s.auto_renew,

    -- Financials
    s.price                                                     AS billed_price,
    s.discount_amount,
    s.gst_amount,
    s.total_amount,

    -- Count renewals from history
    COALESCE(hist.renewal_count, 0)                            AS times_renewed,

    -- Who created this subscription
    cu.full_name                                                AS created_by,
    s.created_at::date                                          AS created_date

FROM public.subscriptions s

JOIN public.members m
    ON m.id = s.member_id

JOIN public.membership_plans mp
    ON mp.id = s.plan_id

JOIN public.branches b
    ON b.id = s.branch_id

LEFT JOIN public.users cu
    ON cu.id = s.created_by

-- Renewal count from subscription_history
LEFT JOIN (
    SELECT
        subscription_id,
        COUNT(*) FILTER (WHERE action = 'renewed') AS renewal_count
    FROM public.subscription_history
    GROUP BY subscription_id
) hist
    ON hist.subscription_id = s.id

ORDER BY
    b.name,
    s.status,
    s.end_date;
