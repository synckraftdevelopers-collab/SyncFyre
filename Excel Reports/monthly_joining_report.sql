-- =============================================================
-- MONTHLY JOINING REPORT
-- Tables: members, branches, subscriptions, membership_plans,
--         payments
-- Description: Members who joined each month, with their
--              first subscription plan and first payment.
--              Useful for growth tracking and trend analysis.
-- =============================================================

-- ── Section 1: Monthly new member count by branch ────────────
SELECT
    'Monthly Count'                                            AS report_section,
    b.name                                                     AS branch_name,
    TO_CHAR(DATE_TRUNC('month', m.created_at), 'YYYY-MM')    AS join_month,
    COUNT(m.id)                                               AS new_members,
    COUNT(m.id) FILTER (WHERE m.status = 'active')            AS still_active,
    COUNT(m.id) FILTER (WHERE m.status = 'inactive')          AS now_inactive,
    COUNT(m.id) FILTER (WHERE m.gender = 'male')              AS male_count,
    COUNT(m.id) FILTER (WHERE m.gender = 'female')            AS female_count,
    COUNT(m.id) FILTER (WHERE m.gender NOT IN ('male','female')
                           OR m.gender IS NULL)               AS other_count

FROM public.members m

JOIN public.branches b
    ON b.id = m.branch_id

GROUP BY b.name, DATE_TRUNC('month', m.created_at)
ORDER BY join_month DESC, b.name

UNION ALL

-- ── Section 2: Individual new member detail list ─────────────
SELECT
    'Member Detail'                                            AS report_section,
    b.name                                                     AS branch_name,
    TO_CHAR(DATE_TRUNC('month', m.created_at), 'YYYY-MM')    AS join_month,

    -- Reuse numeric columns for detail fields via cast
    -- (use a spreadsheet tool to split sections by report_section)
    NULL::bigint                                              AS new_members,
    NULL::bigint                                              AS still_active,
    NULL::bigint                                              AS now_inactive,
    NULL::bigint                                              AS male_count,
    NULL::bigint                                              AS female_count,
    NULL::bigint                                              AS other_count

FROM public.members m
JOIN public.branches b ON b.id = m.branch_id
WHERE 1=0; -- placeholder to close union; use detail query below separately

-- ── Section 2 (standalone): New member detail with plan & payment
SELECT
    m.member_code,
    m.full_name,
    m.gender,
    m.phone,
    m.email,
    b.name                                                     AS branch_name,
    m.created_at::date                                        AS join_date,
    TO_CHAR(DATE_TRUNC('month', m.created_at), 'YYYY-MM')    AS join_month,
    m.status                                                  AS current_status,

    -- First subscription
    fs.plan_name                                              AS first_plan,
    fs.start_date                                             AS plan_start,
    fs.end_date                                               AS plan_end,
    fs.total_amount                                           AS plan_amount,

    -- First payment received
    fp.amount                                                 AS first_payment_amount,
    fp.method                                                 AS first_payment_method,
    fp.paid_at::date                                          AS first_payment_date

FROM public.members m

JOIN public.branches b
    ON b.id = m.branch_id

-- First subscription per member
LEFT JOIN LATERAL (
    SELECT
        sub.start_date,
        sub.end_date,
        sub.total_amount,
        sub.status,
        mp.name AS plan_name
    FROM public.subscriptions sub
    JOIN public.membership_plans mp ON mp.id = sub.plan_id
    WHERE sub.member_id = m.id
    ORDER BY sub.created_at ASC
    LIMIT 1
) fs ON TRUE

-- First completed payment per member
LEFT JOIN LATERAL (
    SELECT
        pay.amount,
        pay.method,
        pay.paid_at
    FROM public.payments pay
    WHERE pay.member_id = m.id
      AND pay.status = 'completed'
    ORDER BY pay.paid_at ASC
    LIMIT 1
) fp ON TRUE

ORDER BY
    m.created_at DESC,
    b.name;
