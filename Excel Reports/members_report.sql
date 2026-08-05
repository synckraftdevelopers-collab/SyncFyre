-- =============================================================
-- MEMBERS REPORT
-- Tables: members, branches, trainers, users, subscriptions,
--         membership_plans
-- Description: Full member roster with branch, trainer,
--              current subscription plan, and status.
-- =============================================================

SELECT
    m.member_code,
    m.full_name,
    m.gender,
    m.date_of_birth,
    DATE_PART('year', AGE(m.date_of_birth::date))::int         AS age,
    m.phone,
    m.email,
    m.blood_group,
    m.height_cm,
    m.weight_kg,
    m.fitness_goal,
    m.medical_conditions,
    m.status                                                    AS member_status,
    b.name                                                      AS branch_name,
    b.city                                                      AS branch_city,

    -- Assigned trainer name (via trainers → users)
    tu.full_name                                                AS assigned_trainer,

    -- Latest subscription
    mp.name                                                     AS current_plan,
    s.start_date                                                AS subscription_start,
    s.end_date                                                  AS subscription_end,
    s.status                                                    AS subscription_status,

    -- Days remaining (negative = expired)
    (s.end_date - CURRENT_DATE)                                 AS days_remaining,

    m.emergency_contact_name,
    m.emergency_contact_phone,
    m.created_at::date                                          AS joined_date

FROM public.members m

JOIN public.branches b
    ON b.id = m.branch_id

-- Trainer info (optional)
LEFT JOIN public.trainers t
    ON t.id = m.assigned_trainer_id
LEFT JOIN public.users tu
    ON tu.id = t.user_id

-- Most recent subscription per member
LEFT JOIN LATERAL (
    SELECT *
    FROM public.subscriptions sub
    WHERE sub.member_id = m.id
    ORDER BY sub.created_at DESC
    LIMIT 1
) s ON TRUE

LEFT JOIN public.membership_plans mp
    ON mp.id = s.plan_id

ORDER BY
    b.name,
    m.status,
    m.full_name;
