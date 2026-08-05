-- =============================================================
-- TRAINER REPORT
-- Tables: trainers, users, staff, branches,
--         trainer_assignments, members, workouts, appointments
-- Description: Trainer roster with assigned member count,
--              active workout count, and upcoming appointments.
-- =============================================================

SELECT
    u.full_name                                                 AS trainer_name,
    u.email,
    u.phone,
    b.name                                                      AS branch_name,

    -- Staff info
    st.employee_code,
    st.designation,
    st.joining_date,

    -- Trainer details
    t.experience_years,
    t.specializations,
    t.certifications,
    t.status                                                    AS trainer_status,

    -- Active assigned members
    COALESCE(ta_stats.active_members, 0)                       AS active_assigned_members,

    -- Total members ever assigned
    COALESCE(ta_stats.total_members, 0)                        AS total_members_assigned,

    -- Active workouts currently scheduled
    COALESCE(wo_stats.active_workouts, 0)                      AS active_workouts,

    -- Upcoming appointments (today onward)
    COALESCE(ap_stats.upcoming_appointments, 0)                AS upcoming_appointments

FROM public.trainers t

JOIN public.users u
    ON u.id = t.user_id

JOIN public.branches b
    ON b.id = t.branch_id

LEFT JOIN public.staff st
    ON st.id = t.staff_id

-- Assigned member counts
LEFT JOIN (
    SELECT
        trainer_id,
        COUNT(*) FILTER (WHERE status = 'active')  AS active_members,
        COUNT(*)                                   AS total_members
    FROM public.trainer_assignments
    GROUP BY trainer_id
) ta_stats
    ON ta_stats.trainer_id = t.id

-- Active workout counts
LEFT JOIN (
    SELECT
        trainer_id,
        COUNT(*) AS active_workouts
    FROM public.workouts
    WHERE status = 'active'
    GROUP BY trainer_id
) wo_stats
    ON wo_stats.trainer_id = t.id

-- Upcoming appointments
LEFT JOIN (
    SELECT
        provider_staff_id,
        COUNT(*) AS upcoming_appointments
    FROM public.appointments
    WHERE appointment_date >= CURRENT_DATE
      AND status IN ('pending', 'approved')
    GROUP BY provider_staff_id
) ap_stats
    ON ap_stats.provider_staff_id = t.staff_id

ORDER BY
    b.name,
    t.status,
    u.full_name;
