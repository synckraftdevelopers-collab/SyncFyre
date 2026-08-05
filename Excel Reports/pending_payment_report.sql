-- =============================================================
-- PENDING PAYMENT REPORT
-- Tables: invoices, payments, members, subscriptions,
--         membership_plans, branches
-- Description: All outstanding balances – unpaid/partial
--              invoices and pending/failed payments.
--              Sorted by overdue days (oldest first).
-- =============================================================

-- ── Section 1: Unpaid & Partial invoices ─────────────────────
SELECT
    'Invoice Outstanding'                                      AS record_type,
    i.invoice_number                                           AS reference,
    m.member_code,
    m.full_name,
    m.phone,
    b.name                                                     AS branch_name,

    mp.name                                                    AS plan_name,

    i.total_amount,
    i.amount_paid,
    (i.total_amount - i.amount_paid)                          AS balance_due,

    i.status                                                   AS invoice_status,
    i.due_date,

    -- Days overdue (positive = overdue, negative = not yet due)
    CASE
        WHEN i.due_date IS NOT NULL
        THEN (CURRENT_DATE - i.due_date)
        ELSE NULL
    END                                                        AS days_overdue,

    i.created_at::date                                        AS invoice_date,
    NULL::text                                                 AS payment_method,
    NULL::text                                                 AS transaction_reference

FROM public.invoices i

JOIN public.members m
    ON m.id = i.member_id

JOIN public.branches b
    ON b.id = i.branch_id

LEFT JOIN public.subscriptions s
    ON s.id = i.subscription_id

LEFT JOIN public.membership_plans mp
    ON mp.id = s.plan_id

WHERE i.status IN ('unpaid', 'partial')

UNION ALL

-- ── Section 2: Pending / Failed payment transactions ─────────
SELECT
    'Payment Pending/Failed'                                   AS record_type,
    p.id::text                                                 AS reference,
    m.member_code,
    m.full_name,
    m.phone,
    b.name                                                     AS branch_name,

    mp.name                                                    AS plan_name,

    p.amount                                                   AS total_amount,
    0::numeric                                                 AS amount_paid,
    p.amount                                                   AS balance_due,

    p.status::text                                             AS invoice_status,
    NULL::date                                                 AS due_date,

    (CURRENT_DATE - p.created_at::date)                       AS days_overdue,

    p.created_at::date                                        AS invoice_date,
    p.method::text                                             AS payment_method,
    p.transaction_reference

FROM public.payments p

JOIN public.members m
    ON m.id = p.member_id

JOIN public.branches b
    ON b.id = p.branch_id

LEFT JOIN public.subscriptions s
    ON s.id = p.subscription_id

LEFT JOIN public.membership_plans mp
    ON mp.id = s.plan_id

WHERE p.status IN ('pending', 'failed')

ORDER BY
    days_overdue DESC NULLS LAST,
    branch_name,
    full_name;
