-- =============================================================
-- ATTENDANCE REPORT
-- Tables: attendance, members, branches
-- Description: Daily attendance log with entry/exit times,
--              duration, and member details.
--              Adjust the date range filter as needed.
-- =============================================================

SELECT
    a.attendance_date,
    m.member_code,
    m.full_name,
    m.phone,
    m.status                                                    AS member_status,
    b.name                                                      AS branch_name,

    -- Times (converted to IST)
    (a.entry_time AT TIME ZONE 'Asia/Kolkata')::time            AS entry_time_ist,
    (a.exit_time  AT TIME ZONE 'Asia/Kolkata')::time            AS exit_time_ist,

    -- Duration in minutes (computed column from schema)
    a.duration_minutes,

    -- Friendly duration
    CASE
        WHEN a.duration_minutes IS NULL THEN 'No exit recorded'
        ELSE FLOOR(a.duration_minutes / 60)::text || 'h ' ||
             (a.duration_minutes % 60)::text || 'm'
    END                                                         AS duration_hm,

    a.source,
    a.device_id

FROM public.attendance a

JOIN public.members m
    ON m.id = a.member_id

JOIN public.branches b
    ON b.id = a.branch_id

-- ── Date range filter – change these to the desired period ──
WHERE a.attendance_date BETWEEN
        (DATE_TRUNC('month', CURRENT_DATE))::date
    AND CURRENT_DATE
-- ────────────────────────────────────────────────────────────

ORDER BY
    a.attendance_date DESC,
    b.name,
    m.full_name;
