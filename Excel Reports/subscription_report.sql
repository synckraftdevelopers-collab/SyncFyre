-- =============================================================
-- SUBSCRIPTION REPORT
-- Tables: subscriptions, members, membership_plans, branches,
--         payments
-- Description: Subscription summary per plan with financial
--              totals, active/expired counts, and payment
--              collection rate.
-- =============================================================

-- ── Section 1: Per-plan summary ──────────────────────────────
SELECT
    'Plan Summary'                                             AS report_section,
    b.name                                                     AS branch_name,
    mp.name                                                    AS plan_name,
    mp.duration_months,
    mp.price                                                   AS plan_price,
    mp.gst_percent,
    mp.status                                                  AS plan_status,

    -- Subscription counts by status
    COUNT(s.id)                                                AS total_subscriptions,
    COUNT(s.id) FILTER (WHERE s.status = 'active')            AS active_count,
    COUNT(s.id) FILTER (WHERE s.status = 'expired')           AS expired_count,
    COUNT(s.id) FILTER (WHERE s.status = 'cancelled')         AS cancelled_count,
    COUNT(s.id) FILTER (WHERE s.status = 'paused')            AS paused_count,
    COUNT(s.id) FILTER (WHERE s.status = 'pending')           AS pending_count,

    -- Revenue metrics
    COALESCE(SUM(s.total_amount), 0)                          AS total_billed,
    COALESCE(SUM(s.discount_amount), 0)                       AS total_discounts,
    COALESCE(SUM(s.gst_amount), 0)                            AS total_gst_collected,

    -- Payments actually received for these subscriptions
    COALESCE(SUM(p_stats.paid), 0)                            AS total_paid,

    -- Auto-renew opt-in count
    COUNT(s.id) FILTER (WHERE s.auto_renew = TRUE)            AS auto_renew_count

FROM public.membership_plans mp

JOIN public.branches b
    ON b.id = mp.branch_id

LEFT JOIN public.subscriptions s
    ON s.plan_id = mp.id

-- Payments linked to each subscription
LEFT JOIN (
    SELECT
        subscription_id,
        SUM(amount) FILTER (WHERE status = 'completed') AS paid
    FROM public.payments
    GROUP BY subscription_id
) p_stats
    ON p_stats.subscription_id = s.id

GROUP BY
    b.name, mp.id, mp.name, mp.duration_months,
    mp.price, mp.gst_percent, mp.status

ORDER BY
    b.name,
    mp.name;
