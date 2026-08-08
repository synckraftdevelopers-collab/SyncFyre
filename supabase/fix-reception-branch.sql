-- Fix: Ensure all staff users (reception, trainer, etc.) have branch_id set.
-- Run this in the Supabase SQL Editor.

-- Step 1: See which users are missing branch_id
SELECT u.id, u.full_name, u.email, u.branch_id, r.slug as role
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.branch_id IS NULL
  AND r.slug IN ('reception', 'trainer', 'dietician', 'manager');

-- Step 2: Get the branch ID to assign
SELECT id, name FROM public.branches LIMIT 5;

-- Step 3: Assign branch to reception/trainer users that have none
-- Replace 'YOUR_BRANCH_ID_HERE' with the UUID from Step 2
UPDATE public.users
SET branch_id = (SELECT id FROM public.branches LIMIT 1)
WHERE branch_id IS NULL
  AND role_id IN (
    SELECT id FROM public.roles
    WHERE slug IN ('reception', 'trainer', 'dietician', 'manager')
  );

-- Step 4: Verify - all staff should now have branch_id
SELECT u.full_name, u.email, u.branch_id, r.slug as role
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE r.slug IN ('admin', 'reception', 'trainer', 'manager', 'dietician');
