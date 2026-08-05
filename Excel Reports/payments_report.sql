-- =============================================================
-- PAYMENTS REPORT
-- Tables: payments, members, branches, invoices,
--         subscriptions, membership_plans, users
-- Description: All payment transactions with member details,
--              invoice reference, plan, method, and collector.
-- =============================================================

SELECT
    p.created_at::date                                          AS payment_date,
    (p.paid_at AT TIME ZONE 'Asia/Kolkata')                     AS paid_at_ist,
    m.member_code,
    m.full_name,
    m.phone,
    b.name                                                      AS branch_name,

    -- Invoice number (may be null for direct payments)
    i.invoice_number,

    -- Membership plan linked through subscription
    mp.name                                                     AS plan_name,

    p.amount,
    p.refund_amount,
    (p.amount - p.refund_amount)                                AS net_amount,
    p.method                                                    AS payment_method,
    p.status                                                    AS payment_status,
    p.transaction_reference,

    -- Staff who collected the payment
    cu.full_name                                                AS collected_by,

    p.receipt_url,
    p.refund_reason

FROM public.payments p

JOIN public.members m
    ON m.id = p.member_id

JOIN public.branches b
    ON b.id = p.branch_id

LEFT JOIN public.invoices i
    ON i.id = p.invoice_id

LEFT JOIN public.subscriptions s
    ON s.id = p.subscription_id

LEFT JOIN public.membership_plans mp
    ON mp.id = s.plan_id

LEFT JOIN public.users cu
    ON cu.id = p.collected_by

-- ── Date range filter ──
WHERE p.created_at >= DATE_TRUNC('month', CURRENT_DATE)
-- ──────────────────────

ORDER BY
    p.created_at DESC;
