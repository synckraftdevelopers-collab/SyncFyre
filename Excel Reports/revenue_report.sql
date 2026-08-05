-- =============================================================
-- REVENUE REPORT
-- Tables: payments, invoices, branches, subscriptions,
--         membership_plans
-- Description: Multi-level revenue breakdown:
--   1. Monthly revenue by branch
--   2. Revenue by payment method
--   3. Revenue by membership plan
-- =============================================================

-- ── Section 1: Monthly revenue by branch ─────────────────────
SELECT
    'Monthly by Branch'                                        AS report_section,
    b.name                                                     AS branch_name,
    TO_CHAR(DATE_TRUNC('month', p.paid_at AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM') AS month,

    COUNT(p.id)                                                AS transaction_count,
    SUM(p.amount)                                              AS gross_amount,
    SUM(p.refund_amount)                                       AS total_refunds,
    SUM(p.amount - p.refund_amount)                            AS net_revenue,

    -- GST collected on completed payments (via linked invoice)
    COALESCE(SUM(i.gst_amount), 0)                            AS gst_amount,

    SUM(p.amount - p.refund_amount)
      - COALESCE(SUM(i.gst_amount), 0)                        AS revenue_ex_gst

FROM public.payments p

JOIN public.branches b
    ON b.id = p.branch_id

LEFT JOIN public.invoices i
    ON i.id = p.invoice_id

WHERE p.status = 'completed'
  AND p.paid_at IS NOT NULL

GROUP BY b.name, DATE_TRUNC('month', p.paid_at AT TIME ZONE 'Asia/Kolkata')
ORDER BY month DESC, b.name

UNION ALL

-- ── Section 2: Revenue by payment method ─────────────────────
SELECT
    'By Payment Method'                                        AS report_section,
    b.name                                                     AS branch_name,
    p.method::text                                             AS month,

    COUNT(p.id)                                                AS transaction_count,
    SUM(p.amount)                                              AS gross_amount,
    SUM(p.refund_amount)                                       AS total_refunds,
    SUM(p.amount - p.refund_amount)                            AS net_revenue,
    NULL::numeric                                              AS gst_amount,
    NULL::numeric                                              AS revenue_ex_gst

FROM public.payments p

JOIN public.branches b
    ON b.id = p.branch_id

WHERE p.status = 'completed'
  AND p.paid_at IS NOT NULL

GROUP BY b.name, p.method
ORDER BY b.name, net_revenue DESC

UNION ALL

-- ── Section 3: Revenue by membership plan ────────────────────
SELECT
    'By Plan'                                                  AS report_section,
    b.name                                                     AS branch_name,
    mp.name                                                    AS month,

    COUNT(p.id)                                                AS transaction_count,
    SUM(p.amount)                                              AS gross_amount,
    SUM(p.refund_amount)                                       AS total_refunds,
    SUM(p.amount - p.refund_amount)                            AS net_revenue,
    COALESCE(SUM(s.gst_amount), 0)                            AS gst_amount,
    NULL::numeric                                              AS revenue_ex_gst

FROM public.payments p

JOIN public.branches b
    ON b.id = p.branch_id

LEFT JOIN public.subscriptions s
    ON s.id = p.subscription_id

LEFT JOIN public.membership_plans mp
    ON mp.id = s.plan_id

WHERE p.status = 'completed'
  AND p.paid_at IS NOT NULL

GROUP BY b.name, mp.name
ORDER BY b.name, net_revenue DESC;
